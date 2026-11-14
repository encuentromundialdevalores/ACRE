import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { assertCan, HttpError, type SessionUser } from "@/lib/session";
import type { Action } from "@/lib/permissions";

/** Carga el terreno y verifica en servidor que el usuario tiene la acción solicitada sobre él. */
export async function loadPropertyFor(user: SessionUser, id: string, action: Action) {
  const [prop] = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  if (!prop) throw new HttpError(404, "Terreno no encontrado");
  assertCan(user, action, { ownerId: prop.ownerId, createdBy: prop.createdBy });
  return prop;
}
