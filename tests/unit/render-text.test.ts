import { describe, it, expect } from "vitest";
import { renderTextToPdf } from "@/lib/pdf/render-text";

describe("renderTextToPdf", () => {
  it("produces a PDF buffer starting with %PDF-", async () => {
    const buf = await renderTextToPdf("Hello\nWorld");
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(200);
  });
  it("is deterministic byte-for-byte when CreationDate is fixed", async () => {
    const a = await renderTextToPdf("x", { fixedDate: new Date("2026-01-01") });
    const b = await renderTextToPdf("x", { fixedDate: new Date("2026-01-01") });
    expect(a.equals(b)).toBe(true);
  });
});
