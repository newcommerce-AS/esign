import { db, initDb } from "@/lib/db/client";
import { signingRequests, signers, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/resend-client";
import { SignerInviteEmail } from "@/lib/email/templates/signer-invite";

export type ConfirmResult =
  | { ok: true; signingRequestId: string }
  | { ok: false; reason: "not_found" | "already_confirmed" | "invalid_state" };

export async function confirmSender(token: string, baseUrl: string): Promise<ConfirmResult> {
  await initDb();
  const [req] = await db.select().from(signingRequests).where(eq(signingRequests.senderConfirmToken, token));
  if (!req) return { ok: false, reason: "not_found" };
  if (req.senderConfirmedAt) return { ok: false, reason: "already_confirmed" };
  if (req.status !== "awaiting_sender_confirm") return { ok: false, reason: "invalid_state" };
  const now = new Date();
  await db.update(signingRequests).set({ senderConfirmedAt: now, status: "active" }).where(eq(signingRequests.id, req.id));
  await logAudit({ signingRequestId: req.id, eventType: "sender_confirmed" });
  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, req.id));
  const sgs = await db.select().from(signers).where(eq(signers.signingRequestId, req.id));
  await Promise.all(sgs.map(async (s) => {
    const signUrl = `${baseUrl}/sign/${s.signToken}`;
    await sendEmail({ to: s.email, subject: `Du har et dokument til signering: ${doc.originalFilename}`, react: SignerInviteEmail({ signerName: s.name, senderEmail: req.senderEmail, signUrl, documentName: doc.originalFilename, expiresAt: req.expiresAt }) });
    await logAudit({ signingRequestId: req.id, signerId: s.id, eventType: "email_sent", payload: { to: s.email } });
  }));
  return { ok: true, signingRequestId: req.id };
}
