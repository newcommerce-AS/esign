import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db/client";
import { documents, signingRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/http/errors";
import { clientIp } from "@/lib/http/ip";
import { rateLimit } from "@/lib/rate-limit/db";
import { logAudit } from "@/lib/audit/log";
import { pdfDownloadName, attachmentDisposition } from "@/lib/http/content-disposition";

export const runtime = "nodejs";

// Lets the sender download the document while reviewing it on the confirm page.
// Gated by the sender confirm token; allowed before AND after confirm so a
// re-download works. Streams the rendered PDF with a clean .pdf filename.
export async function GET(req: NextRequest, { params }: { params: Promise<{ confirm_token: string }> }) {
  const { confirm_token } = await params;
  const ip = clientIp(req);
  const rl = await rateLimit(`api:ip:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many requests", 429);
  await initDb();

  const [reqRow] = await db.select().from(signingRequests).where(eq(signingRequests.senderConfirmToken, confirm_token));
  if (!reqRow) return apiError("NOT_FOUND", "Invalid confirm token", 404);
  if (reqRow.status !== "awaiting_sender_confirm" && reqRow.status !== "active") {
    return apiError("INVALID_STATE", `Request is ${reqRow.status}`, 409);
  }

  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, reqRow.id));
  if (!doc) return apiError("NOT_FOUND", "Document not found", 404);

  const upstream = await fetch(doc.renderedPdfBlobUrl);
  if (!upstream.ok || !upstream.body) return apiError("UPSTREAM_ERROR", "Could not fetch document", 502);

  await logAudit({ signingRequestId: reqRow.id, eventType: "document_downloaded", ip });

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": attachmentDisposition(pdfDownloadName(doc.originalFilename)),
    },
  });
}
