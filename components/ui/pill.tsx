import { Icon } from "./icons";

type PillTone = "neutral" | "ink" | "soft" | "outline";

const TONES: Record<PillTone, { bg: string; fg: string; bd?: string }> = {
  neutral: { bg: "var(--bg-mute)",     fg: "var(--fg-soft)" },
  ink:     { bg: "#0a0a0a",            fg: "#fff" },
  soft:    { bg: "var(--accent-soft)", fg: "var(--accent)" },
  outline: { bg: "transparent",        fg: "var(--fg-muted)", bd: "var(--border-strong)" },
};

export function Pill({ children, tone = "neutral", icon, mono, size = "md", style = {} }: {
  children: React.ReactNode; tone?: PillTone; icon?: string;
  mono?: boolean; size?: "sm" | "md" | "lg"; style?: React.CSSProperties;
}) {
  const t = TONES[tone];
  const fs = { sm: 11, md: 12, lg: 13 }[size];
  const h  = { sm: 20, md: 24, lg: 28 }[size];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: h, padding: "0 9px", background: t.bg, color: t.fg, border: t.bd ? `1px solid ${t.bd}` : "none", borderRadius: 999, fontSize: fs, fontWeight: 500, fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)", ...style }}>
      {icon && <Icon name={icon} size={fs + 2} />}
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  pending:   { bg: "#f5f5f4", fg: "#57534e", dot: "#a8a29e", label: "Venter" },
  awaiting:  { bg: "#fffbeb", fg: "#92400e", dot: "#d97706", label: "Avventer bekreftelse" },
  active:    { bg: "#eef1f6", fg: "#15233f", dot: "#15233f", label: "Aktiv" },
  verified:  { bg: "#f0fdf4", fg: "#15803d", dot: "#16a34a", label: "E-post bekreftet" },
  sms:       { bg: "#f0fdf4", fg: "#15803d", dot: "#16a34a", label: "SMS verifisert" },
  signed:    { bg: "#f0fdf4", fg: "#15803d", dot: "#16a34a", label: "Signert" },
  completed: { bg: "#15233f", fg: "#fff",    dot: "#86efac", label: "Fullført" },
  declined:  { bg: "#fef2f2", fg: "#991b1b", dot: "#dc2626", label: "Avvist" },
  cancelled: { bg: "#f5f5f4", fg: "#57534e", dot: "#78716c", label: "Avbrutt" },
  expired:   { bg: "#f5f5f4", fg: "#57534e", dot: "#78716c", label: "Utløpt" },
  error:     { bg: "#fef2f2", fg: "#991b1b", dot: "#dc2626", label: "Feil" },
};

export function StatusPill({ status, label, size = "md", dot = true }: {
  status: string; label?: string; size?: "sm" | "md" | "lg"; dot?: boolean;
}) {
  const t = STATUS_TONES[status] ?? STATUS_TONES.pending;
  const fs = { sm: 11, md: 12, lg: 13 }[size];
  const h  = { sm: 20, md: 24, lg: 28 }[size];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: h, padding: "0 9px", background: t.bg, color: t.fg, borderRadius: 999, fontSize: fs, fontWeight: 500, letterSpacing: -0.1, whiteSpace: "nowrap" }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 3, background: t.dot, flexShrink: 0 }} />}
      {label ?? t.label}
    </span>
  );
}
