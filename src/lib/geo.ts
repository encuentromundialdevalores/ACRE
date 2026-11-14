import area from "@turf/area";
import kinks from "@turf/kinks";
import pointOnFeature from "@turf/point-on-feature";
import centroid from "@turf/centroid";
import distance from "@turf/distance";
import { polygon as turfPolygon, point as turfPoint } from "@turf/helpers";
import type { Feature, Polygon, Position } from "geojson";

export const MONTERREY_CENTER: [number, number] = [25.6866, -100.3161]; // lat, lng
export const MONTERREY_ZOOM = 11;

export type PolygonFeature = Feature<Polygon>;

export type GeometryValidation =
  | { ok: true; feature: PolygonFeature; areaM2: number; representativePoint: { lat: number; lng: number } }
  | { ok: false; error: string };

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** Acepta Feature<Polygon>, Polygon o FeatureCollection con un polígono; devuelve Feature<Polygon> normalizado. */
export function normalizePolygon(input: unknown): PolygonFeature | null {
  if (!input || typeof input !== "object") return null;
  const g = input as Record<string, unknown>;
  if (g.type === "FeatureCollection" && Array.isArray(g.features)) {
    const f = (g.features as unknown[]).find((x) => {
      const ff = x as Record<string, unknown>;
      const geom = ff.geometry as Record<string, unknown> | undefined;
      return geom?.type === "Polygon";
    });
    return f ? normalizePolygon(f) : null;
  }
  if (g.type === "Feature") {
    const geom = g.geometry as Record<string, unknown> | undefined;
    if (geom?.type !== "Polygon") return null;
    return { type: "Feature", properties: (g.properties as Record<string, unknown>) ?? {}, geometry: geom as unknown as Polygon };
  }
  if (g.type === "Polygon") {
    return { type: "Feature", properties: {}, geometry: g as unknown as Polygon };
  }
  return null;
}

export function validatePolygon(input: unknown): GeometryValidation {
  const feature = normalizePolygon(input);
  if (!feature) return { ok: false, error: "La geometría debe ser un polígono GeoJSON." };
  const rings = feature.geometry.coordinates;
  if (!Array.isArray(rings) || rings.length === 0) return { ok: false, error: "El polígono no tiene anillos." };
  const outer = rings[0] as Position[];
  if (outer.length < 4) return { ok: false, error: "El polígono necesita al menos tres vértices." };
  for (const pos of outer) {
    if (!Array.isArray(pos) || !isFiniteNumber(pos[0]) || !isFiniteNumber(pos[1])) {
      return { ok: false, error: "Coordenadas inválidas en el polígono." };
    }
    if (pos[0] < -180 || pos[0] > 180 || pos[1] < -90 || pos[1] > 90) {
      return { ok: false, error: "Coordenadas fuera de rango (se espera [lng, lat] en WGS84)." };
    }
  }
  const first = outer[0], last = outer[outer.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    outer.push([first[0], first[1]]);
  }
  let poly;
  try {
    poly = turfPolygon(rings as Position[][]);
  } catch (e) {
    return { ok: false, error: `Polígono inválido: ${(e as Error).message}` };
  }
  const selfIntersections = kinks(poly);
  if (selfIntersections.features.length > 0) {
    return { ok: false, error: "El polígono se autointersecta. Corrige los vértices cruzados." };
  }
  const areaM2 = area(poly);
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return { ok: false, error: "El polígono no tiene área." };
  const rp = pointOnFeature(poly).geometry.coordinates;
  return {
    ok: true,
    feature: { type: "Feature", properties: feature.properties ?? {}, geometry: poly.geometry },
    areaM2: Math.round(areaM2 * 100) / 100,
    representativePoint: { lat: rp[1], lng: rp[0] },
  };
}

export function polygonCentroid(feature: PolygonFeature): { lat: number; lng: number } {
  const c = centroid(feature).geometry.coordinates;
  return { lat: c[1], lng: c[0] };
}

/** Distancia geodésica en metros entre dos puntos (línea recta). */
export function straightLineDistanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return Math.round(distance(turfPoint([a.lng, a.lat]), turfPoint([b.lng, b.lat]), { units: "meters" }));
}

export function formatArea(m2: number | string | null | undefined): string {
  if (m2 === null || m2 === undefined) return "—";
  const n = typeof m2 === "string" ? Number(m2) : m2;
  if (!Number.isFinite(n)) return "—";
  const m2Str = `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} m²`;
  if (n >= 10_000) return `${m2Str} (${(n / 10_000).toLocaleString("es-MX", { maximumFractionDigits: 2 })} ha)`;
  return m2Str;
}

export function formatDistance(m: number | null | undefined): string {
  if (m === null || m === undefined || !Number.isFinite(m)) return "—";
  return m >= 1000 ? `${(m / 1000).toLocaleString("es-MX", { maximumFractionDigits: 2 })} km` : `${Math.round(m)} m`;
}
