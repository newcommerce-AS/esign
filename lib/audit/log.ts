import { db, initDb } from "@/lib/db/client";
import { auditEvents } from "@/lib/db/schema";

export async function logAudit(input: {
  signingRequestId: string;
  signerId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
  ip?: string;
}) {
  await initDb();
  await db.insert(auditEvents).values({
    signingRequestId: input.signingRequestId,
    signerId: input.signerId,
    eventType: input.eventType,
    payload: input.payload ?? {},
    ip: input.ip,
  });
}
