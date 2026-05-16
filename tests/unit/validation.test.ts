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
