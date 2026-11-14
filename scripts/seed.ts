import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/lib/db";
import { users } from "../src/lib/db/schema";

async function upsertUser(name: string, email: string, password: string, role: "ADMIN" | "OWNER" | "BUYER") {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    await db.update(users).set({ name, passwordHash, role }).where(eq(users.email, email));
  } else {
    await db.insert(users).values({ name, email, passwordHash, role });
  }
  console.log(`✓ ${role.padEnd(5)} ${email} / ${password}`);
}

async function main() {
  await upsertUser("Socio ACRE", process.env.SEED_ADMIN_EMAIL ?? "admin@acre.local", process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!", "ADMIN");
  await upsertUser("María Propietaria", "propietario@acre.local", "Owner1234!", "OWNER");
  await upsertUser("Carlos Comprador", "comprador@acre.local", "Buyer1234!", "BUYER");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
