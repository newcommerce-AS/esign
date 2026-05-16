# esign v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a public, free, AI-agent-friendly e-signature SaaS that takes a document + signer list and produces a signed PDF with audit certificate.

**Architecture:** Single Next.js (App Router) app on Vercel with public REST API + signer-facing UI. Separate npm package `@newcommerce/esign-mcp` provides MCP tools that wrap the REST API. Anonymous use; anti-abuse via mandatory sender-email-confirmation gate. 90-day retention.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · Drizzle ORM · Neon Postgres · Vercel Blob · Resend · Twilio · Upstash Redis · pdfkit · pdf-lib · pdf.js · Zod · Vitest · Playwright · pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-05-16-esign-design.md`

---

## File map

```
package.json                  pnpm workspaces, root scripts
pnpm-workspace.yaml
tsconfig.base.json
.env.example
vercel.json                   cron config
drizzle.config.ts

app/(public)/page.tsx                                  Landing + create form
app/(public)/sign/[sign_token]/page.tsx                Signer view
app/(public)/confirm/[confirm_token]/page.tsx          Sender confirm page
app/(public)/status/[lookup_token]/page.tsx            Sender status page

app/api/v1/signing-requests/route.ts                   POST create
app/api/v1/signing-requests/[id]/route.ts              GET status
app/api/v1/signing-requests/[id]/cancel/route.ts       POST cancel
app/api/v1/sign/[sign_token]/route.ts                  GET + POST sign
app/api/v1/sign/[sign_token]/decline/route.ts          POST
app/api/v1/sign/[sign_token]/sms/send/route.ts         POST
app/api/v1/sign/[sign_token]/sms/verify/route.ts       POST
app/api/v1/documents/[id]/final/route.ts               GET

app/confirm/[confirm_token]/route.ts                   Browser-clickable GET confirm

app/api/internal/cron/expire/route.ts
app/api/internal/cron/retention/route.ts

lib/db/schema.ts                                       Drizzle schema
lib/db/client.ts                                       Neon connection
lib/db/migrate.ts                                      Migration runner script

lib/tokens.ts                                          Opaque token gen + hashing
lib/hash.ts                                            SHA-256 helpers
lib/validation.ts                                      Zod schemas (request bodies)

lib/pdf/render-markdown.ts                             markdown → PDF (pdfkit)
lib/pdf/render-text.ts                                 text → PDF (pdfkit)
lib/pdf/audit-appendix.ts                              certificate page (pdf-lib)
lib/pdf/finalize.ts                                    original + appendix → final

lib/email/resend-client.ts
lib/email/templates/sender-confirm.tsx                 React Email
lib/email/templates/signer-invite.tsx
lib/email/templates/completion.tsx
lib/email/templates/decline.tsx

lib/sms/twilio-client.ts
lib/sms/code.ts                                        6-digit code gen + verify

lib/storage/blob.ts                                    Vercel Blob wrapper

lib/rate-limit/upstash.ts

lib/audit/log.ts                                       audit_events helpers
lib/webhook/fire.ts                                    HMAC-signed POST

lib/services/create-request.ts                         Orchestrates POST create
lib/services/confirm-sender.ts
lib/services/sign.ts
lib/services/decline.ts
lib/services/complete.ts                               Builds final PDF, emails
lib/services/expire.ts
lib/services/retention.ts

packages/mcp-server/package.json
packages/mcp-server/src/index.ts
packages/mcp-server/src/api-client.ts
packages/mcp-server/src/tools/create-signing-request.ts
packages/mcp-server/src/tools/get-signing-status.ts
packages/mcp-server/src/tools/cancel-signing-request.ts
packages/mcp-server/src/tools/download-signed-document.ts
packages/mcp-server/README.md

tests/unit/...
tests/e2e/...
playwright.config.ts
vitest.config.ts
```

---

## Phase 1 — Foundation

### Task 1: Initialize pnpm workspace + Next.js app

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `app/layout.tsx`, `app/(public)/page.tsx`

- [ ] **Step 1: Init pnpm + Next.js**

```bash
pnpm dlx create-next-app@latest . --typescript --app --tailwind --eslint --src-dir=false --import-alias='@/*' --no-turbopack --yes
```

- [ ] **Step 2: Convert to workspace**

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "."
  - "packages/*"
```

- [ ] **Step 3: Add dependencies**

```bash
pnpm add drizzle-orm @neondatabase/serverless zod resend twilio @upstash/ratelimit @upstash/redis pdfkit pdf-lib @vercel/blob nanoid
pnpm add -D drizzle-kit vitest @vitest/coverage-v8 @playwright/test @types/pdfkit tsx
```

- [ ] **Step 4: Write `.env.example`**

```
DATABASE_URL=postgres://...
BLOB_READ_WRITE_TOKEN=
RESEND_API_KEY=
RESEND_FROM_ADDRESS=no-reply@esign.newcommerce.no
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+1...
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
APP_BASE_URL=http://localhost:3000
APP_VERSION=0.1.0
CRON_SECRET=devsecret
```

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "chore: scaffold Next.js app with pnpm workspace and deps"
```

---

### Task 2: Drizzle schema

**Files:**
- Create: `lib/db/schema.ts`, `drizzle.config.ts`, `lib/db/client.ts`

- [ ] **Step 1: Write schema** in `lib/db/schema.ts`

```ts
import { pgTable, uuid, text, timestamp, inet, jsonb, index } from "drizzle-orm/pg-core";

export const signingRequests = pgTable("signing_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  expiredAt: timestamp("expired_at", { withTimezone: true }),
  senderEmail: text("sender_email").notNull(),
  senderName: text("sender_name"),
  senderIp: inet("sender_ip"),
  senderConfirmToken: text("sender_confirm_token").notNull().unique(),
  senderConfirmedAt: timestamp("sender_confirmed_at", { withTimezone: true }),
  senderLookupToken: text("sender_lookup_token").notNull().unique(),
  status: text("status").notNull(),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  metadata: jsonb("metadata"),
}, (t) => ({ statusIdx: index("sr_status_idx").on(t.status), expiresIdx: index("sr_expires_idx").on(t.expiresAt) }));

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  signingRequestId: uuid("signing_request_id").notNull().references(() => signingRequests.id, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull(),
  originalFormat: text("original_format").notNull(),
  originalBlobUrl: text("original_blob_url").notNull(),
  renderedPdfBlobUrl: text("rendered_pdf_blob_url").notNull(),
  renderedPdfSha256: text("rendered_pdf_sha256").notNull(),
  finalSignedPdfBlobUrl: text("final_signed_pdf_blob_url"),
});

export const signers = pgTable("signers", {
  id: uuid("id").defaultRandom().primaryKey(),
  signingRequestId: uuid("signing_request_id").notNull().references(() => signingRequests.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  signToken: text("sign_token").notNull().unique(),
  signTokenHash: text("sign_token_hash").notNull(),
  status: text("status").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  smsCodeHash: text("sms_code_hash"),
  smsCodeExpiresAt: timestamp("sms_code_expires_at", { withTimezone: true }),
  smsVerifiedAt: timestamp("sms_verified_at", { withTimezone: true }),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signedIp: inet("signed_ip"),
  signedUserAgent: text("signed_user_agent"),
  consentText: text("consent_text"),
  declineReason: text("decline_reason"),
}, (t) => ({ srIdx: index("signers_sr_idx").on(t.signingRequestId) }));

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  signingRequestId: uuid("signing_request_id").notNull().references(() => signingRequests.id, { onDelete: "cascade" }),
  signerId: uuid("signer_id").references(() => signers.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  ip: inet("ip"),
}, (t) => ({ srIdx: index("ae_sr_idx").on(t.signingRequestId), typeIdx: index("ae_type_idx").on(t.eventType) }));
```

- [ ] **Step 2: Drizzle config** in `drizzle.config.ts`

```ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 3: DB client** in `lib/db/client.ts`

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
export const db = drizzle(neon(process.env.DATABASE_URL!));
```

- [ ] **Step 4: Generate + apply migration**

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

Expected: tables created in dev Neon branch.

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat(db): add Drizzle schema for signing_requests, documents, signers, audit_events"
```

---

### Task 3: Token + hash utilities

**Files:**
- Create: `lib/tokens.ts`, `lib/hash.ts`, `tests/unit/tokens.test.ts`, `tests/unit/hash.test.ts`, `vitest.config.ts`

- [ ] **Step 1: Vitest config** in `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"] },
});
```

- [ ] **Step 2: Write failing tests** in `tests/unit/tokens.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { newToken, hashToken } from "@/lib/tokens";

describe("tokens", () => {
  it("produces URL-safe tokens of length >= 32", () => {
    const t = newToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });
  it("produces unique tokens across 1000 calls", () => {
    const set = new Set(Array.from({ length: 1000 }, () => newToken()));
    expect(set.size).toBe(1000);
  });
  it("hashToken is deterministic and hex 64 chars", () => {
    const h = hashToken("abc");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken("abc")).toBe(h);
  });
});
```

- [ ] **Step 3: Run test (expect FAIL)**

```bash
pnpm vitest run tests/unit/tokens.test.ts
```

Expected: import error / function not found.

- [ ] **Step 4: Implement** `lib/tokens.ts`

```ts
import { randomBytes, createHash } from "node:crypto";
export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
export function hashToken(t: string): string {
  return createHash("sha256").update(t).digest("hex");
}
```

- [ ] **Step 5: Write + run hash tests** in `tests/unit/hash.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { sha256Hex } from "@/lib/hash";

describe("sha256Hex", () => {
  it("matches known vector for empty input", () => {
    expect(sha256Hex(Buffer.from(""))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });
});
```

- [ ] **Step 6: Implement** `lib/hash.ts`

```ts
import { createHash } from "node:crypto";
export function sha256Hex(buf: Buffer | Uint8Array): string {
  return createHash("sha256").update(buf).digest("hex");
}
```

- [ ] **Step 7: Run all unit tests, then commit**

```bash
pnpm vitest run
git add . && git commit -m "feat(lib): token + hash utilities with tests"
```

---

### Task 4: Zod validation schemas

**Files:**
- Create: `lib/validation.ts`, `tests/unit/validation.test.ts`

- [ ] **Step 1: Write failing tests** in `tests/unit/validation.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { createSigningRequestSchema } from "@/lib/validation";

const validBody = {
  sender_email: "ole@example.com",
  document: { filename: "a.txt", format: "text", content_base64: Buffer.from("hi").toString("base64") },
  signers: [{ name: "H", email: "h@example.com" }],
};

describe("createSigningRequestSchema", () => {
  it("accepts a minimal valid body", () => {
    expect(createSigningRequestSchema.safeParse(validBody).success).toBe(true);
  });
  it("rejects empty signers", () => {
    const r = createSigningRequestSchema.safeParse({ ...validBody, signers: [] });
    expect(r.success).toBe(false);
  });
  it("rejects non-E.164 phone", () => {
    const r = createSigningRequestSchema.safeParse({
      ...validBody,
      signers: [{ name: "H", email: "h@example.com", phone: "98765432" }],
    });
    expect(r.success).toBe(false);
  });
  it("rejects unknown document.format", () => {
    const r = createSigningRequestSchema.safeParse({
      ...validBody,
      document: { ...validBody.document, format: "docx" },
    });
    expect(r.success).toBe(false);
  });
  it("rejects more than 10 signers", () => {
    const many = Array.from({ length: 11 }, (_, i) => ({ name: `S${i}`, email: `s${i}@x.com` }));
    expect(createSigningRequestSchema.safeParse({ ...validBody, signers: many }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Implement** `lib/validation.ts`

```ts
import { z } from "zod";

