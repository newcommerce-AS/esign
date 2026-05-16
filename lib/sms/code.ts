import { createHash, randomInt, timingSafeEqual } from "node:crypto";

export function generateSmsCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}
export function hashSmsCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
export function verifySmsCode(input: string, expectedHash: string): boolean {
  const a = Buffer.from(hashSmsCode(input));
  const b = Buffer.from(expectedHash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
