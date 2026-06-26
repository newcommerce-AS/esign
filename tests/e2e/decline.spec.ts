import { test, expect, request } from "@playwright/test";
import { getSignTokensForRequest, confirmTokenFromUrl } from "./helpers";

test("decline cancels the request and invalidates other signers' tokens", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/v1/signing-requests", {
    data: {
      sender_email: "decline+e2e@example.com",
      document: { filename: "d.txt", format: "text", content_base64: Buffer.from("d").toString("base64") },
      signers: [{ name: "A", email: "a+e2e@example.com" }, { name: "B", email: "b+e2e@example.com" }],
    },
  });
  const body = await create.json();
  await api.post(`/api/v1/confirm/${confirmTokenFromUrl(body.confirm_url)}`);
  const tokens = await getSignTokensForRequest(body.id);
  const decline = await api.post(`/api/v1/sign/${tokens[0].signToken}/decline`, { data: { reason: "ikke enig" } });
  expect(decline.ok()).toBeTruthy();
  const other = await api.get(`/api/v1/sign/${tokens[1].signToken}`);
  expect(other.status()).toBe(409);
});
