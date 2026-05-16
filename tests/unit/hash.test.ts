import { describe, it, expect } from "vitest";
import { sha256Hex } from "@/lib/hash";

describe("sha256Hex", () => {
  it("matches known vector for empty input", () => {
    expect(sha256Hex(Buffer.from(""))).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });
});
