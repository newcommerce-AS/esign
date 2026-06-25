# Design: Last ned dokument fra signeringssiden

**Dato:** 2026-06-25
**Status:** Godkjent

## Problem

Signanten kan lese dokumentet på signeringssiden (`/sign/[sign_token]`), men har
ingen måte å laste det ned på. Eneste utvei i dag er «Åpne i ny fane», og bare når
PDF-visningen feiler. Signanter trenger ofte en kopi av dokumentet de er i ferd
med å signere.

## Omfang

- **I omfang:** Last ned *originaldokumentet slik det foreligger til signering*
  (den rendrede PDF-en signanten leser).
- **Utenfor omfang:** Nedlasting av den ferdig signerte PDF-en med revisjonsvedlegg.
  Den eksisterer ikke på signeringstidspunktet, og lagres pga. null-retensjon aldri
  for nedlasting — den leveres kun på e-post.

## Arkitektur

Ett nytt same-origin proxy-endepunkt + én ny prop på `PdfViewer`. Ingen
skjemaendring, ingen ny lagring (respekterer null-retensjon).

### 1. Nytt endepunkt: `GET /api/v1/sign/[sign_token]/document`

Speiler vaktlogikken i søsken-routen `GET /api/v1/sign/[sign_token]`:

- Rate-limit `api:ip:<ip>` (60/60s), `429` ved overskridelse.
- Slå opp signant på `sign_token` → `404` hvis ugyldig.
- Slå opp signeringsoppdrag → `409` hvis status ≠ `active` (blob slettes ved
  fullføring/avvisning/utløp, så URL-en er uansett død etterpå).
- **Ingen SMS-gate.** Bevisst valg: `PdfViewer` viser allerede hele dokumentet
  uten SMS-verifisering (SMS gater bare *signer*-handlingen i POST-routen).
  Nedlasting matcher visning — token + aktivt oppdrag, ikke mer. Å gate
  nedlasting bak SMS gir friksjon uten sikkerhetsgevinst.
- Streamer blob-en direkte: `fetch(doc.renderedPdfBlobUrl)` →
  `new NextResponse(res.body, { headers })`. Ingen buffering i minne
  (det var grunnen til å forkaste klient-side-alternativet). `502` hvis
  upstream-fetch ikke er `ok`.
- Headere:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="<ascii>"; filename*=UTF-8''<rfc5987>`
- **Filnavn:** alltid `.pdf` (bytes er alltid rendret PDF, også for markdown/text-
  opplasting). Gjenbruker konvensjonen fra `lib/services/complete.ts:46`:
  `originalFilename.replace(/\.[^.]+$/, "") + ".pdf"`. RFC 5987 `filename*` for æ/ø/å.
- Audit-logg: `document_downloaded` (eventType er fritekst i skjemaet — ingen
  enum-endring nødvendig).
- `runtime = "nodejs"` (som søsken-routene).

### 2. UI: nedlastingsknapp i `PdfViewer`-verktøylinjen

- `PdfViewer` får ny valgfri prop `downloadUrl?: string`.
- Når satt, vises en liten nedlastings-ikonlenke i den mørke verktøylinjen
  (`#404040`, der filnavn + sidetall ligger), til høyre.
- `signer-view.tsx` sender `downloadUrl={`/api/v1/sign/${signToken}/document`}`.
- Implementasjon: `<a href={downloadUrl} download>` med download-ikon. Fungerer
  som ekte nedlasting fordi endepunktet er same-origin og setter
  `Content-Disposition: attachment`.
- Feil-fallbacken («Åpne i ny fane», `pdf-viewer.tsx:96-103`) er urørt og peker
  fortsatt på rå blob-`url` for visning.

## Datakontrakt

| Felt | Kilde | Merk |
|------|-------|------|
| blob-bytes | `documents.renderedPdfBlobUrl` | alltid PDF |
| nedlastingsnavn | `documents.originalFilename` | strippes for ext, `.pdf` påføres |
| token-gate | `signers.signToken` | `404` hvis ukjent |
| state-gate | `signingRequests.status` | `409` hvis ≠ `active` |

## Feilhåndtering

| Tilfelle | Respons |
|----------|---------|
| Ukjent `sign_token` | `404 NOT_FOUND` |
| Oppdrag ikke aktivt | `409 INVALID_STATE` |
| Blob utilgjengelig (upstream !ok) | `502` |
| For mange forespørsler | `429 RATE_LIMITED` |
| Filnavn med æ/ø/å | RFC 5987 `filename*` |

## Testing

Følger eksisterende mønster (Playwright e2e i `tests/e2e/`):

- Nedlastingsknappen er synlig på signeringssiden når dokumentet er lastet.
- `GET /api/v1/sign/<token>/document` svarer `200` med
  `content-type: application/pdf` og `content-disposition: attachment`.
- Markdown-opplasting: nedlastet filnavn ender på `.pdf` (ikke `.md`).
- Ugyldig token → `404`.

## Filer som berøres

- **Ny:** `app/api/v1/sign/[sign_token]/document/route.ts`
- **Endres:** `components/pdf-viewer.tsx` (ny `downloadUrl`-prop + knapp)
- **Endres:** `app/sign/[sign_token]/signer-view.tsx` (sender `downloadUrl`)
- **Ny/endres:** e2e-test under `tests/e2e/`
