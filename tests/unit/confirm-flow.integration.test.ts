import { describe, it, expect, beforeAll } from "vitest";
import { initDb, db } from "@/lib/db/client";
import { signingRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createSigningRequest } from "@/lib/services/create-request";
import { confirmSender } from "@/lib/services/confirm-sender";
import { getConfirmView } from "@/lib/services/confirm-view";

// In-process integration test against PGlite (single module graph → single db
// instance, so no cross-bundle visibility artifact). Exercises the service
// layer the e2e suite covers only against Neon: getConfirmView's render states
// and confirmSender's status-driven branching (incl. the terminal-after-confirm
// case that a timestamp-only check would mishandle).

const BASE = "http://localhost:3000";

async function create(opts: { senderEmail: string; signers: { name: string; email: string }[] }) {
  const made = await createSigningRequest(
    {
      sender_email: opts.senderEmail,
      sender_name: undefined,
      document: { filename: "Avtale.txt", format: "text", content_base64: Buffer.from("Innhold").toString("base64") },
      signers: opts.signers,
      expires_in_days: 30,
      webhook_url: undefined,
      metadata: undefined,
    },
    "0.0.0.0",
    BASE,
  );
  const token = new URL(made.confirm_url).pathname.split("/").filter(Boolean).pop()!;
  return { id: made.id, token };
}

beforeAll(async () => {
  await initDb();
});

describe("getConfirmView render states", () => {
  it("returns a preview for an awaiting request", async () => {
    const { token } = await create({ senderEmail: "ole@newcommerce.no", signers: [{ name: "Kari", email: "kari@example.com" }] });
    const view = await getConfirmView(token);
    expect(view.kind).toBe("preview");
    if (view.kind === "preview") {
      expect(view.document.filename).toBe("Avtale.txt");
      expect(view.signers.map((s) => s.email)).toContain("kari@example.com");
    }
  });

  it("returns not_found for an unknown token", async () => {
    expect((await getConfirmView("does-not-exist")).kind).toBe("not_found");
  });

  it("returns already_confirmed with the sender's sign-token after confirm (sender is a signer)", async () => {
    const { token } = await create({ senderEmail: "self@newcommerce.no", signers: [{ name: "Self", email: "self@newcommerce.no" }] });
    const c = await confirmSender(token, BASE);
    expect(c.ok).toBe(true);
    const view = await getConfirmView(token);
    expect(view.kind).toBe("already_confirmed");
    if (view.kind === "already_confirmed") expect(view.signerSignToken).not.toBeNull();
  });

  it("returns already_confirmed with null sign-token when the sender is not a signer", async () => {
    const { token } = await create({ senderEmail: "boss@newcommerce.no", signers: [{ name: "Other", email: "other@example.com" }] });
    await confirmSender(token, BASE);
    const view = await getConfirmView(token);
    expect(view.kind).toBe("already_confirmed");
    if (view.kind === "already_confirmed") expect(view.signerSignToken).toBeNull();
  });

  it("returns a terminal view for a cancelled request", async () => {
    const { id, token } = await create({ senderEmail: "ole@newcommerce.no", signers: [{ name: "X", email: "x@example.com" }] });
    await confirmSender(token, BASE);
    await db.update(signingRequests).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(signingRequests.id, id));
    const view = await getConfirmView(token);
    expect(view.kind).toBe("terminal");
    if (view.kind === "terminal") expect(view.reason).toBe("cancelled");
  });
});

describe("confirmSender status-driven branching", () => {
  it("is idempotent: a second confirm reports already_confirmed", async () => {
    const { token } = await create({ senderEmail: "ole@newcommerce.no", signers: [{ name: "X", email: "x@example.com" }] });
    expect((await confirmSender(token, BASE)).ok).toBe(true);
    const second = await confirmSender(token, BASE);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("already_confirmed");
  });

  it("returns not_found for an unknown token", async () => {
    const r = await confirmSender("nope", BASE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not_found");
  });

  it("returns invalid_state (NOT already_confirmed) for a confirmed request that later went terminal", async () => {
    const { id, token } = await create({ senderEmail: "ole@newcommerce.no", signers: [{ name: "X", email: "x@example.com" }] });
    await confirmSender(token, BASE); // → active, senderConfirmedAt set
    // Terminal transition leaves senderConfirmedAt intact (e.g. expire cron):
    await db.update(signingRequests).set({ status: "expired", expiredAt: new Date() }).where(eq(signingRequests.id, id));
    const r = await confirmSender(token, BASE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_state");
  });
});
