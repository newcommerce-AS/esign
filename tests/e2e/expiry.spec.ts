import { test, expect, request } from "@playwright/test";
import { db } from "../../lib/db/client";
import { signingRequests } from "../../lib/db/schema";
import { eq } from "drizzle-orm";
import { confirmTokenFromUrl } from "./helpers";

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
  await api.post(`/api/v1/confirm/${confirmTokenFromUrl(body.confirm_url)}`);
  await db.update(signingRequests).set({ expiresAt: new Date(Date.now() - 1000), status: "active" }).where(eq(signingRequests.id, body.id));
  const cron = await api.get("/api/internal/cron/expire", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(cron.ok()).toBeTruthy();
  // After expire cron, the row is deleted inline — expect 404.
  const status = await api.get(`/api/v1/signing-requests/${body.id}`, { headers: { "x-lookup-token": body.sender_lookup_token } });
  expect(status.status()).toBe(404);
});
