import bcrypt from "bcryptjs";
import { asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { properties, users } from "@/lib/db/schema";
import { temporaryPassword } from "@/lib/password";

export const ROLES = ["ADMIN", "OWNER", "BUYER"] as const;

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre completo").max(120),
  email: z.string().trim().toLowerCase().email("Correo no válido"),
  role: z.enum(ROLES),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
  resetPassword: z.literal(true).optional(),
});

export async function listUsers() {
  return db.select({
    id: users.id, name: users.name, email: users.email, role: users.role, active: users.active, createdAt: users.createdAt,
    properties: sql<number>`(select count(*)::int from ${properties} where ${properties.ownerId} = ${users.id})`,
  }).from(users).orderBy(asc(users.role), asc(users.name));
}

export async function createUser(input: z.infer<typeof createUserSchema>) {
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (exists) throw new Error("Ya existe una cuenta con ese correo");
  const password = temporaryPassword();
  const [row] = await db.insert(users).values({ ...input, passwordHash: await bcrypt.hash(password, 12) })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });
  return { user: row, password };
}

export async function updateUser(actorId: string, id: string, input: z.infer<typeof updateUserSchema>) {
  if (id === actorId && (input.active === false || (input.role && input.role !== "ADMIN"))) {
    throw new Error("No puedes desactivar ni quitarte el rol de socio a ti mismo");
  }
  const set: Partial<typeof users.$inferInsert> = {};
  if (input.name) set.name = input.name;
  if (input.role) set.role = input.role;
  if (input.active !== undefined) set.active = input.active;
  let password: string | null = null;
  if (input.resetPassword) { password = temporaryPassword(); set.passwordHash = await bcrypt.hash(password, 12); }
  if (Object.keys(set).length === 0) throw new Error("Nada que actualizar");
  const [row] = await db.update(users).set(set).where(eq(users.id, id))
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role, active: users.active });
  if (!row) throw new Error("Usuario no encontrado");
  return { user: row, password };
}