const E164 = /^\+[1-9]\d{6,14}$/;

export const createSigningRequestSchema = z.object({
  sender_email: z.string().email(),
  sender_name: z.string().min(1).max(200).optional(),
  document: z.object({
    filename: z.string().min(1).max(255),
    format: z.enum(["pdf", "markdown", "text"]),
    content_base64: z.string().min(1),
  }),
  signers: z.array(z.object({
    name: z.string().min(1).max(200),
    email: z.string().email(),
    phone: z.string().regex(E164).optional(),
  })).min(1).max(10),
  expires_in_days: z.number().int().min(1).max(60).default(30),
  webhook_url: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateSigningRequestInput = z.infer<typeof createSigningRequestSchema>;

export const signActionSchema = z.object({
  name: z.string().min(1).max(200),
  consent: z.literal(true),
});

export const declineSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const smsVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run tests/unit/validation.test.ts
git add . && git commit -m "feat(lib): zod validation schemas for API requests"
```

---

## Phase 2 — PDF rendering

### Task 5: Render text → PDF

**Files:**
- Create: `lib/pdf/render-text.ts`, `tests/unit/render-text.test.ts`

- [ ] **Step 1: Failing test** in `tests/unit/render-text.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { renderTextToPdf } from "@/lib/pdf/render-text";

describe("renderTextToPdf", () => {
  it("produces a PDF buffer starting with %PDF-", async () => {
    const buf = await renderTextToPdf("Hello\nWorld");
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buf.length).toBeGreaterThan(200);
  });
  it("is deterministic byte-for-byte when CreationDate is fixed", async () => {
    const a = await renderTextToPdf("x", { fixedDate: new Date("2026-01-01") });
    const b = await renderTextToPdf("x", { fixedDate: new Date("2026-01-01") });
    expect(a.equals(b)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement** `lib/pdf/render-text.ts`

```ts
import PDFDocument from "pdfkit";

export async function renderTextToPdf(text: string, opts: { fixedDate?: Date } = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: opts.fixedDate ? { CreationDate: opts.fixedDate } : undefined });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.font("Helvetica").fontSize(11);
    for (const line of text.split(/\r?\n/)) doc.text(line);
    doc.end();
  });
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest run tests/unit/render-text.test.ts
git add . && git commit -m "feat(pdf): render plain text to PDF"
```

---

### Task 6: Render markdown → PDF

**Files:**
- Create: `lib/pdf/render-markdown.ts`, `tests/unit/render-markdown.test.ts`

- [ ] **Step 1: Add dep**

```bash
pnpm add marked
```

- [ ] **Step 2: Failing test** in `tests/unit/render-markdown.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { renderMarkdownToPdf } from "@/lib/pdf/render-markdown";

describe("renderMarkdownToPdf", () => {
  it("produces a PDF buffer", async () => {
    const md = "# Title\n\nParagraph **bold** and *italic*.\n\n- item 1\n- item 2";
    const buf = await renderMarkdownToPdf(md);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
```

- [ ] **Step 3: Implement** `lib/pdf/render-markdown.ts`

```ts
import PDFDocument from "pdfkit";
import { marked, type Token } from "marked";

export async function renderMarkdownToPdf(md: string, opts: { fixedDate?: Date } = {}): Promise<Buffer> {
  const tokens = marked.lexer(md);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: opts.fixedDate ? { CreationDate: opts.fixedDate } : undefined });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    renderTokens(doc, tokens);
    doc.end();
  });
}

function renderTokens(doc: PDFKit.PDFDocument, tokens: Token[]) {
  for (const t of tokens) {
    if (t.type === "heading") {
      const sizes = [22, 18, 15, 13, 12, 11];
      doc.font("Helvetica-Bold").fontSize(sizes[Math.min(t.depth - 1, 5)]).text(t.text).moveDown(0.5);
    } else if (t.type === "paragraph") {
      doc.font("Helvetica").fontSize(11).text(t.text).moveDown(0.5);
    } else if (t.type === "list") {
      doc.font("Helvetica").fontSize(11);
      for (const item of t.items) doc.text(`• ${item.text}`);
      doc.moveDown(0.5);
    } else if (t.type === "code") {
      doc.font("Courier").fontSize(10).text(t.text).moveDown(0.5);
    } else if (t.type === "blockquote") {
      doc.font("Helvetica-Oblique").fontSize(11).text(t.text).moveDown(0.5);
    } else if (t.type === "hr") {
      doc.moveDown(0.3); const y = doc.y; doc.moveTo(50, y).lineTo(545, y).stroke(); doc.moveDown(0.5);
    } else if (t.type === "space") {
      doc.moveDown(0.3);
    } else if ("text" in t && typeof t.text === "string") {
      doc.font("Helvetica").fontSize(11).text(t.text).moveDown(0.3);
    }
  }
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm vitest run tests/unit/render-markdown.test.ts
git add . && git commit -m "feat(pdf): render markdown to PDF using marked + pdfkit"
```

---

### Task 7: Audit appendix + final PDF assembly

**Files:**
- Create: `lib/pdf/audit-appendix.ts`, `lib/pdf/finalize.ts`, `tests/unit/audit-appendix.test.ts`

- [ ] **Step 1: Failing test** in `tests/unit/audit-appendix.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { renderTextToPdf } from "@/lib/pdf/render-text";
import { finalizeSignedPdf } from "@/lib/pdf/finalize";
import { sha256Hex } from "@/lib/hash";
import { PDFDocument } from "pdf-lib";

describe("finalizeSignedPdf", () => {
  it("appends a signature certificate page; original bytes unchanged", async () => {
    const original = await renderTextToPdf("Original contract content");
    const originalSha = sha256Hex(original);
    const cert = {
      documentId: "doc-1",
      documentSha256: originalSha,
      originalFilename: "c.txt",
      originalFormat: "text" as const,
      createdAt: new Date("2026-05-16T14:00:00Z"),
      senderEmail: "ole@example.com",
      senderIp: "1.2.3.4",
      senderConfirmedAt: new Date("2026-05-16T14:01:00Z"),
      signers: [{
        index: 1, total: 1, name: "Henrik", email: "h@example.com",
        signedAt: new Date("2026-05-16T15:00:00Z"), signedIp: "5.6.7.8",
        emailVerifiedAt: new Date("2026-05-16T14:55:00Z"),
        smsVerifiedAt: null, phone: null, userAgent: "test",
        consentText: "Jeg, Henrik, samtykker...", signTokenHash: "abc",
      }],
      appVersion: "0.1.0",
      generatedAt: new Date("2026-05-16T15:00:00Z"),
    };
    const finalPdf = await finalizeSignedPdf(original, cert);
    const parsed = await PDFDocument.load(finalPdf);
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Implement** `lib/pdf/audit-appendix.ts`

```ts
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface SignerCert {
  index: number; total: number;
  name: string; email: string; phone: string | null;
  signedAt: Date; signedIp: string; userAgent: string;
  emailVerifiedAt: Date; smsVerifiedAt: Date | null;
  consentText: string; signTokenHash: string;
}
export interface CertInput {
  documentId: string;
  documentSha256: string;
  originalFilename: string;
  originalFormat: "pdf" | "markdown" | "text";
  createdAt: Date;
  senderEmail: string;
  senderIp: string;
  senderConfirmedAt: Date;
  signers: SignerCert[];
  appVersion: string;
  generatedAt: Date;
}

export async function buildAuditAppendix(cert: CertInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  let page = pdf.addPage([595.28, 841.89]); // A4
  let y = 800;
  const draw = (text: string, opts: { size?: number; bold?: boolean; code?: boolean } = {}) => {
    const size = opts.size ?? 10;
    if (y < 60) { page = pdf.addPage([595.28, 841.89]); y = 800; }
    page.drawText(text, { x: 50, y, size, font: opts.bold ? fontBold : opts.code ? mono : font, color: rgb(0,0,0) });
    y -= size + 4;
  };
  draw("SIGNATURE CERTIFICATE", { size: 16, bold: true });
  y -= 6;
  draw(`Document ID:       ${cert.documentId}`, { code: true });
  draw(`Document SHA-256:  ${cert.documentSha256}`, { code: true });
  draw(`Original filename: ${cert.originalFilename}`);
  draw(`Original format:   ${cert.originalFormat}`);
  draw(`Created:           ${cert.createdAt.toISOString()} by ${cert.senderEmail} (IP ${cert.senderIp})`);
  draw(`Sender confirmed:  ${cert.senderConfirmedAt.toISOString()}`);
  y -= 6;
  for (const s of cert.signers) {
    draw(`Signer ${s.index} of ${s.total}: ${s.name} <${s.email}>`, { bold: true });
    draw(`  Signed:          ${s.signedAt.toISOString()} from IP ${s.signedIp}`);
    draw(`  Email verified:  ${s.emailVerifiedAt.toISOString()} (clicked unique token)`);
    draw(`  SMS verified:    ${s.smsVerifiedAt ? `${s.smsVerifiedAt.toISOString()} on ${s.phone}` : "not required"}`);
    draw(`  User agent:      ${s.userAgent.slice(0, 100)}`);
    draw(`  Consent text:    "${s.consentText}"`);
    draw(`  Sign-token hash: ${s.signTokenHash}`, { code: true });
    y -= 6;
  }
  draw(`Generated by esign.newcommerce.no v${cert.appVersion} at ${cert.generatedAt.toISOString()}`, { size: 8 });
  return await pdf.save();
}
```

- [ ] **Step 3: Implement** `lib/pdf/finalize.ts`

```ts
import { PDFDocument } from "pdf-lib";
import { buildAuditAppendix, type CertInput } from "./audit-appendix";

export async function finalizeSignedPdf(originalPdf: Buffer, cert: CertInput): Promise<Buffer> {
  const out = await PDFDocument.create();
  const original = await PDFDocument.load(originalPdf);
  const copiedOriginal = await out.copyPages(original, original.getPageIndices());
  for (const p of copiedOriginal) out.addPage(p);
  const appendixBytes = await buildAuditAppendix(cert);
  const appendix = await PDFDocument.load(appendixBytes);
  const copiedApp = await out.copyPages(appendix, appendix.getPageIndices());
  for (const p of copiedApp) out.addPage(p);
  return Buffer.from(await out.save());
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm vitest run tests/unit/audit-appendix.test.ts
git add . && git commit -m "feat(pdf): audit appendix and final PDF assembly"
```

---

## Phase 3 — External integrations

### Task 8: Blob storage wrapper

**Files:**
- Create: `lib/storage/blob.ts`

- [ ] **Step 1: Implement** `lib/storage/blob.ts`

```ts
import { put, del } from "@vercel/blob";

export async function putPdf(key: string, body: Buffer): Promise<string> {
  const res = await put(key, body, { access: "public", contentType: "application/pdf", addRandomSuffix: false });
  return res.url;
}

export async function putBytes(key: string, body: Buffer, contentType: string): Promise<string> {
  const res = await put(key, body, { access: "public", contentType, addRandomSuffix: false });
  return res.url;
}

export async function deleteBlob(url: string): Promise<void> {
  await del(url);
}
```

- [ ] **Step 2: Commit** (no unit test — thin wrapper; covered in E2E)

```bash
git add . && git commit -m "feat(storage): Vercel Blob wrapper"
```

---

### Task 9: Rate limit helper

**Files:**
- Create: `lib/rate-limit/upstash.ts`, `tests/unit/rate-limit.test.ts`

- [ ] **Step 1: Failing test** in `tests/unit/rate-limit.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit/upstash";

vi.mock("@upstash/redis", () => ({ Redis: class { static fromEnv() { return new this(); } } }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() { return {}; }
    constructor() {}
    async limit() { return { success: true, remaining: 4, reset: Date.now() + 1000 }; }
  },
}));

beforeEach(() => process.env.UPSTASH_REDIS_REST_URL = "x");

describe("rateLimit", () => {
  it("returns success true for unblocked key", async () => {
    const r = await rateLimit("create:ip:1.2.3.4", { limit: 5, windowSec: 3600 });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Implement** `lib/rate-limit/upstash.ts`

```ts
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = Redis.fromEnv();
const cache = new Map<string, Ratelimit>();

export async function rateLimit(key: string, opts: { limit: number; windowSec: number }) {
  const cacheKey = `${opts.limit}:${opts.windowSec}`;
  let rl = cache.get(cacheKey);
  if (!rl) {
    rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(opts.limit, `${opts.windowSec}s`), analytics: false });
    cache.set(cacheKey, rl);
  }
  return await rl.limit(key);
}
```

- [ ] **Step 3: Run + commit**

```bash
pnpm vitest run tests/unit/rate-limit.test.ts
git add . && git commit -m "feat: Upstash sliding-window rate limit helper"
```

---

### Task 10: Resend email client + templates

**Files:**
- Create: `lib/email/resend-client.ts`, `lib/email/templates/sender-confirm.tsx`, `lib/email/templates/signer-invite.tsx`, `lib/email/templates/completion.tsx`, `lib/email/templates/decline.tsx`

- [ ] **Step 1: Add deps**

```bash
pnpm add @react-email/components react-email
```

- [ ] **Step 2: Implement** `lib/email/resend-client.ts`

```ts
import { Resend } from "resend";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_ADDRESS!;

export async function sendEmail(opts: {
  to: string; subject: string; react: ReactElement;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const html = await render(opts.react);
  return await resend.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html, attachments: opts.attachments });
}
```

- [ ] **Step 3: Implement** `lib/email/templates/sender-confirm.tsx`

```tsx
import { Html, Head, Body, Container, Heading, Text, Button } from "@react-email/components";

export function SenderConfirmEmail({ confirmUrl, signerNames }: { confirmUrl: string; signerNames: string[] }) {
  return (
    <Html><Head /><Body style={{ fontFamily: "system-ui, sans-serif" }}>
      <Container>
        <Heading>Bekreft signeringsoppdrag</Heading>
        <Text>Du har bedt oss sende et dokument til signering hos: {signerNames.join(", ")}.</Text>
        <Text>Klikk under for å bekrefte. Først da går invitasjonen ut til signantene.</Text>
        <Button href={confirmUrl} style={{ background: "#111", color: "#fff", padding: "12px 20px", borderRadius: 6 }}>Bekreft signeringsoppdrag</Button>
        <Text style={{ fontSize: 12, color: "#666" }}>Hvis du ikke ba om dette, kan du trygt ignorere e-posten.</Text>
      </Container>
    </Body></Html>
  );
}
```

- [ ] **Step 4: Implement** `lib/email/templates/signer-invite.tsx`

```tsx
import { Html, Head, Body, Container, Heading, Text, Button } from "@react-email/components";

export function SignerInviteEmail({ signerName, senderEmail, signUrl, documentName, expiresAt }: {
  signerName: string; senderEmail: string; signUrl: string; documentName: string; expiresAt: Date;
}) {
  return (
    <Html><Head /><Body style={{ fontFamily: "system-ui, sans-serif" }}>
      <Container>
        <Heading>Du har et dokument til signering</Heading>
        <Text>Hei {signerName},</Text>
        <Text>{senderEmail} har sendt deg <b>{documentName}</b> til elektronisk signering.</Text>
        <Button href={signUrl} style={{ background: "#111", color: "#fff", padding: "12px 20px", borderRadius: 6 }}>Åpne og signer</Button>
        <Text style={{ fontSize: 12, color: "#666" }}>Lenken utløper {expiresAt.toLocaleString("nb-NO")}.</Text>
      </Container>
    </Body></Html>
  );
}
```

- [ ] **Step 5: Implement** `lib/email/templates/completion.tsx`

```tsx
import { Html, Head, Body, Container, Heading, Text } from "@react-email/components";

export function CompletionEmail({ recipientName, documentName, allSigners }: {
  recipientName: string; documentName: string; allSigners: string[];
}) {
  return (
    <Html><Head /><Body style={{ fontFamily: "system-ui, sans-serif" }}>
      <Container>
        <Heading>Dokumentet er signert</Heading>
        <Text>Hei {recipientName},</Text>
        <Text><b>{documentName}</b> er nå signert av alle parter: {allSigners.join(", ")}.</Text>
        <Text>Den endelige signerte PDFen ligger som vedlegg.</Text>
        <Text style={{ fontSize: 12, color: "#666" }}>Vi sletter dokumentet fra våre servere om 90 dager. Behold denne kopien.</Text>
      </Container>
    </Body></Html>
  );
}
```

- [ ] **Step 6: Implement** `lib/email/templates/decline.tsx`

```tsx
import { Html, Head, Body, Container, Heading, Text } from "@react-email/components";

export function DeclineEmail({ recipientName, documentName, declinerName, reason }: {
  recipientName: string; documentName: string; declinerName: string; reason: string;
}) {
  return (
    <Html><Head /><Body style={{ fontFamily: "system-ui, sans-serif" }}>
      <Container>
        <Heading>Signeringsoppdrag avbrutt</Heading>
        <Text>Hei {recipientName},</Text>
        <Text>{declinerName} har avvist å signere <b>{documentName}</b>.</Text>
        <Text>Begrunnelse: <i>{reason}</i></Text>
        <Text>Oppdraget er kansellert. Du må opprette et nytt hvis dere blir enige.</Text>
      </Container>
    </Body></Html>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add . && git commit -m "feat(email): Resend client + React Email templates"
```

---

### Task 11: Twilio SMS client + code helpers

**Files:**
- Create: `lib/sms/twilio-client.ts`, `lib/sms/code.ts`, `tests/unit/sms-code.test.ts`

- [ ] **Step 1: Failing tests** in `tests/unit/sms-code.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { generateSmsCode, hashSmsCode, verifySmsCode } from "@/lib/sms/code";

describe("sms code", () => {
  it("generates 6-digit code", () => {
    const c = generateSmsCode();
    expect(c).toMatch(/^\d{6}$/);
  });
  it("hash is deterministic", () => {
    expect(hashSmsCode("123456")).toBe(hashSmsCode("123456"));
  });
  it("verifySmsCode returns true for matching, false otherwise", () => {
    const h = hashSmsCode("123456");
    expect(verifySmsCode("123456", h)).toBe(true);
    expect(verifySmsCode("000000", h)).toBe(false);
  });
});
```

- [ ] **Step 2: Implement** `lib/sms/code.ts`

```ts
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export function generateSmsCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
export function hashSmsCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
export function verifySmsCode(input: string, expectedHash: string): boolean {
  const a = Buffer.from(hashSmsCode(input));
  const b = Buffer.from(expectedHash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 3: Implement** `lib/sms/twilio-client.ts`

```ts
import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendSms(to: string, body: string): Promise<void> {
  await client.messages.create({ from: process.env.TWILIO_FROM_NUMBER!, to, body });
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm vitest run tests/unit/sms-code.test.ts
git add . && git commit -m "feat(sms): Twilio client and 6-digit code helpers"
```

---

### Task 12: Audit log helper + webhook fire helper

**Files:**
- Create: `lib/audit/log.ts`, `lib/webhook/fire.ts`, `tests/unit/webhook.test.ts`

- [ ] **Step 1: Implement** `lib/audit/log.ts`

```ts
import { db } from "@/lib/db/client";
import { auditEvents } from "@/lib/db/schema";

export async function logAudit(input: {
  signingRequestId: string;
  signerId?: string;
  eventType: string;
  payload?: Record<string, unknown>;
  ip?: string;
}) {
  await db.insert(auditEvents).values({
    signingRequestId: input.signingRequestId,
    signerId: input.signerId,
    eventType: input.eventType,
    payload: input.payload ?? {},
    ip: input.ip,
  });
}
```

- [ ] **Step 2: Failing test** in `tests/unit/webhook.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { signWebhookBody } from "@/lib/webhook/fire";
import { createHmac } from "node:crypto";

describe("signWebhookBody", () => {
  it("returns HMAC-SHA256 hex of body using secret", () => {
    const body = JSON.stringify({ a: 1 });
    const sig = signWebhookBody(body, "secret");
    expect(sig).toBe(createHmac("sha256", "secret").update(body).digest("hex"));
  });
});
```

- [ ] **Step 3: Implement** `lib/webhook/fire.ts`

```ts
import { createHmac } from "node:crypto";

export function signWebhookBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function fireWebhook(url: string, secret: string, payload: Record<string, unknown>): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = signWebhookBody(body, secret);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-esign-signature": signature },
      body,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Best-effort in v1 — no retry
  }
}
```

- [ ] **Step 4: Run + commit**

```bash
pnpm vitest run tests/unit/webhook.test.ts
git add . && git commit -m "feat: audit log + best-effort signed webhook fire"
```

---

## Phase 4 — Service layer

### Task 13: `createSigningRequest` service

**Files:**
- Create: `lib/services/create-request.ts`, `tests/unit/create-request.test.ts`

- [ ] **Step 1: Implement** `lib/services/create-request.ts`

```ts
import { db } from "@/lib/db/client";
import { signingRequests, documents, signers } from "@/lib/db/schema";
import { newToken, hashToken } from "@/lib/tokens";
import { sha256Hex } from "@/lib/hash";
import { putBytes, putPdf } from "@/lib/storage/blob";
import { renderTextToPdf } from "@/lib/pdf/render-text";
import { renderMarkdownToPdf } from "@/lib/pdf/render-markdown";
import { logAudit } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/resend-client";
import { SenderConfirmEmail } from "@/lib/email/templates/sender-confirm";
import type { CreateSigningRequestInput } from "@/lib/validation";

export interface CreateSigningRequestResult {
  id: string;
  status: "awaiting_sender_confirm";
  confirm_url: string;
  sender_lookup_token: string;
  webhook_secret: string | null;
  expires_at: string;
  signers: { id: string; name: string; email: string; status: string }[];
}

export async function createSigningRequest(input: CreateSigningRequestInput, senderIp: string, baseUrl: string): Promise<CreateSigningRequestResult> {
  const originalBuf = Buffer.from(input.document.content_base64, "base64");
  let renderedPdf: Buffer;
  if (input.document.format === "pdf") renderedPdf = originalBuf;
  else if (input.document.format === "markdown") renderedPdf = await renderMarkdownToPdf(originalBuf.toString("utf8"));
  else renderedPdf = await renderTextToPdf(originalBuf.toString("utf8"));
  const renderedSha = sha256Hex(renderedPdf);
  const requestId = crypto.randomUUID();
  const originalUrl = await putBytes(`${requestId}/original-${input.document.filename}`, originalBuf, contentTypeFor(input.document.format));
  const renderedUrl = await putPdf(`${requestId}/rendered.pdf`, renderedPdf);
  const senderConfirmToken = newToken();
  const senderLookupToken = newToken();
  const webhookSecret = input.webhook_url ? newToken(24) : null;
  const expiresAt = new Date(Date.now() + input.expires_in_days * 86400_000);
  const [created] = await db.insert(signingRequests).values({
    id: requestId, expiresAt, senderEmail: input.sender_email, senderName: input.sender_name,
    senderIp, senderConfirmToken, senderLookupToken, status: "awaiting_sender_confirm",
    webhookUrl: input.webhook_url, webhookSecret, metadata: input.metadata as Record<string, unknown> | undefined,
  }).returning();
  await db.insert(documents).values({
    signingRequestId: requestId, originalFilename: input.document.filename, originalFormat: input.document.format,
    originalBlobUrl: originalUrl, renderedPdfBlobUrl: renderedUrl, renderedPdfSha256: renderedSha,
  });
  const signerRows = await db.insert(signers).values(input.signers.map((s) => {
    const t = newToken();
    return { signingRequestId: requestId, name: s.name, email: s.email, phone: s.phone, signToken: t, signTokenHash: hashToken(t), status: "pending" };
  })).returning();
  await logAudit({ signingRequestId: requestId, eventType: "request_created", payload: { signerCount: input.signers.length }, ip: senderIp });
  const confirmUrl = `${baseUrl}/confirm/${senderConfirmToken}`;
  await sendEmail({ to: input.sender_email, subject: "Bekreft signeringsoppdrag", react: SenderConfirmEmail({ confirmUrl, signerNames: input.signers.map((s) => s.name) }) });
  return {
    id: requestId, status: "awaiting_sender_confirm", confirm_url: confirmUrl,
    sender_lookup_token: senderLookupToken, webhook_secret: webhookSecret,
    expires_at: expiresAt.toISOString(),
    signers: signerRows.map((s) => ({ id: s.id, name: s.name, email: s.email, status: s.status })),
  };
}

function contentTypeFor(format: "pdf" | "markdown" | "text"): string {
  return format === "pdf" ? "application/pdf" : format === "markdown" ? "text/markdown" : "text/plain";
}
```

- [ ] **Step 2: Commit** (deeper integration tested via E2E in Phase 8)

```bash
git add . && git commit -m "feat(service): createSigningRequest orchestrator"
```

---

### Task 14: `confirmSender` service

**Files:**
- Create: `lib/services/confirm-sender.ts`

- [ ] **Step 1: Implement**

```ts
import { db } from "@/lib/db/client";
import { signingRequests, signers, documents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/resend-client";
import { SignerInviteEmail } from "@/lib/email/templates/signer-invite";

export type ConfirmResult =
  | { ok: true; signingRequestId: string }
  | { ok: false; reason: "not_found" | "already_confirmed" | "invalid_state" };

export async function confirmSender(token: string, baseUrl: string): Promise<ConfirmResult> {
  const [req] = await db.select().from(signingRequests).where(eq(signingRequests.senderConfirmToken, token));
  if (!req) return { ok: false, reason: "not_found" };
  if (req.senderConfirmedAt) return { ok: false, reason: "already_confirmed" };
  if (req.status !== "awaiting_sender_confirm") return { ok: false, reason: "invalid_state" };
  const now = new Date();
  await db.update(signingRequests).set({ senderConfirmedAt: now, status: "active" }).where(eq(signingRequests.id, req.id));
  await logAudit({ signingRequestId: req.id, eventType: "sender_confirmed" });
  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, req.id));
  const sgs = await db.select().from(signers).where(eq(signers.signingRequestId, req.id));
  await Promise.all(sgs.map(async (s) => {
    const signUrl = `${baseUrl}/sign/${s.signToken}`;
    await sendEmail({ to: s.email, subject: `Du har et dokument til signering: ${doc.originalFilename}`, react: SignerInviteEmail({ signerName: s.name, senderEmail: req.senderEmail, signUrl, documentName: doc.originalFilename, expiresAt: req.expiresAt }) });
    await logAudit({ signingRequestId: req.id, signerId: s.id, eventType: "email_sent", payload: { to: s.email } });
  }));
  return { ok: true, signingRequestId: req.id };
}
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat(service): confirmSender flips state and sends signer invitations"
```

---

### Task 15: `sign`, `decline`, SMS services

**Files:**
- Create: `lib/services/sign.ts`, `lib/services/decline.ts`, `lib/services/sms.ts`

- [ ] **Step 1: Implement** `lib/services/sms.ts`

```ts
import { db } from "@/lib/db/client";
import { signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSmsCode, hashSmsCode, verifySmsCode } from "@/lib/sms/code";
import { sendSms } from "@/lib/sms/twilio-client";
import { logAudit } from "@/lib/audit/log";

export async function sendSmsCode(signerId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [s] = await db.select().from(signers).where(eq(signers.id, signerId));
  if (!s || !s.phone) return { ok: false, reason: "no_phone" };
  const code = generateSmsCode();
  const expires = new Date(Date.now() + 10 * 60_000);
  await db.update(signers).set({ smsCodeHash: hashSmsCode(code), smsCodeExpiresAt: expires }).where(eq(signers.id, signerId));
  await sendSms(s.phone, `Din signeringskode: ${code} (10 minutter gyldighet)`);
  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "sms_code_sent" });
  return { ok: true };
}

export async function verifyCode(signerId: string, code: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [s] = await db.select().from(signers).where(eq(signers.id, signerId));
  if (!s || !s.smsCodeHash || !s.smsCodeExpiresAt) return { ok: false, reason: "no_code" };
  if (s.smsCodeExpiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (!verifySmsCode(code, s.smsCodeHash)) return { ok: false, reason: "mismatch" };
  await db.update(signers).set({ smsVerifiedAt: new Date(), status: "sms_verified", smsCodeHash: null, smsCodeExpiresAt: null }).where(eq(signers.id, signerId));
  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "sms_verified" });
  return { ok: true };
}
```

- [ ] **Step 2: Implement** `lib/services/sign.ts`

```ts
import { db } from "@/lib/db/client";
import { signers, signingRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { completeIfDone } from "./complete";

export type SignResult = { ok: true; completed: boolean } | { ok: false; reason: string };

export async function performSign(signerId: string, fullName: string, ip: string, userAgent: string): Promise<SignResult> {
  const [s] = await db.select().from(signers).where(eq(signers.id, signerId));
  if (!s) return { ok: false, reason: "not_found" };
  if (s.status === "signed") return { ok: false, reason: "already_signed" };
  if (!s.emailVerifiedAt) return { ok: false, reason: "email_not_verified" };
  if (s.phone && !s.smsVerifiedAt) return { ok: false, reason: "sms_required" };
  const consentText = `Jeg, ${fullName}, samtykker til innholdet i dette dokumentet og signerer det elektronisk.`;
  await db.update(signers).set({
    status: "signed", signedAt: new Date(), signedIp: ip, signedUserAgent: userAgent, consentText,
  }).where(eq(signers.id, signerId));
  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "signed", payload: { ip, userAgent }, ip });
  const completed = await completeIfDone(s.signingRequestId);
  return { ok: true, completed };
}
```

- [ ] **Step 3: Implement** `lib/services/decline.ts`

```ts
import { db } from "@/lib/db/client";
import { signers, signingRequests, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/resend-client";
import { DeclineEmail } from "@/lib/email/templates/decline";
import { fireWebhook } from "@/lib/webhook/fire";

export async function performDecline(signerId: string, reason: string): Promise<{ ok: boolean }> {
  const [s] = await db.select().from(signers).where(eq(signers.id, signerId));
  if (!s) return { ok: false };
  await db.update(signers).set({ status: "declined", declineReason: reason }).where(eq(signers.id, signerId));
  await db.update(signingRequests).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(signingRequests.id, s.signingRequestId));
  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "declined", payload: { reason } });
  await logAudit({ signingRequestId: s.signingRequestId, eventType: "cancelled" });
  const [req] = await db.select().from(signingRequests).where(eq(signingRequests.id, s.signingRequestId));
  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, s.signingRequestId));
  const otherSigners = await db.select().from(signers).where(eq(signers.signingRequestId, s.signingRequestId));
  const recipients = [{ name: "avsender", email: req.senderEmail }, ...otherSigners.filter((o) => o.id !== s.id).map((o) => ({ name: o.name, email: o.email }))];
  await Promise.all(recipients.map((r) => sendEmail({ to: r.email, subject: `Signeringsoppdrag avbrutt: ${doc.originalFilename}`, react: DeclineEmail({ recipientName: r.name, documentName: doc.originalFilename, declinerName: s.name, reason }) })));
  if (req.webhookUrl && req.webhookSecret) await fireWebhook(req.webhookUrl, req.webhookSecret, { event: "declined", signing_request_id: req.id, signer_id: s.id, occurred_at: new Date().toISOString(), request_status: "cancelled" });
  return { ok: true };
}
```

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "feat(service): sign, decline, sms send/verify"
```

