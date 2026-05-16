"use client";
import { useState } from "react";
import { Icon } from "./icons";

export function MonoChip({ children, label, copyable, full, size = "md", style = {} }: {
  children: React.ReactNode; label?: string; copyable?: boolean;
  full?: boolean; size?: "sm" | "md" | "lg"; style?: React.CSSProperties;
}) {
  const [copied, setCopied] = useState(false);
  const fs = { sm: 11.5, md: 12.5, lg: 13 }[size];
  const h  = { sm: 22, md: 26, lg: 30 }[size];

  function doCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(String(children)).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: h, padding: copyable ? "0 4px 0 8px" : "0 8px", background: "var(--bg-mute)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", fontFamily: "var(--font-mono)", fontSize: fs, color: "var(--fg-soft)", letterSpacing: -0.1, maxWidth: full ? "100%" : undefined, ...style }}>
      {label && <span style={{ fontSize: fs - 1, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginRight: 2 }}>{label}</span>}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: full ? 1 : undefined }}>{children}</span>
      {copyable && (
        <button onClick={doCopy} title="Kopier" style={{ border: "none", background: "transparent", cursor: "pointer", padding: "4px 6px", borderRadius: 4, color: "var(--fg-muted)", display: "inline-flex" }}>
          {copied ? <Icon name="check" size={13} style={{ color: "var(--success)" }}/> : <Icon name="copy" size={13} />}
        </button>
      )}
    </span>
  );
}
