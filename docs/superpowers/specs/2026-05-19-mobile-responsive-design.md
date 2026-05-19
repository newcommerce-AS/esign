# Mobile-responsive frontend (esign)

**Date:** 2026-05-19
**Status:** Approved (Ole, A1 + B1 stack)
**Scope:** Entire app (landing, create-form, confirm, status, sign)

## Problem

The current frontend was designed desktop-first. On mobile (verified on iPhone Safari):

1. **The signing page does not show the document at all.** The PDF is loaded into an `<iframe>`, and iOS Safari refuses to render PDFs inside iframes — they appear blank/grey.
2. **The two-column grid (`minmax(0, 1.5fr) minmax(360px, 1fr)`) does not collapse.** Inline `style={{}}` blocks have no media queries, so the 360 px sidebar min-width forces horizontal overflow on phone widths.
3. **The PDF panel has a fixed `height: 720`** that wastes most of the viewport on phones.
4. **Header padding (`14px 32px`) and chip rows are too wide** for ~375 px screens.
5. **Landing, create-form, confirm, and status pages** share the same inline-style pattern with no breakpoints.

## Goals

- A signer on an iPhone in Safari can read the document and complete signing without leaving the page.
- All public-facing pages render cleanly down to 360 px viewport width without horizontal scroll.
- No regression in desktop appearance.
- All existing e2e tests (`tests/e2e/*.spec.ts`) keep passing.

## Non-goals

- New visual design system / theme changes.
- Native mobile app.
- Offline mode.
- Zoom/pan UI for PDF (basic in-canvas viewer is sufficient).
- Refactoring the admin dashboard (there is none — agent-native).

## Approach

### A — PDF rendering: switch to `react-pdf` (pdf.js) on all platforms

Replace the `<iframe src={pdfUrl}>` in `app/sign/[sign_token]/signer-view.tsx` with a `react-pdf`-based viewer that renders pages to `<canvas>`. This works identically on iOS, Android, and desktop, eliminating the iframe-blocked-on-iOS class of bug.

- Dependency: `react-pdf` v10.x (or latest compatible with React 19), plus `pdfjs-dist` (transitive but pinned).
- Worker: copy `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` into `public/` via a `postinstall` script in `package.json`. Set `pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"`. This avoids every Next/Turbopack bundler quirk around `new URL(..., import.meta.url)`.
- Render mode: canvas-only (no text-layer / annotation-layer). The signer just needs to read; selectable text adds known CSS/overlap bugs and is not worth it for v1. Can be opted into later if requested.
- Renders all pages stacked vertically. Page width fits container, height auto.
- Loading state: existing skeleton card.
- Error state: if pdf.js fails to load the PDF, show a fallback link "Åpne dokument i ny fane" pointing at the original blob URL.
- Markdown/text documents are converted to PDF server-side already (see `lib/render-markdown.ts`), so we only ever serve PDFs to the viewer — no special case needed.

### B — Layout: stack vertically below 900 px + sticky sign-CTA on mobile

In `signer-view.tsx`, replace inline grid styling with classes that respond to viewport:

- Above 900 px: current two-column layout preserved (PDF left, sign-panel right).
- Below 900 px: single column. PDF first (height ~`60vh` capped at ~520 px for ergonomics), sign-panel below. User scrolls naturally.
- On mobile, the primary "Signer" button stays visible at the bottom of the viewport via `position: sticky` on the sign-panel CTA row — but only the button row, so the user keeps scrolling context.
- **iOS soft-keyboard risk:** `position: sticky` can jump or hide under the keyboard when the name input receives focus. If real-device testing reveals this, fall back to a plain (non-sticky) bottom button — the form is short enough that one extra scroll is acceptable.
- Header chips (`Utløper …`, `SHA-256 …`) hide on very narrow screens; the document filename and "esign" wordmark always stay.

### C — Mechanical responsiveness pass on the other pages

Apply the same pattern to:

- `app/(public)/page.tsx` — landing
- `app/(public)/create-form.tsx` — sender flow
- `app/confirm/[confirm_token]/page.tsx` — sender confirmation
- `app/(public)/status/[lookup_token]/page.tsx` — status page
- `components/ui/nav.tsx` — public nav

Concretely: replace hard-coded paddings (`28px 32px`, `60px 32px`, etc.) with responsive variants, allow grids/flex rows to wrap, ensure no element has a fixed min-width that exceeds 320 px.

We will **not** introduce a hamburger menu or fundamentally redesign navigation — the current nav has 2-3 items max and fits if we let it wrap.

## Implementation notes

- Tailwind v4 is in use. Prefer Tailwind responsive classes (`md:`, `lg:`) on `className` over inline `style` where it does not regress current look. Keep inline `style` for theme-token-driven colors that already work; just add `className` on the same element for responsive width/padding/grid.
- The CSS resets in `app/globals.css` should remain. Add at most one or two media-query blocks there if needed for things that cannot be expressed in Tailwind (rare).
- The PDF viewer file should be its own client component (`components/pdf-viewer.tsx`) so it can be code-split out of the signer view bundle — pdfjs is ~200 KB.
- Use Next.js dynamic import with `{ ssr: false }` for the viewer to avoid SSR'ing pdf.js (it needs `window`).

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| `react-pdf` worker URL fails to resolve under Next 16 / Turbopack | Fallback: copy worker to `public/` and reference by absolute path. Test before relying on `import.meta.url`. |
| Larger JS bundle (~200 KB) on /sign | Acceptable. /sign is rarely accessed twice by the same user; this is signing UI, not a SPA. Code-split keeps it off other routes. |
| pdf.js renders blank on a malformed PDF | Show fallback "Open in new tab" link. Server-side PDFs come from pdf-lib/pdfkit so format is controlled, but defense in depth. |
| Sticky button overlaps content | Add bottom padding to scroll container equal to button height. |
| E2E tests break because layout changed | They assert text content and user actions, not pixel positions. Spot-check after implementation. |

## Verification

- `pnpm build` succeeds.
- `pnpm test` (vitest) passes.
- `pnpm test:e2e` (Playwright) passes — happy path, decline, expiry, sender-gate.
- Manual smoke test on:
  - iPhone Safari (Ole's device) — **required before merge.** Chrome DevTools mobile emulation runs Blink, not WebKit, and would never have caught the original iframe-PDF bug. Vercel preview URL goes in the PR body.
  - Chrome DevTools mobile emulation (iPhone 14, Pixel 7) — secondary sanity check.
  - Desktop Chrome at 1280 px wide — confirms no desktop regression.

## Out of scope (deferred)

- Push notifications, native share sheet integration.
- Page-by-page PDF navigation with thumbnails.
- Pinch-zoom on PDF canvas (browser native zoom is fine for now).
- Storing user's scroll progress between page reloads.
