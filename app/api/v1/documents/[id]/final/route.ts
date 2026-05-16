import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { documents, signingRequests, signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/http/errors";
import { constantTimeStringEq } from "@/lib/http/timing-safe";
import { clientIp } from "@/lib/http/ip";
import { rateLimit } from "@/lib/rate-limit/upstash";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = clientIp(req);
  const rl = await rateLimit(`api:ip:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many requests", 429);
  const lookup = req.headers.get("x-lookup-token");
  const sign = req.headers.get("x-sign-token");
  const [d] = await db.select().from(documents).where(eq(documents.id, id));
  if (!d || !d.finalSignedPdfBlobUrl) return apiError("NOT_FOUND", "Final PDF not available", 404);
  const [r] = await db.select().from(signingRequests).where(eq(signingRequests.id, d.signingRequestId));
  if (!r) return apiError("NOT_FOUND", "Not found", 404);
  let authorized = false;
  if (lookup && constantTimeStringEq(r.senderLookupToken, lookup)) authorized = true;
  if (sign) {
    const [s] = await db.select().from(signers).where(eq(signers.signToken, sign));
    if (s && s.signingRequestId === d.signingRequestId) authorized = true;
  }
  if (!authorized) return apiError("UNAUTHORIZED", "Missing or invalid token", 401);
  const buf = await fetch(d.finalSignedPdfBlobUrl).then((r) => r.arrayBuffer());
  return new NextResponse(Buffer.from(buf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="signed-${d.originalFilename.replace(/\.[^.]+$/, "")}.pdf"` } });
}
