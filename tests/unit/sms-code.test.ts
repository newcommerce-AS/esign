import { describe, it, expect } from "vitest";
import { generateSmsCode, hashSmsCode, verifySmsCode } from "@/lib/sms/code";

describe("sms code", () => {
  it("generates 6-digit code", () => {
    const c = generateSmsCode();
    expect(c).toMatch(/^\d{6}$/);
  });
  it("hash is deterministic", () => {
    expect(hashSmsCode("123456")).toBe(hashSmsCode("123456"));
  });
  it("verifySmsCode returns true for matching, false otherwise", () => {
    const h = hashSmsCode("123456");
    expect(verifySmsCode("123456", h)).toBe(true);
    expect(verifySmsCode("000000", h)).toBe(false);
  });
});
