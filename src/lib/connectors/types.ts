import type { FieldKey } from "./fields";
import type { PolygonFeature } from "@/lib/geo";

export type VerificationStatus = "CONFIRMADO" | "PENDIENTE" | "NO_DISPONIBLE";

export type ProviderId = "denue" | "google_geocoding" | "google_places" | "anr" | "demo";

export type ConnectorInput = {
  propertyId: string;
  /** Punto representativo del polígono (dentro del terreno). */
  point: { lat: number; lng: number };
  polygon: PolygonFeature | null;
  radiusM: number;
  signal: AbortSignal;
};

export type NearbyPlace = { name: string; lat: number; lng: number; distanceM: number; category?: string };

export type FieldResult = {
  fieldKey: FieldKey;
  status: VerificationStatus;
  value: string | null;
  valueJson?: unknown;
  unit?: string | null;
  source: string;
  sourceUrl?: string | null;
  /** Cómo se obtuvo/calculó el dato (p. ej. "punto representativo + radio 500 m, distancia en línea recta"). */
  method?: string | null;
  notes?: string | null;
  isDemo?: boolean;
};

export type ConnectorOutput = { fields: FieldResult[]; cacheable?: boolean };

export interface Connector {
  id: ProviderId;
  label: string;
  /** Campos que este conector es responsable de producir. */
  fields: FieldKey[];
  /** Si devuelve una razón, el conector no se ejecuta y sus campos quedan PENDIENTE con esa nota. */
  notConfiguredReason(): string | null;
  run(input: ConnectorInput): Promise<ConnectorOutput>;
}

export class ConnectorError extends Error {
  constructor(message: string, public kind: "timeout" | "network" | "auth" | "invalid_response" | "unavailable" = "network") {
    super(message);
  }
}
