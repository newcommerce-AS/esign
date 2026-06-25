// bytes er alltid rendret PDF, også for markdown/text-opplasting
export function pdfDownloadName(originalFilename: string): string {
  return originalFilename.replace(/\.[^.]+$/, "") + ".pdf";
}

// RFC 5987: ascii-fallback + utf-8-kodet variant for æ/ø/å
export function attachmentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(name);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
