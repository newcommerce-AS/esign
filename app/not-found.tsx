import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/ui/nav";
import { Icon } from "@/components/ui/icons";

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>
      <SiteNav />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ maxWidth: 460, textAlign: "left" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-muted)", marginBottom: 10, letterSpacing: 0.5 }}>
            HTTP <span style={{ color: "var(--accent)" }}>404</span> · NOT_FOUND
          </div>
          <h1 style={{ fontSize: 56, fontWeight: 600, letterSpacing: "-0.04em", margin: "0 0 14px", lineHeight: 1.02 }}>
            Siden finnes <span style={{ color: "var(--fg-faint)" }}>ikke.</span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 26px" }}>
            Lenken er enten skrevet feil eller hører til et oppdrag som ikke lenger eksisterer. Det er sjelden noe galt med tjenesten selv.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", background: "var(--accent)", color: "#fff", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
              Tilbake til forsiden <Icon name="arrow" size={16} />
            </Link>
            <a href="#" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", background: "transparent", color: "var(--fg)", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
              <Icon name="code" size={16} /> API status
            </a>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
