import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { declineSchema } from "@/lib/validation";
import { performDecline } from "@/lib/services/decline";
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
  const parsed = declineSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid body", 400, { issues: parsed.error.issues });
  const r = await performDecline(s.id, parsed.data.reason);
  if (!r.ok) return apiError("INTERNAL_ERROR", "Decline failed", 500);
  return NextResponse.json({ ok: true });
}
