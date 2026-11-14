import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrationRuns, properties, propertyData, providerCache, queryLogs } from "@/lib/db/schema";
import { sha256 } from "@/lib/crypto";
import { normalizePolygon, validatePolygon } from "@/lib/geo";
import { PROXIMITY_RADIUS_M } from "./fields";
import { connectorsForMode, currentDataMode, type DataMode } from "./index";
import { ConnectorError, type Connector, type ConnectorInput, type FieldResult } from "./types";

export const TIMEOUT_MS = () => Number(process.env.CONNECTOR_TIMEOUT_MS ?? 60_000);
const CACHE_TTL_MS = () => Number(process.env.CONNECTOR_CACHE_TTL_HOURS ?? 24) * 3_600_000;

export type RunSummary = {
  runId: string;
  mode: DataMode;
  durationMs: number;
  byStatus: Record<"CONFIRMADO" | "PENDIENTE" | "NO_DISPONIBLE", number>;
  providers: { id: string; label: string; status: "ok" | "error" | "timeout" | "not_configured" | "cache"; durationMs: number; message?: string }[];
};

/** Clave de caché por proveedor y coordenadas redondeadas a ~1 m. */
export function cacheKeyFor(providerId: string, point: { lat: number; lng: number }, radiusM: number) {
  return sha256(`${providerId}|${point.lat.toFixed(5)}|${point.lng.toFixed(5)}|${radiusM}`);
}

async function readCache(key: string): Promise<FieldResult[] | null> {
  const [row] = await db.select().from(providerCache).where(and(eq(providerCache.cacheKey, key), gt(providerCache.expiresAt, new Date()))).limit(1);
  return row ? (row.payload as FieldResult[]) : null;
}

async function writeCache(key: string, providerId: string, fields: FieldResult[]) {
  const now = new Date();
  await db.insert(providerCache)
    .values({ cacheKey: key, provider: providerId, payload: fields, fetchedAt: now, expiresAt: new Date(now.getTime() + CACHE_TTL_MS()) })
    .onConflictDoUpdate({ target: providerCache.cacheKey, set: { payload: fields, fetchedAt: now, expiresAt: new Date(now.getTime() + CACHE_TTL_MS()) } });
}

/** Ejecuta un conector con límite de tiempo y traduce cualquier fallo a campos PENDIENTE. */
export async function executeConnector(connector: Connector, base: Omit<ConnectorInput, "signal">, opts: { useCache?: boolean } = {}) {
  const started = Date.now();
  const reason = connector.notConfiguredReason();
  const pendingAll = (notes: string): FieldResult[] =>
    connector.fields.map((fieldKey) => ({ fieldKey, status: "PENDIENTE" as const, value: null, source: connector.label, notes }));

  if (reason) {
    return { fields: pendingAll(`Conector no configurado: ${reason}`), status: "not_configured" as const, durationMs: 0, message: reason, cacheHit: false };
  }
  const key = cacheKeyFor(connector.id, base.point, base.radiusM);
  if (opts.useCache !== false) {
    const cached = await readCache(key);
    if (cached) {
      return { fields: cached.map((f) => ({ ...f, notes: [f.notes, "Resultado reutilizado de caché."].filter(Boolean).join(" ") })), status: "cache" as const, durationMs: Date.now() - started, cacheHit: true };
    }
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS());
  try {
    const out = await Promise.race([
      connector.run({ ...base, signal: controller.signal }),
      new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new ConnectorError(`La consulta superó el tiempo límite de ${TIMEOUT_MS() / 1000} s`, "timeout")))),
    ]);
    // Garantiza que cada campo prometido tenga un resultado.
    const missing = connector.fields.filter((k) => !out.fields.some((f) => f.fieldKey === k));
    const fields = [...out.fields, ...missing.map((fieldKey) => ({ fieldKey, status: "PENDIENTE" as const, value: null, source: connector.label, notes: "La fuente devolvió una respuesta incompleta para este campo." }))];
    if (out.cacheable && fields.every((f) => f.status !== "PENDIENTE")) await writeCache(key, connector.id, fields);
    return { fields, status: "ok" as const, durationMs: Date.now() - started, cacheHit: false };
  } catch (e) {
    const err = e as Error;
    const isTimeout = err instanceof ConnectorError && err.kind === "timeout";
    const note = isTimeout
      ? `La fuente no respondió dentro del límite de ${TIMEOUT_MS() / 1000} s. El dato queda pendiente; vuelve a ejecutar la consulta.`
      : `No fue posible completar la consulta: ${err.message}`;
    return { fields: pendingAll(note), status: isTimeout ? ("timeout" as const) : ("error" as const), durationMs: Date.now() - started, message: err.message, cacheHit: false };
  } finally {
    clearTimeout(timer);
  }
}

