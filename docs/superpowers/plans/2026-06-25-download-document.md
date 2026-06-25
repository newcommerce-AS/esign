# Last ned dokument fra signeringssiden — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gi signanten en knapp på signeringssiden for å laste ned originaldokumentet (den rendrede PDF-en) via et token-beskyttet same-origin proxy-endepunkt.

**Architecture:** Ett nytt API-route (`GET /api/v1/sign/[sign_token]/document`) speiler vaktlogikken i søsken-GET-routen, streamer blob-en fra `documents.renderedPdfBlobUrl` tilbake med `Content-Disposition: attachment`. UI-en får en `downloadUrl`-prop på `PdfViewer` som rendrer en nedlastingslenke i verktøylinjen. Ingen skjemaendring, ingen ny lagring — null-retensjon bevares.

**Tech Stack:** Next.js 16 (App Router, `runtime = "nodejs"`), Drizzle ORM, Vercel Blob, Playwright (e2e), React (client component).

## Global Constraints

- **Null-retensjon:** Ikke lagre noe nytt. Endepunktet streamer kun den eksisterende blob-en. Ingen arkiv, ingen kopi.
- **Norsk i UI-tekst, engelsk i kode/filnavn/struktur.**
- **PDF-versjonspinning:** Ikke rør `react-pdf`/`pdfjs-dist`-versjoner eller `public/pdf*.mjs` — urelatert til denne oppgaven.
- **Filnavn ved nedlasting:** alltid `.pdf`. Bruk konvensjonen fra `lib/services/complete.ts:46`: `originalFilename.replace(/\.[^.]+$/, "") + ".pdf"`.
- **Feilrespons-format:** bruk `apiError(code, message, status)` fra `lib/http/errors.ts`.
- **Rate-limit-signatur:** `rateLimit("api:ip:" + ip, { limit: 60, windowSec: 60 })` fra `lib/rate-limit/db.ts`; returnerer `{ success: boolean }`.
- **Commit-meldinger:** ingen `Co-Authored-By`-trailer.

> **Verifiseringsvirkelighet (oppdatert under utførelse):** e2e-suiten kan ikke
> kjøre grønt lokalt. `tests/e2e/helpers.ts` spør DB direkte fra test-runner-
> prosessen; det fungerer kun med Neon-HTTP-driveren (stateless, cross-process),
> ikke med lokal PGlite. Dette rammer *alle* eksisterende e2e-tester (`happy-path`,
> `decline`, `sender-gate`) likt — det finnes ingen CI, og e2e er ment for en delt
> Postgres. Derfor: **den lokale porten er vitest-unit-tester**, e2e-specene
> beholdes som live-dekning når noen kjører mot Neon. Vi kjører IKKE e2e mot
> prod-Neon (testene lager rader som ikke selv-slettes).

## File Structure

- **Create:** `app/api/v1/sign/[sign_token]/document/route.ts` — proxy-endepunkt (GET).
- **Create:** `lib/http/content-disposition.ts` — rene helpere (`pdfDownloadName`, `attachmentDisposition`).
- **Create:** `tests/unit/content-disposition.test.ts` — vitest-unit-test (lokal port).
- **Modify:** `components/pdf-viewer.tsx` — ny `downloadUrl?: string`-prop + nedlastingslenke i verktøylinjen.
- **Modify:** `app/sign/[sign_token]/signer-view.tsx` — send `downloadUrl` til `PdfViewer`.
- **Create:** `tests/e2e/download.spec.ts` — e2e-dekning (live når kjørt mot Neon; ikke lokal port).

---

### Task 1: Proxy-endepunkt for nedlasting

**Files:**
- Create: `app/api/v1/sign/[sign_token]/document/route.ts`
- Create: `lib/http/content-disposition.ts`
- Test (lokal port): `tests/unit/content-disposition.test.ts`
- Test (e2e, live-dekning): `tests/e2e/download.spec.ts` (opprettes her; utvides i Task 3)

**Interfaces:**
- Consumes:
  - `db`, `initDb` fra `@/lib/db/client`
  - `signers`, `documents`, `signingRequests` fra `@/lib/db/schema`
    - `signers.signToken`, `signers.signingRequestId`, `signers.id`
    - `signingRequests.id`, `signingRequests.status` (aktiv = `"active"`)
    - `documents.signingRequestId`, `documents.renderedPdfBlobUrl`, `documents.originalFilename`
  - `apiError(code, message, status)` fra `@/lib/http/errors`
  - `clientIp(req)` fra `@/lib/http/ip`
  - `rateLimit(key, { limit, windowSec })` fra `@/lib/rate-limit/db`
  - `logAudit({ signingRequestId, signerId, eventType, ip })` fra `@/lib/audit/log`
  - `eq` fra `drizzle-orm`
