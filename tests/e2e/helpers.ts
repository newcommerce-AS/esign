import { db } from "../../lib/db/client";
import { signingRequests, signers } from "../../lib/db/schema";
import { eq } from "drizzle-orm";

export async function getConfirmTokenForRequest(id: string) {
  const [r] = await db.select().from(signingRequests).where(eq(signingRequests.id, id));
  return r.senderConfirmToken;
}
export async function getSignTokensForRequest(id: string) {
  const rows = await db.select().from(signers).where(eq(signers.signingRequestId, id));
  return rows.map((r) => ({ id: r.id, signToken: r.signToken, email: r.email, name: r.name }));
}

// Extract the confirm token from a confirm_url (= ${base}/confirm/<token>) so tests
// can build a relative API path that always hits the test server, regardless of
// the server's configured APP_BASE_URL.
export function confirmTokenFromUrl(confirmUrl: string): string {
  return new URL(confirmUrl).pathname.split("/").filter(Boolean).pop()!;
}
