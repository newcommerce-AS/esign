# esign — UI design brief

> Paste this to an AI design tool (v0, Lovable, Figma AI, or a Claude project). It is self-contained — designers should not need other context to do good work.

---

## 1. Product in one paragraph

**esign** is a free, agent-friendly electronic signature service. A sender uploads a document (PDF, Markdown, or plain text), adds one or more signers (name + email, optional phone for SMS verification), and the service runs the full e-signing flow: it emails the sender a confirmation link first (anti-abuse gate), then emails each signer a unique signing link, captures their signature with audit trail (email-link proof, IP, timestamp, SHA-256 of document, optional SMS code), assembles a final PDF that contains the original plus a signature certificate appendix, and emails the signed PDF to all parties. No accounts. Open REST API + MCP server so Claude or other AI agents can orchestrate the whole flow on a user's behalf.

**Audience:** small businesses, freelancers, B2B contract counterparties — anyone who needs a Standard Electronic Signature (SES under eIDAS) and doesn't want to pay DocuSign/Adobe Sign. Also: AI agents acting on behalf of those users.

**Differentiation:** truly free, no signup, agent-native (MCP server out of the box), document is hashed and audit-trailed so the signature has real evidentiary weight.

---

## 2. Brand and tone

**Voice:** Norwegian (bokmål) primary. Senior, technical, no-bullshit. We do not market with hyperbole, exclamation marks, or growth-team copy. Think Linear / Resend / Vercel — confident minimalism. We respect the reader's intelligence.

**Visual direction:**
- **Aesthetic:** Scandinavian minimal. Black on white as the primary palette. One restrained accent — a deep ink-blue or muted forest-green — used sparingly for action buttons and active states. No gradients, no glassmorphism.
- **Typography:** A single sans-serif throughout (system stack or Geist Sans). Numerals and hashes set in mono (Geist Mono or system mono) when shown — they should feel like "real cryptographic data," not decoration.
- **Density:** generous whitespace, but not airy. Functional density similar to Stripe's dashboard. Mobile must feel comfortable, not cramped.
- **Imagery:** No stock photography. No illustrations of "people signing on tablets." If decorative graphics are used at all, abstract geometric forms only — preferably a stylized representation of the cryptographic / document concepts (hash, signature, audit trail). Better: rely on type and whitespace.
- **Emoji:** none in product copy. The certificate appendix uses none either.

**Inspiration references** (positive): linear.app, resend.com, vercel.com landing, plain.com, posthog.com.
**Anti-references:** docusign.com (corporate-bloated), pandadoc.com (sales-y), any "sign here" hand cartoon.

---

## 3. Tech context (so designs are buildable)

- Next.js 16 (App Router) + Tailwind v4 + React 19
- All copy in **Norwegian bokmål**. English fallback is post-v1.
- Light theme only in v1. No dark mode toggle.
- Responsive: design for **375px mobile**, **768px tablet**, **1024px+ desktop**. Mobile is the priority — most signers will arrive from email on phone.
- Accessibility: WCAG AA contrast minimum, visible focus states, keyboard-navigable. The signer flow especially must work for people with screen readers.
- All forms are HTML-form-first (no exotic JS controls). PDF preview uses an `<iframe>` for v1 (no custom PDF.js renderer).

---

## 4. Screens to design

Each section lists every state we need a design for. Designs should show realistic Norwegian copy, not lorem ipsum.

### 4.1 Landing page — `/`

The landing has two jobs: (a) explain what esign is and how it works so a first-time visitor builds enough trust to use it, and (b) let that visitor immediately create a signing request without scrolling forever.

**Sections, in order:**

1. **Hero** — headline, sub-headline, primary call-to-action that scrolls/jumps to the form. Trust line below (e.g., "Standard Electronic Signature under eIDAS · SHA-256 audit trail · 90-dagers oppbevaring").
2. **How it works** — three numbered steps with brief explainer text per step:
   1. Last opp dokumentet og legg til signanter
   2. Bekreft via e-post (anti-misbruk-sjekk)
   3. Signanter signerer, signert PDF sendes til alle
