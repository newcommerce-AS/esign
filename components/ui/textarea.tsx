"use client";

interface TextareaProps {
  label?: string;
  helper?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  rows?: number;
  name?: string;
}

export function Textarea({ label, helper, error, value, defaultValue, onChange, placeholder, rows = 4, name }: TextareaProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-soft)" }}>{label}</label>}
      <textarea
        rows={rows} value={value} defaultValue={defaultValue} onChange={onChange}
        placeholder={placeholder} name={name}
        className={`es-input${error ? " err" : ""}`}
        style={{ background: "#fff", border: `1px solid ${error ? "var(--danger)" : "var(--border-strong)"}`, borderRadius: "var(--r-sm)", padding: "10px 12px", fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg)", resize: "vertical", minHeight: 80, transition: "border-color .12s, box-shadow .12s" }}
      />
      {(helper || error) && <div style={{ fontSize: 12.5, color: error ? "var(--danger)" : "var(--fg-muted)" }}>{error || helper}</div>}
    </div>
  );
}
