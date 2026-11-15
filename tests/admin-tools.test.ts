import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";
import { manualEntrySchema, toDatum, type ManualEntry } from "@/lib/manual-schema";
import { temporaryPassword } from "@/lib/password";
import { can } from "@/lib/permissions";

describe("exportación CSV", () => {
  it("incluye BOM para Excel y escapa comas, comillas y saltos de línea", () => {
    const csv = toCsv(["a", "b"], [["Monterrey, N.L.", 'dice "hola"'], ["línea\nnueva", null]]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Monterrey, N.L.","dice ""hola"""');
    expect(csv).toContain('"línea\nnueva",');
  });
});

describe("captura manual", () => {
  it("valida que se indique la fuente", () => {
    expect(manualEntrySchema.safeParse({ fieldKey: "riesgo_sismico", level: "Bajo", source: "" }).success).toBe(false);
    expect(manualEntrySchema.safeParse({ fieldKey: "riesgo_sismico", level: "Bajo", source: "Portal del Atlas" }).success).toBe(true);
  });
  it("rechaza un nivel de riesgo inventado", () => {
    expect(manualEntrySchema.safeParse({ fieldKey: "riesgo_inundacion", level: "Sin riesgo", source: "Atlas" }).success).toBe(false);
  });
  it("produce el mismo formato que el conector para servicios cercanos", () => {
    const e = manualEntrySchema.parse({ fieldKey: "escuelas", count: "4", nearestDistanceM: "250", nearestName: "Primaria Juárez", source: "Google Maps" }) as unknown as ManualEntry;
    const d = toDatum(e);
    expect(d.value).toBe("4 en 500 m · más cercana a 250 m");
    expect(d.valueJson).toMatchObject({ count: 4, nearestDistanceM: 250, nearestName: "Primaria Juárez" });
  });
});

describe("gestión de usuarios", () => {
  it("genera contraseñas temporales de 13 caracteres distintas entre sí", () => {
    const a = temporaryPassword(), b = temporaryPassword();
    expect(a).toMatch(/^[A-Za-z]{4}-[2-9]{4}-[A-Za-z]{2}[!#$%*?]$/);
    expect(a).not.toBe(b);
  });
  it("solo el socio administra usuarios y captura datos a mano", () => {
    for (const action of ["user.manage", "data.manual_entry"] as const) {
      expect(can({ id: "1", role: "ADMIN" }, action)).toBe(true);
      expect(can({ id: "1", role: "OWNER" }, action, { ownerId: "1" })).toBe(false);
      expect(can({ id: "1", role: "BUYER" }, action)).toBe(false);
    }
  });
});
