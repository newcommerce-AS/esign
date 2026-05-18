# esign — design spec (v1)

**Status:** approved 2026-05-16
**Author:** Ole Morten Faltinsen (via Claude brainstorm)
**Target:** v1 MVP — public free SES e-signature SaaS with REST API and MCP server

---

## 1. Goal

A web app that takes a document (PDF, Markdown, or plain text) and a list of signers (name + email, optional phone), and orchestrates electronic signing such that:

- All signers receive a unique signing link by email.
- Signers verify identity via the unique email link (mandatory) and optional SMS code (only if sender supplied a phone number).
- Each signature is anchored with email-link-proof, IP address, user agent, UTC timestamp, and an immutable SHA-256 hash of the document.
- When all signers have signed, the final PDF (original + signature-certificate appendix) is emailed to every signer and the sender.
- The whole thing is callable from an AI agent (Claude or other) so a user can say "get this signed by Henrik" and the agent handles it end-to-end.

Free for all to use. No accounts. Designed to be operated and orchestrated by AI agents.

## 2. Non-goals (v1)

- BankID, Vipps Login, Buypass, or any AES/QES integration. v1 produces a **Standard Electronic Signature (SES)** only.
- Persistent user accounts or a historical dashboard.
- Sequential signing flow (parallel only).
- Document templates / shared sample library.
- Webhook delivery retries / durable queue.
- White-label domains per customer.
- Long-term archival (no server-side retention; signers keep their own copy via email).

## 3. Legal posture

The signature produced is a **Standard Electronic Signature** under eIDAS. This is sufficient for most B2B agreements where parties have not pre-disputed the form of signature. It is *not* sufficient for documents that legally require AES/QES (e.g., certain real-estate transactions, employment contracts in some jurisdictions).

We are a **tool** that helps parties create an SES. We are not an eIDAS-registered trust service provider. The FAQ states this plainly and recommends BankID-based services for cases needing AES/QES.

Bevisverdi is maximized via the audit trail (see §7).

## 4. Architecture

**One Next.js (App Router) app deployed on Vercel.** Contains:

- **Web UI**:
  - `/` — landing + "create new signing request" form (manual use)
  - `/sign/[sign_token]` — signer-facing page with PDF viewer + signing controls
  - `/confirm/[confirm_token]` — sender confirmation handler
  - `/status/[lookup_token]` — sender-facing status page
- **REST API** under `/api/v1/...` — JSON. Public, anonymous, rate-limited per IP.
- **Internal cron endpoint** `/api/internal/cron/` — expiry sweep. Invoked by Vercel Cron. (Retention deletion is now inline on completion/decline/expire.)

**Separate MCP server** as an npm package `@newcommerce/esign-mcp`. Stdio-based. Installed locally by users in Claude Desktop/Code/etc. Thin wrapper over the public REST API. Holds no state.

### External dependencies

| Service | Purpose |
|---|---|
| Neon Postgres | All persistent state + sliding-window rate limiting |
| Vercel Blob | Original + final PDF storage |
| Resend | Outbound email (sender confirmation, signer invitation, final receipt with signed PDF attached) |
| Twilio | SMS verification, only when phone is provided |

### Anti-abuse: sender confirmation gate