3. **Why it's trustworthy** — short section explaining: email-link verification + IP capture + SHA-256 of the document + optional SMS step + audit-trail appendix in the final PDF. Acknowledge clearly: "Vi tilbyr Standard elektronisk signatur. For dokumenter som krever BankID (arbeidskontrakter, eiendom) anbefaler vi andre tjenester."
4. **The create form itself** — primary conversion surface, see §4.2.
5. **For utviklere og AI-agenter** — small but visible section with: REST API endpoint, link to API docs (planned), `npm i -g @newcommerce/esign-mcp` install line, link to MCP README. This signals to engineers / agents that the service is built for them.
6. **Footer** — minimal: copyright, link to spec / source, contact email. No legal/marketing fluff.

**Required states:** default. (Loading and error states live in the form section §4.2.)

**Mobile note:** Hero should fit on a single phone screen above the fold. Create-form fields stack vertically.

### 4.2 Create form (embedded on landing)

This is where the sender configures the signing request.

**Fields:**
- **Din e-post (avsender)** — type=email, required. Helper text: "Vi sender deg en bekreftelses-lenke før signantene får sin invitasjon."
- **Dokument** — file picker accepting `.pdf`, `.md`, `.txt`. Drag-and-drop zone visible on desktop, plain file input on mobile is fine. Show selected filename and size after pick. Max 10 MB (show error if exceeded).
- **Signanter** — repeatable row. Each row: navn (text), e-post (email), telefon (tel, valgfri — helper "+47..., for SMS-verifisering"). Add-row button: "+ legg til signant". Max 10 rows.
- **Submit button** — "Send til bekreftelse" (primary action). Disabled until required fields are valid.

**Inline helper** between the form and submit button: "Vi sender ut signerings-invitasjoner først når du bekrefter via e-post." This explains why nothing happens immediately on submit.

**States to design:**
- **Idle** (empty form)
- **Filled** (valid, ready to submit)
- **Submitting** (button shows spinner / "Sender...", form disabled)
- **Success** — replace form with a success card showing: "Sjekk innboksen din: vi har sendt en bekreftelses-lenke til `<sender_email>`. Klikk den for å sende invitasjoner til signantene." Include the `confirm_url` as a copyable monospace string for agent/CLI use, with a "kopier" button. Also include the `sender_lookup_token` similarly — labeled clearly so a developer / agent recognizes it.
- **Validation error** (inline, per field — red text + red border)
- **API error** (toast or banner — "Noe gikk galt: <message>")
- **Rate-limited error** (specific state with explanation: "Maks 5 oppdrag per time per IP. Prøv igjen om <X> minutter.")

### 4.3 Confirm page — `/confirm/<token>`

When the sender clicks the confirmation link in their email, they land here. The action happens server-side automatically; the page just confirms result.

**States:**
- **Success** — green check-style header (no emoji, use a small SVG icon), "Bekreftet" headline, paragraph "Signantene har nå mottatt invitasjonen sin på e-post." Show a link back to `/` and a link to a status page.
- **Already confirmed** — neutral header "Allerede bekreftet", paragraph explaining the request is already active.
- **Invalid / expired token** — error header "Ugyldig eller utløpt bekreftelses-lenke", suggest creating a new request.
- **Wrong state** (e.g., already cancelled) — error header "Kan ikke bekrefte i nåværende tilstand", brief explanation.

Keep this page minimal — it's a transactional confirmation, not a destination.

### 4.4 Signer page — `/sign/<sign_token>`

The most important screen in the app. A signer arrives here from email and must (a) understand who sent them what, (b) read the document, (c) optionally verify via SMS, (d) sign or decline.

**Layout (desktop):** two columns on wide screens — document preview left (60%), sign actions right (40%). Or single column with document above actions. On mobile: single column, document fits viewport width.

