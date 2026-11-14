import "dotenv/config";
import { readFileSync } from "fs";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/lib/db";
import { users } from "../src/lib/db/schema";
import { createProperty } from "../src/lib/services/properties";
import { runIntegration } from "../src/lib/connectors/runner";
import { validatePolygon } from "../src/lib/geo";

/**
 * Importa los 20 polígonos ficticios del AMM y, opcionalmente, ejecuta el motor de consultas
 * para medir el tiempo de integración de cada expediente.
 *   npm run db:import-polygons                 → sólo importa
 *   npm run db:import-polygons -- --consultar  → importa y consulta
 */
async function main() {
  const file = process.argv.find((a) => a.endsWith(".geojson")) ?? "data/poligonos-prueba-amm.geojson";
  const consultar = process.argv.includes("--consultar");
  const fc = JSON.parse(readFileSync(file, "utf8")) as { features: { properties: Record<string, string | number>; geometry: unknown }[] };
  const [admin] = await db.select().from(users).where(eq(users.role, "ADMIN")).limit(1);
  if (!admin) throw new Error("Ejecuta primero npm run db:seed");
  const user = { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
  const rows: { code: string; name: string; areaM2: number; targetM2: number; ms?: number; ok?: number; pend?: number }[] = [];
  for (const f of fc.features) {
    const v = validatePolygon(f.geometry);
    if (!v.ok) { console.error(`✗ ${f.properties.id}: ${v.error}`); continue; }
    const t0 = Date.now();
    const prop = await createProperty(user, { name: String(f.properties.name), municipality: String(f.properties.municipality ?? ""), description: `Polígono ficticio de validación (${f.properties.id}). Objetivo ≈ ${f.properties.target_m2} m².`, polygon: f.geometry });
    const row: (typeof rows)[number] = { code: prop.code, name: prop.name, areaM2: Number(prop.areaM2), targetM2: Number(f.properties.target_m2) };
    if (consultar) {
      const s = await runIntegration(prop.id, admin.id);
      row.ms = Date.now() - t0; row.ok = s.byStatus.CONFIRMADO; row.pend = s.byStatus.PENDIENTE;
    }
    rows.push(row);
    console.log(`✓ ${prop.code} ${prop.name.padEnd(24)} ${row.areaM2.toFixed(0).padStart(7)} m² (objetivo ${row.targetM2})${row.ms != null ? ` · ${(row.ms / 1000).toFixed(1)} s · ${row.ok} ok / ${row.pend} pend.` : ""}`);
  }
  if (consultar && rows.length) {
    const avg = rows.reduce((a, r) => a + (r.ms ?? 0), 0) / rows.length;
    console.log(`\nTiempo medio de integración automática por expediente: ${(avg / 1000).toFixed(1)} s (${rows.length} terrenos). Añade el tiempo de registro manual para la métrica completa.`);
  }
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
