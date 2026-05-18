import { confirmSender } from "@/lib/services/confirm-sender";
import { Icon } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { SiteNav, SiteFooter } from "@/components/ui/nav";
import { baseUrl } from "@/lib/http/base-url";
import Link from "next/link";

export const runtime = "nodejs";

function ConfirmIcon({ tone }: { tone: "success" | "neutral" | "error" }) {
  const cfg = {
    success: { bg: "var(--success-bg)", fg: "var(--success)", line: "var(--success-line)", icon: "check" },
    neutral: { bg: "var(--bg-mute)",    fg: "var(--fg-soft)", line: "var(--border)",        icon: "info" },
    error:   { bg: "var(--danger-bg)",  fg: "var(--danger)",  line: "var(--danger-line)",   icon: "alert" },
  }[tone];
  return (
    <div style={{ width: 48, height: 48, borderRadius: 24, background: cfg.bg, color: cfg.fg, border: `1px solid ${cfg.line}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
      <Icon name={cfg.icon} size={22} />
    </div>
  );
}

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ confirm_token: string }>;
}) {
  const { confirm_token } = await params;
  const result = await confirmSender(confirm_token, baseUrl());

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <SiteNav />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 20px" }}>
        <Card padding={40} style={{ width: "100%", maxWidth: 520, background: "#fff" }}>
          {result.ok ? (
            <>
              <ConfirmIcon tone="success" />
              <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, margin: "0 0 10px" }}>Bekreftet</h1>
              <p style={{ fontSize: 15, color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 28px" }}>
                Signantene har nå mottatt invitasjonen sin på e-post. Vi gir deg beskjed når alle har signert.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href={`/status/${result.senderLookupToken}?id=${result.signingRequestId}`} className="es-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", background: "var(--color-accent)", color: "#fff", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
                  Se status for oppdraget <Icon name="arrow" size={16} />
                </Link>
                <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", background: "var(--bg-mute)", color: "var(--fg)", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500, textDecoration: "none", border: "1px solid var(--border-strong)" }}>
                  Til forsiden
                </Link>
              </div>
            </>
          ) : result.reason === "already_confirmed" ? (
            <>
              <ConfirmIcon tone="neutral" />
              <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, margin: "0 0 10px" }}>Allerede bekreftet</h1>
              <p style={{ fontSize: 15, color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 28px" }}>
                Dette oppdraget er allerede aktivt — invitasjonene er sendt og signantene kan signere.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link href={`/status/${result.senderLookupToken}?id=${result.signingRequestId}`} className="es-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", background: "var(--color-accent)", color: "#fff", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
                  Se status for oppdraget <Icon name="arrow" size={16} />
                </Link>
                <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", background: "var(--bg-mute)", color: "var(--fg)", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500, textDecoration: "none", border: "1px solid var(--border-strong)" }}>
                  Til forsiden
                </Link>
              </div>
            </>
          ) : result.reason === "not_found" ? (
            <>
              <ConfirmIcon tone="error" />
              <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, margin: "0 0 10px" }}>Ugyldig eller utløpt bekreftelses-lenke</h1>
              <p style={{ fontSize: 15, color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 28px" }}>
                Lenken kan ha utløpt (gyldig i 24 timer), vært brukt allerede eller blitt kopiert ufullstendig fra e-posten.
              </p>
              <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", background: "var(--accent)", color: "#fff", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500, textDecoration: "none" }}>
                Opprett nytt oppdrag <Icon name="arrow" size={16} />
              </Link>
            </>
          ) : (
            <>
              <ConfirmIcon tone="error" />
              <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, margin: "0 0 10px" }}>Kan ikke bekrefte i nåværende tilstand</h1>
              <p style={{ fontSize: 15, color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 28px" }}>
                Oppdraget er allerede kansellert eller utløpt. Opprett et nytt oppdrag hvis du fortsatt vil få dokumentet signert.
              </p>
              <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", background: "var(--bg-mute)", color: "var(--fg)", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500, textDecoration: "none", border: "1px solid var(--border-strong)" }}>
                Tilbake til forsiden <Icon name="arrow" size={16} />
              </Link>
            </>
          )}
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}
