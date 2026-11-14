import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** Token opaco criptográficamente aleatorio (32 bytes → 43 chars base64url). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex"), bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
