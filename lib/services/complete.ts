import { db } from "@/lib/db/client";
import { signingRequests, signers, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { finalizeSignedPdf } from "@/lib/pdf/finalize";
import { putPdf } from "@/lib/storage/blob";
import { logAudit } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/resend-client";
import { CompletionEmail } from "@/lib/email/templates/completion";
import { fireWebhook } from "@/lib/webhook/fire";

export async function completeIfDone(signingRequestId: string): Promise<boolean> {
  const sgs = await db.select().from(signers).where(eq(signers.signingRequestId, signingRequestId));
  if (sgs.some((s) => s.status !== "signed")) return false;
  const [req] = await db.select().from(signingRequests).where(eq(signingRequests.id, signingRequestId));
  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, signingRequestId));
  const originalRendered = await fetch(doc.renderedPdfBlobUrl).then((r) => r.arrayBuffer()).then((b) => Buffer.from(b));
  const finalPdf = await finalizeSignedPdf(originalRendered, {
    documentId: doc.id, documentSha256: doc.renderedPdfSha256,
    originalFilename: doc.originalFilename, originalFormat: doc.originalFormat as "pdf" | "markdown" | "text",
    createdAt: req.createdAt, senderEmail: req.senderEmail, senderIp: req.senderIp ?? "unknown",
    senderConfirmedAt: req.senderConfirmedAt!, appVersion: process.env.APP_VERSION ?? "0.0.0",
    generatedAt: new Date(),
    signers: sgs.map((s, i) => ({
      index: i + 1, total: sgs.length, name: s.name, email: s.email, phone: s.phone,
      signedAt: s.signedAt!, signedIp: s.signedIp ?? "unknown", userAgent: s.signedUserAgent ?? "",
      emailVerifiedAt: s.emailVerifiedAt!, smsVerifiedAt: s.smsVerifiedAt,
      consentText: s.consentText!, signTokenHash: s.signTokenHash,
    })),
  });
  const finalUrl = await putPdf(`${signingRequestId}/final.pdf`, finalPdf);
  await db.update(documents).set({ finalSignedPdfBlobUrl: finalUrl }).where(eq(documents.signingRequestId, signingRequestId));
  await db.update(signingRequests).set({ status: "completed", completedAt: new Date() }).where(eq(signingRequests.id, signingRequestId));
  await logAudit({ signingRequestId, eventType: "completed" });
  const recipients = [{ name: "avsender", email: req.senderEmail }, ...sgs.map((s) => ({ name: s.name, email: s.email }))];
  const allSignerNames = sgs.map((s) => s.name);
  await Promise.all(recipients.map((r) => sendEmail({
    to: r.email, subject: `Signert: ${doc.originalFilename}`,
    react: CompletionEmail({ recipientName: r.name, documentName: doc.originalFilename, allSigners: allSignerNames }),
    attachments: [{ filename: `signed-${doc.originalFilename.replace(/\.[^.]+$/, "")}.pdf`, content: finalPdf }],
  })));
  if (req.webhookUrl && req.webhookSecret) await fireWebhook(req.webhookUrl, req.webhookSecret, { event: "completed", signing_request_id: req.id, occurred_at: new Date().toISOString(), request_status: "completed" });
  return true;
}