- Produces:
  - HTTP-endepunkt `GET /api/v1/sign/<sign_token>/document` som svarer `200` med `content-type: application/pdf` og `content-disposition: attachment; filename=...; filename*=UTF-8''...`, eller feilkoder (`404`/`409`/`429`/`502`).

- [ ] **Step 1: Skriv den feilende testen**

Opprett `tests/e2e/download.spec.ts`:

```typescript
import { test, expect, request } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { getSignTokensForRequest } from "./helpers";

// Oppretter et oppdrag og åpner sender-confirm-porten.
// confirmSender() kjøres server-side når /confirm/<token> rendres (se app/confirm/[confirm_token]/page.tsx),
// så et rent api.get på confirm_url aktiverer oppdraget (status → "active").
async function createAndConfirm(api: APIRequestContext) {
  const create = await api.post("/api/v1/signing-requests", {
    data: {
      sender_email: "ole+dl@example.com",
      document: { filename: "avtale.txt", format: "text", content_base64: Buffer.from("Nedlastingstest").toString("base64") },
      signers: [{ name: "Sig One", email: "sig1+dl@example.com" }],
    },
  });
  expect(create.ok()).toBeTruthy();
  const body = await create.json();
  const confirm = await api.get(body.confirm_url);
  expect(confirm.ok()).toBeTruthy();
  return body;
}

test("download endpoint streams PDF as attachment", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const body = await createAndConfirm(api);
  const [{ signToken }] = await getSignTokensForRequest(body.id);

  const res = await api.get(`/api/v1/sign/${signToken}/document`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/pdf");
  expect(res.headers()["content-disposition"]).toContain("attachment");
});

test("download endpoint returns 404 for unknown token", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const res = await api.get(`/api/v1/sign/does-not-exist/document`);
  expect(res.status()).toBe(404);
});
```

> Merk: `body.confirm_url` finnes i create-responsen (se `happy-path.spec.ts:19`). Bekreftelsen kjøres server-side i `app/confirm/[confirm_token]/page.tsx` (`await confirmSender(...)`), så en ren `api.get(body.confirm_url)` aktiverer oppdraget — ingen klient-JS eller POST nødvendig.

- [ ] **Step 2: Kjør testen og verifiser at den feiler**

Run: `pnpm test:e2e download.spec.ts`
Expected: FAIL — routen finnes ikke ennå. (Merk: e2e kjører ikke grønt lokalt, jf. Verifiseringsvirkelighet over. Den lokale porten er vitest-testen i Step 4b.)

- [ ] **Step 3a: Trekk de rene helperne ut i en lib-modul**

En `route.ts` bør bare eksportere HTTP-handlere + segment-config. Legg den testbare logikken i `lib/http/content-disposition.ts`:

```typescript
// bytes er alltid rendret PDF, også for markdown/text-opplasting
export function pdfDownloadName(originalFilename: string): string {
  return originalFilename.replace(/\.[^.]+$/, "") + ".pdf";
}

// RFC 5987: ascii-fallback + utf-8-kodet variant for æ/ø/å
export function attachmentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(name);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
```

- [ ] **Step 3b: Skriv routen som importerer helperne**

Opprett `app/api/v1/sign/[sign_token]/document/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, initDb } from "@/lib/db/client";
import { signers, documents, signingRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/http/errors";
import { clientIp } from "@/lib/http/ip";
import { rateLimit } from "@/lib/rate-limit/db";
import { logAudit } from "@/lib/audit/log";
import { pdfDownloadName, attachmentDisposition } from "@/lib/http/content-disposition";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  const ip = clientIp(req);
  const rl = await rateLimit(`api:ip:${ip}`, { limit: 60, windowSec: 60 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many requests", 429);
  await initDb();

  const [s] = await db.select().from(signers).where(eq(signers.signToken, sign_token));
  if (!s) return apiError("NOT_FOUND", "Invalid sign token", 404);

  const [reqRow] = await db.select().from(signingRequests).where(eq(signingRequests.id, s.signingRequestId));
  if (reqRow.status !== "active") return apiError("INVALID_STATE", `Request is ${reqRow.status}`, 409);

  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, s.signingRequestId));

  const upstream = await fetch(doc.renderedPdfBlobUrl);
  if (!upstream.ok || !upstream.body) return apiError("UPSTREAM_ERROR", "Could not fetch document", 502);

  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "document_downloaded", ip });

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": attachmentDisposition(pdfDownloadName(doc.originalFilename)),
    },
  });
}
```

