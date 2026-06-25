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
  expect(res.headers()["content-disposition"]).toMatch(/filename[*]?=.*\.pdf/i);
});

test("download endpoint returns 404 for unknown token", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const res = await api.get(`/api/v1/sign/does-not-exist/document`);
  expect(res.status()).toBe(404);
});

test("signing page shows a download link", async ({ page, baseURL }) => {
  const api = await request.newContext({ baseURL });
  const body = await createAndConfirm(api);
  const [{ signToken }] = await getSignTokensForRequest(body.id);

  await page.goto(`/sign/${signToken}`);
  await expect(page.getByText("har sendt deg")).toBeVisible();
  await expect(page.getByRole("link", { name: /last ned/i })).toBeVisible();
});

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