When an anonymous sender creates a request, the request is created in status `awaiting_sender_confirm`. Signers receive **nothing** at this point. A confirmation email is sent to `sender_email`. Only when the sender clicks the confirmation link (or an agent opens the link on the sender's behalf) does the request flip to `active` and signer invitation emails go out.

The confirmation URL is also returned directly in the API response. This is by design: the URL is only useful if delivered to a real recipient, and agents need to be able to show the URL to the user ("klikk her for å bekrefte"). The confirmation URL is single-use.

Rate limit: 5 signing requests per IP per hour (anonymous). Postgres-backed sliding window (rate_limit_hits table).

## 5. Data model (Postgres, Drizzle ORM)

```
signing_requests
  id                          uuid pk
  created_at, expires_at      timestamptz
  sender_email                text
  sender_name                 text nullable
  sender_ip                   inet
  sender_confirm_token        text unique
  sender_confirmed_at         timestamptz nullable
  sender_lookup_token         text unique     -- returned to creator, used for status/cancel/download
  status                      text            -- see §6
  webhook_url                 text nullable
  webhook_secret              text nullable   -- hmac secret, generated at creation
  metadata                    jsonb nullable

documents
  id                          uuid pk
  signing_request_id          uuid fk
  original_filename           text
  original_format             text            -- 'pdf' | 'markdown' | 'text'
  original_blob_url           text
  rendered_pdf_blob_url       text            -- canonical signing artifact
  rendered_pdf_sha256         text            -- baked into audit trail
  final_signed_pdf_blob_url   text nullable

signers
  id                          uuid pk
  signing_request_id          uuid fk
  name                        text
  email                       text
  phone                       text nullable
  sign_token                  text unique     -- single-use URL token
  sign_token_hash             text            -- recorded in audit trail
  status                      text            -- see §6
  email_verified_at           timestamptz nullable
  sms_code_hash               text nullable   -- hashed current code, expires fast
  sms_code_expires_at         timestamptz nullable
  sms_verified_at             timestamptz nullable
  signed_at                   timestamptz nullable
  signed_ip                   inet nullable
  signed_user_agent           text nullable
  consent_text                text nullable   -- the exact string shown at signing
  decline_reason              text nullable

audit_events                  -- append-only
  id                          uuid pk
  signing_request_id          uuid fk
  signer_id                   uuid fk nullable
  event_type                  text            -- see §6
  payload                     jsonb
  occurred_at                 timestamptz
  ip                          inet nullable
```

## 6. State machines and event types

### `signing_requests.status`

`draft` → `awaiting_sender_confirm` → `active` → `completed` | `cancelled` | `expired`

(`draft` reserved for future internal use; v1 transitions straight to `awaiting_sender_confirm` on creation.)

### `signers.status`

`pending` → `email_verified` → (`sms_sent` → `sms_verified`)? → `signed` | `declined`

(The `document_viewed` *audit event* fires when the signer first opens the link, but `status` transitions directly from `pending` to `email_verified` — opening the link with the unique token is itself proof of email access.)

**SMS gating:** if a signer has a `phone` set, SMS verification is mandatory for that signer — they cannot reach `signed` without passing through `sms_verified`. If `phone` is null, SMS is skipped entirely.

### `audit_events.event_type`

`request_created`, `sender_confirmed`, `email_sent`, `document_viewed`,
`email_verified`, `sms_code_sent`, `sms_verified`, `signed`, `declined`,
`completed`, `cancelled`, `expired`, `reminder_sent`

## 7. Audit trail and signature certificate

For each completed request, the final PDF is composed by `pdf-lib` as:

1. The original rendered PDF (unchanged bytes — same SHA-256 as captured at creation).
2. One or more appendix pages titled **Signature Certificate**.

The appendix contains:

```
─── SIGNATURE CERTIFICATE ───
Document ID: <uuid>
Document SHA-256: <hex>
Original filename: <name>
Original format: pdf | markdown | text
Created: <UTC> by <sender_email> (IP <sender_ip>)
Sender confirmed: <UTC>

Signer 1 of N: <name> <email>
  Signed:           <UTC> from IP <ip>
  Email verified:   <UTC> (clicked unique token)
  SMS verified:     <UTC> on <phone>          [or "not required"]
  User agent:       <ua>
  Consent text:     "<exact string shown to signer>"
  Sign-token hash:  <hex>

[…repeat per signer…]

Generated by esign.newcommerce.no v<APP_VERSION> at <UTC>
```

The certificate is what gives the SES its bevisverdi after we delete the database row (immediately after completion). Every signer receives the final PDF by email, so each party holds their own durable copy.

## 8. Signing flow (end-to-end)

1. **Create request** — `POST /api/v1/signing-requests` (anonymous, rate-limited).
   - Validate input, write `signing_request` row in status `awaiting_sender_confirm`.
   - Convert document: if `markdown`/`text`, render to PDF via `pdfkit`; if `pdf`, store as-is. Both copies (original + rendered) saved to Vercel Blob.
   - Compute SHA-256 of rendered PDF, persist on `documents.rendered_pdf_sha256`.
   - Generate `sender_confirm_token` (single-use), `sender_lookup_token` (long-lived), `webhook_secret` (if webhook).
   - Audit event `request_created`.
   - Send confirmation email via Resend.
   - **Response includes** `confirm_url`, `sender_lookup_token`, `webhook_secret` (if applicable), and the signer list with their public IDs (not their `sign_token`).

2. **Sender confirms** — `GET /confirm/<token>` (browser).
   - Validates token, sets `sender_confirmed_at`, flips status to `active`.
   - Sends signer invitation emails (parallel — all at once).
   - Audit event `sender_confirmed`, then `email_sent` per signer.

3. **Signer signs** — `GET /sign/<sign_token>` (browser).
   - Validates token. Records audit event `document_viewed`. Sets `email_verified_at` if not already set (the very act of arriving with the unique token proves email access). Sets signer status to `email_verified`.
   - UI renders the PDF using `pdf.js`.
   - If `phone` is set on the signer: SMS verification is **required** before signing is allowed. UI exposes a "Send SMS code" button → `POST /sign/<sign_token>/sms/send` → Twilio. Signer enters the 6-digit code → `POST /sign/<sign_token>/sms/verify` → sets `sms_verified_at`.
   - Signer types their name in a text field. Checks the consent checkbox showing the exact string: `"Jeg, <name>, samtykker til innholdet i dette dokumentet og signerer det elektronisk."`
   - Clicks **Signer** → `POST /sign/<sign_token>` with `{name, consent: true}`.
   - Server validates: status must be `email_verified` (or `sms_verified` if SMS was required); name non-empty; consent true. Records `signed_at`, `signed_ip`, `signed_user_agent`, `consent_text`. Status → `signed`.
   - Audit event `signed`.
   - If this was the last outstanding signer, trigger completion (step 4).

4. **Completion** — all signers in `signed` status:
   - Generate final PDF (original + signature-certificate appendix) via `pdf-lib` — kept in memory only, never uploaded to blob storage.
   - Set `signing_requests.status = completed`. Audit event `completed`.
   - Email each signer + sender with the final PDF attached. Email body notes: "Vi har slettet dokumentet fra våre servere. Vedlegget er originalen — behold denne kopien."
   - Fire webhook if configured (best-effort, HMAC-signed). Webhook payload contains only metadata, not the PDF.
   - Delete original + rendered blobs from Vercel Blob.
   - Delete the `signing_request` row (cascades to documents, signers, audit_events).

5. **Decline** — `POST /sign/<sign_token>/decline` with `{reason}`.
   - Signer status → `declined`; request status → `cancelled` (parallel mode is all-or-nothing in v1).
   - Notification email to sender + remaining signers.
   - Webhook fires with `event: "declined"`.
   - Delete original + rendered blobs. Delete signing_request row (cascade).

6. **Expiry** — Vercel Cron hourly:
   - Find requests where `expires_at < now() AND status = 'active'` → set `status = expired`. Audit event + webhook.
   - Delete blobs. Delete signing_request row (cascade).

## 9. REST API

All endpoints under `/api/v1`. JSON in/out. Public unless noted.

```
POST   /signing-requests                            Create
GET    /signing-requests/:id                        Get status (header: X-Lookup-Token)
POST   /signing-requests/:id/cancel                 Cancel (X-Lookup-Token)
GET    /sign/:sign_token                            Signer fetch (signing_request_id, signer info, document URL, sms_required)
POST   /sign/:sign_token                            Sign ({name, consent})
POST   /sign/:sign_token/decline                    Decline ({reason})
POST   /sign/:sign_token/sms/send                   Trigger SMS code
POST   /sign/:sign_token/sms/verify                 Verify code ({code})
```

### `POST /signing-requests` — request

```json
{
  "sender_email": "ole@newcommerce.no",
  "sender_name": "Ole",
  "document": {
    "filename": "avtale.md",
    "format": "markdown",
    "content_base64": "<base64>"
  },
  "signers": [
    { "name": "Henrik Nergaard", "email": "henrik@example.com", "phone": "+4790000000" }
  ],
  "expires_in_days": 30,
  "webhook_url": "https://example.com/webhook",
  "metadata": { "free_form": "agent context here" }
}
```

### `POST /signing-requests` — response

```json
{
  "id": "7f3a-...-9b2",
  "status": "awaiting_sender_confirm",
  "confirm_url": "https://esign.newcommerce.no/confirm/<token>",
  "sender_lookup_token": "<opaque>",
  "webhook_secret": "<opaque>",
  "expires_at": "2026-06-15T14:23:00Z",
  "signers": [
    { "id": "...", "name": "Henrik Nergaard", "email": "henrik@example.com", "status": "pending" }
  ]
}
```

### Webhook payload

```json
{
  "event": "signed" | "declined" | "completed" | "expired" | "cancelled",
  "signing_request_id": "...",
  "signer_id": "...",
  "occurred_at": "<UTC>",
  "request_status": "active|completed|cancelled|expired"
}
```

HMAC-SHA256 of the raw body using `webhook_secret`, sent in `X-Esign-Signature` header.

### Validation rules

- `sender_email`, `signers[].email` — RFC 5322.
- `signers[].phone` — E.164 (`+47...`).
- `document.content_base64` — max 10 MB raw bytes (configurable).
- `signers` — 1 to 10 in v1.
- `expires_in_days` — 1 to 60, default 30.

### Error format

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
```

Codes: `VALIDATION_ERROR`, `RATE_LIMITED`, `NOT_FOUND`, `INVALID_TOKEN`, `INVALID_STATE`, `UNAUTHORIZED`, `INTERNAL_ERROR`.

## 10. MCP server

Package: `@newcommerce/esign-mcp`. Stdio-based. Configured via env:

```
ESIGN_API_BASE_URL=https://esign.newcommerce.no/api/v1
ESIGN_DEFAULT_SENDER_EMAIL=ole@newcommerce.no   # optional convenience
```

Exposed tools:

| Tool | Arguments | Returns |
|---|---|---|
| `create_signing_request` | `document` (filename, format, content_base64), `signers` (list), `sender_email?`, `expires_in_days?` | Full create response including `confirm_url` |
| `get_signing_status` | `signing_request_id`, `sender_lookup_token` | Current state + per-signer state |
| `cancel_signing_request` | `signing_request_id`, `sender_lookup_token`, `reason?` | Cancellation confirmation |

The signed PDF is delivered only by email. To process it from an AI agent, use a Gmail/IMAP MCP server to fetch the attachment from the recipient's inbox.

The MCP server stores no state. Agents are responsible for surfacing `confirm_url` / `sender_lookup_token` to the user (e.g., Claude shows them in chat for Ole to keep).

## 11. Project structure

```
/app
  /(public)
    page.tsx                                 # landing + manual create form
    sign/[sign_token]/page.tsx
    confirm/[confirm_token]/page.tsx
    status/[lookup_token]/page.tsx
  /api/v1
    signing-requests/route.ts                # POST
    signing-requests/[id]/route.ts           # GET
    signing-requests/[id]/cancel/route.ts    # POST
    sign/[sign_token]/route.ts               # GET, POST
    sign/[sign_token]/decline/route.ts
    sign/[sign_token]/sms/send/route.ts
    sign/[sign_token]/sms/verify/route.ts
  /api/internal/cron/
    expire/route.ts
/lib
  db/                                        # Drizzle schema + client
  pdf/
    render-markdown.ts                       # markdown → PDF (pdfkit)
    render-text.ts                           # text → PDF
    audit-appendix.ts                        # final PDF assembly (pdf-lib)
    hash.ts
  email/
    resend-client.ts
    templates/                               # React Email
  sms/
    twilio-client.ts
  rate-limit/
    db.ts
  audit/
    log.ts
  tokens.ts                                  # opaque token generation
  validation.ts                              # zod schemas shared input/output
/packages
  mcp-server/                                # @newcommerce/esign-mcp (separate workspace)
    package.json
    src/index.ts
    src/tools/*.ts
/tests
  unit/
  e2e/
drizzle.config.ts
package.json (workspaces)
vercel.json (cron config)
```

## 12. Operational details

### Secrets (Vercel env)

```
DATABASE_URL
BLOB_READ_WRITE_TOKEN
RESEND_API_KEY
RESEND_FROM_ADDRESS=no-reply@esign.newcommerce.no
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
APP_BASE_URL=https://esign.newcommerce.no
APP_VERSION                                 # injected at build time
CRON_SECRET                                 # to authorize /api/internal/cron/*
```

### Vercel Cron

```json
{
  "crons": [
    { "path": "/api/internal/cron/expire", "schedule": "0 * * * *" }
  ]
}
```

Cron endpoints check `Authorization: Bearer <CRON_SECRET>`.

### Rate limiting

- `POST /api/v1/signing-requests` — 5 / hour / IP.
- `POST /api/v1/sign/<token>/sms/send` — 5 / hour / signer.
- All other endpoints — 60 / minute / IP soft limit.

Implementation: Postgres-backed sliding window via `rate_limit_hits` table. Non-atomic count-then-insert; acceptable for this use case. Hourly cleanup runs in the expire cron job.

### Logging / observability

- Vercel logs by default.
- Audit events are the durable, queryable record for support cases ("did Henrik receive his email?").
- No PII in application logs beyond what's necessary for debugging; rely on `audit_events` for the real trail.

## 13. Test strategy

**Unit (Vitest):**
- PDF rendering produces consistent SHA-256 across runs for the same input.
- Audit appendix layout for 1, 2, 10 signers; with and without SMS.
- Rate-limit sliding window.
- Token generation entropy + uniqueness.
- HMAC webhook signature.
- MCP tool wrappers (mock HTTP).

**E2E (Playwright):**
- Happy path: create with 2 signers → sender confirms → signer 1 signs → signer 2 signs → assert `completed: true` on last sign response → assert `GET /signing-requests/:id` returns 404 (row deleted). Dev-mail directory contains PDF attachment.
- Sender-confirm gate: signers do NOT receive email before sender confirms.
- Decline path: one signer declines → status becomes cancelled → other signer's token becomes invalid.
- Expiry: time-traveled cron run expires and deletes the row → `GET /signing-requests/:id` returns 404.

Resend test domain + Twilio magic numbers used in E2E — no production sends.

**DB in tests:** Neon branch per PR (or local Postgres in Docker for dev).

## 14. Open considerations (track but not block v1)

- Should we add a "preview as signer" mode for the sender before confirmation, so they can see exactly what the signer will see? Likely yes in v1.1.
- Internationalization: v1 ships Norwegian + English UI (toggle by `Accept-Language`). Email templates same.
- Should the MCP server bundle a fallback "create-and-open-confirm-link" combined tool that opens the browser automatically? Probably overreach — leave to the agent.
- For agents that want fire-and-forget without ever returning to fetch results: should we allow `auto_confirm: true` in the API when sender_email matches a verified domain (later, with DKIM-based domain verification)? v2 territory.

## 15. Definition of done (v1)

- All endpoints in §9 implemented and covered by unit + at least one E2E path.
- MCP server published to npm as `@newcommerce/esign-mcp` with a README showing Claude Desktop config snippet.
- Happy-path E2E: last sign POST returns `completed: true`, subsequent GET returns 404, dev-mail has PDF attachment with size > 0.
- README documents: how to deploy your own copy, how to use the public hosted instance via API, how to install the MCP server.
- `esign.newcommerce.no` live, with DKIM/SPF/DMARC for Resend domain configured, Twilio number provisioned, Neon connected.
- A real signed PDF (sender = Ole, signer = Henrik) exists end-to-end as the acceptance demo.
- Data retention: no server-side storage after completion/decline/expiry. Email is the canonical delivery and archival channel.
