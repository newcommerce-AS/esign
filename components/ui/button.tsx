"use client";
import { Icon, Spinner } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "destructive_solid" | "link";
type Size = "sm" | "md" | "lg";

const SIZES = {
  sm: { h: 32, px: 12, fs: 13, gap: 6, ic: 14 },
  md: { h: 40, px: 16, fs: 14, gap: 8,  ic: 16 },
  lg: { h: 48, px: 20, fs: 15, gap: 10, ic: 18 },
};

const VARIANTS: Record<Variant, { bg: string; fg: string; bd: string; cls: string }> = {
  primary:          { bg: "var(--accent)",       fg: "#fff",            bd: "transparent",         cls: "es-btn-primary" },
  secondary:        { bg: "#fff",                 fg: "var(--fg)",       bd: "var(--border-strong)", cls: "es-btn-secondary" },
  ghost:            { bg: "transparent",          fg: "var(--fg)",       bd: "transparent",         cls: "es-btn-ghost" },
  destructive:      { bg: "#fff",                 fg: "var(--danger)",   bd: "var(--danger-line)",  cls: "" },
  destructive_solid:{ bg: "var(--danger)",        fg: "#fff",            bd: "transparent",         cls: "" },
  link:             { bg: "transparent",          fg: "var(--fg)",       bd: "transparent",         cls: "" },
};

interface ButtonProps {
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: string;
  iconRight?: string;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  as?: "button" | "a";
  href?: string;
  onClick?: React.MouseEventHandler;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
  className?: string;
  form?: string;
}

export function Button({
  children, variant = "primary", size = "md", icon, iconRight,
  disabled, loading, block, as: Tag = "button", href, onClick,
  type = "button", style = {}, className = "", form,
}: ButtonProps) {
  const s = SIZES[size];
  const v = VARIANTS[variant];
  const isLink = variant === "link";

  return (
    <Tag
      href={href}
      type={Tag === "button" ? type : undefined}
      onClick={onClick}
      disabled={disabled || loading}
      form={form}
      className={`${v.cls} ${className}`}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: s.gap, height: isLink ? "auto" : s.h,
        padding: isLink ? 0 : `0 ${s.px}px`,
        background: v.bg, color: v.fg,
        border: v.bd === "transparent" ? "none" : `1px solid ${v.bd}`,
        borderRadius: isLink ? 0 : "var(--r-sm)",
        fontFamily: "var(--font-sans)", fontSize: s.fs, fontWeight: 500,
        letterSpacing: -0.1,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        textDecoration: isLink ? "underline" : "none",
        textUnderlineOffset: 3,
        width: block ? "100%" : "auto",
        transition: "background .12s, transform .04s, box-shadow .12s",
        userSelect: "none", whiteSpace: "nowrap",
        ...style,
      }}
    >
      {loading && <Spinner size={s.ic} color="currentColor" />}
      {!loading && icon && <Icon name={icon} size={s.ic} />}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={s.ic} />}
    </Tag>
  );
}
