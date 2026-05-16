import { Icon } from "./icons";

type BannerTone = "info" | "success" | "warn" | "error";

const TONES: Record<BannerTone, { bg: string; fg: string; line: string; ic: string }> = {
  info:    { bg: "var(--accent-soft)", fg: "var(--accent)", line: "var(--accent-line)", ic: "info" },
  success: { bg: "var(--success-bg)",  fg: "var(--success)", line: "var(--success-line)", ic: "check" },
  warn:    { bg: "var(--warn-bg)",     fg: "var(--warn)",    line: "var(--warn-line)",    ic: "alert" },
  error:   { bg: "var(--danger-bg)",   fg: "var(--danger)",  line: "var(--danger-line)",  ic: "alert" },
};

export function Banner({ tone = "info", title, children, icon, style = {} }: {
  tone?: BannerTone; title?: string; children?: React.ReactNode;
  icon?: string; style?: React.CSSProperties;
}) {
  const t = TONES[tone];
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 14px", background: t.bg, border: `1px solid ${t.line}`, borderRadius: "var(--r-sm)", color: t.fg, ...style }}>
      <Icon name={icon ?? t.ic} size={18} style={{ marginTop: 1, flexShrink: 0 }} />
      <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5 }}>
        {title && <div style={{ fontWeight: 600, marginBottom: children ? 2 : 0 }}>{title}</div>}
        {children && <div style={{ color: tone === "info" ? "var(--fg-soft)" : t.fg, opacity: tone === "info" ? 1 : 0.92 }}>{children}</div>}
      </div>
    </div>
  );
}
