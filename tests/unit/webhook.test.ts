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
