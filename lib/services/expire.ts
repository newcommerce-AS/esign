import { db, initDb } from "@/lib/db/client";
import { signingRequests, documents } from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { fireWebhook } from "@/lib/webhook/fire";
import { deleteBlob } from "@/lib/storage/blob";

export async function expireDueRequests(now = new Date()): Promise<number> {
  await initDb();
  const due = await db.select().from(signingRequests)
    .where(and(eq(signingRequests.status, "active"), lt(signingRequests.expiresAt, now)));
  for (const r of due) {
    await db.update(signingRequests).set({ status: "expired", expiredAt: now }).where(eq(signingRequests.id, r.id));
    await logAudit({ signingRequestId: r.id, eventType: "expired" });
    if (r.webhookUrl && r.webhookSecret) await fireWebhook(r.webhookUrl, r.webhookSecret, { event: "expired", signing_request_id: r.id, occurred_at: now.toISOString(), request_status: "expired" });
    // Delete all blobs then hard-delete the row (cascades to documents, signers, audit_events).
    const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, r.id));
    if (doc) {
      await Promise.all([doc.originalBlobUrl, doc.renderedPdfBlobUrl, doc.finalSignedPdfBlobUrl].filter((u): u is string => !!u).map((u) => deleteBlob(u).catch(() => {})));
    }
    await db.delete(signingRequests).where(eq(signingRequests.id, r.id));
  }
  return due.length;
}
