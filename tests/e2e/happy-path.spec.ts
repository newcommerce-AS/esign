import { test, expect, request } from "@playwright/test";
import { getSignTokensForRequest } from "./helpers";

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

  const final = await api.get(`/api/v1/documents/${statusJson.document.id}/final`, { headers: { "x-lookup-token": body.sender_lookup_token } });
  expect(final.ok()).toBeTruthy();
});