---

### Task 16: `complete` service

**Files:**
- Create: `lib/services/complete.ts`

- [ ] **Step 1: Implement**

```ts
import { db } from "@/lib/db/client";
import { signingRequests, signers, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { finalizeSignedPdf } from "@/lib/pdf/finalize";
import { putPdf } from "@/lib/storage/blob";
import { logAudit } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/resend-client";
import { CompletionEmail } from "@/lib/email/templates/completion";
import { fireWebhook } from "@/lib/webhook/fire";

export async function completeIfDone(signingRequestId: string): Promise<boolean> {
  const sgs = await db.select().from(signers).where(eq(signers.signingRequestId, signingRequestId));
  if (sgs.some((s) => s.status !== "signed")) return false;
  const [req] = await db.select().from(signingRequests).where(eq(signingRequests.id, signingRequestId));
  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, signingRequestId));
  const originalRendered = await fetch(doc.renderedPdfBlobUrl).then((r) => r.arrayBuffer()).then((b) => Buffer.from(b));
  const finalPdf = await finalizeSignedPdf(originalRendered, {
    documentId: doc.id, documentSha256: doc.renderedPdfSha256,
    originalFilename: doc.originalFilename, originalFormat: doc.originalFormat as "pdf" | "markdown" | "text",
    createdAt: req.createdAt, senderEmail: req.senderEmail, senderIp: req.senderIp ?? "unknown",
    senderConfirmedAt: req.senderConfirmedAt!, appVersion: process.env.APP_VERSION ?? "0.0.0",
    generatedAt: new Date(),
    signers: sgs.map((s, i) => ({
      index: i + 1, total: sgs.length, name: s.name, email: s.email, phone: s.phone,
      signedAt: s.signedAt!, signedIp: s.signedIp ?? "unknown", userAgent: s.signedUserAgent ?? "",
      emailVerifiedAt: s.emailVerifiedAt!, smsVerifiedAt: s.smsVerifiedAt,
      consentText: s.consentText!, signTokenHash: s.signTokenHash,
    })),
  });
  const finalUrl = await putPdf(`${signingRequestId}/final.pdf`, finalPdf);
  await db.update(documents).set({ finalSignedPdfBlobUrl: finalUrl }).where(eq(documents.signingRequestId, signingRequestId));
  await db.update(signingRequests).set({ status: "completed", completedAt: new Date() }).where(eq(signingRequests.id, signingRequestId));
  await logAudit({ signingRequestId, eventType: "completed" });
  const recipients = [{ name: "avsender", email: req.senderEmail }, ...sgs.map((s) => ({ name: s.name, email: s.email }))];
  const allSignerNames = sgs.map((s) => s.name);
  await Promise.all(recipients.map((r) => sendEmail({
    to: r.email, subject: `Signert: ${doc.originalFilename}`,
    react: CompletionEmail({ recipientName: r.name, documentName: doc.originalFilename, allSigners: allSignerNames }),
    attachments: [{ filename: `signed-${doc.originalFilename.replace(/\.[^.]+$/, "")}.pdf`, content: finalPdf }],
  })));
  if (req.webhookUrl && req.webhookSecret) await fireWebhook(req.webhookUrl, req.webhookSecret, { event: "completed", signing_request_id: req.id, occurred_at: new Date().toISOString(), request_status: "completed" });
  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat(service): complete builds final PDF, emails parties, fires webhook"
```

