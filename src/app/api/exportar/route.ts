import { asc, inArray } from "drizzle-orm";
import { withApi } from "@/lib/api";
import { requireApiUser, assertCan, HttpError } from "@/lib/session";
import { db } from "@/lib/db";
import { integrationRuns, properties, propertyData } from "@/lib/db/schema";
import { FIELD_DEFS, FIELD_KEYS, type FieldKey } from "@/lib/connectors/fields";
import { toCsv } from "@/lib/csv";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : "");
const round = (n: number | null, dp = 2) => (n == null ? "" : Number(n.toFixed(dp)));

/**
 * Exporta las mediciones para el análisis estadístico.
 *  ?tipo=resumen → una fila por terreno (tiempos, completitud, trazabilidad)
 *  ?tipo=datos   → una fila por terreno y campo (valor, estado, fuente, fecha)
 */
export const GET = withApi(async (req: Request) => {
  const user = await requireApiUser();
  assertCan(user, "data.review");
  const tipo = new URL(req.url).searchParams.get("tipo") ?? "resumen";
  if (!["resumen", "datos"].includes(tipo)) throw new HttpError(400, "tipo debe ser resumen o datos");

  const props = await db.select().from(properties).orderBy(asc(properties.code));
  const ids = props.map((p) => p.id);
  const data = ids.length ? await db.select().from(propertyData).where(inArray(propertyData.propertyId, ids)) : [];
  const runs = ids.length ? await db.select().from(integrationRuns).where(inArray(integrationRuns.propertyId, ids)).orderBy(asc(integrationRuns.startedAt)) : [];
  const stamp = new Date().toISOString().slice(0, 10);

  let csv: string;
  if (tipo === "datos") {
    const rows = props.flatMap((p) => FIELD_KEYS.map((k) => {
      const d = data.find((x) => x.propertyId === p.id && x.fieldKey === k);
      return [p.code, p.name, p.municipality, FIELD_DEFS[k].order, FIELD_DEFS[k].label, d?.value ?? "", d?.verificationStatus ?? "SIN_CONSULTAR",
        d ? (d.isManual ? "si" : "no") : "", d ? (d.isDemo ? "si" : "no") : "", d?.source ?? "", d?.sourceUrl ?? "", d?.method ?? "", iso(d?.consultedAt), d?.notes ?? ""];
    }));
    csv = toCsv(["clave", "terreno", "municipio", "campo_num", "campo", "valor", "estado", "captura_manual", "demostrativo", "fuente", "url_fuente", "metodo", "fecha_consulta", "notas"], rows);
  } else {
    const rows = props.map((p) => {
      const pd = data.filter((x) => x.propertyId === p.id && FIELD_KEYS.includes(x.fieldKey as FieldKey));
      const pr = runs.filter((r) => r.propertyId === p.id && r.finishedAt);
      const first = pr[0], last = pr[pr.length - 1];
      const count = (s: string) => pd.filter((x) => x.verificationStatus === s).length;
      const confirmed = count("CONFIRMADO");
      const traced = pd.filter((x) => x.source && x.consultedAt).length;
      const minToFirst = first?.finishedAt ? (first.finishedAt.getTime() - p.createdAt.getTime()) / 60000 : null;
      return [p.code, p.name, p.municipality, p.areaM2 ?? "", iso(p.createdAt), pr.length,
        iso(first?.startedAt), iso(first?.finishedAt), round(first?.durationMs != null ? first.durationMs / 1000 : null),
        iso(last?.finishedAt), round(last?.durationMs != null ? last.durationMs / 1000 : null), round(minToFirst),
        confirmed, count("PENDIENTE"), count("NO_DISPONIBLE"), FIELD_KEYS.length - pd.length, pd.filter((x) => x.isManual).length,
        round((confirmed / FIELD_KEYS.length) * 100, 1), round((traced / FIELD_KEYS.length) * 100, 1), last?.mode ?? ""];
    });
    csv = toCsv(["clave", "terreno", "municipio", "superficie_m2", "registrado_en", "num_consultas",
      "primera_consulta_inicio", "primera_consulta_fin", "primera_consulta_duracion_s",
      "ultima_consulta_fin", "ultima_consulta_duracion_s", "min_registro_a_primera_consulta",
      "campos_confirmados", "campos_pendientes", "campos_no_disponibles", "campos_sin_consultar", "campos_captura_manual",
      "completitud_pct", "trazabilidad_pct", "modo_datos"], rows);
  }
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="acre-mediciones-${tipo}-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
});
