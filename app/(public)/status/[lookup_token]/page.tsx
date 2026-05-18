"use client";
import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Banner } from "@/components/ui/banner";
import { MonoChip } from "@/components/ui/mono-chip";
import { StatusPill, Pill } from "@/components/ui/pill";
import { Stepper } from "@/components/ui/stepper";
import { Icon } from "@/components/ui/icons";

interface RequestData {
  id: string; status: string; created_at: string; expires_at: string;
  sender_email: string; sender_confirmed_at: string | null;
  completed_at: string | null; cancelled_at: string | null;
  document: { id: string; filename: string; sha256: string } | null;
  signers: { id: string; name: string; email: string; status: string; signed_at: string | null }[];
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("nb-NO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function signerStepState(signerStatus: string, reqStatus: string): "done" | "current" | "pending" {
  if (reqStatus === "completed" || signerStatus === "signed") return "done";
  if (signerStatus === "email_verified" || signerStatus === "sms_verified") return "current";
  return "pending";
}

export default function StatusPage() {
  const params = useParams<{ lookup_token: string }>();
  const searchParams = useSearchParams();
  const lookup_token = params.lookup_token;

  const [id, setId] = useState(searchParams.get("id") ?? "");
  const [data, setData] = useState<RequestData | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function load(reqId: string) {
    if (!reqId.trim()) return;
    setLoading(true); setError(null);
    const r = await fetch(`/api/v1/signing-requests/${reqId}`, { headers: { "x-lookup-token": lookup_token } });
    setLoading(false);
    if (r.ok) { setDeleted(false); setData(await r.json()); }
    else if (r.status === 404) { setDeleted(true); setData(null); }
    else { const j = await r.json(); setError(j.error?.message ?? "Feil"); }
  }

  async function cancel() {
    if (!data) return;
    setCancelling(true);
    const r = await fetch(`/api/v1/signing-requests/${data.id}/cancel`, { method: "POST", headers: { "x-lookup-token": lookup_token } });
    setCancelling(false);
    if (r.ok) load(data.id);
  }

  // Auto-load if id came from query params
  useEffect(() => {
    const qid = searchParams.get("id");
    if (qid) load(qid);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const completed = data?.status === "completed";
  const signedCount = data?.signers.filter((s) => s.status === "signed").length ?? 0;

  return (
    <div style={{ background: "var(--bg-mute)", minHeight: "100vh" }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      {data ? (
        <div style={{ background: "#fff", borderBottom: "1px solid var(--border)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--fg-muted)", fontSize: 13, marginBottom: 14, fontFamily: "var(--font-mono)" }}>
              <a href="/" style={{ color: "inherit", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                <Icon name="chevd" size={12} style={{ transform: "rotate(90deg)" }} /> esign
              </a>
              <span style={{ color: "var(--fg-faint)" }}>/</span>
              <span style={{ color: "var(--fg)" }}>status</span>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--r-sm)", background: "var(--bg-mute)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-soft)", flexShrink: 0 }}>
                <Icon name="doc" size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5, margin: 0 }}>{data.document?.filename ?? "Ukjent fil"}</h1>
                  <Pill tone="outline" size="sm" mono>PDF</Pill>
                  <StatusPill status={data.status} size="md" />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12.5, color: "var(--fg-muted)", fontFamily: "var(--font-mono)" }}>
                  <span>opprettet {fmtDate(data.created_at)}</span>
                  <span>utløper {fmtDate(data.expires_at)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {(data.status === "active" || data.status === "awaiting_sender_confirm") && (
                  <Button variant="destructive" icon="x" loading={cancelling} onClick={cancel}>Avbryt oppdraget</Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "#fff", borderBottom: "1px solid var(--border)", padding: "28px 32px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.5, margin: "0 0 4px" }}>Status</h1>
            <p style={{ fontSize: 14, color: "var(--fg-muted)" }}>Skriv inn signing-request ID for å se status.</p>
          </div>
        </div>
      )}

      {/* ── Banners for terminal states ──────────────────────────── */}
      {deleted && (
        <div style={{ maxWidth: 1100, margin: "24px auto -8px", padding: "0 32px" }}>
          <Banner tone="success" title="Ferdigstilt og slettet.">Dette signeringsoppdraget er ferdig — den signerte PDFen er sendt til alle parter på e-post. Vi har slettet alle data fra våre servere.</Banner>
        </div>
      )}
      {data?.status === "cancelled" && (
        <div style={{ maxWidth: 1100, margin: "24px auto -8px", padding: "0 32px" }}>
          <Banner tone="warn" title="Oppdraget er kansellert.">Oppdraget ble kansellert {fmtDate(data.cancelled_at)}. Lenken kan ikke lenger brukes.</Banner>
        </div>
      )}
      {data?.status === "expired" && (
        <div style={{ maxWidth: 1100, margin: "24px auto -8px", padding: "0 32px" }}>
          <Banner tone="warn" title="Oppdraget er utløpt.">Lenken utløp {fmtDate(data.expires_at)}. Signantene kan ikke lenger signere — opprett et nytt oppdrag.</Banner>
        </div>
      )}

      {/* ── Body ────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 32px 56px" }}>
        {!data && !deleted && (
          <Card padding={28} style={{ background: "#fff", maxWidth: 480 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-soft)" }}>Signing-request ID</label>
                <div className="es-input" style={{ display: "flex", alignItems: "center", height: 40, background: "#fff", border: "1px solid var(--border-strong)", borderRadius: "var(--r-sm)", padding: "0 12px" }}>
                  <input
                    value={id} onChange={(e) => setId(e.target.value)}
                    placeholder="uuid"
                    onKeyDown={(e) => { if (e.key === "Enter") load(id); }}
                    style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg)" }}
                  />
                </div>
              </div>
              <Button variant="primary" loading={loading} onClick={() => load(id)} style={{ alignSelf: "flex-end" }}>Hent</Button>
            </div>
            {error && <Banner tone="error" style={{ marginTop: 14 }}>{error}</Banner>}
          </Card>
        )}

        {data && (
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              {/* Signers stepper */}
              <Card padding={24} style={{ background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>Signanter</h2>
                    <p style={{ fontSize: 13, color: "var(--fg-muted)", margin: 0 }}>
                      {completed ? "Alle har signert." : `${signedCount} av ${data.signers.length} har signert.`}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--fg-muted)" }}>{signedCount}/{data.signers.length}</span>
                    <div style={{ width: 100, height: 4, background: "var(--bg-mute)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${(signedCount / data.signers.length) * 100}%`, height: "100%", background: completed ? "var(--success)" : "var(--accent)", transition: "width .3s" }} />
                    </div>
                  </div>
                </div>
                <Stepper items={data.signers.map((s) => ({
                  state: signerStepState(s.status, data.status),
                  title: (
                    <span style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", gap: 12 }}>
                      <span>
                        <strong style={{ fontWeight: 600 }}>{s.name}</strong>{" "}
                        <span style={{ color: "var(--fg-muted)", fontWeight: 400, fontSize: 13.5 }}>· {s.email}</span>
                      </span>
                      <StatusPill status={completed ? "signed" : s.status} size="sm" />
                    </span>
                  ),
                  meta: s.signed_at ? `signert ${fmtDate(s.signed_at)}` : undefined,
                }))} />
              </Card>

              {/* Audit note — events not exposed by API */}
              <Card padding={0} style={{ background: "#fff" }}>
                <div style={{ padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Audit-spor</h3>
                    <Pill tone="neutral" size="sm" mono>Tilgjengelig i signert PDF</Pill>
                  </span>
                  <Icon name="info" size={14} style={{ color: "var(--fg-muted)" }} />
                </div>
                <div style={{ borderTop: "1px solid var(--border)", padding: "14px 24px 20px", fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.6 }}>
                  Detaljert audit-spor (IP, tidsstempler, SHA-256) er vedlagt som siste side i den signerte PDF-en. Det er tilgjengelig etter fullføring.
                </div>
              </Card>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Card padding={22} style={{ background: "#fff" }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 14px", fontFamily: "var(--font-mono)" }}>Dokument</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13.5 }}>
                  <KVRow label="Filnavn" value={data.document?.filename ?? "—"} mono />
                  <KVRow label="Avsender" value={data.sender_email} />
                  <KVRow label="Opprettet" value={fmtDate(data.created_at) ?? "—"} />
                  <KVRow label="Utløper" value={fmtDate(data.expires_at) ?? "—"} />
                  {data.document?.sha256 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 11.5, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.5 }}>SHA-256</span>
                      <MonoChip size="sm" copyable full style={{ width: "100%" }}>{data.document.sha256}</MonoChip>
                    </div>
                  )}
                </div>
              </Card>

              <Card padding={22} style={{ background: "#fff" }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-faint)", textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 14px", fontFamily: "var(--font-mono)" }}>For agenter</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>sender_lookup_token</div>
                    <MonoChip size="sm" copyable full style={{ width: "100%" }}>{lookup_token}</MonoChip>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>API endpoint</div>
                    <MonoChip size="sm" copyable full style={{ width: "100%" }}>GET /api/v1/signing-requests/{data.id}</MonoChip>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KVRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
      <span style={{ fontSize: 13, color: "var(--fg-muted)" }}>{label}</span>
      <span style={{ fontSize: 13, fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)", color: "var(--fg)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{value}</span>
    </div>
  );
}
