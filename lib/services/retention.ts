import { db } from "@/lib/db/client";
import { signingRequests, documents } from "@/lib/db/schema";
import { eq, lt, or, and, inArray } from "drizzle-orm";
import { deleteBlob } from "@/lib/storage/blob";

export async function sweepRetention(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 90 * 86400_000);
  const stale = await db.select().from(signingRequests).where(or(
    and(eq(signingRequests.status, "completed"), lt(signingRequests.completedAt, cutoff)),
    and(eq(signingRequests.status, "cancelled"), lt(signingRequests.cancelledAt, cutoff)),
    and(eq(signingRequests.status, "expired"), lt(signingRequests.expiredAt, cutoff)),
  ));
  if (stale.length === 0) return 0;
  const ids = stale.map((s) => s.id);
  const docs = await db.select().from(documents).where(inArray(documents.signingRequestId, ids));
  for (const d of docs) {
    await Promise.all([d.originalBlobUrl, d.renderedPdfBlobUrl, d.finalSignedPdfBlobUrl].filter((u): u is string => !!u).map((u) => deleteBlob(u).catch(() => {})));
  }
  await db.delete(signingRequests).where(inArray(signingRequests.id, ids));
  return stale.length;
}