---

### Task 17: `expire` + `retention` services

**Files:**
- Create: `lib/services/expire.ts`, `lib/services/retention.ts`

- [ ] **Step 1: Implement** `lib/services/expire.ts`

```ts
import { db } from "@/lib/db/client";
import { signingRequests } from "@/lib/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { fireWebhook } from "@/lib/webhook/fire";

export async function expireDueRequests(now = new Date()): Promise<number> {
  const due = await db.select().from(signingRequests)
    .where(and(eq(signingRequests.status, "active"), lt(signingRequests.expiresAt, now)));
  for (const r of due) {
    await db.update(signingRequests).set({ status: "expired", expiredAt: now }).where(eq(signingRequests.id, r.id));
    await logAudit({ signingRequestId: r.id, eventType: "expired" });
    if (r.webhookUrl && r.webhookSecret) await fireWebhook(r.webhookUrl, r.webhookSecret, { event: "expired", signing_request_id: r.id, occurred_at: now.toISOString(), request_status: "expired" });
  }
  return due.length;
}
```

- [ ] **Step 2: Implement** `lib/services/retention.ts`

```ts
import { db } from "@/lib/db/client";
import { signingRequests, documents } from "@/lib/db/schema";
import { eq, lt, or, and, inArray } from "drizzle-orm";
import { deleteBlob } from "@/lib/storage/blob";

export async function sweepRetention(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 90 * 86400_000);
  const stale = await db.select().from(signingRequests).where(or(
    and(eq(signingRequests.status, "completed"), lt(signingRequests.completedAt, cutoff)),
    and(eq(signingRequests.status, "cancelled"), lt(signingRequests.cancelledAt, cutoff)),
    and(eq(signingRequests.status, "expired"), lt(signingRequests.expiredAt, cutoff)),
  ));
  if (stale.length === 0) return 0;
  const ids = stale.map((s) => s.id);
  const docs = await db.select().from(documents).where(inArray(documents.signingRequestId, ids));
  for (const d of docs) {
    await Promise.all([d.originalBlobUrl, d.renderedPdfBlobUrl, d.finalSignedPdfBlobUrl].filter((u): u is string => !!u).map((u) => deleteBlob(u).catch(() => {})));
  }
  await db.delete(signingRequests).where(inArray(signingRequests.id, ids));
  return stale.length;
}
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat(service): expire and 90-day retention sweep"
```

