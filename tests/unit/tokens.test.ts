import { describe, it, expect } from "vitest";
import { newToken, hashToken } from "@/lib/tokens";

describe("tokens", () => {
  it("produces URL-safe tokens of length >= 32", () => {
    const t = newToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });
  it("produces unique tokens across 1000 calls", () => {
    const set = new Set(Array.from({ length: 1000 }, () => newToken()));
    expect(set.size).toBe(1000);
  });
  it("hashToken is deterministic and hex 64 chars", () => {
    const h = hashToken("abc");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken("abc")).toBe(h);
  });
});
