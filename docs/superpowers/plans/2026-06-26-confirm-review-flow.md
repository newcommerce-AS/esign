# Confirm review-then-confirm flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline) — TDD, commit per task. Steps use checkbox (`- [ ]`).

**Goal:** Turn the sender-confirm step from a GET-mutates auto-confirm into a non-mutating preview page with an explicit Bekreft action that then redirects the sender to signing.

**Architecture:** GET `/confirm/<token>` becomes read-only (preview + PDF + download + button). A new `POST /api/v1/confirm/<token>` is the only mutation (idempotent), returning a redirect target computed by matching the sender's email to a signer. The agent path gains a real mechanism: `confirm_api_url` in the create response + a `confirm_signing_request` MCP tool.

**Tech Stack:** Next.js 16 App Router, Drizzle, vitest (unit), Playwright (e2e), react-pdf.

## Global Constraints

- No DB schema change, no migration. Sender-as-signer is a computed email match, never a column.
- POST confirm is idempotent: `already_confirmed` → 200 + redirect; only not_found→404, cancelled/expired→409.
- GET routes never mutate. The new document route is rate-limited (60/min/ip) like the sign route.
- Norwegian UI copy; reuse `PdfViewer`, `attachmentDisposition`, `pdfDownloadName`, `apiError`, `rateLimit`, `clientIp`.
- Commits: no Co-Authored-By trailer.

---

## File Structure

**New:** `lib/services/match-sender-signer.ts`, `lib/services/confirm-view.ts`, `app/confirm/[confirm_token]/confirm-view.tsx`, `app/api/v1/confirm/[confirm_token]/route.ts`, `app/api/v1/confirm/[confirm_token]/document/route.ts`, `packages/mcp-server/src/tools/confirm-signing-request.ts`, `tests/unit/match-sender-signer.test.ts`, `tests/e2e/confirm-flow.spec.ts`.

**Modified:** `lib/services/confirm-sender.ts`, `lib/services/create-request.ts`, `app/confirm/[confirm_token]/page.tsx`, `packages/mcp-server/src/api-client.ts`, `packages/mcp-server/src/index.ts`, `packages/mcp-server/README.md`, `app/(public)/create-form.tsx`, `lib/email/templates/sender-confirm.tsx`, `tests/e2e/{happy-path,decline,expiry,download}.spec.ts`.

---

### Task 1: Pure email-match helper (unit-tested)

**Files:** Create `lib/services/match-sender-signer.ts`, `tests/unit/match-sender-signer.test.ts`.

**Produces:** `matchSenderSigner<T extends {email:string;status:string}>(senderEmail: string, signers: T[]): T | null` — first signer whose email equals senderEmail (case-insensitive, trimmed) and whose status is not `signed`/`declined`; else null.

- [ ] Write failing unit test: match by case-insensitive email; skip signed/declined; null when no match; null on empty list.
- [ ] Run `pnpm test match-sender-signer` → fails.
- [ ] Implement the pure function.
- [ ] Run → passes. Commit.

### Task 2: Extend `confirmSender()` to return the matched sign token

**Files:** Modify `lib/services/confirm-sender.ts`.

