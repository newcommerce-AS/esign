import { Icon } from "./icons";

type StepState = "done" | "current" | "pending" | "error";

interface StepItem {
  state?: StepState;
  title: React.ReactNode;
  body?: React.ReactNode;
  meta?: React.ReactNode;
  pill?: React.ReactNode;
}

const TONE: Record<StepState, string> = {
  done:    "var(--success)",
  current: "var(--accent)",
  pending: "var(--border-dark)",
  error:   "var(--danger)",
};

export function Stepper({ items, style = {} }: { items: StepItem[]; style?: React.CSSProperties }) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", ...style }}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const state: StepState = it.state ?? "pending";
        const tone = TONE[state];
        return (
          <li key={i} style={{ display: "flex", gap: 14, position: "relative", paddingBottom: last ? 0 : 22 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <span style={{ width: 22, height: 22, borderRadius: 11, border: state === "pending" ? `1.5px solid ${tone}` : "none", background: state === "pending" ? "#fff" : tone, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)", transition: "all .15s" }}>
                {state === "done" ? <Icon name="check" size={13} style={{ strokeWidth: "2.4" }} /> :
                 state === "error" ? <Icon name="x" size={12} style={{ strokeWidth: "2.4" }} /> :
                 <span style={{ color: state === "pending" ? "var(--fg-faint)" : "#fff" }}>{i + 1}</span>}
              </span>
              {!last && <span style={{ flex: 1, width: 1.5, background: state === "done" ? "var(--success)" : "var(--border)", marginTop: 4, marginBottom: 4, minHeight: 10 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: it.body ? 4 : 0 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: state === "pending" ? "var(--fg-muted)" : "var(--fg)" }}>{it.title}</span>
                {it.pill}
              </div>
              {it.body && <div style={{ fontSize: 13, color: "var(--fg-muted)", lineHeight: 1.5 }}>{it.body}</div>}
              {it.meta && <div style={{ fontSize: 12, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", marginTop: 3 }}>{it.meta}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
