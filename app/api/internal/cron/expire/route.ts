import { NextRequest, NextResponse } from "next/server";
import { expireDueRequests } from "@/lib/services/expire";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("unauthorized", { status: 401 });
  const n = await expireDueRequests();
  return NextResponse.json({ expired: n });
}
