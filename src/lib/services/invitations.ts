import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { invitations, properties, users } from "@/lib/db/schema";
import { generateToken, hashToken } from "@/lib/crypto";

import { invitationState } from "@/lib/invitation-state";
export { invitationState, INVITATION_DAYS, type InvitationState } from "@/lib/invitation-state";

export async function createInvitation(propertyId: string, createdBy: string, opts: { days: number; label?: string | null; inviteeEmail?: string | null }) {
  const token = generateToken();
  const days = Math.min(Math.max(opts.days, 1), 90);
  const expiresAt = new Date(Date.now() + days * 86_400_000);
  const [row] = await db.insert(invitations).values({
    propertyId, createdBy, tokenHash: hashToken(token), expiresAt,
    label: opts.label || null, inviteeEmail: opts.inviteeEmail?.toLowerCase().trim() || null,
  }).returning();
  return { invitation: row, token };
}


export async function revokeInvitation(id: string) {
  const [row] = await db.update(invitations).set({ revokedAt: new Date() }).where(and(eq(invitations.id, id), isNull(invitations.revokedAt))).returning();
  return row ?? null;
}

/** Valida un token de enlace: existe, no expiró, no fue revocado. Registra el acceso. */
export async function resolveInvitationToken(token: string) {
  if (!token || token.length < 20 || token.length > 128) return null;
  const hash = hashToken(token);
  const [row] = await db.select().from(invitations).where(eq(invitations.tokenHash, hash)).limit(1);
  if (!row) return null;
  if (invitationState(row) !== "activa") return null;
  await db.update(invitations).set({ lastAccessedAt: new Date(), accessCount: row.accessCount + 1 }).where(eq(invitations.id, row.id));
  return row;
}

export async function listInvitations(propertyId?: string) {
  return db.select({ inv: invitations, propertyName: properties.name, propertyCode: properties.code, creatorName: users.name })
    .from(invitations)
    .innerJoin(properties, eq(properties.id, invitations.propertyId))
    .innerJoin(users, eq(users.id, invitations.createdBy))
    .where(propertyId ? eq(invitations.propertyId, propertyId) : undefined)
    .orderBy(desc(invitations.createdAt));
}

export async function countActiveInvitations() {
  const rows = await db.select({ id: invitations.id }).from(invitations).where(and(isNull(invitations.revokedAt), gt(invitations.expiresAt, new Date())));
  return rows.length;
}

/** Invitaciones vigentes dirigidas al correo de un comprador con sesión. */
export async function listInvitationsForEmail(email: string) {
  return db.select({ inv: invitations, propertyName: properties.name, propertyCode: properties.code, municipality: properties.municipality })
    .from(invitations)
    .innerJoin(properties, eq(properties.id, invitations.propertyId))
    .where(and(eq(invitations.inviteeEmail, email.toLowerCase()), isNull(invitations.revokedAt), gt(invitations.expiresAt, new Date())))
    .orderBy(desc(invitations.createdAt));
}