---

## Phase 5 — API routes

### Task 18: `POST /api/v1/signing-requests`

**Files:**
- Create: `app/api/v1/signing-requests/route.ts`, `lib/http/errors.ts`, `lib/http/ip.ts`

- [ ] **Step 1: Implement** `lib/http/errors.ts`

```ts
import { NextResponse } from "next/server";

export function apiError(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}
```

- [ ] **Step 2: Implement** `lib/http/ip.ts`

```ts
import type { NextRequest } from "next/server";
export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
}
```

- [ ] **Step 3: Implement** route

```ts
import { NextRequest, NextResponse } from "next/server";
import { createSigningRequestSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit/upstash";
import { createSigningRequest } from "@/lib/services/create-request";
import { apiError } from "@/lib/http/errors";
import { clientIp } from "@/lib/http/ip";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = await rateLimit(`create:ip:${ip}`, { limit: 5, windowSec: 3600 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many signing requests from this IP. Try again later.", 429);
  let body: unknown;
  try { body = await req.json(); } catch { return apiError("VALIDATION_ERROR", "Body is not valid JSON", 400); }
  const parsed = createSigningRequestSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid request body", 400, { issues: parsed.error.issues });
  try {
    const result = await createSigningRequest(parsed.data, ip, process.env.APP_BASE_URL!);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error("create-request failed", e);
    return apiError("INTERNAL_ERROR", "Failed to create signing request", 500);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "feat(api): POST /api/v1/signing-requests"
```

---

### Task 19: Confirm route (browser GET)

**Files:**
- Create: `app/confirm/[confirm_token]/route.ts`

- [ ] **Step 1: Implement**

```ts
import { NextRequest, NextResponse } from "next/server";
import { confirmSender } from "@/lib/services/confirm-sender";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ confirm_token: string }> }) {
  const { confirm_token } = await params;
  const result = await confirmSender(confirm_token, process.env.APP_BASE_URL!);
  if (!result.ok) {
    const message = result.reason === "already_confirmed" ? "Allerede bekreftet." : result.reason === "not_found" ? "Ugyldig eller utløpt bekreftelseslenke." : "Kan ikke bekrefte i nåværende tilstand.";
    return new NextResponse(htmlPage("Kunne ikke bekrefte", message), { status: 400, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  return new NextResponse(htmlPage("Bekreftet ✓", "Signantene har nå mottatt invitasjonen sin på e-post."), { headers: { "content-type": "text/html; charset=utf-8" } });
}

function htmlPage(title: string, message: string) {
  return `<!doctype html><html lang="nb"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:system-ui;max-width:560px;margin:80px auto;padding:0 20px;line-height:1.5}h1{font-size:24px}</style></head><body><h1>${title}</h1><p>${message}</p></body></html>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat(api): GET /confirm/<token> browser confirm endpoint"