- [ ] **Step 4a: Skriv vitest-unit-test for helperne (lokal port)**

Opprett `tests/unit/content-disposition.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { pdfDownloadName, attachmentDisposition } from "../../lib/http/content-disposition";

describe("pdfDownloadName", () => {
  it("forces .pdf for markdown/text uploads", () => {
    expect(pdfDownloadName("avtale.md")).toBe("avtale.pdf");
    expect(pdfDownloadName("kontrakt.txt")).toBe("kontrakt.pdf");
  });
  it("keeps .pdf uploads as .pdf", () => {
    expect(pdfDownloadName("signert.pdf")).toBe("signert.pdf");
  });
  it("appends .pdf when there is no extension", () => {
    expect(pdfDownloadName("avtale")).toBe("avtale.pdf");
  });
  it("only strips the last extension on multi-dot names", () => {
    expect(pdfDownloadName("min.avtale.v2.md")).toBe("min.avtale.v2.pdf");
  });
});

describe("attachmentDisposition", () => {
  it("is an attachment with an ascii filename", () => {
    expect(attachmentDisposition("avtale.pdf")).toContain('attachment; filename="avtale.pdf"');
  });
  it("encodes non-ascii via RFC 5987 filename*", () => {
    const cd = attachmentDisposition("kjøpsavtale_ø.pdf");
    expect(cd).toContain("filename*=UTF-8''");
    expect(cd).toContain(encodeURIComponent("kjøpsavtale_ø.pdf"));
    // ascii-fallbacken må ikke inneholde rå non-ascii-tegn
    expect(cd).toMatch(/filename="[\x20-\x7e]+"/);
  });
});
```

- [ ] **Step 4b: Kjør unit-testen og verifiser at den passerer**

Run: `pnpm test content-disposition`
Expected: PASS — alle assertions grønne, output rent.

- [ ] **Step 5: Commit**

```bash
git add "app/api/v1/sign/[sign_token]/document/route.ts" tests/e2e/download.spec.ts lib/http/content-disposition.ts tests/unit/content-disposition.test.ts
git commit -m "feat(sign): add document download proxy endpoint"
```

---

### Task 2: Nedlastingsknapp i PdfViewer + signer-view

**Files:**
- Modify: `components/pdf-viewer.tsx` (props ~rad 8-13, verktøylinje ~rad 54-76)
- Modify: `app/sign/[sign_token]/signer-view.tsx:210` (`<PdfViewer .../>`-kallet)

**Interfaces:**
- Consumes: endepunktet fra Task 1 (`/api/v1/sign/<sign_token>/document`), `Icon` fra `@/components/ui/icons` (ikon-key `"download"` finnes).
- Produces: `PdfViewer`-prop `downloadUrl?: string`. Når satt, vises en `<a href={downloadUrl} download>`-lenke i verktøylinjen.

- [ ] **Step 1: Utvid `Props` i `components/pdf-viewer.tsx`**

Endre interface-blokken (rad 8-11):

```typescript
interface Props {
  url: string;
  filename: string;
  downloadUrl?: string;
}
```

Og destruktureringen (rad 13):

```typescript
export function PdfViewer({ url, filename, downloadUrl }: Props) {
```

- [ ] **Step 2: Legg nedlastingslenken i verktøylinjen**

I verktøylinjen er det i dag to barn: filnavn-spennet (rad 67-70) og sidetall-spennet (rad 71-75). Bytt ut den høyre delen slik at sidetall og nedlastingslenke ligger sammen. Erstatt blokken `{numPages > 0 && ( ... )}` (rad 71-75) med:

```tsx
        <span style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {numPages > 0 && (
            <span style={{ fontFamily: "var(--font-mono)" }}>
              {numPages} {numPages === 1 ? "side" : "sider"}
            </span>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              title="Last ned dokument"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#e7e5e4", textDecoration: "none", fontSize: 12 }}
            >
              <Icon name="download" size={14} />
              <span className="hidden md:inline">Last ned</span>
            </a>
          )}
        </span>
```

`Icon` er allerede importert øverst i fila (`import { Icon, Spinner } from "@/components/ui/icons";`).

