import { describe, it, expect } from "vitest";
import { renderMarkdownToPdf } from "@/lib/pdf/render-markdown";

describe("renderMarkdownToPdf", () => {
  it("produces a PDF buffer", async () => {
    const md = "# Title\n\nParagraph **bold** and *italic*.\n\n- item 1\n- item 2";
    const buf = await renderMarkdownToPdf(md);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
