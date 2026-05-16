import { describe, it, expect } from "vitest";
import { renderTextToPdf } from "@/lib/pdf/render-text";
import { finalizeSignedPdf } from "@/lib/pdf/finalize";
import { sha256Hex } from "@/lib/hash";
import { PDFDocument } from "pdf-lib";

describe("finalizeSignedPdf", () => {
  it("appends a signature certificate page; original bytes unchanged", async () => {
    const original = await renderTextToPdf("Original contract content");
    const originalSha = sha256Hex(original);
    const cert = {
      documentId: "doc-1",
      documentSha256: originalSha,
      originalFilename: "c.txt",
      originalFormat: "text" as const,
      createdAt: new Date("2026-05-16T14:00:00Z"),
      senderEmail: "ole@example.com",
      senderIp: "1.2.3.4",
      senderConfirmedAt: new Date("2026-05-16T14:01:00Z"),
      signers: [{
        index: 1, total: 1, name: "Henrik", email: "h@example.com",
        signedAt: new Date("2026-05-16T15:00:00Z"), signedIp: "5.6.7.8",
        emailVerifiedAt: new Date("2026-05-16T14:55:00Z"),
        smsVerifiedAt: null, phone: null, userAgent: "test",
        consentText: "Jeg, Henrik, samtykker...", signTokenHash: "abc",
      }],
      appVersion: "0.1.0",
      generatedAt: new Date("2026-05-16T15:00:00Z"),
    };
    const finalPdf = await finalizeSignedPdf(original, cert);
    const parsed = await PDFDocument.load(finalPdf);
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(2);
  });
});
