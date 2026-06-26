import { db, initDb } from "@/lib/db/client";
import { signingRequests, signers, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/resend-client";
import { SignerInviteEmail } from "@/lib/email/templates/signer-invite";
import { matchSenderSigner } from "@/lib/services/match-sender-signer";

export type ConfirmResult =
  | { ok: true; signingRequestId: string; senderLookupToken: string; signerSignToken: string | null }
  | { ok: false; reason: "already_confirmed"; signingRequestId: string; senderLookupToken: string; signerSignToken: string | null }
  | { ok: false; reason: "not_found" | "invalid_state" };

export async function confirmSender(token: string, baseUrl: string): Promise<ConfirmResult> {
  await initDb();
  const [req] = await db.select().from(signingRequests).where(eq(signingRequests.senderConfirmToken, token));
  if (!req) return { ok: false, reason: "not_found" };

  // Status is the source of truth (mirrors getConfirmView). A request that was
  // confirmed and then went terminal (expired/cancelled) keeps senderConfirmedAt
  // set, so we must branch on status — not on the timestamp — or a retry would
  // wrongly report already_confirmed instead of invalid_state.
  if (req.status === "awaiting_sender_confirm") {
    await db.update(signingRequests).set({ senderConfirmedAt: new Date(), status: "active" }).where(eq(signingRequests.id, req.id));
    await logAudit({ signingRequestId: req.id, eventType: "sender_confirmed" });
    const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, req.id));
    const sgs = await db.select().from(signers).where(eq(signers.signingRequestId, req.id));
    await Promise.all(sgs.map(async (s) => {
      const signUrl = `${baseUrl}/sign/${s.signToken}`;
      await sendEmail({ to: s.email, subject: `Du har et dokument til signering: ${doc.originalFilename}`, react: SignerInviteEmail({ signerName: s.name, senderEmail: req.senderEmail, signUrl, documentName: doc.originalFilename, expiresAt: req.expiresAt }) });
      await logAudit({ signingRequestId: req.id, signerId: s.id, eventType: "email_sent", payload: { to: s.email } });
    }));
    return {
      ok: true,
      signingRequestId: req.id,
      senderLookupToken: req.senderLookupToken,
      signerSignToken: matchSenderSigner(req.senderEmail, sgs)?.signToken ?? null,
    };
  }

  if (req.status === "active") {
    const sgs = await db.select().from(signers).where(eq(signers.signingRequestId, req.id));
    return {
      ok: false,
      reason: "already_confirmed",
      signingRequestId: req.id,
      senderLookupToken: req.senderLookupToken,
      signerSignToken: matchSenderSigner(req.senderEmail, sgs)?.signToken ?? null,
    };
  }

  // completed / cancelled / expired
  return { ok: false, reason: "invalid_state" };
}
