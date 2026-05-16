export function Card({ children, padding = 24, style = {}, as: Tag = "div", ...rest }: {
  children: React.ReactNode; padding?: number | string; style?: React.CSSProperties;
  as?: "div" | "section" | "article"; [key: string]: unknown;
}) {
  return (
    <Tag style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", padding, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
