import { getConfirmView } from "@/lib/services/confirm-view";
import { ConfirmView } from "./confirm-view";
import { Icon } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { SiteNav, SiteFooter } from "@/components/ui/nav";
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

const primaryLink = { display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", background: "var(--color-accent)", color: "#fff", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500, textDecoration: "none" } as const;
const ghostLink = { display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 16px", background: "var(--bg-mute)", color: "var(--fg)", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500, textDecoration: "none", border: "1px solid var(--border-strong)" } as const;

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <SiteNav />
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 20px" }}>
        <Card padding={40} style={{ width: "100%", maxWidth: 520, background: "#fff" }}>{children}</Card>
      </div>
      <SiteFooter />
    </div>
  );
}

export default async function ConfirmPage({ params }: { params: Promise<{ confirm_token: string }> }) {
  const { confirm_token } = await params;
  const view = await getConfirmView(confirm_token);

  if (view.kind === "preview") {
    return (
      <ConfirmView
        token={confirm_token}
        document={view.document}
        signers={view.signers}
        senderEmail={view.senderEmail}
        expiresAt={view.expiresAt}
      />
    );
  }

  if (view.kind === "already_confirmed") {
    const dest = view.signerSignToken
      ? { href: `/sign/${view.signerSignToken}`, label: "Gå til signering" }
      : { href: `/status/${view.senderLookupToken}?id=${view.signingRequestId}`, label: "Se status for oppdraget" };
    return (
      <CardShell>
        <ConfirmIcon tone="neutral" />
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, margin: "0 0 10px" }}>Allerede bekreftet</h1>
        <p style={{ fontSize: 15, color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 28px" }}>
          Dette oppdraget er allerede aktivt — invitasjonene er sendt og signantene kan signere.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={dest.href} className="es-btn-primary" style={primaryLink}>
            {dest.label} <Icon name="arrow" size={16} />
          </Link>
          <Link href="/" style={ghostLink}>Til forsiden</Link>
        </div>
      </CardShell>
    );
  }

  if (view.kind === "terminal") {
    const copy = {
      completed: { tone: "success" as const, title: "Oppdraget er fullført", body: "Alle har signert. Den endelige PDFen er sendt på e-post til alle parter, og alle data er slettet fra serverne våre." },
      cancelled: { tone: "neutral" as const, title: "Oppdraget er kansellert", body: "Dette oppdraget er kansellert. Opprett et nytt oppdrag hvis du fortsatt vil få dokumentet signert." },
      expired:   { tone: "neutral" as const, title: "Oppdraget er utløpt", body: "Bekreftelses-fristen er passert. Opprett et nytt oppdrag hvis du fortsatt vil få dokumentet signert." },
    }[view.reason];
    return (
      <CardShell>
        <ConfirmIcon tone={copy.tone} />
        <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, margin: "0 0 10px" }}>{copy.title}</h1>
        <p style={{ fontSize: 15, color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 28px" }}>{copy.body}</p>
        <Link href="/" style={ghostLink}>Tilbake til forsiden <Icon name="arrow" size={16} /></Link>
      </CardShell>
    );
  }

  // not_found
  return (
    <CardShell>
      <ConfirmIcon tone="error" />
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, margin: "0 0 10px" }}>Ugyldig eller utløpt bekreftelses-lenke</h1>
      <p style={{ fontSize: 15, color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 28px" }}>
        Lenken kan ha utløpt, vært brukt allerede eller blitt kopiert ufullstendig fra e-posten.
      </p>
      <Link href="/" style={{ ...primaryLink, background: "var(--accent)" }}>
        Opprett nytt oppdrag <Icon name="arrow" size={16} />
      </Link>
    </CardShell>
  );
}
