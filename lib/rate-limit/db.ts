// lib/rate-limit/db.ts
import { db } from "@/lib/db/client";
import { rateLimitHits } from "@/lib/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

// Note: count-then-insert is non-atomic; acceptable for this use case
// (low-volume rate limiting where occasional off-by-one is harmless).
export async function rateLimit(key: string, opts: { limit: number; windowSec: number }) {
  const windowStart = new Date(Date.now() - opts.windowSec * 1000);

  // Count existing hits in window
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rateLimitHits)
    .where(and(eq(rateLimitHits.key, key), gte(rateLimitHits.occurredAt, windowStart)));

  const n = Number(count);

  if (n >= opts.limit) {
    return { success: false, remaining: 0, reset: Date.now() + opts.windowSec * 1000 };
  }

  // Record this hit
  await db.insert(rateLimitHits).values({ key });

  return { success: true, remaining: opts.limit - n - 1, reset: Date.now() + opts.windowSec * 1000 };
}

// Best-effort cleanup of old hits (called from cron)
export async function cleanupRateLimitHits(maxAgeSec = 3600): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeSec * 1000);
  const result = await db.delete(rateLimitHits).where(sql`${rateLimitHits.occurredAt} < ${cutoff}`);
  return (result as { rowCount?: number }).rowCount ?? 0;
}