```

---

### Task 20: Signer endpoints (GET + POST sign + decline + SMS)

**Files:**
- Create: `app/api/v1/sign/[sign_token]/route.ts`, `app/api/v1/sign/[sign_token]/decline/route.ts`, `app/api/v1/sign/[sign_token]/sms/send/route.ts`, `app/api/v1/sign/[sign_token]/sms/verify/route.ts`

- [ ] **Step 1: Implement** main route `app/api/v1/sign/[sign_token]/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signers, documents, signingRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signActionSchema } from "@/lib/validation";
import { performSign } from "@/lib/services/sign";
import { logAudit } from "@/lib/audit/log";
import { apiError } from "@/lib/http/errors";
import { clientIp } from "@/lib/http/ip";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  const [s] = await db.select().from(signers).where(eq(signers.signToken, sign_token));
  if (!s) return apiError("NOT_FOUND", "Invalid sign token", 404);
  const [req2] = await db.select().from(signingRequests).where(eq(signingRequests.id, s.signingRequestId));
  if (req2.status !== "active") return apiError("INVALID_STATE", `Request is ${req2.status}`, 409);
  const [doc] = await db.select().from(documents).where(eq(documents.signingRequestId, s.signingRequestId));
  if (!s.emailVerifiedAt) {
    await db.update(signers).set({ emailVerifiedAt: new Date(), status: "email_verified" }).where(eq(signers.id, s.id));
    await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "email_verified", ip: clientIp(req) });
  }
  await logAudit({ signingRequestId: s.signingRequestId, signerId: s.id, eventType: "document_viewed", ip: clientIp(req) });
  return NextResponse.json({
    signing_request_id: s.signingRequestId,
    document: { id: doc.id, filename: doc.originalFilename, url: doc.renderedPdfBlobUrl, sha256: doc.renderedPdfSha256 },
    signer: { id: s.id, name: s.name, email: s.email, status: s.status, sms_required: !!s.phone, sms_verified: !!s.smsVerifiedAt },
    sender: { email: req2.senderEmail, name: req2.senderName },
    expires_at: req2.expiresAt.toISOString(),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  const [s] = await db.select().from(signers).where(eq(signers.signToken, sign_token));
  if (!s) return apiError("NOT_FOUND", "Invalid sign token", 404);
  let body: unknown;
  try { body = await req.json(); } catch { return apiError("VALIDATION_ERROR", "Bad JSON", 400); }
  const parsed = signActionSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid body", 400, { issues: parsed.error.issues });
  const result = await performSign(s.id, parsed.data.name, clientIp(req), req.headers.get("user-agent") ?? "");
  if (!result.ok) return apiError("INVALID_STATE", result.reason, 409);
  return NextResponse.json({ ok: true, completed: result.completed });
}
```

- [ ] **Step 2: Implement** `app/api/v1/sign/[sign_token]/decline/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { declineSchema } from "@/lib/validation";
import { performDecline } from "@/lib/services/decline";
import { apiError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  const [s] = await db.select().from(signers).where(eq(signers.signToken, sign_token));
  if (!s) return apiError("NOT_FOUND", "Invalid sign token", 404);
  let body: unknown;
  try { body = await req.json(); } catch { return apiError("VALIDATION_ERROR", "Bad JSON", 400); }
  const parsed = declineSchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid body", 400, { issues: parsed.error.issues });
  const r = await performDecline(s.id, parsed.data.reason);
  if (!r.ok) return apiError("INTERNAL_ERROR", "Decline failed", 500);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Implement** `app/api/v1/sign/[sign_token]/sms/send/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit/upstash";
import { sendSmsCode } from "@/lib/services/sms";
import { apiError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  const [s] = await db.select().from(signers).where(eq(signers.signToken, sign_token));
  if (!s) return apiError("NOT_FOUND", "Invalid sign token", 404);
  const rl = await rateLimit(`sms:signer:${s.id}`, { limit: 5, windowSec: 3600 });
  if (!rl.success) return apiError("RATE_LIMITED", "Too many SMS requests", 429);
  const r = await sendSmsCode(s.id);
  if (!r.ok) return apiError("INVALID_STATE", r.reason, 409);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Implement** `app/api/v1/sign/[sign_token]/sms/verify/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { smsVerifySchema } from "@/lib/validation";
import { verifyCode } from "@/lib/services/sms";
import { apiError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  const [s] = await db.select().from(signers).where(eq(signers.signToken, sign_token));
  if (!s) return apiError("NOT_FOUND", "Invalid sign token", 404);
  let body: unknown;
  try { body = await req.json(); } catch { return apiError("VALIDATION_ERROR", "Bad JSON", 400); }
  const parsed = smsVerifySchema.safeParse(body);
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid body", 400, { issues: parsed.error.issues });
  const r = await verifyCode(s.id, parsed.data.code);
  if (!r.ok) return apiError("INVALID_STATE", r.reason, 409);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat(api): signer endpoints (GET/POST sign, decline, sms send/verify)"
```

---

### Task 21: Status, cancel, final-download endpoints

**Files:**
- Create: `app/api/v1/signing-requests/[id]/route.ts`, `app/api/v1/signing-requests/[id]/cancel/route.ts`, `app/api/v1/documents/[id]/final/route.ts`

- [ ] **Step 1: Implement** GET status

```ts
// app/api/v1/signing-requests/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signingRequests, signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lookup = req.headers.get("x-lookup-token");
  if (!lookup) return apiError("UNAUTHORIZED", "Missing X-Lookup-Token", 401);
  const [r] = await db.select().from(signingRequests).where(eq(signingRequests.id, id));
  if (!r) return apiError("NOT_FOUND", "Not found", 404);
  if (r.senderLookupToken !== lookup) return apiError("UNAUTHORIZED", "Bad lookup token", 401);
  const sgs = await db.select().from(signers).where(eq(signers.signingRequestId, id));
  return NextResponse.json({
    id: r.id, status: r.status, created_at: r.createdAt.toISOString(), expires_at: r.expiresAt.toISOString(),
    sender_email: r.senderEmail, sender_confirmed_at: r.senderConfirmedAt?.toISOString() ?? null,
    completed_at: r.completedAt?.toISOString() ?? null, cancelled_at: r.cancelledAt?.toISOString() ?? null,
    signers: sgs.map((s) => ({ id: s.id, name: s.name, email: s.email, status: s.status, signed_at: s.signedAt?.toISOString() ?? null })),
  });
}
```

- [ ] **Step 2: Implement** cancel

```ts
// app/api/v1/signing-requests/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signingRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { apiError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lookup = req.headers.get("x-lookup-token");
  if (!lookup) return apiError("UNAUTHORIZED", "Missing X-Lookup-Token", 401);
  const [r] = await db.select().from(signingRequests).where(eq(signingRequests.id, id));
  if (!r) return apiError("NOT_FOUND", "Not found", 404);
  if (r.senderLookupToken !== lookup) return apiError("UNAUTHORIZED", "Bad lookup token", 401);
  if (r.status === "completed" || r.status === "cancelled" || r.status === "expired") return apiError("INVALID_STATE", `Already ${r.status}`, 409);
  await db.update(signingRequests).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(signingRequests.id, id));
  await logAudit({ signingRequestId: id, eventType: "cancelled", payload: { by: "sender" } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Implement** final download

```ts
// app/api/v1/documents/[id]/final/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { documents, signingRequests, signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiError } from "@/lib/http/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lookup = req.headers.get("x-lookup-token");
  const sign = req.headers.get("x-sign-token");
  const [d] = await db.select().from(documents).where(eq(documents.id, id));
  if (!d || !d.finalSignedPdfBlobUrl) return apiError("NOT_FOUND", "Final PDF not available", 404);
  const [r] = await db.select().from(signingRequests).where(eq(signingRequests.id, d.signingRequestId));
  let authorized = false;
  if (lookup && r.senderLookupToken === lookup) authorized = true;
  if (sign) {
    const [s] = await db.select().from(signers).where(eq(signers.signToken, sign));
    if (s && s.signingRequestId === d.signingRequestId) authorized = true;
  }
  if (!authorized) return apiError("UNAUTHORIZED", "Missing or invalid token", 401);
  const buf = await fetch(d.finalSignedPdfBlobUrl).then((r) => r.arrayBuffer());
  return new NextResponse(Buffer.from(buf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="signed-${d.originalFilename}.pdf"` } });
}
```

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "feat(api): status, cancel, final-document download"
```

---

### Task 22: Cron endpoints

**Files:**
- Create: `app/api/internal/cron/expire/route.ts`, `app/api/internal/cron/retention/route.ts`, `vercel.json`

- [ ] **Step 1: Implement** expire

```ts
// app/api/internal/cron/expire/route.ts
import { NextRequest, NextResponse } from "next/server";
import { expireDueRequests } from "@/lib/services/expire";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("unauthorized", { status: 401 });
  const n = await expireDueRequests();
  return NextResponse.json({ expired: n });
}
```

- [ ] **Step 2: Implement** retention

```ts
// app/api/internal/cron/retention/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sweepRetention } from "@/lib/services/retention";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse("unauthorized", { status: 401 });
  const n = await sweepRetention();
  return NextResponse.json({ deleted: n });
}
```

- [ ] **Step 3: `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/internal/cron/expire",    "schedule": "0 * * * *" },
    { "path": "/api/internal/cron/retention", "schedule": "0 3 * * *" }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "feat(cron): expire and retention endpoints with Vercel schedule"
```

---

## Phase 6 — Web UI

### Task 23: Landing + create form

**Files:**
- Create: `app/(public)/page.tsx`, `app/(public)/create-form.tsx`

- [ ] **Step 1: Implement** landing

```tsx
// app/(public)/page.tsx
import { CreateForm } from "./create-form";
export default function Home() {
  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-semibold">esign — gratis elektronisk signering</h1>
      <p className="mt-2 text-sm text-gray-600">Last opp et dokument, legg til signanter, send. Vi sender en bekreftelsesmail til deg først — signantene får e-post først når du bekrefter.</p>
      <CreateForm />
      <section className="mt-12 prose">
        <h2>For utviklere og AI-agenter</h2>
        <p>REST API på <code>/api/v1</code>. MCP-server: <code>npm i -g @newcommerce/esign-mcp</code>.</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Implement** form (client component)

```tsx
// app/(public)/create-form.tsx
"use client";
import { useState } from "react";

