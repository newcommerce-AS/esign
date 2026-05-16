import { PDFDocument } from "pdf-lib";
import { buildAuditAppendix, type CertInput } from "./audit-appendix";

export async function finalizeSignedPdf(originalPdf: Buffer, cert: CertInput): Promise<Buffer> {
  const out = await PDFDocument.create();
  const original = await PDFDocument.load(originalPdf);
  const copiedOriginal = await out.copyPages(original, original.getPageIndices());
  for (const p of copiedOriginal) out.addPage(p);
  const appendixBytes = await buildAuditAppendix(cert);
  const appendix = await PDFDocument.load(appendixBytes);
  const copiedApp = await out.copyPages(appendix, appendix.getPageIndices());
  for (const p of copiedApp) out.addPage(p);
  return Buffer.from(await out.save());
}
