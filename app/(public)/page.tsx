import Script from "next/script";
import { CreateForm } from "./create-form";
import { FAQSection } from "./faq-section";
import { Icon } from "@/components/ui/icons";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { FAQ_JSONLD } from "@/lib/faq";

const TRUST_BULLETS = [
  "Standard elektronisk signatur (eIDAS)",
  "SHA-256-hash av dokumentet",
  "90-dagers oppbevaring",
];

const HOW_STEPS = [
  {
    n: "01",
    t: "Last opp dokumentet og legg til signanter",
    b: "PDF, Markdown eller tekst. En eller flere signanter — vi støtter også SMS-verifisering for ekstra trygghet.",
  },
  {
    n: "02",
    t: "Bekreft via e-post (anti-misbruk-sjekk)",
    b: "Vi sender deg en bekreftelses-lenke. Signantene får ingen e-post før du har klikket denne.",
  },
  {
    n: "03",
    t: "Signanter signerer, signert PDF sendes til alle",
    b: "Audit-spor med IP, tidsstempel og dokument-hash legges ved som siste side i den signerte PDF-en.",
  },
];

function SectionLabel({ n, label }: { n: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 font-mono text-xs text-fg-muted mb-4 uppercase tracking-wider">
      <span className="w-6 text-right">{n}</span>
      <span className="w-6 h-px bg-fg-muted" />
      <span>{label}</span>
    </div>
  );
}