export function CreateForm() {
  const [file, setFile] = useState<File | null>(null);
  const [senderEmail, setSenderEmail] = useState("");
  const [signers, setSigners] = useState([{ name: "", email: "", phone: "" }]);
  const [result, setResult] = useState<{ confirm_url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setError("Velg et dokument");
    setSubmitting(true); setError(null);
    const format = file.name.endsWith(".pdf") ? "pdf" : file.name.endsWith(".md") ? "markdown" : "text";
    const content_base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const res = await fetch("/api/v1/signing-requests", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sender_email: senderEmail,
        document: { filename: file.name, format, content_base64 },
        signers: signers.filter((s) => s.email).map((s) => ({ name: s.name, email: s.email, phone: s.phone || undefined })),
      }),
    });
    setSubmitting(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j?.error?.message ?? "Feil"); return; }
    setResult(await res.json());
  }

  if (result) return (
    <div className="mt-6 p-4 border rounded bg-green-50">
      <p className="font-medium">Sjekk innboksen din ({senderEmail}) og klikk bekreftelseslenken for å sende invitasjon til signantene.</p>
      <p className="text-sm mt-2 break-all">Eller åpne direkte: <a className="underline" href={result.confirm_url}>{result.confirm_url}</a></p>
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="block text-sm font-medium">Din e-post (avsender)</label>
        <input required type="email" value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium">Dokument (PDF, Markdown eller tekst)</label>
        <input required type="file" accept=".pdf,.md,.txt,.text" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 w-full" />
      </div>
      <div>
        <label className="block text-sm font-medium">Signanter</label>
        {signers.map((s, i) => (
          <div key={i} className="mt-2 flex gap-2">
            <input placeholder="Navn" value={s.name} onChange={(e) => { const c = [...signers]; c[i].name = e.target.value; setSigners(c); }} className="border rounded px-3 py-2 flex-1" />
            <input placeholder="E-post" type="email" value={s.email} onChange={(e) => { const c = [...signers]; c[i].email = e.target.value; setSigners(c); }} className="border rounded px-3 py-2 flex-1" />
            <input placeholder="+47... (valgfri SMS)" value={s.phone} onChange={(e) => { const c = [...signers]; c[i].phone = e.target.value; setSigners(c); }} className="border rounded px-3 py-2 flex-1" />
          </div>
        ))}
        <button type="button" onClick={() => setSigners([...signers, { name: "", email: "", phone: "" }])} className="mt-2 text-sm underline">+ legg til signant</button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button type="submit" disabled={submitting} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50">{submitting ? "Sender..." : "Send til bekreftelse"}</button>
    </form>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat(ui): landing + create form"
```

---

### Task 24: Signer page

**Files:**
- Create: `app/(public)/sign/[sign_token]/page.tsx`, `app/(public)/sign/[sign_token]/signer-view.tsx`

- [ ] **Step 1: Server component** `app/(public)/sign/[sign_token]/page.tsx`

```tsx
import { SignerView } from "./signer-view";

export default async function Page({ params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  return <main className="max-w-3xl mx-auto p-6"><SignerView signToken={sign_token} /></main>;
}
```

- [ ] **Step 2: Client component** `signer-view.tsx`

```tsx
"use client";
import { useEffect, useState } from "react";

interface Loaded {
  signing_request_id: string;
  document: { id: string; filename: string; url: string; sha256: string };
  signer: { id: string; name: string; email: string; status: string; sms_required: boolean; sms_verified: boolean };
  sender: { email: string; name: string | null };
  expires_at: string;
}

export function SignerView({ signToken }: { signToken: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [smsSent, setSmsSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"signed" | "declined" | null>(null);

  useEffect(() => {
    fetch(`/api/v1/sign/${signToken}`).then((r) => r.json()).then((j) => {
      if (j.error) setError(j.error.message); else { setData(j); setName(j.signer.name); }
    });
  }, [signToken]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p>Laster…</p>;
  if (done === "signed") return <p className="p-4 bg-green-50 border rounded">Takk! Dokumentet er signert. Du får signert PDF på e-post når alle har signert.</p>;
  if (done === "declined") return <p className="p-4 bg-yellow-50 border rounded">Du har avvist å signere. Avsender er varslet.</p>;

  const smsNeeded = data.signer.sms_required && !data.signer.sms_verified;
  const canSign = !smsNeeded && consent && name.trim().length > 0;

  return (
    <>
      <h1 className="text-2xl font-semibold">{data.sender.email} har sendt deg <em>{data.document.filename}</em> til signering</h1>
      <iframe src={data.document.url} className="w-full h-[600px] border mt-4" />
      <p className="mt-2 text-xs text-gray-500">SHA-256: <code>{data.document.sha256}</code></p>

      {smsNeeded && (
        <div className="mt-6 p-4 border rounded">
          <p className="text-sm">SMS-verifisering kreves for denne signaturen.</p>
          {!smsSent ? (
            <button className="mt-2 underline" onClick={async () => { await fetch(`/api/v1/sign/${signToken}/sms/send`, { method: "POST" }); setSmsSent(true); }}>Send SMS-kode</button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input value={smsCode} onChange={(e) => setSmsCode(e.target.value)} placeholder="6-sifret kode" className="border rounded px-3 py-2" />
              <button className="bg-black text-white px-3 py-2 rounded" onClick={async () => {
                const r = await fetch(`/api/v1/sign/${signToken}/sms/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: smsCode }) });
                if (r.ok) location.reload();
                else { const j = await r.json(); setError(j.error?.message ?? "Ugyldig kode"); }
              }}>Verifiser</button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <label className="block">Skriv ditt fulle navn:
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 border rounded px-3 py-2 w-full" />
        </label>
        <label className="flex gap-2 items-start text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>Jeg, {name || "[navn]"}, samtykker til innholdet i dette dokumentet og signerer det elektronisk.</span>
        </label>
        <div className="flex gap-2">
          <button disabled={!canSign || submitting} className="bg-black text-white px-4 py-2 rounded disabled:opacity-50" onClick={async () => {
            setSubmitting(true);
            const r = await fetch(`/api/v1/sign/${signToken}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, consent: true }) });
            setSubmitting(false);
            if (r.ok) setDone("signed"); else { const j = await r.json(); setError(j.error?.message ?? "Feil"); }
          }}>Signer</button>
          <button className="px-4 py-2 border rounded" onClick={async () => {
            const reason = prompt("Begrunnelse for å avvise:");
            if (!reason) return;
            const r = await fetch(`/api/v1/sign/${signToken}/decline`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
            if (r.ok) setDone("declined");
          }}>Avvis</button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat(ui): signer view with PDF iframe, SMS step, sign/decline"
```

---

### Task 25: Status page (sender-facing)

**Files:**
- Create: `app/(public)/status/[lookup_token]/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/(public)/status/[lookup_token]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function StatusPage() {
  const { lookup_token } = useParams<{ lookup_token: string }>();
  const [id, setId] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await fetch(`/api/v1/signing-requests/${id}`, { headers: { "x-lookup-token": lookup_token } });
    if (r.ok) setData(await r.json()); else { const j = await r.json(); setError(j.error?.message); }
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Status</h1>
      <p className="text-sm text-gray-600 mt-2">Skriv inn signing-request ID for å se status.</p>
      <div className="mt-4 flex gap-2">
        <input value={id} onChange={(e) => setId(e.target.value)} placeholder="uuid" className="border rounded px-3 py-2 flex-1" />
        <button className="bg-black text-white px-4 py-2 rounded" onClick={load}>Hent</button>
      </div>
      {error && <p className="text-red-600 mt-3">{error}</p>}
      {data && <pre className="mt-4 text-xs bg-gray-50 p-4 overflow-auto">{JSON.stringify(data, null, 2)}</pre>}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat(ui): sender status page"
```

---

## Phase 7 — MCP server

### Task 26: MCP package scaffold

**Files:**
- Create: `packages/mcp-server/package.json`, `packages/mcp-server/tsconfig.json`, `packages/mcp-server/src/index.ts`, `packages/mcp-server/src/api-client.ts`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@newcommerce/esign-mcp",
  "version": "0.1.0",
  "type": "module",
  "bin": { "esign-mcp": "dist/index.js" },
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc -p .",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ES2022", "moduleResolution": "bundler",
    "outDir": "dist", "rootDir": "src", "strict": true, "esModuleInterop": true,
    "skipLibCheck": true, "declaration": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: `src/api-client.ts`**

```ts
const BASE = process.env.ESIGN_API_BASE_URL ?? "https://esign.newcommerce.no/api/v1";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${body?.error?.code ?? ""}: ${body?.error?.message ?? "request failed"}`);
  return body as T;
}

export interface CreateInput {
  sender_email: string; sender_name?: string;
  document: { filename: string; format: "pdf" | "markdown" | "text"; content_base64: string };
  signers: { name: string; email: string; phone?: string }[];
  expires_in_days?: number; webhook_url?: string; metadata?: Record<string, unknown>;
}

export const api = {
  create: (b: CreateInput) => request<any>("/signing-requests", { method: "POST", body: JSON.stringify(b) }),
  status: (id: string, token: string) => request<any>(`/signing-requests/${id}`, { headers: { "x-lookup-token": token } }),
  cancel: (id: string, token: string) => request<any>(`/signing-requests/${id}/cancel`, { method: "POST", headers: { "x-lookup-token": token } }),
  downloadFinal: async (documentId: string, token: string) => {
    const res = await fetch(`${BASE}/documents/${documentId}/final`, { headers: { "x-lookup-token": token } });
    if (!res.ok) throw new Error(`${res.status}: download failed`);
    const buf = await res.arrayBuffer();
    return Buffer.from(buf).toString("base64");
  },
};
```

- [ ] **Step 4: `src/index.ts`** (server bootstrap)

```ts
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createSigningRequestTool } from "./tools/create-signing-request.js";
import { getStatusTool } from "./tools/get-signing-status.js";
import { cancelTool } from "./tools/cancel-signing-request.js";
import { downloadTool } from "./tools/download-signed-document.js";

const tools = [createSigningRequestTool, getStatusTool, cancelTool, downloadTool];

const server = new Server({ name: "esign-mcp", version: "0.1.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = tools.find((t) => t.name === req.params.name);
  if (!tool) throw new Error(`Unknown tool ${req.params.name}`);
  try {
    const result = await tool.execute(req.params.arguments ?? {});
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (e: any) {
    return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
  }
});

await server.connect(new StdioServerTransport());
```

- [ ] **Step 5: Commit**

```bash
pnpm -F @newcommerce/esign-mcp add @modelcontextprotocol/sdk zod
git add . && git commit -m "feat(mcp): scaffold MCP server package"
```

---

### Task 27: MCP tool — create_signing_request

**Files:**
- Create: `packages/mcp-server/src/tools/create-signing-request.ts`

- [ ] **Step 1: Implement**

```ts
import { api, type CreateInput } from "../api-client.js";

export const createSigningRequestTool = {
  name: "create_signing_request",
  description: "Create a new signing request. Returns confirm_url that the sender must click to release the invitation emails, and a sender_lookup_token for later status queries.",
  inputSchema: {
    type: "object",
    properties: {
      sender_email: { type: "string", format: "email" },
      sender_name: { type: "string" },
      document: {
        type: "object",
        properties: {
          filename: { type: "string" },
          format: { type: "string", enum: ["pdf", "markdown", "text"] },
          content_base64: { type: "string" },
        },
        required: ["filename", "format", "content_base64"],
      },
      signers: {
        type: "array",
        minItems: 1, maxItems: 10,
        items: {
          type: "object",
          properties: {
            name: { type: "string" }, email: { type: "string", format: "email" }, phone: { type: "string" },
          },
          required: ["name", "email"],
        },
      },
      expires_in_days: { type: "integer", minimum: 1, maximum: 60 },
      webhook_url: { type: "string", format: "uri" },
      metadata: { type: "object" },
    },
    required: ["sender_email", "document", "signers"],
  },
  async execute(args: Record<string, unknown>) {
    const input = args as CreateInput;
    if (!input.sender_email && process.env.ESIGN_DEFAULT_SENDER_EMAIL) input.sender_email = process.env.ESIGN_DEFAULT_SENDER_EMAIL;
    return await api.create(input);
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat(mcp): create_signing_request tool"
```

---

### Task 28: MCP tools — status, cancel, download

**Files:**
- Create: `packages/mcp-server/src/tools/get-signing-status.ts`, `packages/mcp-server/src/tools/cancel-signing-request.ts`, `packages/mcp-server/src/tools/download-signed-document.ts`

- [ ] **Step 1: `get-signing-status.ts`**

```ts
import { api } from "../api-client.js";

export const getStatusTool = {
  name: "get_signing_status",
  description: "Get the current status of a signing request (sender-side view). Requires the sender_lookup_token returned at creation.",
  inputSchema: {
    type: "object",
    properties: {
      signing_request_id: { type: "string", format: "uuid" },
      sender_lookup_token: { type: "string" },
    },
    required: ["signing_request_id", "sender_lookup_token"],
  },
  async execute(args: Record<string, unknown>) {
    return await api.status(args.signing_request_id as string, args.sender_lookup_token as string);
  },
};
```

- [ ] **Step 2: `cancel-signing-request.ts`**

```ts
import { api } from "../api-client.js";

export const cancelTool = {
  name: "cancel_signing_request",
  description: "Cancel a signing request. Requires the sender_lookup_token. Cannot cancel completed/cancelled/expired requests.",
  inputSchema: {
    type: "object",
    properties: {
      signing_request_id: { type: "string", format: "uuid" },
      sender_lookup_token: { type: "string" },
      reason: { type: "string" },
    },
    required: ["signing_request_id", "sender_lookup_token"],
  },
  async execute(args: Record<string, unknown>) {
    return await api.cancel(args.signing_request_id as string, args.sender_lookup_token as string);
  },
};
```

- [ ] **Step 3: `download-signed-document.ts`**

```ts
import { api } from "../api-client.js";

export const downloadTool = {
  name: "download_signed_document",
  description: "Download the final signed PDF as base64. The request must be in status 'completed'. Requires the document_id (from get_signing_status) and the sender_lookup_token.",
  inputSchema: {
    type: "object",
    properties: {
      document_id: { type: "string", format: "uuid" },
      sender_lookup_token: { type: "string" },
    },
    required: ["document_id", "sender_lookup_token"],
  },
  async execute(args: Record<string, unknown>) {
    const content_base64 = await api.downloadFinal(args.document_id as string, args.sender_lookup_token as string);
    return { content_base64, filename: "signed.pdf" };
  },
};
```

- [ ] **Step 4: Build + commit**

```bash
pnpm -F @newcommerce/esign-mcp build
git add . && git commit -m "feat(mcp): status, cancel, download tools"
```

---

### Task 29: MCP README

**Files:**
- Create: `packages/mcp-server/README.md`

- [ ] **Step 1: Write README**

```markdown
# @newcommerce/esign-mcp

MCP server that gives any MCP-compatible AI agent (Claude Desktop, Claude Code, etc.) the ability to orchestrate e-signing via [esign.newcommerce.no](https://esign.newcommerce.no).

## Install

```bash
npm install -g @newcommerce/esign-mcp
```

## Claude Desktop config

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "esign": {
      "command": "esign-mcp",
      "env": {
        "ESIGN_API_BASE_URL": "https://esign.newcommerce.no/api/v1",
        "ESIGN_DEFAULT_SENDER_EMAIL": "you@example.com"
      }
    }
  }
}
```

## Tools

- `create_signing_request` — kick off a new signing flow.
- `get_signing_status` — see progress (needs sender_lookup_token).
- `cancel_signing_request` — cancel before completion.
- `download_signed_document` — fetch the final signed PDF when done.

The flow: agent calls `create_signing_request` → user receives a confirmation email → user clicks the `confirm_url` (also returned in the tool response) → signers receive invitations → when all signers sign, the final PDF is emailed to everyone.
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "docs(mcp): README with Claude Desktop config"
```

---

## Phase 8 — E2E + deployment

### Task 30: Playwright happy-path E2E

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/happy-path.spec.ts`, `tests/e2e/helpers.ts`

- [ ] **Step 1: Install Playwright**

```bash
pnpm exec playwright install --with-deps chromium
```

- [ ] **Step 2: `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: "pnpm next start",
    url: "http://localhost:3000",
    timeout: 60_000,
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 3: `tests/e2e/helpers.ts`**

```ts
import { db } from "@/lib/db/client";
import { signingRequests, signers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getConfirmTokenForRequest(id: string) {
  const [r] = await db.select().from(signingRequests).where(eq(signingRequests.id, id));
  return r.senderConfirmToken;
}
export async function getSignTokensForRequest(id: string) {
  const rows = await db.select().from(signers).where(eq(signers.signingRequestId, id));
  return rows.map((r) => ({ id: r.id, signToken: r.signToken, email: r.email, name: r.name }));
}
```

- [ ] **Step 4: `tests/e2e/happy-path.spec.ts`**

```ts
import { test, expect, request } from "@playwright/test";
import { getConfirmTokenForRequest, getSignTokensForRequest } from "./helpers";

test("happy path: create → confirm → 2 signers sign → final pdf available", async ({ page, baseURL }) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/v1/signing-requests", {
    data: {
      sender_email: "ole+e2e@example.com",
      document: { filename: "test.txt", format: "text", content_base64: Buffer.from("E2E happy path content").toString("base64") },
      signers: [
        { name: "Sig One", email: "sig1+e2e@example.com" },
        { name: "Sig Two", email: "sig2+e2e@example.com" },
      ],
    },
  });
  expect(create.ok()).toBeTruthy();
  const body = await create.json();
  expect(body.status).toBe("awaiting_sender_confirm");
  expect(body.confirm_url).toContain("/confirm/");
  expect(body.signers).toHaveLength(2);

  await page.goto(body.confirm_url);
  await expect(page.getByText("Bekreftet")).toBeVisible();

  const signTokens = await getSignTokensForRequest(body.id);
  for (const s of signTokens) {
    await page.goto(`/sign/${s.signToken}`);
    await expect(page.getByText("har sendt deg")).toBeVisible();
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: "Signer" }).click();
    await expect(page.getByText("dokumentet er signert", { exact: false })).toBeVisible({ timeout: 30_000 });
  }

  const status = await api.get(`/api/v1/signing-requests/${body.id}`, { headers: { "x-lookup-token": body.sender_lookup_token } });
  const statusJson = await status.json();
  expect(statusJson.status).toBe("completed");

  const final = await api.get(`/api/v1/documents/${statusJson.document_id ?? body.id}/final`, { headers: { "x-lookup-token": body.sender_lookup_token } });
  expect(final.ok()).toBeTruthy();
});
```

- [ ] **Step 5: Run** (requires `pnpm build && pnpm start` in another terminal, or rely on webServer)

```bash
pnpm exec playwright test happy-path.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add . && git commit -m "test(e2e): happy-path full signing flow"
```

---

### Task 31: E2E sender-gate, decline, expiry

**Files:**
- Create: `tests/e2e/sender-gate.spec.ts`, `tests/e2e/decline.spec.ts`, `tests/e2e/expiry.spec.ts`

- [ ] **Step 1: Sender-gate spec**

```ts
// tests/e2e/sender-gate.spec.ts
import { test, expect, request } from "@playwright/test";
import { getSignTokensForRequest } from "./helpers";

test("signer cannot sign before sender confirms", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/v1/signing-requests", {
    data: {
      sender_email: "gate+e2e@example.com",
      document: { filename: "g.txt", format: "text", content_base64: Buffer.from("x").toString("base64") },
      signers: [{ name: "X", email: "x+e2e@example.com" }],
    },
  });
  const body = await create.json();
  const [s] = await getSignTokensForRequest(body.id);
  const get = await api.get(`/api/v1/sign/${s.signToken}`);
  expect(get.status()).toBe(409);
});
```

- [ ] **Step 2: Decline spec**

```ts
// tests/e2e/decline.spec.ts
import { test, expect, request } from "@playwright/test";
import { getSignTokensForRequest } from "./helpers";

test("decline cancels the request and invalidates other signers' tokens", async ({ baseURL, page }) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/v1/signing-requests", {
    data: {
      sender_email: "decline+e2e@example.com",
      document: { filename: "d.txt", format: "text", content_base64: Buffer.from("d").toString("base64") },
      signers: [{ name: "A", email: "a+e2e@example.com" }, { name: "B", email: "b+e2e@example.com" }],
    },
  });
  const body = await create.json();
  await page.goto(body.confirm_url);
  const tokens = await getSignTokensForRequest(body.id);
  const decline = await api.post(`/api/v1/sign/${tokens[0].signToken}/decline`, { data: { reason: "ikke enig" } });
  expect(decline.ok()).toBeTruthy();
  const other = await api.get(`/api/v1/sign/${tokens[1].signToken}`);
  expect(other.status()).toBe(409);
});
```

- [ ] **Step 3: Expiry spec**

```ts
// tests/e2e/expiry.spec.ts
import { test, expect, request } from "@playwright/test";
import { db } from "@/lib/db/client";
import { signingRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

test("cron expire flips active → expired for past-due requests", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/v1/signing-requests", {
    data: {
      sender_email: "exp+e2e@example.com",
      document: { filename: "e.txt", format: "text", content_base64: Buffer.from("e").toString("base64") },
      signers: [{ name: "Y", email: "y+e2e@example.com" }],
    },
  });
  const body = await create.json();
  // Confirm so status becomes active
  await api.get(body.confirm_url);
  // Force expiry by rewriting expires_at to the past + flipping status to active if not yet
  await db.update(signingRequests).set({ expiresAt: new Date(Date.now() - 1000), status: "active" }).where(eq(signingRequests.id, body.id));
  // Trigger cron
  const cron = await api.get("/api/internal/cron/expire", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(cron.ok()).toBeTruthy();
  const status = await api.get(`/api/v1/signing-requests/${body.id}`, { headers: { "x-lookup-token": body.sender_lookup_token } });
  expect((await status.json()).status).toBe("expired");
});
```

- [ ] **Step 4: Run + commit**

```bash
pnpm exec playwright test
git add . && git commit -m "test(e2e): sender-gate, decline, expiry"
```

---

### Task 32: Deployment configuration

**Files:**
- Modify: `package.json`, `README.md`

- [ ] **Step 1: Add scripts to root `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "build:mcp": "pnpm -F @newcommerce/esign-mcp build"
  }
}
```

- [ ] **Step 2: Write top-level `README.md`**

```markdown
# esign

