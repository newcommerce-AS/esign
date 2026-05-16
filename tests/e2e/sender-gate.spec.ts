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
