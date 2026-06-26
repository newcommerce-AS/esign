"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MonoChip } from "@/components/ui/mono-chip";
import { Pill } from "@/components/ui/pill";
import { Icon, Spinner } from "@/components/ui/icons";
import { Banner } from "@/components/ui/banner";

const PdfViewer = dynamic(
  () => import("@/components/pdf-viewer").then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div style={{ background: "#525252", borderRadius: "var(--r-md)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%", color: "#e7e5e4", gap: 10 }}>
        <Spinner color="#e7e5e4" /> <span style={{ fontSize: 13.5 }}>Henter dokument…</span>
      </div>
    ),
  },
);

interface Props {
  token: string;
  document: { filename: string; url: string; sha256: string };
  signers: { name: string; email: string }[];
  senderEmail: string;
  expiresAt: string;
}

export function ConfirmView({ token, document, signers, senderEmail, expiresAt }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`/api/v1/confirm/${token}`, { method: "POST" });
      if (r.status === 429) { setSubmitting(false); setError("For mange forsøk. Vent litt og prøv igjen."); return; }
      if (r.status === 409) { setSubmitting(false); setError("Oppdraget kan ikke bekreftes lenger — det er kansellert eller utløpt."); return; }
      if (!r.ok) { setSubmitting(false); setError("Kunne ikke bekrefte. Prøv igjen om et øyeblikk."); return; }
      const j = await r.json();
      // Full navigation so the destination (/sign or /status) mounts fresh.
      setRedirecting(true);
      window.location.assign(j.redirect as string);
    } catch {
      setSubmitting(false);
      setError("Kunne ikke kontakte tjenesten. Prøv igjen om et øyeblikk.");
    }
  }

  if (redirecting) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-mute)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Card padding={32} style={{ maxWidth: 480, background: "#fff" }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success-line)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Icon name="check" size={22} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 8px" }}>Bekreftet</h2>
          <p style={{ fontSize: 14.5, color: "var(--fg-muted)", lineHeight: 1.6, display: "flex", alignItems: "center", gap: 10 }}>
            <Spinner color="currentColor" /> Invitasjonene er sendt. Videresender deg…
          </p>
        </Card>
      </div>
    );
  }

  const expiresDate = new Date(expiresAt).toLocaleDateString("nb-NO", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-mute)", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header */}
      <header className="es-sign-header" style={{ background: "#fff", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "sticky", top: 0, zIndex: 5, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: 1 }}>
          <a href="/" style={{ fontWeight: 600, fontSize: 16, letterSpacing: -0.4, display: "inline-flex", alignItems: "center", gap: 7, color: "var(--fg)", textDecoration: "none", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><rect x="1" y="1" width="18" height="18" rx="4" fill="currentColor"/><path d="M5.5 14c1.8-1.8 2.8-6 4.8-6s2 4 4 4" fill="none" stroke="#fafaf9" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5.5 16h9" fill="none" stroke="#fafaf9" strokeWidth="1.6" strokeLinecap="round"/></svg>
            <span>esign</span>
          </a>
          <span className="es-sign-divider" style={{ width: 1, height: 18, background: "var(--border)" }} />
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
            <Icon name="doc" size={15} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{document.filename}</span>
          </span>
        </div>
        <div className="es-sign-chips" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <Pill tone="outline" icon="clock" size="sm">Utløper {expiresDate}</Pill>
          <span className="es-sign-hash">
            <MonoChip label="SHA-256" size="sm">{document.sha256.slice(0, 16)}…</MonoChip>
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="es-sign-content">
        <div className="es-sign-grid">
          {/* PDF viewer */}
          <div className="es-sign-pdf">
            <PdfViewer url={document.url} filename={document.filename} downloadUrl={`/api/v1/confirm/${token}/document`} />
          </div>

          {/* Confirm panel */}
          <Card padding={28} className="es-sign-panel" style={{ background: "#fff" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 6px" }}>Bekreft oppdraget</h2>
                <p style={{ fontSize: 14, color: "var(--fg-muted)", margin: 0, lineHeight: 1.5 }}>
                  Les gjennom dokumentet til venstre. Når du bekrefter, sendes signerings-invitasjoner ut til signantene.
                </p>
              </div>

              {/* Signer list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 12.5, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Invitasjoner sendes til
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {signers.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "10px 12px", background: "var(--bg)" }}>
                      <span style={{ width: 22, height: 22, borderRadius: 11, background: "var(--bg-mute)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)", flexShrink: 0 }}>
                        <Icon name="user" size={13} />
                      </span>
                      <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                        <span style={{ fontSize: 12.5, color: "var(--fg-muted)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ padding: "12px 14px", background: "var(--accent-soft)", border: "1px solid var(--accent-line)", borderRadius: "var(--r-sm)", fontSize: 13, lineHeight: 1.5, color: "var(--accent)", display: "flex", gap: 10 }}>
                <Icon name="info" size={16} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>Ingenting er sendt ut ennå. Invitasjonene går først når du trykker bekreft.</span>
              </div>

              {error && <Banner tone="error">{error}</Banner>}

              <Button variant="primary" size="lg" block
                iconRight={submitting ? undefined : "arrow"}
                loading={submitting}
                onClick={confirm}
              >
                {submitting ? "Bekrefter…" : "Bekreft og send invitasjoner"}
              </Button>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 11.5, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>Dokument-hash</span>
                <MonoChip size="sm" copyable full style={{ width: "100%" }}>{document.sha256}</MonoChip>
                <span style={{ fontSize: 12, color: "var(--fg-faint)" }}>Avsender: {senderEmail}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
