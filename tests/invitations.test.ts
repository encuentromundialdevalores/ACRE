import { describe, it, expect } from "vitest";
import { generateToken, hashToken, safeEqualHex } from "@/lib/crypto";
import { invitationState } from "@/lib/invitation-state";

describe("tokens de invitación", () => {
  it("genera tokens opacos únicos y se almacena solo el hash", () => {
    const a = generateToken(), b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(hashToken(a)).toHaveLength(64);
    expect(hashToken(a)).not.toContain(a);
    expect(safeEqualHex(hashToken(a), hashToken(a))).toBe(true);
    expect(safeEqualHex(hashToken(a), hashToken(b))).toBe(false);
  });
  it("estado: activa, expirada y revocada", () => {
    const now = new Date("2026-11-13T12:00:00Z");
    expect(invitationState({ expiresAt: new Date("2026-11-20T12:00:00Z"), revokedAt: null }, now)).toBe("activa");
    expect(invitationState({ expiresAt: new Date("2026-11-13T11:59:59Z"), revokedAt: null }, now)).toBe("expirada");
    expect(invitationState({ expiresAt: new Date("2026-11-20T12:00:00Z"), revokedAt: new Date("2026-11-13T10:00:00Z") }, now)).toBe("revocada");
  });
});
