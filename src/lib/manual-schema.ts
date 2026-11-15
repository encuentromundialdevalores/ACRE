import { z } from "zod";
import { PROXIMITY_RADIUS_M, type FieldKey } from "@/lib/connectors/fields";

export const RISK_LEVELS = ["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"] as const;

/** Campos que se pueden capturar a mano. La superficie no: siempre se calcula del polígono. */
export const MANUAL_FIELDS = ["direccion", "denue_comercios_500m", "denue_giros_principales", "escuelas", "hospitales", "transporte", "riesgo_inundacion", "riesgo_sismico", "riesgo_laderas"] as const satisfies readonly FieldKey[];
export type ManualField = (typeof MANUAL_FIELDS)[number];

const base = { source: z.string().trim().min(3, "Indica de dónde obtuviste el dato").max(160), sourceUrl: z.string().trim().url("URL no válida").max(500).optional().or(z.literal("")), notes: z.string().trim().max(500).optional() };
const count = z.coerce.number().int().min(0).max(100000);

export const manualEntrySchema = z.discriminatedUnion("fieldKey", [
  z.object({ fieldKey: z.literal("direccion"), text: z.string().trim().min(5).max(300), ...base }),
  z.object({ fieldKey: z.literal("denue_comercios_500m"), count, ...base }),
  z.object({ fieldKey: z.literal("denue_giros_principales"), giros: z.array(z.object({ activity: z.string().trim().min(2).max(200), count })).min(1).max(3), ...base }),
  ...(["escuelas", "hospitales", "transporte"] as const).map((k) => z.object({ fieldKey: z.literal(k), count, nearestDistanceM: z.coerce.number().min(0).max(50000).optional(), nearestName: z.string().trim().max(200).optional(), ...base })),
  ...(["riesgo_inundacion", "riesgo_sismico", "riesgo_laderas"] as const).map((k) => z.object({ fieldKey: z.literal(k), level: z.enum(RISK_LEVELS), ...base })),
] as unknown as [z.ZodObject<z.ZodRawShape>, ...z.ZodObject<z.ZodRawShape>[]]);

export type ManualEntry = { fieldKey: ManualField; source: string; sourceUrl?: string; notes?: string; text?: string; count?: number; giros?: { activity: string; count: number }[]; nearestDistanceM?: number; nearestName?: string; level?: string };

/** Convierte la captura en el mismo formato que produce el conector, para que el expediente la muestre igual. */
export function toDatum(e: ManualEntry): { value: string; valueJson: unknown } {
  switch (e.fieldKey) {
    case "direccion": return { value: e.text!, valueJson: null };
    case "denue_comercios_500m": return { value: String(e.count), valueJson: { count: e.count, radiusM: PROXIMITY_RADIUS_M, sample: [] } };
    case "denue_giros_principales": return { value: e.giros!.map((g) => `${g.activity} (${g.count})`).join("; "), valueJson: { top: e.giros, total: null } };
    case "escuelas": case "hospitales": case "transporte": {
      const d = e.nearestDistanceM;
      return {
        value: `${e.count} en ${PROXIMITY_RADIUS_M} m${d != null ? ` · más cercana a ${Math.round(d)} m` : ""}`,
        valueJson: { count: e.count, capped: false, nearestDistanceM: d ?? null, nearestName: e.nearestName || null, places: e.nearestName && d != null ? [{ name: e.nearestName, distanceM: d, lat: NaN, lng: NaN }] : [] },
      };
    }
    default: return { value: e.level!, valueJson: { level: e.level } };
  }
}

