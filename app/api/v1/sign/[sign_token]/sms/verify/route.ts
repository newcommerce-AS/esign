import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { smsVerifySchema } from "@/lib/validation";
import { verifyCode } from "@/lib/services/sms";
import { apiError } from "@/lib/http/errors";
import { clientIp } from "@/lib/http/ip";
import { rateLimit } from "@/lib/rate-limit/upstash";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  const ip = clientIp(req);
  const rl = await rateLimit(`api:ip:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many requests", 429);
  const [s] = await db.select().from(signers).where(eq(signers.signToken, sign_token));
  if (!s) return apiError("NOT_FOUND", "Invalid sign token", 404);
  let body: unknown;
  try { body = await req.json(); } catch { return apiError("VALIDATION_ERROR", "Bad JSON", 400); }
  const parsed = smsVerifySchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid body", 400, { issues: parsed.error.issues });
  const r = await verifyCode(s.id, parsed.data.code);
  if (!r.ok) return apiError("INVALID_STATE", r.reason, 409);
  return NextResponse.json({ ok: true });
}
