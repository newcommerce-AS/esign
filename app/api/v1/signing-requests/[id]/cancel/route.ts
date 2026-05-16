import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signingRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { apiError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lookup = req.headers.get("x-lookup-token");
  if (!lookup) return apiError("UNAUTHORIZED", "Missing X-Lookup-Token", 401);
  const [r] = await db.select().from(signingRequests).where(eq(signingRequests.id, id));
  if (!r) return apiError("NOT_FOUND", "Not found", 404);
  if (r.senderLookupToken !== lookup) return apiError("UNAUTHORIZED", "Bad lookup token", 401);
  if (r.status === "completed" || r.status === "cancelled" || r.status === "expired") return apiError("INVALID_STATE", `Already ${r.status}`, 409);
  await db.update(signingRequests).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(signingRequests.id, id));
  await logAudit({ signingRequestId: id, eventType: "cancelled", payload: { by: "sender" } });
  return NextResponse.json({ ok: true });
}
