import { straightLineDistanceM } from "@/lib/geo";
import { fetchJson } from "./http";
import { ConnectorError, type Connector, type ConnectorInput, type ConnectorOutput, type FieldResult, type NearbyPlace } from "./types";
import type { FieldKey } from "./fields";

const noKeyReason = () => (process.env.GOOGLE_MAPS_API_KEY ? null : "Falta GOOGLE_MAPS_API_KEY (Geocoding API y Places API (New)).");

type GeocodeResponse = {
  status: string;
  error_message?: string;
  results: { formatted_address: string; address_components: { long_name: string; types: string[] }[] }[];
};

export function parseAddressComponents(components: { long_name: string; types: string[] }[]) {
  const pick = (...types: string[]) => components.find((c) => types.some((t) => c.types.includes(t)))?.long_name ?? null;
  return {
    street: [pick("route"), pick("street_number")].filter(Boolean).join(" ") || null,
    neighborhood: pick("sublocality_level_1", "sublocality", "neighborhood"),
    municipality: pick("locality", "administrative_area_level_2"),
    state: pick("administrative_area_level_1"),
    postalCode: pick("postal_code"),
  };
}

export const googleGeocodingConnector: Connector = {
  id: "google_geocoding",
  label: "Google Maps · Geocoding",
  fields: ["direccion"],
  notConfiguredReason: noKeyReason,
  async run(input: ConnectorInput): Promise<ConnectorOutput> {
    const key = process.env.GOOGLE_MAPS_API_KEY!;
    const { lat, lng } = input.point;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=es&region=mx&key=${encodeURIComponent(key)}`;
    const data = await fetchJson<GeocodeResponse>(url, { signal: input.signal });
    const publicUrl = "https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lng}";
    if (data.status === "REQUEST_DENIED") throw new ConnectorError(`Google rechazó la solicitud: ${data.error_message ?? ""}`, "auth");
    if (data.status === "ZERO_RESULTS") {
      return { fields: [{ fieldKey: "direccion", status: "NO_DISPONIBLE", value: null, source: "Google Geocoding API", sourceUrl: publicUrl, notes: "Google no devolvió una dirección para el punto." }] };
    }
    if (data.status !== "OK") throw new ConnectorError(`Geocoding respondió ${data.status}: ${data.error_message ?? ""}`, "invalid_response");
    const best = data.results[0];
    const parsed = parseAddressComponents(best.address_components);
    return {
      cacheable: true,
      fields: [{
        fieldKey: "direccion",
        status: "CONFIRMADO",
        value: best.formatted_address,
        valueJson: parsed,
        source: "Google Geocoding API",
        sourceUrl: publicUrl,
        method: `Geocodificación inversa del punto representativo (${lat.toFixed(5)}, ${lng.toFixed(5)}).`,
      }],
    };
  },
};

type PlacesResponse = {
  places?: { displayName?: { text: string }; location: { latitude: number; longitude: number }; primaryType?: string }[];
  error?: { message: string; status: string };
};

const CATEGORIES: { fieldKey: FieldKey; label: string; types: string[] }[] = [
  { fieldKey: "escuelas", label: "escuelas", types: ["school", "primary_school", "secondary_school", "university"] },
  { fieldKey: "hospitales", label: "hospitales y clínicas", types: ["hospital", "doctor", "medical_lab"] },
  { fieldKey: "transporte", label: "paradas o estaciones de transporte público", types: ["transit_station", "bus_station", "bus_stop", "subway_station", "light_rail_station", "train_station"] },
];

export const PLACES_MAX_RESULTS = 20;

async function nearby(input: ConnectorInput, types: string[], key: string): Promise<NearbyPlace[]> {
  const body = {
    includedTypes: types,
    maxResultCount: PLACES_MAX_RESULTS,
    languageCode: "es",
    locationRestriction: { circle: { center: { latitude: input.point.lat, longitude: input.point.lng }, radius: input.radiusM } },
  };
  const data = await fetchJson<PlacesResponse>("https://places.googleapis.com/v1/places:searchNearby", {
    method: "POST",
    signal: input.signal,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.displayName,places.location,places.primaryType",
    },
    body: JSON.stringify(body),
  });
  if (data.error) {
    const kind = data.error.status === "PERMISSION_DENIED" || data.error.status === "UNAUTHENTICATED" ? "auth" : "invalid_response";
    throw new ConnectorError(`Places API: ${data.error.message}`, kind);
  }
  return (data.places ?? [])
    .map((p) => ({
      name: p.displayName?.text ?? "Sin nombre",
      lat: p.location.latitude, lng: p.location.longitude,
      distanceM: straightLineDistanceM(input.point, { lat: p.location.latitude, lng: p.location.longitude }),
      category: p.primaryType,
    }))
    .sort((a, b) => a.distanceM - b.distanceM);
}

export function summarizeNearby(fieldKey: FieldKey, label: string, places: NearbyPlace[], radiusM: number, source: string, sourceUrl: string): FieldResult {
  const nearest = places[0];
  const capped = places.length >= PLACES_MAX_RESULTS;
  const countText = capped ? `${PLACES_MAX_RESULTS} o más` : String(places.length);
  return {
    fieldKey,
    status: "CONFIRMADO",
    value: places.length ? `${countText} en ${radiusM} m · más cercana a ${nearest.distanceM} m (línea recta)` : `0 en ${radiusM} m`,
    unit: "establecimientos",
    valueJson: { count: places.length, capped, nearestDistanceM: nearest?.distanceM ?? null, nearestName: nearest?.name ?? null, places, radiusM },
    source,
    sourceUrl,
    method: `Nearby Search (New) con radio de ${radiusM} m alrededor del punto representativo. Distancias geodésicas en línea recta (no de recorrido).${capped ? " La API devuelve máximo 20 resultados por consulta." : ""}`,
    notes: places.length === 0 ? `La fuente no reportó ${label} dentro del radio.` : null,
  };
}

export const googlePlacesConnector: Connector = {
  id: "google_places",
  label: "Google Maps · Places (New)",
  fields: ["escuelas", "hospitales", "transporte"],
  notConfiguredReason: noKeyReason,
  async run(input: ConnectorInput): Promise<ConnectorOutput> {
    const key = process.env.GOOGLE_MAPS_API_KEY!;
    const sourceUrl = "https://places.googleapis.com/v1/places:searchNearby";
    const results = await Promise.all(CATEGORIES.map((c) => nearby(input, c.types, key)));
    return {
      cacheable: true,
      fields: CATEGORIES.map((c, i) => summarizeNearby(c.fieldKey, c.label, results[i], input.radiusM, "Google Places API (New)", sourceUrl)),
    };
  },
};
