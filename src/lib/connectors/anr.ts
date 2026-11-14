import { fetchJson } from "./http";
import { ConnectorError, type Connector, type ConnectorInput, type ConnectorOutput, type FieldResult } from "./types";

/**
 * Atlas Nacional de Riesgos (CENAPRED) — servidor ArcGIS REST público.
 * Endpoints verificados el 13-nov-2026 (ver docs/DECISIONES.md). Configurables por variables ANR_*.
 */
const cfg = () => ({
  base: (process.env.ANR_BASE_URL ?? "https://rmgir.proyectomesoamerica.org/server/rest/services/ANR").replace(/\/$/, ""),
  seismicLayer: process.env.ANR_SEISMIC_LAYER ?? "Fenomenos_Geologicos/MapServer/467",
  landslideService: process.env.ANR_LANDSLIDE_SERVICE ?? "Fenomenos_Geologicos/MapServer",
  landslideLayers: (process.env.ANR_LANDSLIDE_LAYERS ?? "382,383,384,385,386").split(",").map((s) => s.trim()),
  floodLayer: process.env.ANR_FLOOD_LAYER ?? "Fenomenos_Hidrometeorologicos/MapServer/52",
});

export const ANR_PORTAL = "http://www.atlasnacionalderiesgos.gob.mx/";
const SOURCE = "Atlas Nacional de Riesgos · CENAPRED (ArcGIS REST)";

type QueryResponse = { features?: { attributes: Record<string, unknown> }[]; error?: { message: string } };
type IdentifyResponse = { results?: { layerId: number; layerName: string; attributes: Record<string, string> }[]; error?: { message: string } };

/** Orden de clases publicado por la fuente en las subcapas del ráster de laderas (Pixel Value 1..5). */
export const LANDSLIDE_CLASSES = ["Muy Bajo", "Bajo", "Medio", "Alto", "Muy Alto"] as const;

export function landslideClassFromPixel(pixel: string | undefined): string | null {
  if (!pixel || pixel === "NoData") return null;
  const n = Number(pixel);
  if (!Number.isInteger(n) || n < 1 || n > LANDSLIDE_CLASSES.length) return null;
  return LANDSLIDE_CLASSES[n - 1];
}

function pointQueryParams(lat: number, lng: number) {
  return new URLSearchParams({
    geometry: `${lng},${lat}`, geometryType: "esriGeometryPoint", inSR: "4326",
    spatialRel: "esriSpatialRelIntersects", outFields: "*", returnGeometry: "false", f: "json",
  });
}

function identifyParams(lat: number, lng: number, layers: string[]) {
  const d = 0.05;
  return new URLSearchParams({
    geometry: `${lng},${lat}`, geometryType: "esriGeometryPoint", sr: "4326", layers: `all:${layers.join(",")}`,
    tolerance: "2", mapExtent: `${lng - d},${lat - d},${lng + d},${lat + d}`, imageDisplay: "800,800,96",
    returnGeometry: "false", f: "json",
  });
}

async function seismic(input: ConnectorInput): Promise<FieldResult> {
  const c = cfg();
  const url = `${c.base}/${c.seismicLayer}/query?${pointQueryParams(input.point.lat, input.point.lng)}`;
  const data = await fetchJson<QueryResponse>(url, { signal: input.signal });
  if (data.error) throw new ConnectorError(`ANR sísmico: ${data.error.message}`, "invalid_response");
  const feat = data.features?.[0];
  if (!feat) {
    return { fieldKey: "riesgo_sismico", status: "NO_DISPONIBLE", value: null, source: SOURCE, sourceUrl: url, notes: "La capa de regionalización sísmica no contiene el punto consultado." };
  }
  const zone = String(feat.attributes.NAME ?? "");
  const level = String(feat.attributes.ZON2015 ?? "");
  return {
    fieldKey: "riesgo_sismico", status: "CONFIRMADO",
    value: [zone, level].filter(Boolean).join(" · "),
    valueJson: { zone, level, layer: "Regionalización sísmica (CFE, 2015)", attributes: feat.attributes },
    source: SOURCE, sourceUrl: url,
    method: "Intersección del punto representativo con la capa «Regionalización sísmica (CFE, 2015)». Clasificación según la fuente (campos NAME y ZON2015).",
  };
}

