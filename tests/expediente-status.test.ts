import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
const { expedienteStatus } = await import("@/lib/services/properties");

describe("estado del expediente", () => {
  it("sin datos → sin consultar; sólo superficie → sin consultar", () => {
    expect(expedienteStatus({ confirmed: 0, pending: 0, unavailable: 0, demo: 0, total: 0 }).key).toBe("sin_consultar");
    expect(expedienteStatus({ confirmed: 1, pending: 0, unavailable: 0, demo: 0, total: 1 }).key).toBe("sin_consultar");
  });
  it("con pendientes nunca es completo", () => {
    expect(expedienteStatus({ confirmed: 9, pending: 1, unavailable: 0, demo: 0, total: 10 }).key).toBe("pendiente");
  });
  it("no disponible cuenta como resuelto; demo se distingue de completo", () => {
    expect(expedienteStatus({ confirmed: 8, pending: 0, unavailable: 2, demo: 0, total: 10 }).key).toBe("completo");
    expect(expedienteStatus({ confirmed: 1, pending: 0, unavailable: 0, demo: 9, total: 10 }).key).toBe("demo");
  });
});
