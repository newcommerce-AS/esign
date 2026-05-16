"use client";
import React from "react";

interface InputProps {
  label?: string;
  helper?: string;
  error?: string;
  optional?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  mono?: boolean;
  type?: string;
  size?: "sm" | "md" | "lg";
  value?: string;
  defaultValue?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  autoComplete?: string;
  required?: boolean;
}

export function Input({
  label, helper, error, optional, prefix, suffix, mono,
  type = "text", size = "md",
  value, defaultValue, onChange, placeholder, disabled, id, name, autoComplete, required,
}: InputProps) {
  const h = { sm: 34, md: 40, lg: 44 }[size];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {label && (
        <label htmlFor={id} style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-soft)", display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span>{label}</span>
          {optional && <span style={{ color: "var(--fg-faint)", fontWeight: 400 }}>valgfri</span>}
        </label>
      )}
      <div
        style={{ display: "flex", alignItems: "center", height: h, background: disabled ? "var(--bg-mute)" : "#fff", border: `1px solid ${error ? "var(--danger)" : "var(--border-strong)"}`, borderRadius: "var(--r-sm)", padding: "0 12px", transition: "border-color .12s, box-shadow .12s" }}
        className={`es-input${error ? " err" : ""}`}
        tabIndex={-1}
      >
        {prefix && <span style={{ color: "var(--fg-faint)", marginRight: 8, display: "inline-flex" }}>{prefix}</span>}
        <input
          id={id} name={name} type={type} value={value} defaultValue={defaultValue}
          onChange={onChange} placeholder={placeholder} disabled={disabled}
          autoComplete={autoComplete} required={required}
          style={{ border: "none", outline: "none", background: "transparent", flex: 1, height: "100%", minWidth: 0, fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)", fontSize: mono ? 13.5 : 14, color: "var(--fg)", padding: 0 }}
        />
        {suffix && <span style={{ color: "var(--fg-faint)", marginLeft: 8 }}>{suffix}</span>}
      </div>
      {(helper || error) && (
        <div style={{ fontSize: 12.5, color: error ? "var(--danger)" : "var(--fg-muted)", lineHeight: 1.4 }}>{error || helper}</div>
      )}
    </div>
  );
}
