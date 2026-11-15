import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { can, type Action, type Actor, type OwnedResource } from "@/lib/permissions";

export type SessionUser = { id: string; name: string; email: string; role: Actor["role"] };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  // Se consulta la cuenta en cada petición: una cuenta desactivada o con rol cambiado
  // pierde o ajusta su acceso de inmediato, sin esperar a que expire el token.
  const [u] = await db.select({ name: users.name, email: users.email, role: users.role, active: users.active }).from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!u || !u.active) return null;
  return { id: session.user.id, name: u.name, email: u.email, role: u.role };
}

/** Para páginas: redirige a /login si no hay sesión. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Para rutas API: lanza 401 si no hay sesión. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "No autenticado");
  return user;
}

export function assertCan(user: Actor, action: Action, resource?: OwnedResource) {
  if (!can(user, action, resource)) throw new HttpError(403, "No tienes permiso para esta acción");
}
