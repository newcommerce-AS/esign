import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signingRequests, signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lookup = req.headers.get("x-lookup-token");
  if (!lookup) return apiError("UNAUTHORIZED", "Missing X-Lookup-Token", 401);
  const [r] = await db.select().from(signingRequests).where(eq(signingRequests.id, id));
  if (!r) return apiError("NOT_FOUND", "Not found", 404);
  if (r.senderLookupToken !== lookup) return apiError("UNAUTHORIZED", "Bad lookup token", 401);
  const sgs = await db.select().from(signers).where(eq(signers.signingRequestId, id));
  return NextResponse.json({
    id: r.id, status: r.status, created_at: r.createdAt.toISOString(), expires_at: r.expiresAt.toISOString(),
    sender_email: r.senderEmail, sender_confirmed_at: r.senderConfirmedAt?.toISOString() ?? null,
    completed_at: r.completedAt?.toISOString() ?? null, cancelled_at: r.cancelledAt?.toISOString() ?? null,
    signers: sgs.map((s) => ({ id: s.id, name: s.name, email: s.email, status: s.status, signed_at: s.signedAt?.toISOString() ?? null })),
  });
}
