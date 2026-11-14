import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can, type Action, type Actor, type OwnedResource } from "@/lib/permissions";

export type SessionUser = { id: string; name: string; email: string; role: Actor["role"] };

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role,
  };
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