async function upsertField(propertyId: string, f: FieldResult) {
  const row = {
    propertyId, fieldKey: f.fieldKey, value: f.value, valueJson: f.valueJson ?? null, unit: f.unit ?? null,
    source: f.source, sourceUrl: f.sourceUrl ?? null, method: f.method ?? null, consultedAt: new Date(),
    verificationStatus: f.status, isDemo: !!f.isDemo, notes: f.notes ?? null,
  };
  await db.insert(propertyData).values(row).onConflictDoUpdate({ target: [propertyData.propertyId, propertyData.fieldKey], set: row });
}

/** Guarda la superficie calculada con Turf como dato del expediente (campo 2). */
export async function upsertAreaField(propertyId: string, areaM2: number) {
  await upsertField(propertyId, {
    fieldKey: "superficie_m2", status: "CONFIRMADO", value: areaM2.toFixed(2), unit: "m²",
    valueJson: { areaM2, hectares: areaM2 / 10_000 }, source: "Turf.js (cálculo geodésico local)",
    method: "Área geodésica del polígono GeoJSON calculada con @turf/area.",
  });
}

/** Ejecuta todos los conectores del modo actual para un terreno y persiste resultados, logs y la corrida. */
export async function runIntegration(propertyId: string, triggeredBy: string | null, opts: { useCache?: boolean } = {}): Promise<RunSummary> {
  const [prop] = await db.select().from(properties).where(eq(properties.id, propertyId)).limit(1);
  if (!prop) throw new Error("Terreno no encontrado");
  const mode = currentDataMode();
  const polygon = normalizePolygon(prop.polygonGeojson);
  let point = prop.latitude && prop.longitude ? { lat: Number(prop.latitude), lng: Number(prop.longitude) } : null;
  if (polygon) {
    const v = validatePolygon(polygon);
    if (v.ok) {
      point = v.representativePoint;
      await upsertAreaField(propertyId, v.areaM2);
    }
  }
  if (!point) throw new Error("El terreno no tiene polígono ni coordenadas para consultar.");

  const [run] = await db.insert(integrationRuns).values({ propertyId, triggeredBy, mode }).returning();
  const started = Date.now();
  const connectors = connectorsForMode(mode);
  const base = { propertyId, point, polygon, radiusM: PROXIMITY_RADIUS_M };

  const results = await Promise.all(connectors.map(async (c) => {
    const r = await executeConnector(c, base, opts);
    await db.insert(queryLogs).values({ propertyId, provider: c.id, status: r.status, durationMs: r.durationMs, cacheHit: r.cacheHit, errorMessage: r.message ?? null });
    for (const f of r.fields) await upsertField(propertyId, f);
    return { id: c.id, label: c.label, status: r.status, durationMs: r.durationMs, message: r.message, fields: r.fields };
  }));

  const byStatus = { CONFIRMADO: 0, PENDIENTE: 0, NO_DISPONIBLE: 0 };
  for (const r of results) for (const f of r.fields) byStatus[f.status]++;
  const durationMs = Date.now() - started;
  const summary: RunSummary = { runId: run.id, mode, durationMs, byStatus, providers: results.map((r) => ({ id: r.id, label: r.label, status: r.status, durationMs: r.durationMs, message: r.message })) };
  await db.update(integrationRuns).set({ finishedAt: new Date(), durationMs, summary }).where(eq(integrationRuns.id, run.id));
  await db.update(properties).set({ updatedAt: new Date() }).where(eq(properties.id, propertyId));
  return summary;
}
