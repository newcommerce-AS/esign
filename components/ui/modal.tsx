"use client";
import { Icon } from "./icons";
import { Card } from "./card";

export function Modal({ title, children, footer, onClose, width = 440 }: {
  title: string; children: React.ReactNode; footer?: React.ReactNode;
  onClose?: () => void; width?: number;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <Card padding={0} style={{ width, boxShadow: "var(--shadow-3)", animation: "es-fade .18s ease-out" }}>
        <div style={{ padding: "20px 24px 4px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: -0.3 }}>{title}</h3>
          {onClose && (
            <button onClick={onClose} style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: "var(--fg-muted)", borderRadius: 4 }}>
              <Icon name="x" size={16}/>
            </button>
          )}
        </div>
        <div style={{ padding: "12px 24px 20px" }}>{children}</div>
        {footer && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border)", background: "var(--bg)", borderBottomLeftRadius: "var(--r-md)", borderBottomRightRadius: "var(--r-md)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {footer}
          </div>
        )}
      </Card>
    </div>
  );
}
