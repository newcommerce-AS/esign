import { db, initDb } from "@/lib/db/client";
import { signingRequests, signers, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { matchSenderSigner } from "@/lib/services/match-sender-signer";

// READ-ONLY view of a signing request, keyed by the sender confirm token.
// Backs the GET /confirm/<token> preview page. Never writes — a GET must not
// confirm (that is the whole point of the review-then-confirm change).
export type ConfirmView =
  | {
      kind: "preview";
      signingRequestId: string;
      document: { filename: string; url: string; sha256: string };
      signers: { name: string; email: string }[];
      senderEmail: string;
      expiresAt: string;
    }
  | { kind: "already_confirmed"; signingRequestId: string; senderLookupToken: string; signerSignToken: string | null }
  | { kind: "terminal"; reason: "completed" | "cancelled" | "expired" }
  | { kind: "not_found" };

export async function getConfirmView(token: string): Promise<ConfirmView> {
  await initDb();
  const [req] = await db.select().from(signingRequests).where(eq(signingRequests.senderConfirmToken, token));
  if (!req) return { kind: "not_found" };

  if (req.status === "awaiting_sender_confirm") {
    const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, req.id));
    const sgs = await db.select().from(signers).where(eq(signers.signingRequestId, req.id));
    return {
      kind: "preview",
      signingRequestId: req.id,
      document: { filename: doc.originalFilename, url: doc.renderedPdfBlobUrl, sha256: doc.renderedPdfSha256 },
      signers: sgs.map((s) => ({ name: s.name, email: s.email })),
      senderEmail: req.senderEmail,
      expiresAt: req.expiresAt.toISOString(),
    };
  }

  if (req.status === "active") {
    const sgs = await db.select().from(signers).where(eq(signers.signingRequestId, req.id));
    return {
      kind: "already_confirmed",
      signingRequestId: req.id,
      senderLookupToken: req.senderLookupToken,
      signerSignToken: matchSenderSigner(req.senderEmail, sgs)?.signToken ?? null,
    };
  }

  // completed / cancelled / expired
  const reason = req.status === "completed" || req.status === "cancelled" || req.status === "expired" ? req.status : "expired";
  return { kind: "terminal", reason };
}
