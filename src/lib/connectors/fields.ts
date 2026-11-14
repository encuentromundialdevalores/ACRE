/** Catálogo de los campos obligatorios del expediente (los campos 11 y 12 — fuente y fecha — son metadatos de cada fila). */
export const FIELD_KEYS = [
  "direccion",
  "superficie_m2",
  "denue_comercios_500m",
  "denue_giros_principales",
  "escuelas",
  "hospitales",
  "transporte",
  "riesgo_inundacion",
  "riesgo_sismico",
  "riesgo_laderas",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export type FieldSection = "general" | "comercial" | "servicios" | "riesgos";

export const FIELD_DEFS: Record<FieldKey, { order: number; label: string; section: FieldSection; expectedSource: string }> = {
  direccion:               { order: 1,  label: "Dirección del predio (calle, colonia, municipio)", section: "general",   expectedSource: "Google Geocoding" },
  superficie_m2:           { order: 2,  label: "Superficie del polígono",                            section: "general",   expectedSource: "Turf.js" },
  denue_comercios_500m:    { order: 3,  label: "Unidades económicas a 500 m",                        section: "comercial", expectedSource: "INEGI DENUE" },
  denue_giros_principales: { order: 4,  label: "Tres giros comerciales principales",                 section: "comercial", expectedSource: "INEGI DENUE" },
  escuelas:                { order: 5,  label: "Escuelas cercanas",                                  section: "servicios", expectedSource: "Google Places" },
  hospitales:              { order: 6,  label: "Hospitales y clínicas",                               section: "servicios", expectedSource: "Google Places" },
  transporte:              { order: 7,  label: "Transporte público",                                  section: "servicios", expectedSource: "Google Places" },
  riesgo_inundacion:       { order: 8,  label: "Peligro por inundación",                              section: "riesgos",   expectedSource: "Atlas Nacional de Riesgos" },
  riesgo_sismico:          { order: 9,  label: "Peligro sísmico",                                     section: "riesgos",   expectedSource: "Atlas Nacional de Riesgos" },
  riesgo_laderas:          { order: 10, label: "Peligro por deslizamiento de laderas",                section: "riesgos",   expectedSource: "Atlas Nacional de Riesgos" },
};

export const PROXIMITY_RADIUS_M = 500;
