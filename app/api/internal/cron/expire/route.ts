import { NextRequest, NextResponse } from "next/server";
import { expireDueRequests } from "@/lib/services/expire";
import { cleanupRateLimitHits } from "@/lib/rate-limit/db";
import { constantTimeStringEq } from "@/lib/http/timing-safe";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!constantTimeStringEq(auth, `Bearer ${process.env.CRON_SECRET ?? ""}`)) return new NextResponse("unauthorized", { status: 401 });
  const n = await expireDueRequests();
  const cleaned = await cleanupRateLimitHits(3600);
  return NextResponse.json({ expired: n, rate_limit_cleaned: cleaned });
}
