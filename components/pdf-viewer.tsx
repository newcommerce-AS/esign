"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Icon, Spinner } from "@/components/ui/icons";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Props {
  url: string;
  filename: string;
  downloadUrl?: string;
}

export function PdfViewer({ url, filename, downloadUrl }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [failed, setFailed] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const docOptions = useMemo(
    () => ({
      cMapUrl: "/pdf-cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "/pdf-fonts/",
    }),
    [],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      style={{
        background: "#525252",
        borderRadius: "var(--r-md)",
        overflow: "hidden",
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      <div
        style={{
          height: 36,
          background: "#404040",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          justifyContent: "space-between",
          color: "#e7e5e4",
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          <Icon name="doc" size={13} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{filename}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {numPages > 0 && (
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {numPages} {numPages === 1 ? "side" : "sider"}
            </span>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              title="Last ned dokument"
              aria-label="Last ned dokument"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#e7e5e4", textDecoration: "none", fontSize: 12 }}
            >
              <Icon name="download" size={14} />
              <span className="hidden md:inline">Last ned</span>
            </a>
          )}
        </span>
      </div>

      <div
        ref={containerRef}
        className="es-pdf-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        {failed ? (
          <div style={{ color: "#fafaf9", textAlign: "center", padding: 24, fontSize: 14, lineHeight: 1.6, maxWidth: "100%" }}>
            <Icon name="alert" size={28} />
            <p style={{ margin: "12px 0 6px" }}>Kunne ikke vise dokumentet.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#fafaf9", textDecoration: "underline" }}
            >
              Åpne dokument i ny fane
            </a>
            {errMsg && (
              <pre style={{ marginTop: 16, fontSize: 11, lineHeight: 1.4, color: "#d6d3d1", whiteSpace: "pre-wrap", wordBreak: "break-word", textAlign: "left", background: "#404040", padding: 10, borderRadius: 4, maxWidth: "100%", overflow: "auto" }}>
                {errMsg}
              </pre>
            )}
          </div>
        ) : (
          <Document
            file={url}
            options={docOptions}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(e) => { console.error("pdf load error", e); setErrMsg(e?.message ?? String(e)); setFailed(true); }}
            onSourceError={(e) => { console.error("pdf source error", e); setErrMsg(e?.message ?? String(e)); setFailed(true); }}
            loading={
              <div style={{ color: "#e7e5e4", display: "flex", alignItems: "center", gap: 10, padding: 40 }}>
                <Spinner color="#e7e5e4" />
                <span style={{ fontSize: 13.5 }}>Henter dokument…</span>
              </div>
            }
            error={
              <div style={{ color: "#fafaf9", textAlign: "center", padding: 32, fontSize: 14 }}>
                Kunne ikke vise dokumentet.{" "}
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#fafaf9", textDecoration: "underline" }}>
                  Åpne i ny fane
                </a>
              </div>
            }
          >
            {width && Array.from({ length: numPages }, (_, i) => (
              <Page
                key={i}
                pageNumber={i + 1}
                width={Math.min(width - 24, 900)}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading=""
              />
            ))}
          </Document>
        )}
      </div>
    </div>
  );
}
