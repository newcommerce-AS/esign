import { NextRequest, NextResponse } from "next/server";
import { sweepRetention } from "@/lib/services/retention";
import { constantTimeStringEq } from "@/lib/http/timing-safe";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!constantTimeStringEq(auth, `Bearer ${process.env.CRON_SECRET ?? ""}`)) return new NextResponse("unauthorized", { status: 401 });
  const n = await sweepRetention();
  return NextResponse.json({ deleted: n });
}