**Consumes:** `matchSenderSigner`. **Produces:** `ConfirmResult` where both `ok` and `already_confirmed` carry `signerSignToken: string | null` (the matched sender-signer's `signToken`).

- [ ] In the success path, after fetching `sgs`, compute `signerSignToken = matchSenderSigner(req.senderEmail, sgs)?.signToken ?? null`; include in return.
- [ ] In the `already_confirmed` branch, fetch signers and compute the same; include in return.
- [ ] Update the `ConfirmResult` union type accordingly.
- [ ] Typecheck (`pnpm build` later); covered behaviorally by Task 9 e2e. Commit.

### Task 3: `POST /api/v1/confirm/[confirm_token]` — confirm action

**Files:** Create `app/api/v1/confirm/[confirm_token]/route.ts`.

**Consumes:** `confirmSender`, `baseUrl`, `rateLimit`, `clientIp`, `apiError`. **Produces:** JSON `{ ok, status, signing_request_id, sender_lookup_token, sign_url|null, status_url, redirect }`.

- [ ] Implement POST: rate-limit `api:ip:<ip>` 60/60; `const r = await confirmSender(token, baseUrl())`. Build `signUrl = r.signerSignToken ? \`${baseUrl()}/sign/${r.signerSignToken}\` : null`; `statusUrl = \`${baseUrl()}/status/${r.senderLookupToken}?id=${r.signingRequestId}\``; `redirect = signUrl ?? statusUrl`. Map `ok` and `already_confirmed` → 200 with that body; `not_found` → 404; `invalid_state` → 409.
- [ ] Covered by Task 9 e2e. Commit.

### Task 4: `GET /api/v1/confirm/[confirm_token]/document` — download

**Files:** Create `app/api/v1/confirm/[confirm_token]/document/route.ts` (mirror `app/api/v1/sign/[sign_token]/document/route.ts`).

- [ ] Implement: rate-limit; look up request by `senderConfirmToken`; 404 if none; 409 if status not in (`awaiting_sender_confirm`,`active`); fetch document; stream `renderedPdfBlobUrl` with `content-disposition: attachmentDisposition(pdfDownloadName(doc.originalFilename))`; audit `document_downloaded`.
- [ ] Covered by Task 9 e2e. Commit.

### Task 5: `getConfirmView` read-only service

**Files:** Create `lib/services/confirm-view.ts`.

**Produces:** `getConfirmView(token): Promise<ConfirmView>` where `ConfirmView` is a discriminated union on `kind`:
- `{ kind: "preview", signingRequestId, document: {filename, url, sha256}, signers: {name,email}[], expiresAt, senderEmail }` (status `awaiting_sender_confirm`)
- `{ kind: "already_confirmed", signingRequestId, senderLookupToken, signerSignToken: string|null }` (status `active`)
- `{ kind: "terminal", reason: "completed"|"cancelled"|"expired" }`
- `{ kind: "not_found" }`

- [ ] Implement: single read of request by `senderConfirmToken`; branch on `status`; for preview, fetch document + signers; for already_confirmed, fetch signers and compute `matchSenderSigner`. **No writes.**
- [ ] Commit.

### Task 6: Confirm page rewrite + `ConfirmView` client component

**Files:** Modify `app/confirm/[confirm_token]/page.tsx`; Create `app/confirm/[confirm_token]/confirm-view.tsx`.

- [ ] `page.tsx`: `const view = await getConfirmView(confirm_token)`. Render: `preview` → `<ConfirmView ...props />`; `already_confirmed` → "Allerede bekreftet" card with a primary link to `signerSignToken ? /sign/<t> : /status/<lookup>?id=<id>` + "Til forsiden"; `terminal`/`not_found` → existing error cards. Keep `SiteNav`/`SiteFooter` for non-preview states; preview uses its own full-screen layout.
- [ ] `confirm-view.tsx` (client): two-column layout (reuse sign-page CSS classes), dynamic `PdfViewer` (`ssr:false`) with `url`, `downloadUrl=/api/v1/confirm/<token>/document`; right panel: signer list, info line, primary button **«Bekreft og send invitasjoner»**. On click → `POST /api/v1/confirm/<token>` → on ok `window.location.assign(json.redirect)` (full nav into /sign or /status); show loading + error (rate-limited / 409 terminal / network).
- [ ] Covered by Task 9 e2e (happy-path clicks the button). Commit.

### Task 7: `confirm_api_url` in create response

**Files:** Modify `lib/services/create-request.ts`.

- [ ] Add `confirm_api_url: \`${baseUrl}/api/v1/confirm/${senderConfirmToken}\`` to `CreateSigningRequestResult` and the returned object (keep `confirm_url` = human page).
- [ ] Commit.

### Task 8: MCP `confirm_signing_request` tool

**Files:** Create `packages/mcp-server/src/tools/confirm-signing-request.ts`; Modify `packages/mcp-server/src/api-client.ts`, `src/index.ts`, `README.md`, `src/tools/create-signing-request.ts` (description).

- [ ] api-client: add `confirm: (confirmToken: string) => request<unknown>(\`/confirm/${confirmToken}\`, { method: "POST" })`.
- [ ] Tool: `confirm_signing_request` with input `{ confirm_token: string }` (required), execute → `api.confirm(args.confirm_token)`. Description: "Confirm a pending signing request (the sender step). Releases the invitation emails. Equivalent to the sender clicking Bekreft on the confirm page."
- [ ] index.ts: import + add to `tools` array.
- [ ] create tool description: note the sender reviews the document on `confirm_url`, or an agent calls `confirm_signing_request`.
- [ ] README flow text: create → sender opens `confirm_url`, reviews, clicks **Bekreft** (or agent calls `confirm_signing_request`) → invitations out → … 
- [ ] `pnpm build:mcp` → passes. Commit.

### Task 9: e2e — new guards + update existing

**Files:** Create `tests/e2e/confirm-flow.spec.ts`; Modify `tests/e2e/{happy-path,decline,expiry,download}.spec.ts`.

New `confirm-flow.spec.ts`:
- [ ] **GET does not mutate:** create → `api.get(confirm_url)` → `getConfirmTokenForRequest`/status read shows still `awaiting_sender_confirm` AND `GET /api/v1/sign/<token>` → 409.
- [ ] **Idempotent:** `POST /api/v1/confirm/<token>` twice → both `ok()`.
- [ ] **Redirect match:** sender_email == signer email → POST json `redirect` contains `/sign/`. **No match** → contains `/status/`.
- [ ] **Confirm document download:** `GET /api/v1/confirm/<token>/document` → 200, pdf, `attachment`, `filename*=…pdf`; unknown token → 404.

Update existing (helper to activate = POST the confirm API):
- [ ] happy-path: replace `await page.goto(confirm_url); expect "Bekreftet"` with: `page.goto(confirm_url)` → click button «Bekreft og send invitasjoner» → assert it navigated (URL is `/sign/` or `/status/`). Then continue signing via `getSignTokensForRequest`.
- [ ] decline: activate via `await api.post('/api/v1/confirm/<token>')` (use `getConfirmTokenForRequest(body.id)`), drop the `page.goto`.
- [ ] expiry + download: replace `api.get(confirm_url)` with `api.post('/api/v1/confirm/<token>')`.
- [ ] Run `pnpm build && pnpm test:e2e` → all pass.

### Task 10: Minor copy

**Files:** Modify `app/(public)/create-form.tsx`, `lib/email/templates/sender-confirm.tsx`.

- [ ] create-form success subtitle: "Klikk lenken i e-posten for å se dokumentet og bekrefte — så går invitasjonene ut til signantene."
- [ ] sender-confirm email: body line → "Klikk knappen under for å se dokumentet og bekrefte oppdraget." CTA label → "Se og bekreft oppdraget".
- [ ] Commit.

### Task 11: Verify + memory

- [ ] `pnpm test` (unit), `pnpm build` (typecheck), `pnpm test:e2e`, `pnpm build:mcp` — all green.
- [ ] Adversarial review pass (workflow), fix findings.
- [ ] Update `/Users/ole/.claude/memory/project_esign.md` (confirm flow now review-then-confirm + agent confirm tool).

## Self-Review

- **Spec coverage:** preview (T5/T6), POST+idempotency (T3), redirect match (T1/T2/T3), confirm document (T4), agent mechanism (T7/T8), tests incl. GET-no-mutate (T9), copy (T10), memory/deploy notes (T11). ✓
- **Placeholders:** none. ✓
- **Type consistency:** `signerSignToken` used identically in T2→T3; `matchSenderSigner` signature stable T1→T2/T5; `redirect`/`sign_url`/`status_url` keys match spec §C. ✓
