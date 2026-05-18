import { NextRequest, NextResponse } from "next/server";
import { createSigningRequestSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit/upstash";
import { createSigningRequest } from "@/lib/services/create-request";
import { apiError } from "@/lib/http/errors";
import { clientIp } from "@/lib/http/ip";
import { baseUrl } from "@/lib/http/base-url";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await rateLimit(`create:ip:${ip}`, { limit: 5, windowSec: 3600 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many signing requests from this IP. Try again later.", 429);
  let body: unknown;
  try { body = await req.json(); } catch { return apiError("VALIDATION_ERROR", "Body is not valid JSON", 400); }
  const parsed = createSigningRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid request body", 400, { issues: parsed.error.issues });
  try {
    const result = await createSigningRequest(parsed.data, ip, baseUrl());
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "SMS_NOT_CONFIGURED") {
      return apiError("SMS_NOT_CONFIGURED", "SMS-verifisering er ikke konfigurert på denne instansen. Fjern telefonnummer fra signantene og prøv igjen.", 400);
    }
    console.error("create-request failed", e);
    return apiError("INTERNAL_ERROR", "Failed to create signing request", 500);
  }
}
