import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db/client";
import { signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit/upstash";
import { sendSmsCode } from "@/lib/services/sms";
import { apiError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  await initDb();
  const [s] = await db.select().from(signers).where(eq(signers.signToken, sign_token));
  if (!s) return apiError("NOT_FOUND", "Invalid sign token", 404);
  const rl = await rateLimit(`sms:signer:${s.id}`, { limit: 5, windowSec: 3600 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many SMS requests", 429);
  const r = await sendSmsCode(s.id);
  if (!r.ok) return apiError("INVALID_STATE", r.reason, 409);
  return NextResponse.json({ ok: true });
}
