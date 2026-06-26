# Sender confirm: review-then-confirm flow (esign)

**Date:** 2026-06-26
**Status:** Approved (Ole — email-match redirect + explicit POST endpoint)
**Scope:** Sender-confirmation step only (`/confirm/<token>`, its API, the MCP agent path). No schema change, no migration.

## Problem

Today `app/confirm/[confirm_token]/page.tsx` is a server component that **mutates on render**: it calls `confirmSender()` during the GET, which flips the request to `active` and emails the signing invitations. Consequences:

1. **No review.** The sender never sees the document before releasing invitations — clicking the email link is the whole action.
2. **GET mutates = prefetch/scanner hazard.** Any email client, link-safety scanner, or prefetcher that fetches the confirm URL silently releases the invitations. This is a latent anti-abuse hole, ironic given the sender-confirm gate exists *for* anti-abuse.

## Goals

- Clicking the email link lands the sender on a **non-mutating** preview page: document in a PDF viewer, download option, signer summary, and an explicit **Bekreft** button.
- Pressing **Bekreft** confirms the request (invitations go out) via an explicit `POST`, then **redirects the sender to signing** when they are themselves a signer (else to the status page).
- The agent/CLI path keeps working through a **real, explicit mechanism** — not just changed prose.
- A regression test guarantees a GET never again confirms.

## Non-goals

- Schema/data-model changes (sender-as-signer stays a computed email match, not a new column).
- Changing the signing experience itself (`/sign/<token>`) beyond being the redirect target.
- Reworking create-form, status page, or other emails (only minimal copy touch-ups where they now mislead).

## Decisions (locked with Ole)

1. **Redirect after confirm = email match.** Match `senderEmail` against the signer list (case-insensitive, first not-yet-signed match). Match → `/sign/<that signToken>`. No match → `/status/<senderLookupToken>?id=<id>`. Self-signing (sender is the sole signer) falls out naturally.
2. **Agent path = explicit POST**, not GET-sniffing. GET never mutates.

## Architecture

### A. GET `/confirm/<token>` — read-only preview

- New read-only service `lib/services/confirm-view.ts` → `getConfirmView(token)`: one DB read of the request + its document + signers. Returns a discriminated result by `status`. **No writes, no audit event.**
- `page.tsx` (server component) calls it and renders:
  - `awaiting_sender_confirm` → client `ConfirmView` (preview + Bekreft button).
  - `active` (already confirmed) → "Allerede bekreftet" card, offering the **same** destination as a fresh confirm (sign link if sender is a signer, else status link).
  - `completed` / `cancelled` / `expired` → terminal info card.
  - not found → invalid/expired-link card (unchanged copy).

### B. `ConfirmView` client component — `app/confirm/[confirm_token]/confirm-view.tsx`

- Two-column layout mirroring the sign page (reuse `PdfViewer` + existing `es-sign-*` / a parallel `es-confirm-*` grid; PDF left, panel right).
- `PdfViewer` props: `url = renderedPdfBlobUrl` (public blob, rendered same as on the sign page), `downloadUrl = /api/v1/confirm/<token>/document`.
- Panel: signer summary (names + emails — the sender owns this request), an info line ("Når du bekrefter, sendes invitasjoner til signantene"), and the primary button **«Bekreft og send invitasjoner»**.
- On click → `POST /api/v1/confirm/<token>` → on `ok`, `router.push(redirect)`. Loading + error states (rate-limited, already cancelled/expired, network).

### C. POST `/api/v1/confirm/<token>` — confirm action

- Rate-limited (mirror sign routes: 60/min/ip).
- Calls `confirmSender()` (extended — see E). Mapping:
  - `ok` → `200`.
  - `already_confirmed` → **`200`** (idempotent; double-click + agent retry must not fail).
  - `not_found` → `404`. `invalid_state` (cancelled/expired) → `409`.
- Response body (success/idempotent):
  ```json
  {
    "ok": true,
    "status": "active",
    "signing_request_id": "...",
    "sender_lookup_token": "...",
    "sign_url": "https://…/sign/<token>",    // null if sender is not a signer
    "status_url": "https://…/status/<lookup>?id=<id>",
    "redirect": "<sign_url ?? status_url>"
  }
  ```

### D. GET `/api/v1/confirm/<token>/document` — download

- Rate-limited; mirrors `app/api/v1/sign/[sign_token]/document/route.ts`.
- Gated by confirm token; allowed while status is `awaiting_sender_confirm` **or** `active` (so re-download works after confirm). Streams `renderedPdfBlobUrl` with `attachmentDisposition(pdfDownloadName(originalFilename))` — clean `.pdf` filename. Reuses `lib/http/content-disposition.ts`. Logs a `document_downloaded` audit event.

