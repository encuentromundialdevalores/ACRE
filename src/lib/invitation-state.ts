export const INVITATION_DAYS = [1, 3, 7, 14, 30] as const;

export type InvitationState = "activa" | "expirada" | "revocada";

/** Estado de una invitación a partir de sus fechas (puro, utilizable en cliente y servidor). */
export function invitationState(inv: { expiresAt: Date | string; revokedAt: Date | string | null }, now = new Date()): InvitationState {
  if (inv.revokedAt) return "revocada";
  const exp = typeof inv.expiresAt === "string" ? new Date(inv.expiresAt) : inv.expiresAt;
  if (exp.getTime() <= now.getTime()) return "expirada";
  return "activa";
}
