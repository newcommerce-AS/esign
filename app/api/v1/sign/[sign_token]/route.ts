import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db/client";
import { signers, documents, signingRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signActionSchema } from "@/lib/validation";
import { performSign } from "@/lib/services/sign";
import { logAudit } from "@/lib/audit/log";
import { apiError } from "@/lib/http/errors";
import { clientIp } from "@/lib/http/ip";
import { rateLimit } from "@/lib/rate-limit/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  const ip = clientIp(req);
  const rl = await rateLimit(`api:ip:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many requests", 429);
  await initDb();
  const [s] = await db.select().from(signers).where(eq(signers.signToken, sign_token));
  if (!s) return apiError("NOT_FOUND", "Invalid sign token", 404);
  const [req2] = await db.select().from(signingRequests).where(eq(signingRequests.id, s.signingRequestId));
  if (req2.status !== "active") return apiError("INVALID_STATE", `Request is ${req2.status}`, 409);
  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, s.signingRequestId));
  if (!s.emailVerifiedAt) {
    await db.update(signers).set({ emailVerifiedAt: new Date(), status: "email_verified" }).where(eq(signers.id, s.id));
    await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "email_verified", ip: clientIp(req) });
  }
  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "document_viewed", ip: clientIp(req) });
  return NextResponse.json({
    signing_request_id: s.signingRequestId,
    document: { id: doc.id, filename: doc.originalFilename, url: doc.renderedPdfBlobUrl, sha256: doc.renderedPdfSha256 },
    signer: { id: s.id, name: s.name, email: s.email, status: s.status, sms_required: !!s.phone, sms_verified: !!s.smsVerifiedAt },
    sender: { email: req2.senderEmail, name: req2.senderName },
    expires_at: req2.expiresAt.toISOString(),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  const ip = clientIp(req);
  const rl = await rateLimit(`api:ip:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many requests", 429);
  await initDb();
  const [s] = await db.select().from(signers).where(eq(signers.signToken, sign_token));
  if (!s) return apiError("NOT_FOUND", "Invalid sign token", 404);
  let body: unknown;
  try { body = await req.json(); } catch { return apiError("VALIDATION_ERROR", "Bad JSON", 400); }
  const parsed = signActionSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid body", 400, { issues: parsed.error.issues });
  const result = await performSign(s.id, parsed.data.name, clientIp(req), req.headers.get("user-agent") ?? "");
  if (!result.ok) return apiError("INVALID_STATE", result.reason, 409);
  return NextResponse.json({ ok: true, completed: result.completed });
}