**Top of page (always visible):**
- Document filename
- Sender identity (e-post + name if available)
- A small "expires-at" pill ("Lenken utløper 15. juni 14:23")
- A subtle mono chip showing `SHA-256: <first-16-chars>...` — clickable to expand to full hash (this is a real trust signal, don't hide it)

**Document preview:**
- PDF rendered in an `<iframe>` with a min-height of 600px on desktop, 70vh on mobile
- Border / shadow so it doesn't merge with the page

**Sign action card (right column or below):**
- **If SMS required and not yet verified:** show SMS section first with two sub-states:
  - "Send SMS-kode"-knapp before code requested
  - 6-cifret kode-input + "Verifiser"-knapp after code requested
  - Display the masked phone number we'll send to
- **Name input** — "Skriv ditt fulle navn" — pre-filled with the signer's name from the request, editable
- **Consent line** — checkbox + label rendering the consent string LIVE based on the current name field: e.g. "Jeg, **Henrik Nergaard**, samtykker til innholdet i dette dokumentet og signerer det elektronisk."
- **Sign button** — primary action, "Signer" — disabled until consent is checked and name is non-empty (and SMS verified if required)
- **Decline link** — secondary, lower visual weight, "Avvis å signere" — opens a prompt for a reason

**States to design:**
- **Loading** (fetching signer/document data)
- **Active — not yet email-verified** (this should be near-instant since the act of arriving with the token verifies email; design the in-between state anyway)
- **Active — viewing document, ready to sign** (default sign-page state)
- **Active — SMS required, code not sent** (sign button disabled, SMS section primary)
- **Active — SMS code entered, pending verification** (spinner on Verify button)
- **Active — SMS verified, ready to sign** (back to ready-to-sign with green "SMS verifisert" pill)
- **Submitting signature** (button spinner)
- **Signed — success** — replace card with confirmation: "Takk! Du har signert dokumentet. Du får signert PDF på e-post når alle har signert." Show date/time. If user is also the last signer, additionally show "Alle har signert — ferdig PDF sendes nå."
- **Declining** — modal/inline form: textarea for reason, "Avvis"-knapp (red, destructive styling), "Avbryt"-link
- **Declined — success** — confirmation that decline was registered, "Avsender og øvrige signanter er varslet"
- **Already signed** — info state if user reloads the page after signing
- **Request cancelled / expired** — error state explaining the link is no longer valid

**Mobile-specific considerations:** the PDF iframe should be tap-to-zoom or have a "Last ned PDF for å lese"-link fallback. The sign action card should be sticky-bottom on mobile so the primary action stays reachable.

### 4.5 Status page — `/status/<lookup_token>`

The sender's dashboard for a single signing request. Useful for senders running multiple signing flows or for developers/agents inspecting state.

**Header:**
- Document filename + format pill (`PDF` / `MD` / `TXT`)
- Status pill (Awaiting confirm / Active / Completed / Cancelled / Expired) — color-coded
- Created date
- Expires date

**Body:**
- **Signer progress** — a list of signers with their current state. Each row: name, email, status chip (Pending / Email verified / SMS verified / Signed / Declined), signed-at timestamp if applicable. Visually like a vertical stepper or check-list.
- **Audit timeline** (collapsible / behind a "Vis logg" link) — chronological events: `request_created`, `sender_confirmed`, `email_sent → henrik@...`, `email_verified`, `signed`, `completed`. Mono-font, timestamps left, event right.
- **Document section** — SHA-256 of the rendered PDF, link to view the (rendered) document, and once completed: a prominent "Last ned signert PDF" button.

**Actions row:**
- If status === active: "Avbryt oppdraget" (destructive, requires confirm)
- If status === completed: "Last ned signert PDF" (primary)
- If status === any: "Kopier sender_lookup_token" (for agent use)

**States:**
- **Loading**
- **Loaded — awaiting confirm**
- **Loaded — active, 0 signed**
- **Loaded — active, partial signed** (e.g., 1 of 3)
- **Loaded — completed** (with download button)
- **Loaded — cancelled** (decline reason visible)
- **Loaded — expired**
- **Error — not found / unauthorized**

### 4.6 404 / generic error page

Simple, on-brand, with a link home. Norwegian copy: "Siden finnes ikke" / "Noe gikk galt."

### 4.7 Email templates

Four transactional templates already exist in code; they need design polish (not full redesign — these run through React Email and Resend).

1. **Sender confirmation** — subject "Bekreft signeringsoppdrag". Body explains: "Du har bedt om signering hos: <names>. Klikk knappen under for å sende invitasjoner ut."
2. **Signer invitation** — subject "Du har et dokument til signering: <filename>". Body: "Hei <name>, <sender_email> har sendt deg <filename> til elektronisk signering. Klikk for å åpne og signere. Lenken utløper <expires>."
3. **Completion** — subject "Signert: <filename>". Body: "Dokumentet er signert av alle parter: <names>. Signert PDF ligger som vedlegg. Vi sletter dokumentet fra våre servere om 90 dager — behold denne kopien."
4. **Decline notification** — subject "Signeringsoppdrag avbrutt: <filename>". Body: "<decliner_name> har avvist å signere. Begrunnelse: <reason>. Oppdraget er kansellert."

**Design constraints for emails:** plain, scannable, single-column, max 600px wide. Primary CTA button styled black with white text. Inter-friendly fonts. No images that need hosting. Footer line: "esign · gratis elektronisk signering · esign.newcommerce.no".

---

## 5. Components and design system

To keep this consistent across screens, define a small set of reusable primitives. The designer should produce these as a small component library:

- **Button** — primary (black/accent), secondary (outlined), destructive (red), link-style
- **Input** — text, email, tel, textarea — with helper text, error state, and disabled state
- **File drop zone** — with hover/active states
- **Status pill** — variants for each status in the system (8+ variants — match the data model state machines)
- **Mono chip** — for hashes, tokens, IDs — with optional copy-button
- **Stepper** — vertical, used for "how it works" on landing AND for signer progress on status page
- **Card / Section** — neutral surface with optional border
- **Modal / Confirm dialog** — for decline reason input and cancel-request confirmation
- **Toast / Banner** — for transient errors and API failures

---

## 6. Copy — verbatim Norwegian samples

Use these literally. Do not paraphrase, do not translate to English, do not "improve."

- "esign — gratis elektronisk signering"
- "Last opp et dokument, legg til signanter, send."
- "Vi sender en bekreftelsesmail til deg først — signantene får e-post først når du bekrefter."
- "Din e-post (avsender)"
- "Dokument (PDF, Markdown eller tekst)"
- "Signanter"
- "+ legg til signant"
- "Send til bekreftelse"
- "Sjekk innboksen din"
- "Bekreft signeringsoppdrag"
- "Bekreftet ✓ — signantene har nå mottatt invitasjonen sin på e-post."
- "Allerede bekreftet."
- "Ugyldig eller utløpt bekreftelseslenke."
- "Du har et dokument til signering"
- "Åpne og signer"
- "Skriv ditt fulle navn"
- "Jeg, [navn], samtykker til innholdet i dette dokumentet og signerer det elektronisk."
- "Signer"
- "Avvis"
- "Begrunnelse for å avvise"
- "Takk! Dokumentet er signert. Du får signert PDF på e-post når alle har signert."
- "Du har avvist å signere. Avsender er varslet."
- "Dokumentet er signert"
- "Vi sletter dokumentet om 90 dager — behold denne kopien."
- "Lenken utløper {dato}"
- "SMS-verifisering kreves for denne signaturen."
- "Send SMS-kode"
- "6-sifret kode"
- "Verifiser"

---

## 7. Deliverables

Whichever format your tool uses, please produce:

1. **All screens listed in §4** — design for every state listed under each screen (don't skip error / loading / success variants).
2. **Mobile (375px) and desktop (1024px) frames per screen.**
3. **A component library** (§5) with primary, hover, focus, disabled, and error variants where relevant.
4. **Email template designs** (§4.7) — desktop email-client view.
5. **A simple style guide page**: color tokens, type scale, spacing scale, shadow scale.

If you are an AI design tool that outputs React/Tailwind directly (v0, Lovable): produce these as components, scoped to be compatible with Next.js 16 App Router + Tailwind v4 + React 19. Keep code lean — no heavyweight UI libraries, no Radix unless absolutely justified.

---

## 8. Constraints — what NOT to do

- No carousel / hero slider on landing
- No "AI"-themed visual gimmicks (gradient meshes, glowing orbs)
- No fake trust badges or stock testimonials
- No paid-plan upsells anywhere
- No dark-mode-only screens (light theme only in v1)
- No autoplay video
- No marketing modals or newsletter signups
- Do not redesign the audit-certificate PDF appendix layout — that already exists in code with specific typography rules

---

## 9. Existing implementation reference

The current functional UI lives at:
- `app/(public)/page.tsx` — landing + create form (currently unstyled scaffold)
- `app/(public)/sign/[sign_token]/signer-view.tsx` — signer client component
- `app/(public)/status/[lookup_token]/page.tsx` — status page
- `app/confirm/[confirm_token]/route.ts` — confirm page (currently inline HTML)
- `lib/email/templates/*.tsx` — React Email templates

The data shapes, state machines, and error codes are already locked. The designer should not change behavior — just visual polish, layout, and flow improvements. If the design needs a new piece of data that the API doesn't return, flag it explicitly so we can decide whether to extend the API.

---

Hand back: full design files (Figma URL, v0/Lovable share link, or zipped React components) plus a short rationale per major decision. We will iterate from there.
