import PDFDocument from "pdfkit";
import { marked, type Token, type Tokens } from "marked";

export async function renderMarkdownToPdf(md: string, opts: { fixedDate?: Date } = {}): Promise<Buffer> {
  const tokens = marked.lexer(md) as Token[];
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: opts.fixedDate ? { CreationDate: opts.fixedDate } : undefined });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    renderBlocks(doc, tokens);
    doc.end();
  });
}

type InlineCtx = { bold: boolean; italic: boolean; size: number };

function fontFor(ctx: InlineCtx, mono = false): string {
  if (mono) return "Courier";
  if (ctx.bold && ctx.italic) return "Helvetica-BoldOblique";
  if (ctx.bold) return "Helvetica-Bold";
  if (ctx.italic) return "Helvetica-Oblique";
  return "Helvetica";
}

function renderInline(doc: PDFKit.PDFDocument, tokens: Token[] | undefined, ctx: InlineCtx, parentContinued: boolean) {
  if (!tokens || tokens.length === 0) return;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const isLast = i === tokens.length - 1;
    const continued = !isLast || parentContinued;
    if (t.type === "strong") {
      renderInline(doc, (t as Tokens.Strong).tokens, { ...ctx, bold: true }, continued);
    } else if (t.type === "em") {
      renderInline(doc, (t as Tokens.Em).tokens, { ...ctx, italic: true }, continued);
    } else if (t.type === "del") {
      doc.font(fontFor(ctx)).fontSize(ctx.size).text((t as Tokens.Del).text, { continued, strike: true });
    } else if (t.type === "codespan") {
      doc.font(fontFor(ctx, true)).fontSize(ctx.size - 1).text((t as Tokens.Codespan).text, { continued });
    } else if (t.type === "link") {
      const link = t as Tokens.Link;
      doc.fillColor("#1d4ed8").font(fontFor(ctx)).fontSize(ctx.size).text(link.text, { continued, underline: true, link: link.href, oblique: false });
      doc.fillColor("#0a0a0a");
    } else if (t.type === "br") {
      doc.text(" ", { continued: false });
    } else if (t.type === "text") {
      const tt = t as Tokens.Text;
      if (tt.tokens && tt.tokens.length > 0) {
        renderInline(doc, tt.tokens, ctx, continued);
      } else {
        doc.font(fontFor(ctx)).fontSize(ctx.size).text(tt.text, { continued });
      }
    } else if ("text" in t && typeof (t as { text?: unknown }).text === "string") {
      doc.font(fontFor(ctx)).fontSize(ctx.size).text((t as { text: string }).text, { continued });
    }
  }
}

function renderBlocks(doc: PDFKit.PDFDocument, tokens: Token[]) {
  for (const t of tokens) {
    if (t.type === "heading") {
      const h = t as Tokens.Heading;
      const sizes = [22, 18, 15, 13, 12, 11];
      const size = sizes[Math.min(h.depth - 1, 5)];
      renderInline(doc, h.tokens, { bold: true, italic: false, size }, false);
      doc.moveDown(0.5);
    } else if (t.type === "paragraph") {
      const p = t as Tokens.Paragraph;
      renderInline(doc, p.tokens, { bold: false, italic: false, size: 11 }, false);
      doc.moveDown(0.5);
    } else if (t.type === "list") {
      const list = t as Tokens.List;
      const start = typeof list.start === "number" ? list.start : 1;
      for (let idx = 0; idx < list.items.length; idx++) {
        const item = list.items[idx];
        doc.font("Helvetica").fontSize(11).text(list.ordered ? `${start + idx}. ` : "• ", { continued: true });
        // Item bodies are block-level tokens; render their inline content
        if (item.tokens && item.tokens.length > 0) {
          renderItemBlocks(doc, item.tokens);
        } else {
          doc.text(item.text, { continued: false });
        }
      }
      doc.moveDown(0.5);
    } else if (t.type === "code") {
      const c = t as Tokens.Code;
      doc.font("Courier").fontSize(10).text(c.text).moveDown(0.5);
    } else if (t.type === "blockquote") {
      const bq = t as Tokens.Blockquote;
      // Render nested block tokens in italic
      if (bq.tokens && bq.tokens.length > 0) {
        renderBlocks(doc, bq.tokens);
      } else {
        doc.font("Helvetica-Oblique").fontSize(11).text(bq.text).moveDown(0.5);
      }
    } else if (t.type === "hr") {
      doc.moveDown(0.3);
      const y = doc.y;
      doc.moveTo(50, y).lineTo(545, y).stroke();
      doc.moveDown(0.5);
    } else if (t.type === "space") {
      doc.moveDown(0.3);
    } else if ("text" in t && typeof (t as { text?: unknown }).text === "string") {
      doc.font("Helvetica").fontSize(11).text((t as { text: string }).text).moveDown(0.3);
    }
  }
}

function renderItemBlocks(doc: PDFKit.PDFDocument, blocks: Token[]) {
  // Within a list item, render the first text block as inline (continued from bullet), the rest as own blocks
  let first = true;
  for (const b of blocks) {
    if (b.type === "text") {
      const tb = b as Tokens.Text;
      renderInline(doc, tb.tokens ?? [{ type: "text", raw: tb.text, text: tb.text } as Tokens.Text], { bold: false, italic: false, size: 11 }, false);
      first = false;
    } else if (b.type === "paragraph") {
      if (!first) doc.moveDown(0.2);
      renderInline(doc, (b as Tokens.Paragraph).tokens, { bold: false, italic: false, size: 11 }, false);
      first = false;
    } else {
      // Fall through for unusual nested blocks
      renderBlocks(doc, [b]);
      first = false;
    }
  }
}