async function landslide(input: ConnectorInput): Promise<FieldResult> {
  const c = cfg();
  const url = `${c.base}/${c.landslideService}/identify?${identifyParams(input.point.lat, input.point.lng, c.landslideLayers)}`;
  const data = await fetchJson<IdentifyResponse>(url, { signal: input.signal });
  if (data.error) throw new ConnectorError(`ANR laderas: ${data.error.message}`, "invalid_response");
  const pixel = data.results?.find((r) => r.attributes?.["Pixel Value"] !== undefined)?.attributes["Pixel Value"];
  const cls = landslideClassFromPixel(pixel);
  if (!cls) {
    return {
      fieldKey: "riesgo_laderas", status: "NO_DISPONIBLE", value: null, source: SOURCE, sourceUrl: url,
      valueJson: { pixel: pixel ?? null },
      notes: pixel === "NoData" || pixel === undefined
        ? "El Mapa Nacional de Susceptibilidad de inestabilidad de laderas no tiene dato (NoData) en el punto consultado."
        : `Valor de píxel no reconocido: ${pixel}.`,
    };
  }
  return {
    fieldKey: "riesgo_laderas", status: "CONFIRMADO", value: cls,
    valueJson: { pixel, className: cls, layer: "Mapa Nacional de Susceptibilidad de inestabilidad de laderas" },
    source: SOURCE, sourceUrl: url,
    method: "Operación identify sobre el ráster «Mapa Nacional de Susceptibilidad de inestabilidad de laderas»; el valor de píxel (1–5) se traduce a la clase publicada por la fuente (Muy Bajo … Muy Alto).",
  };
}

async function flood(input: ConnectorInput): Promise<FieldResult> {
  const c = cfg();
  const url = `${c.base}/${c.floodLayer}/query?${pointQueryParams(input.point.lat, input.point.lng)}`;
  const data = await fetchJson<QueryResponse>(url, { signal: input.signal });
  if (data.error) throw new ConnectorError(`ANR inundación: ${data.error.message}`, "invalid_response");
  const feat = data.features?.[0];
  if (!feat) {
    return { fieldKey: "riesgo_inundacion", status: "NO_DISPONIBLE", value: null, source: SOURCE, sourceUrl: url, notes: "El índice municipal de peligro por inundación no contiene el punto consultado." };
  }
  const level = String(feat.attributes.PELIGRO_IN ?? "");
  const mun = String(feat.attributes.NOM_MUN ?? "");
  return {
    fieldKey: "riesgo_inundacion", status: level ? "CONFIRMADO" : "NO_DISPONIBLE",
    value: level ? `${level}${mun ? ` (municipio ${mun})` : ""}` : null,
    valueJson: { level, municipality: mun, layer: "Índice de peligro por inundación (CENAPRED, 2016)", attributes: feat.attributes },
    source: SOURCE, sourceUrl: url,
    method: "Intersección del punto representativo con la capa municipal «Índice de peligro por inundación (CENAPRED, 2016)», campo PELIGRO_IN.",
  };
}

/** Señal propia por indicador: vence un poco antes que el límite global para conservar los resultados parciales. */
function withOwnDeadline(parent: AbortSignal, ms: number): AbortSignal {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  parent.addEventListener("abort", () => { clearTimeout(t); c.abort(); });
  c.signal.addEventListener("abort", () => clearTimeout(t));
  return c.signal;
}

/** Cada indicador se consulta de forma independiente: el fallo de uno no afecta a los demás. */
export const anrConnector: Connector = {
  id: "anr",
  label: "Atlas Nacional de Riesgos",
  fields: ["riesgo_inundacion", "riesgo_sismico", "riesgo_laderas"],
  notConfiguredReason: () => null,
  async run(input: ConnectorInput): Promise<ConnectorOutput> {
    const perTaskMs = Math.max(5_000, Number(process.env.CONNECTOR_TIMEOUT_MS ?? 60_000) - 2_000);
    const sub = () => ({ ...input, signal: withOwnDeadline(input.signal, perTaskMs) });
    const tasks: { key: FieldResult["fieldKey"]; fn: () => Promise<FieldResult> }[] = [
      { key: "riesgo_inundacion", fn: () => flood(sub()) },
      { key: "riesgo_sismico", fn: () => seismic(sub()) },
      { key: "riesgo_laderas", fn: () => landslide(sub()) },
    ];
    const settled = await Promise.allSettled(tasks.map((t) => t.fn()));
    const fields = settled.map((s, i) => {
      if (s.status === "fulfilled") return s.value;
      const err = s.reason as Error;
      const timeout = err instanceof ConnectorError && err.kind === "timeout";
      return {
        fieldKey: tasks[i].key, status: "PENDIENTE" as const, value: null, source: SOURCE, sourceUrl: ANR_PORTAL,
        notes: timeout
          ? `La capa del Atlas Nacional de Riesgos no respondió dentro del límite de ${Math.round((perTaskMs + 2_000) / 1000)} s. Vuelve a ejecutar la consulta más tarde.`
          : `No fue posible consultar la fuente: ${err.message}`,
      } satisfies FieldResult;
    });
    return { fields, cacheable: fields.every((f) => f.status !== "PENDIENTE") };
  },
};
