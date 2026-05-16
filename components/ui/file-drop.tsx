"use client";
import { Icon } from "./icons";

export function FileDrop({ file, error, onPick, active }: {
  file: File | null; error?: string; onPick?: (f: File | null) => void; active?: boolean;
}) {
  return (
    <div
      className={`es-drop${active ? " active" : ""}`}
      style={{ border: `1.5px dashed ${error ? "var(--danger)" : "var(--border-dark)"}`, borderRadius: "var(--r-md)", background: file ? "#fff" : "transparent", padding: file ? 16 : 24, cursor: "pointer", transition: "border-color .14s, background .14s" }}
    >
      {!file ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
          <Icon name="upload" size={20} style={{ color: "var(--fg-muted)" }} />
          <div style={{ fontSize: 14, color: "var(--fg-soft)" }}>
            <span style={{ fontWeight: 500 }}>Slipp filen her</span>
            <span style={{ color: "var(--fg-muted)" }}> eller klikk for å velge</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>PDF · MD · TXT · maks 10 MB</div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", background: "var(--bg-mute)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-soft)" }}>
            <Icon name="doc" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>{(file.size / 1024).toFixed(0)} KB</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onPick?.(null); }} style={{ background: "transparent", border: "none", padding: 8, cursor: "pointer", color: "var(--fg-muted)", borderRadius: 4 }} title="Fjern">
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
