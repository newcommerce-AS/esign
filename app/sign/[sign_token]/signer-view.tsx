"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MonoChip } from "@/components/ui/mono-chip";
import { Pill } from "@/components/ui/pill";
import { Icon, Spinner } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
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

interface Loaded {
  signing_request_id: string;
  document: { id: string; filename: string; url: string; sha256: string };
  signer: { id: string; name: string; email: string; status: string; sms_required: boolean; sms_verified: boolean };
  sender: { email: string; name: string | null };
  expires_at: string;
}

export function SignerView({ signToken }: { signToken: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [smsVerified, setSmsVerified] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"signed" | "declined" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    fetch(`/api/v1/sign/${signToken}`)
      .then(async (r) => {
        const j = await r.json();
        if (r.status === 404) setLoadError("__deleted__");
        else if (j.error) setLoadError(j.error.message);
        else { setData(j); setName(j.signer.name); if (j.signer.sms_verified) setSmsVerified(true); }
      });
  }, [signToken]);

  const smsRequired = data?.signer.sms_required ?? false;
  const smsGateOpen = smsRequired && !smsVerified;
  const canSign = !smsGateOpen && consent && name.trim().length > 0;

  async function sendSms() {
    await fetch(`/api/v1/sign/${signToken}/sms/send`, { method: "POST" });
    setSmsSent(true);
  }

  async function verifySms() {
    const r = await fetch(`/api/v1/sign/${signToken}/sms/verify`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: smsCode }),
    });
    if (r.ok) { setSmsVerified(true); setSmsError(null); }
    else { const j = await r.json(); setSmsError(j.error?.message ?? "Ugyldig kode"); }
  }

  async function sign() {
    setSubmitting(true); setFormError(null);
    const r = await fetch(`/api/v1/sign/${signToken}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, consent: true }),
    });
    setSubmitting(false);
    if (r.ok) setDone("signed");
    else { const j = await r.json(); setFormError(j.error?.message ?? "Feil"); }
  }

  async function decline() {
    const r = await fetch(`/api/v1/sign/${signToken}/decline`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: declineReason }),
    });
    if (r.ok) setDone("declined");
    setShowDeclineModal(false);
  }

  // ── Loading state ───────────────────────────────────────────────────────
  if (!data && !loadError) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-mute)", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: "28px 32px" }}>
          <Card padding={28} style={{ maxWidth: 480, margin: "0 auto", background: "#fff" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ height: 22, width: "60%", background: "var(--bg-mute)", borderRadius: 4 }} />
              <div style={{ height: 14, width: "90%", background: "var(--bg-mute)", borderRadius: 4 }} />
              <div style={{ height: 48, background: "var(--accent-soft)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "var(--accent)" }}>
                <Spinner color="currentColor" /> <span style={{ fontSize: 13.5 }}>Henter dokument…</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (loadError === "__deleted__") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-mute)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Card padding={32} style={{ maxWidth: 480, background: "#fff" }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: "var(--bg-mute)", color: "var(--fg-soft)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Icon name="info" size={22} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 8px" }}>Denne lenken er ikke lenger gyldig.</h2>
          <p style={{ fontSize: 14.5, color: "var(--fg-muted)", lineHeight: 1.6 }}>Oppdraget er enten ferdigstilt, avvist eller utløpt. Hvis du har signert, ligger den endelige PDFen i innboksen din.</p>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-mute)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Card padding={32} style={{ maxWidth: 480, background: "#fff" }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-line)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Icon name="alert" size={22} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 8px" }}>Feil</h2>
          <p style={{ fontSize: 14.5, color: "var(--fg-muted)", lineHeight: 1.6 }}>{loadError}</p>
        </Card>
      </div>
    );
  }

  // ── Signed state ────────────────────────────────────────────────────────
  if (done === "signed") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-mute)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Card padding={32} style={{ maxWidth: 480, background: "#fff" }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: "var(--success-bg)", color: "var(--success)", border: "1px solid var(--success-line)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Icon name="check" size={22} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 8px" }}>Takk! Dokumentet er signert.</h2>
          <p style={{ fontSize: 14.5, color: "var(--fg-muted)", lineHeight: 1.6 }}>
            Du får signert PDF på e-post når alle har signert. Vi sletter alle data fra våre servere umiddelbart etter fullføring.
          </p>
        </Card>
      </div>
    );
  }

  // ── Declined state ──────────────────────────────────────────────────────
  if (done === "declined") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-mute)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Card padding={32} style={{ maxWidth: 480, background: "#fff" }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: "var(--bg-mute)", color: "var(--fg-soft)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Icon name="x" size={22} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 8px" }}>Du har avvist å signere.</h2>
          <p style={{ fontSize: 14.5, color: "var(--fg-muted)", lineHeight: 1.6 }}>Avsender og øvrige signanter er varslet. Oppdraget er kansellert.</p>
        </Card>
      </div>
    );
  }

  const expiresDate = data ? new Date(data.expires_at).toLocaleDateString("nb-NO", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";

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
            <span style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data?.document.filename}</span>
            {/* E2E test selector: must contain "har sendt deg" */}
            <span className="hidden md:inline" style={{ fontSize: 13, color: "var(--fg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              fra {data?.sender.email} har sendt deg dette dokumentet
            </span>
          </span>
        </div>
        <div className="es-sign-chips" style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <Pill tone="outline" icon="clock" size="sm">Utløper {expiresDate}</Pill>
          <span className="es-sign-hash">
            {data && <MonoChip label="SHA-256" size="sm">{data.document.sha256.slice(0, 16)}…</MonoChip>}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="es-sign-content">
        <div className="es-sign-grid">
          {/* PDF viewer */}
          {data && (
            <div className="es-sign-pdf">
              <PdfViewer url={data.document.url} filename={data.document.filename} downloadUrl={`/api/v1/sign/${signToken}/document`} />
            </div>
          )}

          {/* Sign panel */}
          <Card padding={28} className="es-sign-panel" style={{ background: "#fff" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 6px" }}>Signer dokumentet</h2>
                <p style={{ fontSize: 14, color: "var(--fg-muted)", margin: 0, lineHeight: 1.5 }}>
                  Les gjennom dokumentet til venstre, skriv navnet ditt og bekreft samtykket.
                </p>
              </div>

              {/* SMS gate */}
              {smsRequired && (
                <div style={{ border: smsVerified ? "1px solid var(--success-line)" : "1px solid var(--accent-line)", background: smsVerified ? "var(--success-bg)" : "var(--accent-soft)", borderRadius: "var(--r-sm)", padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: smsVerified ? 0 : 10 }}>
                    <Icon name="phone" size={15} style={{ color: smsVerified ? "var(--success)" : "var(--accent)" }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: smsVerified ? "var(--success)" : "var(--accent)" }}>
                      {smsVerified ? "SMS verifisert" : "SMS-verifisering kreves"}
                    </span>
                    {smsVerified && <Icon name="check" size={15} style={{ color: "var(--success)", strokeWidth: "2.2" }} />}
                  </div>
                  {!smsVerified && (
                    <>
                      <div style={{ fontSize: 13, color: "var(--fg-soft)", lineHeight: 1.5, marginBottom: 14 }}>
                        {smsSent ? "Kode sendt til telefonen din." : "Vi sender en 6-sifret kode til telefonen din."}
                      </div>
                      {!smsSent ? (
                        <Button variant="primary" size="md" icon="phone" onClick={sendSms}>Send SMS-kode</Button>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <input
                            value={smsCode} onChange={(e) => setSmsCode(e.target.value)}
                            placeholder="6-sifret kode"
                            className="es-input"
                            style={{ border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "0 12px", height: 40, fontFamily: "var(--font-mono)", fontSize: 18, letterSpacing: 4, background: "#fff", color: "var(--fg)", width: "100%" }}
                          />
                          {smsError && <p style={{ fontSize: 12.5, color: "var(--danger)", margin: 0 }}>{smsError}</p>}
                          <div style={{ display: "flex", gap: 10 }}>
                            <Button variant="primary" onClick={verifySms}>Verifiser</Button>
                            <Button variant="ghost" size="md" onClick={sendSms}>Send på nytt</Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Sign fields */}
              <div style={{ opacity: smsGateOpen ? 0.45 : 1, pointerEvents: smsGateOpen ? "none" : "auto", display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-soft)" }}>Skriv ditt fulle navn</label>
                  <div className="es-input" style={{ display: "flex", alignItems: "center", height: 40, background: "#fff", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "0 12px" }}>
                    <Icon name="user" size={14} style={{ color: "var(--fg-faint)", marginRight: 8 }} />
                    <input value={name} onChange={(e) => setName(e.target.value)}
                      style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--fg)" }} />
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--fg-muted)" }}>Forhåndsutfylt fra oppdraget — du kan endre.</p>
                </div>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <span style={{ flexShrink: 0, width: 18, height: 18, marginTop: 1, borderRadius: 4, border: `1.5px solid ${consent ? "var(--accent)" : "var(--border-dark)"}`, background: consent ? "var(--accent)" : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", transition: "all .12s" }}>
                    {consent && <Icon name="check" size={14} style={{ color: "#fff", strokeWidth: "2.2" }} />}
                  </span>
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
                  <span style={{ fontSize: 14, color: "var(--fg)", lineHeight: 1.45 }}>
                    Jeg, <strong style={{ fontWeight: 600 }}>{name || "[navn]"}</strong>, samtykker til innholdet i dette dokumentet og signerer det elektronisk.
                  </span>
                </label>

                {formError && <Banner tone="error">{formError}</Banner>}

                <Button variant="primary" size="lg" block
                  iconRight={submitting ? undefined : "sig"}
                  loading={submitting}
                  disabled={!canSign}
                  onClick={sign}
                >
                  {submitting ? "Signerer..." : "Signer"}
                </Button>

                <button
                  style={{ background: "transparent", border: "none", color: "var(--fg-muted)", fontSize: 13, padding: "4px 0", cursor: "pointer", textAlign: "center", textDecoration: "underline", textUnderlineOffset: 3 }}
                  onClick={() => setShowDeclineModal(true)}
                >
                  Avvis å signere
                </button>
              </div>

              {/* Hash */}
              {data && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>Dokument-hash</span>
                  <MonoChip size="sm" copyable full style={{ width: "100%" }}>{data.document.sha256}</MonoChip>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Decline modal */}
      {showDeclineModal && (
        <Modal
          title="Avvis å signere"
          onClose={() => setShowDeclineModal(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowDeclineModal(false)}>Avbryt</Button>
              <Button variant="destructive_solid" onClick={decline}>Avvis</Button>
            </>
          }
          width={480}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 14, color: "var(--fg-muted)", margin: 0, lineHeight: 1.55 }}>
              Avsender vil få en e-post med begrunnelsen din. Du kan ikke angre denne handlingen.
            </p>
            <Textarea
              label="Begrunnelse for å avvise"
              placeholder="Skriv en kort forklaring…"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={4}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
