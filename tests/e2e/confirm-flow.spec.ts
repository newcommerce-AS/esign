import { test, expect, request } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { confirmTokenFromUrl } from "./helpers";

// These tests are API-only (no in-process DB access), so they run against any
// running instance — including a local PGlite server via E2E_BASE_URL.
// Senders use @newcommerce.no (a trusted domain) to bypass the create rate-limit.

const txt = (s: string) => Buffer.from(s).toString("base64");

async function create(api: APIRequestContext, opts: { senderEmail: string; signers: { name: string; email: string }[] }) {
  const res = await api.post("/api/v1/signing-requests", {
    data: {
      sender_email: opts.senderEmail,
      document: { filename: "avtale.txt", format: "text", content_base64: txt("Bekreft-flyt innhold") },
      signers: opts.signers,
    },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

test("a plain GET on the confirm link does NOT confirm (no mutation)", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const body = await create(api, { senderEmail: "ole@newcommerce.no", signers: [{ name: "Sig", email: "sig+gate@example.com" }] });
  const token = confirmTokenFromUrl(body.confirm_url);

  // Simulate an email scanner / link prefetcher opening the page.
  const preview = await api.get(`/confirm/${token}`);
  expect(preview.ok()).toBeTruthy();

  // The request must still be awaiting confirmation and no invitation released.
  const status = await api.get(`/api/v1/signing-requests/${body.id}`, { headers: { "x-lookup-token": body.sender_lookup_token } });
  const sj = await status.json();
  expect(sj.status).toBe("awaiting_sender_confirm");
  expect(sj.signers.every((s: { status: string }) => s.status === "pending")).toBeTruthy();
});

test("POST confirm is idempotent (double-click / agent retry)", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const body = await create(api, { senderEmail: "ole@newcommerce.no", signers: [{ name: "Sig", email: "sig+idem@example.com" }] });
  const token = confirmTokenFromUrl(body.confirm_url);

  const r1 = await api.post(`/api/v1/confirm/${token}`);
  const r2 = await api.post(`/api/v1/confirm/${token}`);
  expect(r1.ok()).toBeTruthy();
  expect(r2.ok()).toBeTruthy();
  expect((await r2.json()).status).toBe("active");
});

test("confirm redirects the sender to their own signing page when sender is a signer", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const body = await create(api, { senderEmail: "self@newcommerce.no", signers: [{ name: "Self", email: "self@newcommerce.no" }] });
  const token = confirmTokenFromUrl(body.confirm_url);

  const r = await api.post(`/api/v1/confirm/${token}`);
  const j = await r.json();
  expect(j.sign_url).not.toBeNull();
  expect(j.redirect).toContain("/sign/");
});

test("confirm redirects to the status page when the sender is not a signer", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const body = await create(api, { senderEmail: "boss@newcommerce.no", signers: [{ name: "Other", email: "other+ns@example.com" }] });
  const token = confirmTokenFromUrl(body.confirm_url);

  const r = await api.post(`/api/v1/confirm/${token}`);
  const j = await r.json();
  expect(j.sign_url).toBeNull();
  expect(j.redirect).toContain("/status/");
});

test("confirm document endpoint streams the PDF as an attachment", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const body = await create(api, { senderEmail: "ole@newcommerce.no", signers: [{ name: "Sig", email: "sig+doc@example.com" }] });
  const token = confirmTokenFromUrl(body.confirm_url);

  const res = await api.get(`/api/v1/confirm/${token}/document`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("application/pdf");
  expect(res.headers()["content-disposition"]).toContain("attachment");
  expect(res.headers()["content-disposition"]).toMatch(/filename[*]?=.*\.pdf/i);
});

test("confirm document endpoint returns 404 for an unknown token", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const res = await api.get(`/api/v1/confirm/does-not-exist/document`);
  expect(res.status()).toBe(404);
});
