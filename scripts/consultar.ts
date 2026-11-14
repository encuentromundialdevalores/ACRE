import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/lib/db";
import { properties, propertyData } from "../src/lib/db/schema";
import { runIntegration } from "../src/lib/connectors/runner";

/**
 * Ejecuta el motor de consultas para un terreno desde la terminal y muestra el resultado por campo.
 *   DATA_MODE=real npx tsx scripts/consultar.ts ACRE-0001 [--sin-cache]
 */
async function main() {
  const code = process.argv[2];
  if (!code) throw new Error("Uso: tsx scripts/consultar.ts <código ACRE-xxxx> [--sin-cache]");
  const [p] = await db.select().from(properties).where(eq(properties.code, code)).limit(1);
  if (!p) throw new Error(`No existe el terreno ${code}`);
  const t0 = Date.now();
  const s = await runIntegration(p.id, null, { useCache: !process.argv.includes("--sin-cache") });
  console.log(`Modo ${s.mode} · ${((Date.now() - t0) / 1000).toFixed(1)} s · ${JSON.stringify(s.byStatus)}`);
  for (const pr of s.providers) console.log(`  ${pr.label.padEnd(32)} ${pr.status.padEnd(15)} ${(pr.durationMs / 1000).toFixed(1)} s ${pr.message ?? ""}`);
  const rows = await db.select().from(propertyData).where(eq(propertyData.propertyId, p.id));
  console.log("\nCampo                      Estado         Valor                                            | Nota");
  for (const r of rows.sort((a, b) => a.fieldKey.localeCompare(b.fieldKey)))
    console.log(`${r.fieldKey.padEnd(26)} ${r.verificationStatus.padEnd(14)} ${(r.isDemo ? "[DEMO] " : "") + (r.value ?? "—").slice(0, 48).padEnd(48)} | ${(r.notes ?? "").slice(0, 100)}`);
  await pool.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
