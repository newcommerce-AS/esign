import { randomBytes, createHash } from "node:crypto";

export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(t: string): string {
  return createHash("sha256").update(t).digest("hex");
}
