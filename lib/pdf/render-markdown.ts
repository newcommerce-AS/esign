import PDFDocument from "pdfkit";
import { marked, type Token } from "marked";

export async function renderMarkdownToPdf(md: string, opts: { fixedDate?: Date } = {}): Promise<Buffer> {
  const tokens = marked.lexer(md) as Token[];
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: opts.fixedDate ? { CreationDate: opts.fixedDate } : undefined });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    renderTokens(doc, tokens);
    doc.end();
  });
}

function renderTokens(doc: PDFKit.PDFDocument, tokens: Token[]) {
  for (const t of tokens) {
    if (t.type === "heading") {
      const sizes = [22, 18, 15, 13, 12, 11];
      doc.font("Helvetica-Bold").fontSize(sizes[Math.min(t.depth - 1, 5)]).text(t.text).moveDown(0.5);
    } else if (t.type === "paragraph") {
      doc.font("Helvetica").fontSize(11).text(t.text).moveDown(0.5);
    } else if (t.type === "list") {
      doc.font("Helvetica").fontSize(11);
      for (const item of t.items) doc.text(`• ${item.text}`);
      doc.moveDown(0.5);
    } else if (t.type === "code") {
      doc.font("Courier").fontSize(10).text(t.text).moveDown(0.5);
    } else if (t.type === "blockquote") {
      doc.font("Helvetica-Oblique").fontSize(11).text(t.text).moveDown(0.5);
    } else if (t.type === "hr") {
      doc.moveDown(0.3); const y = doc.y; doc.moveTo(50, y).lineTo(545, y).stroke(); doc.moveDown(0.5);
    } else if (t.type === "space") {
      doc.moveDown(0.3);
    } else if ("text" in t && typeof t.text === "string") {
      doc.font("Helvetica").fontSize(11).text(t.text).moveDown(0.3);
    }
  }
}
