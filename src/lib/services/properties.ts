import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { properties, propertyData, users, type Property } from "@/lib/db/schema";
import { validatePolygon } from "@/lib/geo";
import { upsertAreaField } from "@/lib/connectors/runner";
import { FIELD_KEYS } from "@/lib/connectors/fields";
import type { SessionUser } from "@/lib/session";

export const propertyInputSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  neighborhood: z.string().trim().max(120).optional().nullable(),
  municipality: z.string().trim().max(120).optional().nullable(),
  polygon: z.unknown().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});
export type PropertyInput = z.infer<typeof propertyInputSchema>;

async function nextCode(): Promise<string> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(properties);
  return `ACRE-${String(Number(count) + 1).padStart(4, "0")}`;
}

function geometryFields(input: PropertyInput) {
  if (input.polygon) {
    const v = validatePolygon(input.polygon);
    if (!v.ok) throw new Error(v.error);
    return { polygonGeojson: v.feature, areaM2: v.areaM2.toFixed(2), latitude: v.representativePoint.lat.toFixed(7), longitude: v.representativePoint.lng.toFixed(7) };
  }
  return {
    polygonGeojson: null, areaM2: null,
    latitude: input.latitude != null ? input.latitude.toFixed(7) : null,
    longitude: input.longitude != null ? input.longitude.toFixed(7) : null,
  };
}

export async function createProperty(user: SessionUser, input: PropertyInput): Promise<Property> {
  const geo = geometryFields(input);
  const ownerId = user.role === "OWNER" ? user.id : (input.ownerId ?? null);
  let code = await nextCode();
  for (let i = 0; i < 5; i++) {
    const exists = await db.select({ id: properties.id }).from(properties).where(eq(properties.code, code)).limit(1);
    if (!exists.length) break;
    code = `ACRE-${String(Number(code.slice(5)) + 1 + i).padStart(4, "0")}`;
  }
  const [row] = await db.insert(properties).values({
    code, name: input.name, description: input.description ?? null, ownerId, createdBy: user.id,
    address: input.address ?? null, neighborhood: input.neighborhood ?? null, municipality: input.municipality ?? null, ...geo,
  }).returning();
  if (geo.areaM2) await upsertAreaField(row.id, Number(geo.areaM2));
  return row;
}

export async function updateProperty(id: string, user: SessionUser, input: PropertyInput): Promise<Property> {
  const geo = geometryFields(input);
  const patch: Partial<typeof properties.$inferInsert> = {
    name: input.name, description: input.description ?? null,
    address: input.address ?? null, neighborhood: input.neighborhood ?? null, municipality: input.municipality ?? null,
    updatedAt: new Date(), ...geo,
  };
  if (user.role === "ADMIN" && input.ownerId !== undefined) patch.ownerId = input.ownerId ?? null;
  const [row] = await db.update(properties).set(patch).where(eq(properties.id, id)).returning();
  if (geo.areaM2) await upsertAreaField(row.id, Number(geo.areaM2));
  return row;
}

export async function getProperty(id: string) {
  return db.query.properties.findFirst({ where: eq(properties.id, id), with: { owner: true, data: true, documents: true } });
}

export type PropertyFilters = { q?: string; municipality?: string; status?: "completo" | "pendiente" | "sin_consultar" };

export type PropertyListItem = Property & { ownerName: string | null; confirmed: number; pending: number; unavailable: number; demo: number; total: number };

/** Lista terrenos visibles para el usuario con conteo de estado de sus datos. */
export async function listProperties(user: SessionUser, filters: PropertyFilters = {}): Promise<PropertyListItem[]> {
  const conds: SQL[] = [];
  if (user.role !== "ADMIN") conds.push(or(eq(properties.ownerId, user.id), eq(properties.createdBy, user.id))!);
  if (filters.q) conds.push(or(ilike(properties.name, `%${filters.q}%`), ilike(properties.code, `%${filters.q}%`), ilike(properties.address, `%${filters.q}%`))!);
  if (filters.municipality) conds.push(ilike(properties.municipality, `%${filters.municipality}%`));

  const rows = await db
    .select({
      p: properties,
      ownerName: users.name,
      confirmed: sql<number>`count(*) filter (where ${propertyData.verificationStatus} = 'CONFIRMADO' and not ${propertyData.isDemo})::int`,
      demo: sql<number>`count(*) filter (where ${propertyData.isDemo})::int`,
      pending: sql<number>`count(*) filter (where ${propertyData.verificationStatus} = 'PENDIENTE')::int`,
      unavailable: sql<number>`count(*) filter (where ${propertyData.verificationStatus} = 'NO_DISPONIBLE')::int`,
      total: sql<number>`count(${propertyData.id})::int`,
    })
    .from(properties)
    .leftJoin(users, eq(users.id, properties.ownerId))
    .leftJoin(propertyData, eq(propertyData.propertyId, properties.id))
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(properties.id, users.name)
    .orderBy(desc(properties.createdAt));

  const items = rows.map((r) => ({ ...r.p, ownerName: r.ownerName, confirmed: r.confirmed, pending: r.pending, unavailable: r.unavailable, demo: r.demo, total: r.total }));
  if (!filters.status) return items;
  return items.filter((i) => expedienteStatus(i).key === filters.status);
}

export type ExpedienteStatus = { key: "completo" | "pendiente" | "sin_consultar" | "demo"; label: string; resolved: number; required: number };

/** Estado del expediente: completo sólo cuando los 10 campos tienen un estado distinto de PENDIENTE y ninguno es demo. */
export function expedienteStatus(c: { confirmed: number; pending: number; unavailable: number; demo: number; total: number }): ExpedienteStatus {
  const required = FIELD_KEYS.length;
  const resolved = c.confirmed + c.unavailable + c.demo;
  if (c.total === 0 || (c.total === 1 && c.confirmed === 1 && resolved === 1)) return { key: "sin_consultar", label: "Sin consultar", resolved, required };
  if (c.pending > 0 || resolved < required) return { key: "pendiente", label: "Información pendiente", resolved, required };
  if (c.demo > 0) return { key: "demo", label: "Completo (demostración)", resolved, required };
  return { key: "completo", label: "Completo", resolved, required };
}

export async function listOwners() {
  return db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.role, "OWNER")).orderBy(users.name);
}
