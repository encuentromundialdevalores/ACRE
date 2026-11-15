import type { Role } from "@/lib/db/schema";

/**
 * Matriz de permisos configurable. Cada acción lista los roles que la tienen.
 * "own" indica que OWNER sólo la ejerce sobre sus propios terrenos.
 */
export type Action =
  | "dashboard.admin"
  | "property.list_all"
  | "property.create"
  | "property.read"
  | "property.update"
  | "property.delete"
  | "property.draw_polygon"
  | "property.run_queries"
  | "document.upload"
  | "document.read"
  | "document.delete"
  | "invitation.manage"
  | "invitation.list_all"
  | "data.review"
  | "data.manual_entry"
  | "user.manage";

type Rule = { roles: Role[]; ownerScoped?: boolean };

export const PERMISSIONS: Record<Action, Rule> = {
  "dashboard.admin":        { roles: ["ADMIN"] },
  "property.list_all":      { roles: ["ADMIN"] },
  "property.create":        { roles: ["ADMIN", "OWNER"] },
  "property.read":          { roles: ["ADMIN", "OWNER"], ownerScoped: true },
  "property.update":        { roles: ["ADMIN", "OWNER"], ownerScoped: true },
  "property.delete":        { roles: ["ADMIN"] },
  "property.draw_polygon":  { roles: ["ADMIN", "OWNER"], ownerScoped: true },
  "property.run_queries":   { roles: ["ADMIN"] },
  "document.upload":        { roles: ["ADMIN", "OWNER"], ownerScoped: true },
  "document.read":          { roles: ["ADMIN", "OWNER"], ownerScoped: true },
  "document.delete":        { roles: ["ADMIN"] },
  "invitation.manage":      { roles: ["ADMIN"] },
  "invitation.list_all":    { roles: ["ADMIN"] },
  "data.review":            { roles: ["ADMIN"] },
  "data.manual_entry":      { roles: ["ADMIN"] },
  "user.manage":            { roles: ["ADMIN"] },
};

export type Actor = { id: string; role: Role };
export type OwnedResource = { ownerId: string | null; createdBy?: string | null };

export function can(actor: Actor | null | undefined, action: Action, resource?: OwnedResource): boolean {
  if (!actor) return false;
  const rule = PERMISSIONS[action];
  if (!rule.roles.includes(actor.role)) return false;
  if (actor.role === "ADMIN") return true;
  if (rule.ownerScoped) {
    if (!resource) return false;
    return resource.ownerId === actor.id || resource.createdBy === actor.id;
  }
  return true;
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Socio ACRE",
  OWNER: "Propietario",
  BUYER: "Comprador invitado",
};
