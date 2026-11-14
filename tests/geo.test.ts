import { describe, it, expect } from "vitest";
import { validatePolygon, straightLineDistanceM, formatArea, normalizePolygon } from "@/lib/geo";

// Cuadrado de ~100 m de lado en Monterrey
const square = { type: "Polygon", coordinates: [[[-100.3161, 25.6866], [-100.3151, 25.6866], [-100.3151, 25.6875], [-100.3161, 25.6875], [-100.3161, 25.6866]]] };

describe("validatePolygon", () => {
  it("calcula área geodésica aproximada y punto representativo dentro", () => {
    const v = validatePolygon(square);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.areaM2).toBeGreaterThan(9_000);
    expect(v.areaM2).toBeLessThan(11_000);
    expect(v.representativePoint.lat).toBeGreaterThan(25.6866);
    expect(v.representativePoint.lat).toBeLessThan(25.6875);
  });
  it("cierra anillos abiertos y acepta Feature y FeatureCollection", () => {
    const open = { type: "Polygon", coordinates: [square.coordinates[0].slice(0, 4)] };
    expect(validatePolygon(open).ok).toBe(true);
    expect(validatePolygon({ type: "Feature", properties: {}, geometry: square }).ok).toBe(true);
    expect(validatePolygon({ type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: square }] }).ok).toBe(true);
  });
  it("rechaza autointersecciones (figura de ocho)", () => {
    const bowtie = { type: "Polygon", coordinates: [[[-100.32, 25.68], [-100.31, 25.69], [-100.31, 25.68], [-100.32, 25.69], [-100.32, 25.68]]] };
    const v = validatePolygon(bowtie);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.error).toMatch(/autointersecta/);
  });
  it("rechaza geometrías inválidas", () => {
    expect(validatePolygon(null).ok).toBe(false);
    expect(validatePolygon({ type: "Point", coordinates: [0, 0] }).ok).toBe(false);
    expect(validatePolygon({ type: "Polygon", coordinates: [[[0, 0], [1, 1]]] }).ok).toBe(false);
    expect(validatePolygon({ type: "Polygon", coordinates: [[[200, 0], [1, 1], [2, 2], [200, 0]]] }).ok).toBe(false);
    expect(normalizePolygon("x")).toBeNull();
  });
});

describe("utilidades", () => {
  it("distancia geodésica en línea recta", () => {
    const d = straightLineDistanceM({ lat: 25.6866, lng: -100.3161 }, { lat: 25.6866, lng: -100.3061 });
    expect(d).toBeGreaterThan(990); expect(d).toBeLessThan(1_020);
  });
  it("formatea m² y hectáreas", () => {
    expect(formatArea(1234.5)).toMatch(/m²/);
    expect(formatArea(25_000)).toMatch(/ha/);
    expect(formatArea(null)).toBe("—");
  });
});
