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
