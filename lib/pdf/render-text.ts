import PDFDocument from "pdfkit";

export async function renderTextToPdf(text: string, opts: { fixedDate?: Date } = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: opts.fixedDate ? { CreationDate: opts.fixedDate } : undefined });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font("Helvetica").fontSize(11);
    for (const line of text.split(/\r?\n/)) doc.text(line);
    doc.end();
  });
}
