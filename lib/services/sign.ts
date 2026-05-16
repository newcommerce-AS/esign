import { db } from "@/lib/db/client";
import { signers, signingRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { completeIfDone } from "./complete";

export type SignResult = { ok: true; completed: boolean } | { ok: false; reason: string };

export async function performSign(signerId: string, fullName: string, ip: string, userAgent: string): Promise<SignResult> {
  const [s] = await db.select().from(signers).where(eq(signers.id, signerId));
  if (!s) return { ok: false, reason: "not_found" };
  if (s.status === "signed") return { ok: false, reason: "already_signed" };
  if (!s.emailVerifiedAt) return { ok: false, reason: "email_not_verified" };
  if (s.phone && !s.smsVerifiedAt) return { ok: false, reason: "sms_required" };
  const consentText = `Jeg, ${fullName}, samtykker til innholdet i dette dokumentet og signerer det elektronisk.`;
  await db.update(signers).set({
    status: "signed", signedAt: new Date(), signedIp: ip, signedUserAgent: userAgent, consentText,
  }).where(eq(signers.id, signerId));
  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "signed", payload: { ip, userAgent }, ip });
  const completed = await completeIfDone(s.signingRequestId);
  return { ok: true, completed };
}
