import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Connector, ConnectorInput } from "@/lib/connectors/types";
import { ConnectorError } from "@/lib/connectors/types";
import { topActivities } from "@/lib/connectors/denue";
import { landslideClassFromPixel } from "@/lib/connectors/anr";
import { parseAddressComponents, summarizeNearby } from "@/lib/connectors/google";
import { buildDemoFields, DEMO_SOURCE } from "@/lib/connectors/demo";

// El runner importa la BD; se sustituye por un stub para probar la lógica de ejecución aislada.
vi.mock("@/lib/db", () => ({ db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }), insert: () => ({ values: () => ({ onConflictDoUpdate: async () => undefined, returning: async () => [{ id: "run" }] }) }) } }));

const { executeConnector } = await import("@/lib/connectors/runner");
const base = { propertyId: "p", point: { lat: 25.6866, lng: -100.3161 }, polygon: null, radiusM: 500 };

function fakeConnector(run: Connector["run"], reason: string | null = null): Connector {
  return { id: "denue", label: "Fake", fields: ["denue_comercios_500m", "denue_giros_principales"], notConfiguredReason: () => reason, run };
}

describe("executeConnector (manejo de fallos)", () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); process.env.CONNECTOR_TIMEOUT_MS = "50"; });
  afterEach(() => { vi.useRealTimers(); delete process.env.CONNECTOR_TIMEOUT_MS; });

  it("API fuera de servicio → todos los campos PENDIENTE, nunca negativo", async () => {
    const r = await executeConnector(fakeConnector(async () => { throw new ConnectorError("ECONNREFUSED", "network"); }), base, { useCache: false });
    expect(r.status).toBe("error");
    expect(r.fields).toHaveLength(2);
    for (const f of r.fields) { expect(f.status).toBe("PENDIENTE"); expect(f.value).toBeNull(); }
  });
  it("tiempo de espera superado → PENDIENTE con nota de 30 s", async () => {
    const r = await executeConnector(fakeConnector((input: ConnectorInput) => new Promise((_, rej) => input.signal.addEventListener("abort", () => rej(new ConnectorError("abort", "timeout"))))), base, { useCache: false });
    expect(r.status).toBe("timeout");
    expect(r.fields[0].notes).toMatch(/30 s/);
  });
  it("credenciales inválidas → PENDIENTE con el motivo", async () => {
    const r = await executeConnector(fakeConnector(async () => { throw new ConnectorError("token rechazado", "auth"); }), base, { useCache: false });
    expect(r.status).toBe("error");
    expect(r.fields[0].notes).toMatch(/token rechazado/);
  });
  it("respuesta incompleta → los campos faltantes quedan PENDIENTE", async () => {
    const r = await executeConnector(fakeConnector(async () => ({ fields: [{ fieldKey: "denue_comercios_500m", status: "CONFIRMADO", value: "3", source: "x" }] })), base, { useCache: false });
    expect(r.fields.find((f) => f.fieldKey === "denue_comercios_500m")?.status).toBe("CONFIRMADO");
    expect(r.fields.find((f) => f.fieldKey === "denue_giros_principales")?.status).toBe("PENDIENTE");
  });
  it("conector sin credenciales → not_configured sin llamar a la red", async () => {
    const run = vi.fn();
    const r = await executeConnector(fakeConnector(run, "Falta TOKEN"), base);
    expect(r.status).toBe("not_configured");
    expect(run).not.toHaveBeenCalled();
    expect(r.fields.every((f) => f.status === "PENDIENTE")).toBe(true);
  });
});

describe("parsers de fuentes", () => {
  it("DENUE: tres giros más frecuentes", () => {
    const rows = ["A", "B", "A", "C", "A", "B", "D"].map((c) => ({ Clase_actividad: c }));
    expect(topActivities(rows)).toEqual([{ activity: "A", count: 3 }, { activity: "B", count: 2 }, { activity: "C", count: 1 }]);
    expect(topActivities([])).toEqual([]);
  });
  it("ANR laderas: píxel → clase; NoData → null (no se inventa nivel)", () => {
    expect(landslideClassFromPixel("1")).toBe("Muy Bajo");
    expect(landslideClassFromPixel("4")).toBe("Alto");
    expect(landslideClassFromPixel("NoData")).toBeNull();
    expect(landslideClassFromPixel("9")).toBeNull();
    expect(landslideClassFromPixel(undefined)).toBeNull();
  });
  it("Google Geocoding: calle, colonia y municipio", () => {
    const p = parseAddressComponents([{ long_name: "Av. Constitución", types: ["route"] }, { long_name: "400", types: ["street_number"] }, { long_name: "Centro", types: ["sublocality_level_1", "sublocality"] }, { long_name: "Monterrey", types: ["locality"] }]);
    expect(p).toMatchObject({ street: "Av. Constitución 400", neighborhood: "Centro", municipality: "Monterrey" });
  });
  it("Google Places: cero resultados se reporta como 0 confirmado, no como ausencia de dato", () => {
    const f = summarizeNearby("escuelas", "escuelas", [], 500, "src", "url");
    expect(f.status).toBe("CONFIRMADO"); expect(f.value).toMatch(/^0 en 500 m/); expect(f.method).toMatch(/línea recta/);
  });
});

describe("modo demostración", () => {
  it("es determinista y siempre se etiqueta como sintético", () => {
    const a = buildDemoFields({ lat: 25.6866, lng: -100.3161 }, 500), b = buildDemoFields({ lat: 25.6866, lng: -100.3161 }, 500);
    expect(a.map((f) => f.value)).toEqual(b.map((f) => f.value));
    expect(a.every((f) => f.isDemo && f.source === DEMO_SOURCE)).toBe(true);
    expect(a.some((f) => /INEGI|Google|CENAPRED/i.test(f.source))).toBe(false);
  });
});

describe("DENUE sin resultados", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("convierte 'No hay resultados.' en 0 confirmado", async () => {
    process.env.INEGI_DENUE_TOKEN = "t";
    vi.stubGlobal("fetch", vi.fn(async () => new Response("No hay resultados.", { status: 200 })));
    const { denueConnector } = await import("@/lib/connectors/denue");
    const out = await denueConnector.run({ point: { lat: 25.7, lng: -100.3 }, radiusM: 500, signal: new AbortController().signal } as unknown as ConnectorInput);
    const count = out.fields.find((f) => f.fieldKey === "denue_comercios_500m");
    expect(count?.status).toBe("CONFIRMADO");
    expect(count?.value).toBe("0");
  });
});