function AuditLine({ t, l, v, last }: { t: string; l: string; v: string; last?: boolean }) {
  return (
    <div className="grid gap-3.5 font-mono text-xs leading-relaxed" style={{ gridTemplateColumns: "180px 1fr", paddingBottom: last ? 0 : 2 }}>
      <span className="text-fg-faint">{t}</span>
      <span>
        <span className="text-accent">{l}</span>
        {" "}
        <span className="text-fg-faint">{v}</span>
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Script id="faq-jsonld" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(FAQ_JSONLD)}
      </Script>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="px-5 md:px-12 pt-16 md:pt-20 pb-14 md:pb-18 border-b border-border">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-7xl font-semibold tracking-tight leading-tight md:leading-none mb-5 text-balance" style={{ letterSpacing: "-0.04em" }}>
            Signer dokumenter elektronisk.
            <span className="text-fg-faint"> Gratis. Uten konto.</span>
          </h1>
          <p className="text-base md:text-lg leading-relaxed text-fg-muted max-w-xl mb-8">
            Last opp en PDF, Markdown eller tekstfil, legg til signanter, send. Vi sender en bekreftelses­mail til deg først — signantene får dokumentet først når du bekrefter.
          </p>
          <div className="flex flex-wrap gap-3 items-center mb-8">
            <a href="#start" className="inline-flex items-center gap-2 h-12 px-5 bg-accent text-white font-medium text-sm rounded-sm es-btn-primary transition-colors" style={{ borderRadius: "var(--r-sm)" }}>
              Start signering <Icon name="arrow" size={16} />
            </a>
            <a href="#api" className="inline-flex items-center gap-2 h-12 px-5 font-medium text-sm text-fg es-btn-ghost transition-colors" style={{ borderRadius: "var(--r-sm)" }}>
              <Icon name="code" size={16} /> Les API-docs
            </a>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-fg-muted font-mono">
            {TRUST_BULLETS.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <Icon name="check" size={13} style={{ color: "var(--success)", strokeWidth: "2.4" }} /> {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="hvordan" className="px-5 md:px-12 py-16 md:py-22 border-b border-border">
        <div className="max-w-6xl mx-auto">
          <SectionLabel n="01" label="Slik fungerer det" />
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight mb-2 text-balance" style={{ letterSpacing: "-0.03em" }}>
            Tre steg. Ingen konto. Ingen kortinformasjon.
          </h2>
          <p className="text-fg-muted text-sm md:text-base mb-10 max-w-lg">
            Hele flyten er bygget rundt at avsender bekrefter først, signantene etterpå.
          </p>
          <div className="grid md:grid-cols-3 gap-6 md:gap-7">
            {HOW_STEPS.map((s) => (
              <div key={s.n} className="border-t border-fg pt-5">
                <div className="font-mono text-xs text-fg-faint mb-4 tracking-wider uppercase">STEG {s.n}</div>
                <h3 className="text-base md:text-lg font-semibold mb-2 leading-snug" style={{ letterSpacing: "-0.01em" }}>{s.t}</h3>
                <p className="text-sm md:text-sm text-fg-muted leading-relaxed">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust section ────────────────────────────────────────── */}
      <section id="tillit" className="px-5 md:px-12 py-16 md:py-22 border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_1.2fr] gap-10 md:gap-16">
          <div>
            <SectionLabel n="02" label="Tillit og bevisverdi" />
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight mb-4 text-balance" style={{ letterSpacing: "-0.03em" }}>
              En signatur som faktisk holder vann.
            </h2>
            <p className="text-fg-muted text-sm md:text-base leading-relaxed mb-6">
              Hver signering inkluderer e-post-verifisering, IP-fangst, SHA-256-hash av dokumentet og et audit-spor som legges ved som siste side i den signerte PDF-en. Det gir deg en{" "}
              <em className="not-italic text-fg">standard elektronisk signatur</em> under eIDAS — tilstrekkelig for kommersielle avtaler, NDA-er og fakturagrunnlag.
            </p>
            <Banner tone="warn" icon="info" title="Når du bør bruke noe annet">
              For arbeids­kontrakter, eiendoms­transaksjoner og dokumenter som lovkrever{" "}
              <strong>kvalifisert</strong> elektronisk signatur (BankID) anbefaler vi andre tjenester.
            </Banner>
          </div>
          <Card padding={0} style={{ overflow: "hidden", background: "#fff" }}>
            <div className="px-5 py-3.5 border-b border-border flex items-center gap-2.5 font-mono text-xs text-fg-muted uppercase tracking-wider">
              <Icon name="shield" size={14} /> Audit-spor (eksempel)
            </div>
            <div className="px-5 py-4">
              <AuditLine t="2026-05-14 14:23:08 UTC" l="request_created"   v="sender=henrik@nordlys.studio" />
              <AuditLine t="2026-05-14 14:23:11 UTC" l="sender_confirmed"  v="ip=84.214.18.42" />
              <AuditLine t="2026-05-14 14:23:12 UTC" l="email_sent"        v="→ kari@bekk.no" />
              <AuditLine t="2026-05-14 14:31:54 UTC" l="email_verified"    v="ip=2a01:799:c1d:..." />
              <AuditLine t="2026-05-14 14:33:02 UTC" l="sms_verified"      v="phone=+47•••••27" />
              <AuditLine t="2026-05-14 14:33:48 UTC" l="signed"            v='name="Kari Berg"' />
              <AuditLine t="2026-05-14 14:33:48 UTC" l="document_hash"     v="sha256:9f4c2e8b1a..." last />
            </div>
          </Card>
        </div>
      </section>

      {/* ── Create form ──────────────────────────────────────────── */}
      <section id="start" className="px-5 md:px-12 py-16 md:py-22 border-b border-border bg-bg">
        <div className="max-w-2xl mx-auto">
          <SectionLabel n="03" label="Opprett oppdrag" />
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight mb-2 text-balance" style={{ letterSpacing: "-0.03em" }}>
            Last opp, legg til signanter, send.
          </h2>
          <p className="text-fg-muted text-sm md:text-base mb-8">
            Avsenderbekreftelse via e-post hindrer misbruk. Signantene varsles først når du har bekreftet.
          </p>
          <CreateForm />
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <FAQSection />

      {/* ── Developer section ────────────────────────────────────── */}
      <section id="api" className="px-5 md:px-12 py-16 md:py-22 border-b border-border bg-fg text-white" style={{ background: "#0a0a0a", color: "#e7e5e4" }}>
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_1.1fr] gap-10 md:gap-14">
          <div>
            <div className="inline-flex items-center gap-2.5 font-mono text-xs mb-4 uppercase tracking-wider" style={{ color: "#a8a29e" }}>
              <span className="w-6 text-right">05</span>
              <span className="w-6 h-px" style={{ background: "#a8a29e" }} />
              <span>For utviklere og AI-agenter</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight mb-4 text-balance text-white" style={{ letterSpacing: "-0.03em" }}>
              Bygget for å bli orkestrert.
            </h2>
            <p className="text-sm md:text-base leading-relaxed mb-7" style={{ color: "#a8a29e" }}>
              esign har en åpen REST-API og en MCP-server — Claude eller andre agenter kan opprette signerings­oppdrag på vegne av en bruker uten å håndtere kompliserte auth-flyter.
            </p>
            <div className="flex flex-col gap-3.5 text-sm mb-7" style={{ color: "#d6d3d1" }}>
              {[
                "Ingen API-nøkler — token-basert, kortlivet, per oppdrag",
                "SHA-256-hash returneres på opprettelse, før noe sendes",
                "Idempotency-Key støttes på alle write-endepunkter",
              ].map((b) => (
                <div key={b} className="flex items-start gap-2.5">
                  <Icon name="check" size={15} style={{ color: "#86efac", strokeWidth: "2.2", marginTop: 2, flexShrink: 0 }} />
                  <span>{b}</span>
                </div>
              ))}
              <div className="flex items-start gap-2.5">
                <Icon name="check" size={15} style={{ color: "#86efac", strokeWidth: "2.2", marginTop: 2, flexShrink: 0 }} />
                <span>Webhooks (signert med HMAC) på <code className="font-mono" style={{ color: "#fafaf9" }}>signed</code>, <code className="font-mono" style={{ color: "#fafaf9" }}>declined</code>, <code className="font-mono" style={{ color: "#fafaf9" }}>completed</code></span>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <a href="#" className="inline-flex items-center gap-2 h-10 px-4 bg-white text-fg-fg font-medium text-sm rounded-sm" style={{ borderRadius: "var(--r-sm)", color: "#0a0a0a" }}>
                <Icon name="code" size={14} /> Les API-docs <Icon name="arrow" size={14} />
              </a>
              <a href="#" className="inline-flex items-center gap-2 h-10 px-4 border font-medium text-sm rounded-sm text-white" style={{ borderRadius: "var(--r-sm)", borderColor: "#3f3935" }}>
                <Icon name="external" size={14} /> MCP README
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-3.5">
            <TerminalBlock label="bash · install mcp">
              {`$ npm i -g @newcommerce/esign-mcp\n$ esign-mcp serve --port 7700\n\n`}
              <span style={{ color: "#a8a29e" }}>MCP server listening</span>
              {`  →  http://localhost:7700\n`}
              <span style={{ color: "#a8a29e" }}>tools registered</span>
              {`     →  create_request, get_status, cancel`}
            </TerminalBlock>
            <TerminalBlock label="curl · create request">
              <span style={{ color: "#86efac" }}>POST</span>
              {` https://esign.newcommerce.no/v1/requests\n`}
              <span style={{ color: "#a8a29e" }}>Content-Type:</span>
              {` application/json\n\n{\n  `}
              <span style={{ color: "#fbbf24" }}>&quot;sender_email&quot;</span>
              {`: `}
              <span style={{ color: "#86efac" }}>&quot;henrik@nordlys.studio&quot;</span>
              {`,\n  `}
              <span style={{ color: "#fbbf24" }}>&quot;signers&quot;</span>
              {`: [{ `}
              <span style={{ color: "#fbbf24" }}>&quot;name&quot;</span>
              {`: `}
              <span style={{ color: "#86efac" }}>&quot;Kari Berg&quot;</span>
              {`, ... }]\n}\n\n← 201 Created\n{ `}
              <span style={{ color: "#fbbf24" }}>&quot;id&quot;</span>
              {`: `}
              <span style={{ color: "#86efac" }}>&quot;req_8GqK...&quot;</span>
              {` }`}
            </TerminalBlock>
          </div>
        </div>
      </section>
    </>
  );
}

function TerminalBlock({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#0a0a0a", color: "#e7e5e4", border: "1px solid #1c1917", borderRadius: "var(--r-md)", overflow: "hidden", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.65 }}>
      {label && (
        <div style={{ padding: "10px 14px", borderBottom: "1px solid #1c1917", display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "#a8a29e", letterSpacing: 0.5, textTransform: "uppercase" }}>
          <Icon name="code" size={12} /> {label}
        </div>
      )}
      <pre style={{ margin: 0, padding: "14px 16px", fontFamily: "inherit", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{children}</pre>
    </div>
  );
}