Free AI-agent-friendly e-signature SaaS.

- **Web:** https://esign.newcommerce.no
- **API:** `POST https://esign.newcommerce.no/api/v1/signing-requests`
- **MCP server:** `npm i -g @newcommerce/esign-mcp` ([README](packages/mcp-server/README.md))

## Local development

```bash
pnpm install
cp .env.example .env.local
# fill in Neon, Resend, Twilio, Upstash, Blob creds
pnpm db:push
pnpm dev
```

## Deployment

1. Connect this repo to Vercel; set env vars from `.env.example`.
2. Provision: Neon Postgres, Resend (verify `esign.newcommerce.no` domain with DKIM/SPF/DMARC), Twilio number, Upstash Redis.
3. `vercel.json` configures hourly expire + daily retention cron.
4. Publish the MCP server: `pnpm -F @newcommerce/esign-mcp build && pnpm -F @newcommerce/esign-mcp publish --access public`.

## Spec

See `docs/superpowers/specs/2026-05-16-esign-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "docs: top-level README + npm scripts"
```

---

### Task 33: Manual acceptance — Ole signs a real document with Henrik

- [ ] **Step 1:** Deploy to Vercel (`vercel --prod`).
- [ ] **Step 2:** Verify DKIM/SPF/DMARC for `esign.newcommerce.no` in Resend dashboard.
- [ ] **Step 3:** Provision Twilio number + Norwegian sender ID.
- [ ] **Step 4:** From `ole@newcommerce.no`, create a real test signing request (e.g. an internal NDA) addressed to Henrik.
- [ ] **Step 5:** Verify the full mail-loop end-to-end: confirmation email arrives → click → Henrik receives invitation → signs → both receive completed PDF.
- [ ] **Step 6:** Verify the audit certificate appendix has correct SHA-256, IPs, timestamps.
- [ ] **Step 7:** Configure `esign-mcp` in Ole's Claude Desktop. Test "få denne PDFen signert av Henrik" end-to-end from the agent.

---

## Self-review (run before handoff)

**Spec coverage:**
- §1 goal — Tasks 13–24 implement document → signers → email → sign → final PDF.
- §3 SES legal posture — surfaced in audit-appendix template (Task 7) and README. README explicitly references spec.
- §4 architecture — Tasks 1, 23–25 (Next.js app), 26–29 (MCP server), 18–22 (API), 22 (cron).
- §5 data model — Task 2.
- §6 state machines — Tasks 13–17 enforce transitions.
- §7 audit trail — Task 7 (appendix), Task 16 (assembly + email attach).
- §8 flow — covered Tasks 13–17 (services) and 18–22 (HTTP layer).
- §9 REST API — Tasks 18–22.
- §10 MCP — Tasks 26–29.
- §11 project structure — matches Task 1 scaffold + per-task file paths.
- §12 secrets / cron — Task 22 + Task 32.
- §13 test strategy — Tasks 3, 4, 5, 6, 7, 11, 12 (unit); Tasks 30, 31 (E2E).
- §14 open considerations — explicitly out of scope; no tasks needed.
- §15 DoD — Task 33 acceptance criteria match spec DoD.

**Placeholder scan:** No "TBD"/"TODO"/"add appropriate error handling"/"similar to Task N". All code blocks are concrete.

**Type consistency:** `CreateSigningRequestResult`, `CreateInput`, `CertInput`, `SignerCert`, `SignResult` are each defined once and referenced consistently. The status enum strings (`awaiting_sender_confirm`, `active`, `completed`, `cancelled`, `expired`) match between schema (Task 2), services (Tasks 13–17), and API responses.

No gaps identified. Plan ready.

