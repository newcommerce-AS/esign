import { NextRequest, NextResponse } from "next/server";
import { confirmSender } from "@/lib/services/confirm-sender";
import { apiError } from "@/lib/http/errors";
import { clientIp } from "@/lib/http/ip";
import { rateLimit } from "@/lib/rate-limit/db";
import { baseUrl } from "@/lib/http/base-url";

export const runtime = "nodejs";

function confirmedResponse(base: string, r: { signingRequestId: string; senderLookupToken: string; signerSignToken: string | null }) {
  const signUrl = r.signerSignToken ? `${base}/sign/${r.signerSignToken}` : null;
  const statusUrl = `${base}/status/${r.senderLookupToken}?id=${r.signingRequestId}`;
  return NextResponse.json({
    ok: true,
    status: "active",
    signing_request_id: r.signingRequestId,
    sender_lookup_token: r.senderLookupToken,
    sign_url: signUrl,
    status_url: statusUrl,
    redirect: signUrl ?? statusUrl,
  });
}

// Explicit, idempotent confirm action. The browser button and agents/CLI both
// POST here. GET never mutates (see app/confirm/[confirm_token]/page.tsx).
export async function POST(req: NextRequest, { params }: { params: Promise<{ confirm_token: string }> }) {
  const { confirm_token } = await params;
  const ip = clientIp(req);
  const rl = await rateLimit(`api:ip:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many requests", 429);

  const base = baseUrl();
  const result = await confirmSender(confirm_token, base);

  // ok OR already_confirmed → 200 with redirect data (idempotent).
  if (result.ok) return confirmedResponse(base, result);
  if (result.reason === "already_confirmed") return confirmedResponse(base, result);
  if (result.reason === "not_found") return apiError("NOT_FOUND", "Invalid or expired confirm token", 404);
  return apiError("INVALID_STATE", "Request can no longer be confirmed", 409);
}
