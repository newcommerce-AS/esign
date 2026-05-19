"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileDrop } from "@/components/ui/file-drop";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { MonoChip } from "@/components/ui/mono-chip";
import { Icon } from "@/components/ui/icons";

interface Signer { name: string; email: string; phone: string; }
type FormState = "idle" | "submitting" | "success" | "rate_limited" | "api_error" | "validation_error" | "sms_not_configured";

interface SuccessData {
  confirm_url: string;
  sender_lookup_token?: string;
  id?: string;
}

export function CreateForm() {
  const [file, setFile] = useState<File | null>(null);
  const [senderEmail, setSenderEmail] = useState("");
  const [signers, setSigners] = useState<Signer[]>([{ name: "", email: "", phone: "" }]);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<SuccessData | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setFormState("validation_error"); setErrorMsg("Velg et dokument"); return; }
    const validSigners = signers.filter((s) => s.email);
    if (validSigners.length === 0) { setFormState("validation_error"); setErrorMsg("Legg til minst én signant"); return; }
    setFormState("submitting"); setErrorMsg(null);
    try {
      const format = file.name.endsWith(".pdf") ? "pdf" : file.name.endsWith(".md") ? "markdown" : "text";
      const buf = await file.arrayBuffer();
      const content_base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      const res = await fetch("/api/v1/signing-requests", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sender_email: senderEmail,
          document: { filename: file.name, format, content_base64 },
          signers: validSigners.map((s) => ({ name: s.name, email: s.email, phone: s.phone || undefined })),
        }),
      });
      if (res.status === 429) { setFormState("rate_limited"); return; }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.error?.code === "SMS_NOT_CONFIGURED") {
          setFormState("sms_not_configured");
          return;
        }
        setErrorMsg(j?.error?.message ?? "Feil");
        setFormState("api_error");
        return;
      }
      setResult(await res.json());
      setFormState("success");
    } catch {
      setErrorMsg("Kunne ikke kontakte tjenesten. Prøv igjen om et øyeblikk.");
      setFormState("api_error");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  function updateSigner(i: number, field: keyof Signer, val: string) {
    const c = [...signers]; c[i] = { ...c[i], [field]: val }; setSigners(c);
  }

  function removeSigner(i: number) {
    setSigners(signers.filter((_, idx) => idx !== i));
  }

  if (formState === "success" && result) {
    return (
      <Card padding={32} style={{ background: "#fff" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 22, background: "var(--success-bg)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--success-line)" }}>
              <Icon name="mail" size={20} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: -0.2 }}>Bekreftelses-lenke sendt</div>
              <div style={{ fontSize: 13.5, color: "var(--fg-muted)" }}>Klikk lenken i e-posten — så går invitasjonene ut til signantene.</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12.5, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.6 }}>Sendt til</span>
            <MonoChip copyable size="lg" full style={{ width: "100%" }}>{senderEmail}</MonoChip>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12.5, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.6 }}>
              confirm_url <span style={{ color: "var(--fg-muted)", textTransform: "none", letterSpacing: 0 }}>— for agent / CLI</span>
            </span>
            <MonoChip copyable size="lg" full style={{ width: "100%" }}>{result.confirm_url}</MonoChip>
          </div>

          {result.sender_lookup_token && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12.5, color: "var(--fg-faint)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.6 }}>
                sender_lookup_token <span style={{ color: "var(--fg-muted)", textTransform: "none", letterSpacing: 0 }}>— spor status</span>
              </span>
              <MonoChip copyable size="lg" full style={{ width: "100%" }}>{result.sender_lookup_token}</MonoChip>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, paddingTop: 8, flexWrap: "wrap" }}>
            {result.id && result.sender_lookup_token && (
              <Button variant="secondary" iconRight="arrow" as="a" href={`/status/${result.sender_lookup_token}?id=${result.id}`}>
                Gå til status­side
              </Button>
            )}
            <Button variant="ghost" icon="refresh" onClick={() => { setFormState("idle"); setResult(null); setFile(null); setSenderEmail(""); setSigners([{ name: "", email: "", phone: "" }]); }}>
              Nytt oppdrag
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {formState === "rate_limited" && (
        <Banner tone="error" title="For mange forsøk" style={{ marginBottom: 22 }}>
          Maks 5 oppdrag per time per IP. Prøv igjen om en stund.
        </Banner>
      )}
      {formState === "sms_not_configured" && (
        <Banner tone="warn" title="SMS-verifisering er ikke aktivt enda" style={{ marginBottom: 22 }}>
          Fjern telefonnummer fra signantene for å fortsette.
        </Banner>
      )}
      {formState === "api_error" && (
        <Banner tone="error" title="Noe gikk galt" style={{ marginBottom: 22 }}>
          {errorMsg ?? "Kunne ikke kontakte tjenesten. Prøv igjen om et øyeblikk."}
        </Banner>
      )}

      <Card padding={32} style={{ background: "#fff" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <Input
            id="sender-email"
            label="Din e-post (avsender)"
            type="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            placeholder="navn@firma.no"
            helper="Vi sender deg en bekreftelses-lenke før signantene får sin invitasjon."
            error={formState === "validation_error" && !senderEmail ? "Skriv inn en gyldig e-postadresse." : undefined}
            prefix={<Icon name="mail" size={14} />}
            required
          />

          {/* File drop */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-soft)" }}>
              Dokument <span style={{ color: "var(--fg-faint)", fontWeight: 400 }}>(PDF, Markdown eller tekst)</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <FileDrop file={file} onPick={setFile} active={dragActive}
                error={formState === "validation_error" && !file ? "Velg et dokument" : undefined} />
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.md,.txt,.text" className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* Signers */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--fg-soft)" }}>Signanter</label>
              <span style={{ fontSize: 12, color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>{signers.length} / 10</span>
            </div>
            {signers.map((s, i) => (
              <div key={i} className="es-signer-row" style={{ border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: 14, background: "var(--bg)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg-faint)", fontFamily: "var(--font-mono)" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 10, background: "var(--bg-mute)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--fg-muted)" }}>{i + 1}</span>
                </span>
                <input placeholder="Navn" value={s.name} onChange={(e) => updateSigner(i, "name", e.target.value)}
                  className="border rounded px-3 py-2 text-sm w-full es-input" style={{ borderColor: "var(--border-strong)", borderRadius: "var(--r-sm)", background: "#fff", color: "var(--fg)", fontFamily: "var(--font-sans)" }} />
                <input data-signer-email placeholder="E-post" type="email" value={s.email} onChange={(e) => updateSigner(i, "email", e.target.value)}
                  className="border rounded px-3 py-2 text-sm w-full es-input" style={{ borderColor: "var(--border-strong)", borderRadius: "var(--r-sm)", background: "#fff", color: "var(--fg)", fontFamily: "var(--font-mono)", fontSize: 13 }} />
                <button type="button" aria-label="Fjern signant" onClick={() => removeSigner(i)}
                  style={{ background: "transparent", border: "none", padding: 6, color: "var(--fg-faint)", cursor: "pointer", borderRadius: 4 }}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
            {signers.length < 10 && (
              <button type="button" onClick={() => setSigners([...signers, { name: "", email: "", phone: "" }])}
                style={{ background: "transparent", border: "1px dashed var(--border-strong)", borderRadius: "var(--r-sm)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", color: "var(--fg-soft)", fontSize: 13.5, fontFamily: "var(--font-sans)", fontWeight: 500 }}>
                <Icon name="plus" size={14} /> legg til signant
              </button>
            )}
          </div>

          <div style={{ padding: "12px 14px", background: "var(--accent-soft)", border: "1px solid var(--accent-line)", borderRadius: "var(--r-sm)", fontSize: 13, lineHeight: 1.5, color: "var(--accent)", display: "flex", gap: 10 }}>
            <Icon name="info" size={16} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>Vi sender ut signerings-invitasjoner først når <strong>du</strong> bekrefter via e-post.</span>
          </div>

          <Button type="submit" variant="primary" size="lg" block loading={formState === "submitting"} iconRight={formState === "submitting" ? undefined : "arrow"}>
            {formState === "submitting" ? "Sender..." : "Send til bekreftelse"}
          </Button>
        </div>
      </Card>
    </form>
  );
}
