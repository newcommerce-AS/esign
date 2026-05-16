import { db, initDb } from "@/lib/db/client";
import { signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSmsCode, hashSmsCode, verifySmsCode } from "@/lib/sms/code";
import { sendSms } from "@/lib/sms/twilio-client";
import { logAudit } from "@/lib/audit/log";

export async function sendSmsCode(signerId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  await initDb();
  const [s] = await db.select().from(signers).where(eq(signers.id, signerId));
  if (!s || !s.phone) return { ok: false, reason: "no_phone" };
  const code = generateSmsCode();
  const expires = new Date(Date.now() + 10 * 60_000);
  await db.update(signers).set({ smsCodeHash: hashSmsCode(code), smsCodeExpiresAt: expires }).where(eq(signers.id, signerId));
  await sendSms(s.phone, `Din signeringskode: ${code} (10 minutter gyldighet)`);
  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "sms_code_sent" });
  return { ok: true };
}

export async function verifyCode(signerId: string, code: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  await initDb();
  const [s] = await db.select().from(signers).where(eq(signers.id, signerId));
  if (!s || !s.smsCodeHash || !s.smsCodeExpiresAt) return { ok: false, reason: "no_code" };
  if (s.smsCodeExpiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (!verifySmsCode(code, s.smsCodeHash)) return { ok: false, reason: "mismatch" };
  await db.update(signers).set({ smsVerifiedAt: new Date(), status: "sms_verified", smsCodeHash: null, smsCodeExpiresAt: null }).where(eq(signers.id, signerId));
  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "sms_verified" });
  return { ok: true };
}