### E. `confirmSender()` extension — `lib/services/confirm-sender.ts`

- Compute the matched sender-signer (case-insensitive email, first not-yet-signed) and return its `signToken` (or `null`) on **both** `ok` and `already_confirmed` results, alongside the existing `signingRequestId` + `senderLookupToken`.
- **Matched sender still receives the invite email.** The redirect is a convenience; if they abandon the redirected session the email is their fallback. Keep the existing invite-to-all-signers loop unchanged.
- Behavior otherwise unchanged (status flip, audit `sender_confirmed`, invitations).

### F. Agent-native mechanism (real, not prose)

- `lib/services/create-request.ts` result + `app/api/v1/signing-requests` response gain **`confirm_api_url`** = `${baseUrl}/api/v1/confirm/<token>` (the human `confirm_url` stays as the preview page).
- New MCP tool `confirm_signing_request({ confirm_token | confirm_api_url })` → `api.confirm()` in `packages/mcp-server/src/api-client.ts` → `POST` to the endpoint.
- Update `packages/mcp-server/README.md` flow text + `create_signing_request` description (sender now reviews then confirms; agents call `confirm_signing_request`).

## Data flow

```
create → status=awaiting_sender_confirm, email to sender (link = /confirm/<t>)
  sender opens /confirm/<t>      → getConfirmView (READ ONLY) → preview
  sender presses Bekreft         → POST /api/v1/confirm/<t> → confirmSender()
                                   → status=active, invitations emailed
                                   → 200 { redirect }
  browser router.push(redirect)  → /sign/<own token>  (match)  | /status/...  (no match)
agent: create → POST /api/v1/confirm/<t>  (or confirm_signing_request tool)
```

## Error handling

- GET preview never throws on valid-but-non-awaiting states — it renders the matching card.
- POST is the only mutation; idempotent on already-confirmed; 404/409 for missing/terminal.
- Document route: 404 unknown token, 409 if request is terminal (cancelled/expired/completed), 502 on blob fetch failure (mirror sign route).

## Testing (TDD — this is where the energy goes)

1. **GET-does-not-mutate (the point of the change).** create → `api.get(confirm_url)` → assert request still `awaiting_sender_confirm` **and** a signer `GET /api/v1/sign/<t>` returns `409`. Encodes the prefetch/scanner fix.
2. **Idempotency.** `POST /api/v1/confirm/<t>` twice → both `200`.
3. **Redirect = sign when sender is a signer.** sender_email == a signer's email → POST response `redirect` contains `/sign/`. **No match** → `redirect` contains `/status/`.
4. **Self-signing.** sender is the sole signer → confirm → redirect to `/sign/<token>` → that page signs to completion.
5. **Document download (confirm-gated).** `GET /api/v1/confirm/<t>/document` → 200, `content-type: application/pdf`, `content-disposition: attachment; …filename=*.pdf`; 404 for unknown token.
6. **Update existing e2e:** happy-path + decline now click the **Bekreft** button (or POST the confirm API) to activate; expiry + download switch `api.get(confirm_url)` → `POST /api/v1/confirm/<t>`. `sender-gate` is unaffected (verify still 409 pre-confirm).

## Deploy notes

- **No migration.** Confirm tokens already emailed for in-flight requests stay valid — their behavior changes (preview instead of auto-confirm) but the token resolves.
- **Audit provenance (deliberate):** a matched sender reaches `/sign` via redirect, not their own invite link, so `email_verified` fires from the confirm flow. The same address was already proven by the confirm-link click, so this is legitimate SES proof — documented here so it is intentional, not incidental.

## Files (~6–8 + tests)

**New:** `lib/services/confirm-view.ts`, `app/confirm/[confirm_token]/confirm-view.tsx`, `app/api/v1/confirm/[confirm_token]/route.ts`, `app/api/v1/confirm/[confirm_token]/document/route.ts`, `packages/mcp-server/src/tools/confirm-signing-request.ts`.
**Modified:** `app/confirm/[confirm_token]/page.tsx`, `lib/services/confirm-sender.ts`, `lib/services/create-request.ts` (+ create response/validation type), `packages/mcp-server/src/api-client.ts`, `packages/mcp-server/src/index.ts`, `packages/mcp-server/README.md`, minor copy in `app/(public)/create-form.tsx` + `lib/email/templates/sender-confirm.tsx`, e2e specs.