- [ ] **Step 3: Send `downloadUrl` fra `signer-view.tsx`**

Endre `PdfViewer`-kallet (rad 210) fra:

```tsx
              <PdfViewer url={data.document.url} filename={data.document.filename} />
```

til:

```tsx
              <PdfViewer url={data.document.url} filename={data.document.filename} downloadUrl={`/api/v1/sign/${signToken}/document`} />
```

- [ ] **Step 4: Verifiser at det bygger og typesjekker**

Run: `pnpm build`
Expected: Bygget fullfører uten TypeScript-feil.

- [ ] **Step 5: Commit**

```bash
git add components/pdf-viewer.tsx "app/sign/[sign_token]/signer-view.tsx"
git commit -m "feat(sign): show download button in pdf viewer toolbar"
```

---

### Task 3: E2E-dekning for UI-knapp og filnavnsregel

**Files:**
- Modify: `tests/e2e/download.spec.ts`

**Interfaces:**
- Consumes: routen fra Task 1, UI-en fra Task 2, `getConfirmTokenForRequest`/`getSignTokensForRequest` fra `tests/e2e/helpers.ts`.
- Produces: ingen (ren testdekning).

- [ ] **Step 1: Legg til test for synlig nedlastingsknapp**

Legg til i `tests/e2e/download.spec.ts`:

```typescript
test("signing page shows a download link", async ({ page, baseURL }) => {
  const api = await request.newContext({ baseURL });
  const body = await createAndConfirm(api);
  const [{ signToken }] = await getSignTokensForRequest(body.id);

  await page.goto(`/sign/${signToken}`);
  await expect(page.getByText("har sendt deg")).toBeVisible();
  await expect(page.getByRole("link", { name: /last ned/i })).toBeVisible();
});
```

- [ ] **Step 2: Legg til test for `.pdf`-filnavn ved tekst-opplasting**

Tekst-opplastingen i `createAndConfirm` bruker `filename: "avtale.txt"`. Verifiser at nedlastingsnavnet blir `.pdf`. Legg til:

```typescript
test("download name is forced to .pdf for non-pdf uploads", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const body = await createAndConfirm(api);
  const [{ signToken }] = await getSignTokensForRequest(body.id);

  const res = await api.get(`/api/v1/sign/${signToken}/document`);
  expect(res.status()).toBe(200);
  const cd = res.headers()["content-disposition"];
  expect(cd).toContain('filename="avtale.pdf"');
  expect(cd).not.toContain(".txt");
});
```

- [ ] **Step 3: Kjør hele download-suiten**

Run: `pnpm test:e2e download.spec.ts`
Expected: PASS — alle fem testene (2 fra Task 1 + 3 her) grønne.

- [ ] **Step 4: Kjør full e2e-suite for regresjon**

Run: `pnpm test:e2e`
Expected: PASS — ingen eksisterende e2e-tester brutt.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/download.spec.ts
git commit -m "test(sign): e2e coverage for document download button and filename"
```

---

## Self-Review

**Spec coverage:**
- Endepunkt + vaktlogikk (rate-limit/404/409/502) → Task 1 ✓
- Ingen SMS-gate (matcher visning) → ivaretatt ved at routen ikke sjekker `smsVerifiedAt` (kun token + active); ingen kode lagt til for SMS ✓
- Stream uten buffering (`new NextResponse(upstream.body, ...)`) → Task 1, Step 3 ✓
- `.pdf`-filnavn + RFC 5987 → Task 1 (`pdfDownloadName` + `contentDisposition`), testet Task 3 ✓
- Audit `document_downloaded` → Task 1, Step 3 ✓
- UI-knapp i verktøylinjen + `downloadUrl`-prop → Task 2 ✓
- Feil-fallback urørt → ikke endret i Task 2 ✓
- Testing (knapp synlig, attachment-header, .pdf-navn, 404) → Task 1 + Task 3 ✓

**Placeholder scan:** Ingen TBD/TODO; all kode er konkret. Eneste betingede note (confirm GET vs POST) er løst med referanse til `happy-path.spec.ts` som bruker `page.goto(confirm_url)` (GET). ✓

**Type consistency:** `pdfDownloadName`/`contentDisposition` definert og brukt i samme fil; `downloadUrl`-prop konsistent mellom `pdf-viewer.tsx` og `signer-view.tsx`; felt-navn (`renderedPdfBlobUrl`, `originalFilename`, `signToken`, `signingRequestId`, `status`) verifisert mot `route.ts`-søsken og `schema.ts`. ✓
