import { db } from "@/lib/db/client";
import { signers, signingRequests, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/resend-client";
import { DeclineEmail } from "@/lib/email/templates/decline";
import { fireWebhook } from "@/lib/webhook/fire";

export async function performDecline(signerId: string, reason: string): Promise<{ ok: boolean }> {
  const [s] = await db.select().from(signers).where(eq(signers.id, signerId));
  if (!s) return { ok: false };
  await db.update(signers).set({ status: "declined", declineReason: reason }).where(eq(signers.id, signerId));
  await db.update(signingRequests).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(signingRequests.id, s.signingRequestId));
  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "declined", payload: { reason } });
  await logAudit({ signingRequestId: s.signingRequestId, eventType: "cancelled" });
  const [req] = await db.select().from(signingRequests).where(eq(signingRequests.id, s.signingRequestId));
  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, s.signingRequestId));
  const otherSigners = await db.select().from(signers).where(eq(signers.signingRequestId, s.signingRequestId));
  const recipients = [{ name: "avsender", email: req.senderEmail }, ...otherSigners.filter((o) => o.id !== s.id).map((o) => ({ name: o.name, email: o.email }))];
  await Promise.all(recipients.map((r) => sendEmail({ to: r.email, subject: `Signeringsoppdrag avbrutt: ${doc.originalFilename}`, react: DeclineEmail({ recipientName: r.name, documentName: doc.originalFilename, declinerName: s.name, reason }) })));
  if (req.webhookUrl && req.webhookSecret) await fireWebhook(req.webhookUrl, req.webhookSecret, { event: "declined", signing_request_id: req.id, signer_id: s.id, occurred_at: new Date().toISOString(), request_status: "cancelled" });
  return { ok: true };
}
