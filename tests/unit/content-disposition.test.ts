import { describe, it, expect } from "vitest";
import { pdfDownloadName, attachmentDisposition } from "../../lib/http/content-disposition";

describe("pdfDownloadName", () => {
  it("forces .pdf for markdown/text uploads", () => {
    expect(pdfDownloadName("avtale.md")).toBe("avtale.pdf");
    expect(pdfDownloadName("kontrakt.txt")).toBe("kontrakt.pdf");
  });
  it("keeps .pdf uploads as .pdf", () => {
    expect(pdfDownloadName("signert.pdf")).toBe("signert.pdf");
  });
  it("appends .pdf when there is no extension", () => {
    expect(pdfDownloadName("avtale")).toBe("avtale.pdf");
  });
  it("only strips the last extension on multi-dot names", () => {
    expect(pdfDownloadName("min.avtale.v2.md")).toBe("min.avtale.v2.pdf");
  });
});

describe("attachmentDisposition", () => {
  it("is an attachment with an ascii filename", () => {
    expect(attachmentDisposition("avtale.pdf")).toContain('attachment; filename="avtale.pdf"');
  });
  it("encodes non-ascii via RFC 5987 filename*", () => {
    const cd = attachmentDisposition("kjøpsavtale_ø.pdf");
    expect(cd).toContain("filename*=UTF-8''");
    expect(cd).toContain(encodeURIComponent("kjøpsavtale_ø.pdf"));
    expect(cd).toMatch(/filename="[\x20-\x7e]+"/);
  });
  it("reflects the forced .pdf name end-to-end via pdfDownloadName", () => {
    expect(attachmentDisposition(pdfDownloadName("kontrakt.txt"))).toContain('filename="kontrakt.pdf"');
  });
});
