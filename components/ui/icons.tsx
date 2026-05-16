const stroke = { fill: "none" as const, stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const paths: Record<string, React.ReactNode> = {
  check:    <polyline points="4 9 7.5 12.5 14 5" {...stroke} />,
  x:        <g {...stroke}><path d="M4 4l10 10M14 4L4 14"/></g>,
  arrow:    <g {...stroke}><path d="M3 9h12M11 5l4 4-4 4"/></g>,
  chevd:    <polyline points="4 7 9 12 14 7" {...stroke} />,
  chevu:    <polyline points="4 11 9 6 14 11" {...stroke} />,
  chevr:    <polyline points="6 4 12 9 6 14" {...stroke} />,
  copy:     <g {...stroke}><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H11"/></g>,
  upload:   <g {...stroke}><path d="M9 12V3M5.5 6.5L9 3l3.5 3.5"/><path d="M3 12v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2"/></g>,
  doc:      <g {...stroke}><path d="M5 2h5l3 3v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M10 2v3h3"/></g>,
  mail:     <g {...stroke}><rect x="2.5" y="4" width="13" height="10" rx="1.5"/><path d="M3 5l6 5 6-5"/></g>,
  lock:     <g {...stroke}><rect x="4" y="8" width="10" height="7" rx="1"/><path d="M6 8V6a3 3 0 0 1 6 0v2"/></g>,
  hash:     <g {...stroke}><path d="M6 2l-1.5 14M12 2l-1.5 14M3 6h12M3 12h12"/></g>,
  user:     <g {...stroke}><circle cx="9" cy="6.5" r="2.5"/><path d="M3.5 15c1-2.5 3-3.5 5.5-3.5s4.5 1 5.5 3.5"/></g>,
  phone:    <g {...stroke}><path d="M5 2h2l1.5 4-2 1.5a8 8 0 0 0 4 4l1.5-2L16 11v2c0 1.5-1 2.5-2.5 2.5C8 15.5 2.5 10 2.5 4.5 2.5 3 3.5 2 5 2z"/></g>,
  plus:     <g {...stroke}><path d="M9 3v12M3 9h12"/></g>,
  minus:    <g {...stroke}><path d="M3 9h12"/></g>,
  trash:    <g {...stroke}><path d="M3 5h12M7 5V3.5A1 1 0 0 1 8 2.5h2a1 1 0 0 1 1 1V5M5 5l.7 9a1 1 0 0 0 1 1h4.6a1 1 0 0 0 1-1L13 5"/></g>,
  refresh:  <g {...stroke}><path d="M3 9a6 6 0 0 1 10.5-4M15 9a6 6 0 0 1-10.5 4"/><polyline points="11 5 14 5 14 2"/><polyline points="7 13 4 13 4 16"/></g>,
  download: <g {...stroke}><path d="M9 3v9M5.5 8.5L9 12l3.5-3.5"/><path d="M3 14v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1"/></g>,
  eye:      <g {...stroke}><path d="M1.5 9C3 5.5 6 3.5 9 3.5s6 2 7.5 5.5c-1.5 3.5-4.5 5.5-7.5 5.5S3 12.5 1.5 9z"/><circle cx="9" cy="9" r="2"/></g>,
  info:     <g {...stroke}><circle cx="9" cy="9" r="6.5"/><path d="M9 8v4M9 6h.01"/></g>,
  alert:    <g {...stroke}><path d="M9 2L1.5 15h15z"/><path d="M9 7v4M9 13h.01"/></g>,
  clock:    <g {...stroke}><circle cx="9" cy="9" r="6.5"/><polyline points="9 5 9 9 12 11"/></g>,
  shield:   <g {...stroke}><path d="M9 2l6 2v5c0 4-3 6-6 7-3-1-6-3-6-7V4z"/><polyline points="6.5 9 8.5 11 12 7.5"/></g>,
  code:     <g {...stroke}><polyline points="6 5 2 9 6 13"/><polyline points="12 5 16 9 12 13"/></g>,
  sparkle:  <g {...stroke}><path d="M9 2v3M9 13v3M2 9h3M13 9h3M4 4l2 2M12 12l2 2M14 4l-2 2M4 14l2-2"/></g>,
  menu:     <g {...stroke}><path d="M3 5h12M3 9h12M3 13h12"/></g>,
  external: <g {...stroke}><path d="M11 3h4v4M14.5 3.5L9 9"/><path d="M13 11v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h3"/></g>,
  sig:      <g {...stroke}><path d="M2 13c2-2 3-7 5-7s2 5 4 5 3-3 5-3"/><path d="M2 16h14"/></g>,
};

export function Icon({ name, size = 16, className = "", style = {} }: {
  name: string; size?: number; className?: string; style?: React.CSSProperties;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" className={className}
      style={{ flexShrink: 0, ...style }} aria-hidden="true">
      {paths[name] ?? null}
    </svg>
  );
}

export function Spinner({ size = 14, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18"
      style={{ animation: "es-spin 0.8s linear infinite" }} aria-hidden="true">
      <circle cx="9" cy="9" r="6.5" fill="none" stroke={color} strokeWidth="1.8" strokeOpacity="0.2"/>
      <path d="M9 2.5a6.5 6.5 0 0 1 6.5 6.5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function Logo({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 600, fontSize: size, letterSpacing: -0.4, color }}>
      <svg width={size + 2} height={size + 2} viewBox="0 0 20 20" aria-hidden="true">
        <rect x="1" y="1" width="18" height="18" rx="4" fill={color}/>
        <path d="M5.5 14c1.8-1.8 2.8-6 4.8-6s2 4 4 4" fill="none" stroke="#fafaf9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5.5 16h9" fill="none" stroke="#fafaf9" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
      <span>esign</span>
    </span>
  );
}
