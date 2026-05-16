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
