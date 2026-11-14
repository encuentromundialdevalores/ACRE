import { describe, it, expect } from "vitest";
import { can } from "@/lib/permissions";

const admin = { id: "a", role: "ADMIN" as const }, owner = { id: "o", role: "OWNER" as const }, buyer = { id: "b", role: "BUYER" as const };
const mine = { ownerId: "o", createdBy: "a" }, other = { ownerId: "x", createdBy: "a" };

describe("matriz de permisos", () => {
  it("el socio puede todo sobre cualquier terreno", () => {
    expect(can(admin, "property.read", other)).toBe(true);
    expect(can(admin, "invitation.manage")).toBe(true);
    expect(can(admin, "property.run_queries", other)).toBe(true);
  });
  it("el propietario sólo ve y edita sus terrenos", () => {
    expect(can(owner, "property.read", mine)).toBe(true);
    expect(can(owner, "property.read", other)).toBe(false);
    expect(can(owner, "property.update", mine)).toBe(true);
    expect(can(owner, "document.upload", mine)).toBe(true);
    expect(can(owner, "property.run_queries", mine)).toBe(false);
    expect(can(owner, "invitation.manage")).toBe(false);
    expect(can(owner, "property.read")).toBe(false); // sin recurso no hay alcance
  });
  it("el comprador no accede a la administración ni a terrenos", () => {
    expect(can(buyer, "property.read", mine)).toBe(false);
    expect(can(buyer, "property.create")).toBe(false);
    expect(can(null, "property.read", mine)).toBe(false);
  });
});
