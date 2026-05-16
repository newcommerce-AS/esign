import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signingRequests, signers, documents } from "@/lib/db/schema";
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
  if (!lookup) return apiError("UNAUTHORIZED", "Missing X-Lookup-Token", 401);
  const [r] = await db.select().from(signingRequests).where(eq(signingRequests.id, id));
  if (!r) return apiError("NOT_FOUND", "Not found", 404);
  if (!constantTimeStringEq(r.senderLookupToken, lookup)) return apiError("UNAUTHORIZED", "Bad lookup token", 401);
  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, id));
  const sgs = await db.select().from(signers).where(eq(signers.signingRequestId, id));
  return NextResponse.json({
    id: r.id, status: r.status, created_at: r.createdAt.toISOString(), expires_at: r.expiresAt.toISOString(),
    sender_email: r.senderEmail, sender_confirmed_at: r.senderConfirmedAt?.toISOString() ?? null,
    completed_at: r.completedAt?.toISOString() ?? null, cancelled_at: r.cancelledAt?.toISOString() ?? null,
    document: doc ? { id: doc.id, filename: doc.originalFilename, sha256: doc.renderedPdfSha256, final_available: !!doc.finalSignedPdfBlobUrl } : null,
    signers: sgs.map((s) => ({ id: s.id, name: s.name, email: s.email, status: s.status, signed_at: s.signedAt?.toISOString() ?? null })),
  });
}
