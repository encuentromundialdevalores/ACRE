import type { Connector, ConnectorInput, ConnectorOutput, FieldResult, NearbyPlace } from "./types";
import { FIELD_KEYS } from "./fields";

/**
 * Conector de demostración. Genera datos sintéticos DETERMINISTAS a partir de las coordenadas.
 * Nunca se atribuyen a una institución: la fuente es siempre "Datos sintéticos de demostración".
 */
export const DEMO_SOURCE = "Datos sintéticos de demostración (no verificados)";

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

function fakePlaces(rand: () => number, point: { lat: number; lng: number }, n: number, prefix: string, radiusM: number): NearbyPlace[] {
  const out: NearbyPlace[] = [];
  for (let i = 0; i < n; i++) {
    const d = Math.round(60 + rand() * (radiusM - 60));
    const ang = rand() * Math.PI * 2;
    out.push({
      name: `${prefix} demo ${i + 1}`,
      lat: point.lat + (d / 111_320) * Math.cos(ang),
      lng: point.lng + (d / (111_320 * Math.cos((point.lat * Math.PI) / 180))) * Math.sin(ang),
      distanceM: d,
    });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

export function buildDemoFields(point: { lat: number; lng: number }, radiusM: number, areaM2?: number | null): FieldResult[] {
  const seed = Math.floor(Math.abs(point.lat * 1e4) + Math.abs(point.lng * 1e4));
  const rand = rng(seed);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const base = { source: DEMO_SOURCE, isDemo: true, status: "CONFIRMADO" as const, method: "Valor sintético generado localmente a partir de las coordenadas; sólo para demostración de la interfaz." };

  const comercios = Math.floor(rand() * 180);
  const giros = ["Comercio al por menor en tiendas de abarrotes", "Restaurantes con servicio de preparación de tacos y tortas", "Salones y clínicas de belleza", "Consultorios médicos", "Farmacias", "Talleres mecánicos"];
  const esc = fakePlaces(rand, point, Math.floor(rand() * 6), "Escuela", radiusM);
  const hosp = fakePlaces(rand, point, Math.floor(rand() * 4), "Clínica", radiusM);
  const trans = fakePlaces(rand, point, Math.floor(rand() * 8), "Parada", radiusM);
  const nearbyField = (fieldKey: FieldResult["fieldKey"], places: NearbyPlace[]): FieldResult => ({
    ...base, fieldKey, unit: "establecimientos",
    value: places.length ? `${places.length} en ${radiusM} m · más cercana a ${places[0].distanceM} m (línea recta)` : `0 en ${radiusM} m`,
    valueJson: { count: places.length, capped: false, nearestDistanceM: places[0]?.distanceM ?? null, nearestName: places[0]?.name ?? null, places, radiusM },
  });

  const calles = ["Av. Constitución", "Calle Hidalgo", "Av. Garza Sada", "Calle Morelos", "Av. Lincoln"];
  const colonias = ["Centro", "Del Valle", "Contry", "Mitras", "Cumbres"];
  const municipios = ["Monterrey", "San Pedro Garza García", "Guadalupe", "San Nicolás de los Garza", "Apodaca"];
  const niveles = ["Muy bajo", "Bajo", "Medio", "Alto"];

  const fields: FieldResult[] = [
    { ...base, fieldKey: "direccion", value: `${pick(calles)} ${100 + Math.floor(rand() * 900)}, ${pick(colonias)}, ${pick(municipios)}, N.L. (demo)`, valueJson: { demo: true } },
    { ...base, fieldKey: "denue_comercios_500m", value: String(comercios), unit: "unidades económicas", valueJson: { count: comercios, radiusM, sample: [] } },
    { ...base, fieldKey: "denue_giros_principales", value: [pick(giros), pick(giros), pick(giros)].filter((v, i, a) => a.indexOf(v) === i).join("; "), valueJson: { top: [] } },
    nearbyField("escuelas", esc),
    nearbyField("hospitales", hosp),
    nearbyField("transporte", trans),
    { ...base, fieldKey: "riesgo_inundacion", value: `${pick(niveles)} (demo)`, valueJson: { level: "demo" } },
    { ...base, fieldKey: "riesgo_sismico", value: "Zona A · Baja (demo)", valueJson: { level: "demo" } },
    { ...base, fieldKey: "riesgo_laderas", value: `${pick(["Muy Bajo", "Bajo", "Medio"])} (demo)`, valueJson: { level: "demo" } },
  ];
  if (areaM2 != null) {
    // La superficie siempre es un cálculo real de Turf, no se simula.
  }
  return fields;
}

export const demoConnector: Connector = {
  id: "demo",
  label: "Modo demostración",
  fields: FIELD_KEYS.filter((k) => k !== "superficie_m2"),
  notConfiguredReason: () => null,
  async run(input: ConnectorInput): Promise<ConnectorOutput> {
    await new Promise((r) => setTimeout(r, 400));
    return { fields: buildDemoFields(input.point, input.radiusM), cacheable: false };
  },
};
