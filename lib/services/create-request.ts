import { db, initDb } from "@/lib/db/client";
import { signingRequests, documents, signers } from "@/lib/db/schema";
import { newToken, hashToken } from "@/lib/tokens";
import { sha256Hex } from "@/lib/hash";
import { putBytes, putPdf } from "@/lib/storage/blob";
import { renderTextToPdf } from "@/lib/pdf/render-text";
import { renderMarkdownToPdf } from "@/lib/pdf/render-markdown";
import { logAudit } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/resend-client";
import { SenderConfirmEmail } from "@/lib/email/templates/sender-confirm";
import type { CreateSigningRequestInput } from "@/lib/validation";

export interface CreateSigningRequestResult {
  id: string;
  status: "awaiting_sender_confirm";
  confirm_url: string;
  sender_lookup_token: string;
  webhook_secret: string | null;
  expires_at: string;
  signers: { id: string; name: string; email: string; status: string }[];
}

export async function createSigningRequest(input: CreateSigningRequestInput, senderIp: string, baseUrl: string): Promise<CreateSigningRequestResult> {
  const isProd = process.env.NODE_ENV === "production";
  const smsConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  const hasSignerWithPhone = input.signers.some((s) => s.phone);
  if (isProd && hasSignerWithPhone && !smsConfigured) {
    throw new Error("SMS_NOT_CONFIGURED");
  }
  await initDb();
  const originalBuf = Buffer.from(input.document.content_base64, "base64");
  let renderedPdf: Buffer;
  if (input.document.format === "pdf") renderedPdf = originalBuf;
  else if (input.document.format === "markdown") renderedPdf = await renderMarkdownToPdf(originalBuf.toString("utf8"));
  else renderedPdf = await renderTextToPdf(originalBuf.toString("utf8"));
  const renderedSha = sha256Hex(renderedPdf);
  const requestId = crypto.randomUUID();
  const originalUrl = await putBytes(`${requestId}/original-${input.document.filename}`, originalBuf, contentTypeFor(input.document.format));
  const renderedUrl = await putPdf(`${requestId}/rendered.pdf`, renderedPdf);
  const senderConfirmToken = newToken();
  const senderLookupToken = newToken();
  const webhookSecret = input.webhook_url ? newToken(24) : null;
  const expiresAt = new Date(Date.now() + input.expires_in_days * 86400_000);
  const [created] = await db.insert(signingRequests).values({
    id: requestId, expiresAt, senderEmail: input.sender_email, senderName: input.sender_name,
    senderIp, senderConfirmToken, senderLookupToken, status: "awaiting_sender_confirm",
    webhookUrl: input.webhook_url, webhookSecret, metadata: input.metadata as Record<string, unknown> | undefined,
  }).returning();
  await db.insert(documents).values({
    signingRequestId: requestId, originalFilename: input.document.filename, originalFormat: input.document.format,
    originalBlobUrl: originalUrl, renderedPdfBlobUrl: renderedUrl, renderedPdfSha256: renderedSha,
  });
  const signerRows = await db.insert(signers).values(input.signers.map((s) => {
    const t = newToken();
    return { signingRequestId: requestId, name: s.name, email: s.email, phone: s.phone, signToken: t, signTokenHash: hashToken(t), status: "pending" };
  })).returning();
  await logAudit({ signingRequestId: requestId, eventType: "request_created", payload: { signerCount: input.signers.length }, ip: senderIp });
  const confirmUrl = `${baseUrl}/confirm/${senderConfirmToken}`;
  await sendEmail({ to: input.sender_email, subject: "Bekreft signeringsoppdrag", react: SenderConfirmEmail({ confirmUrl, signerNames: input.signers.map((s) => s.name) }) });
  return {
    id: requestId, status: "awaiting_sender_confirm", confirm_url: confirmUrl,
    sender_lookup_token: senderLookupToken, webhook_secret: webhookSecret,
    expires_at: expiresAt.toISOString(),
    signers: signerRows.map((s) => ({ id: s.id, name: s.name, email: s.email, status: s.status })),
  };
}

function contentTypeFor(format: "pdf" | "markdown" | "text"): string {
  return format === "pdf" ? "application/pdf" : format === "markdown" ? "text/markdown" : "text/plain";
}
