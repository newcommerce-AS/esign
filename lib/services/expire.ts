import { db, initDb } from "@/lib/db/client";
import { signingRequests } from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { fireWebhook } from "@/lib/webhook/fire";

export async function expireDueRequests(now = new Date()): Promise<number> {
  await initDb();
  const due = await db.select().from(signingRequests)
    .where(and(eq(signingRequests.status, "active"), lt(signingRequests.expiresAt, now)));
  for (const r of due) {
    await db.update(signingRequests).set({ status: "expired", expiredAt: now }).where(eq(signingRequests.id, r.id));
    await logAudit({ signingRequestId: r.id, eventType: "expired" });
    if (r.webhookUrl && r.webhookSecret) await fireWebhook(r.webhookUrl, r.webhookSecret, { event: "expired", signing_request_id: r.id, occurred_at: now.toISOString(), request_status: "expired" });
  }
  return due.length;
}
