import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db/client";
import { signers, documents, signingRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/http/errors";
import { clientIp } from "@/lib/http/ip";
import { rateLimit } from "@/lib/rate-limit/db";
import { logAudit } from "@/lib/audit/log";

export const runtime = "nodejs";

// bytes er alltid rendret PDF, også for markdown/text-opplasting
function pdfDownloadName(originalFilename: string): string {
  return originalFilename.replace(/\.[^.]+$/, "") + ".pdf";
}

// RFC 5987: ascii-fallback + utf-8-kodet variant for æ/ø/å
function contentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(name);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  const ip = clientIp(req);
  const rl = await rateLimit(`api:ip:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many requests", 429);
  await initDb();

  const [s] = await db.select().from(signers).where(eq(signers.signToken, sign_token));
  if (!s) return apiError("NOT_FOUND", "Invalid sign token", 404);

  const [reqRow] = await db.select().from(signingRequests).where(eq(signingRequests.id, s.signingRequestId));
  if (reqRow.status !== "active") return apiError("INVALID_STATE", `Request is ${reqRow.status}`, 409);

  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, s.signingRequestId));

  const upstream = await fetch(doc.renderedPdfBlobUrl);
  if (!upstream.ok || !upstream.body) return apiError("UPSTREAM_ERROR", "Could not fetch document", 502);

  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "document_downloaded", ip });

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": contentDisposition(pdfDownloadName(doc.originalFilename)),
    },
  });
}
