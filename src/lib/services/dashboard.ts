import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { integrationRuns, properties, queryLogs } from "@/lib/db/schema";
import { expedienteStatus, listProperties } from "./properties";
import { countActiveInvitations } from "./invitations";
import type { SessionUser } from "@/lib/session";

export async function dashboardStats(user: SessionUser) {
  const items = await listProperties(user);
  const statuses = items.map((i) => expedienteStatus(i).key);
  const avg = await db.select({ avg: sql<number | null>`avg(${integrationRuns.durationMs})` }).from(integrationRuns);
  const invitationsActive = user.role === "ADMIN" ? await countActiveInvitations() : 0;
  return {
    total: items.length,
    complete: statuses.filter((s) => s === "completo" || s === "demo").length,
    pending: statuses.filter((s) => s === "pendiente").length,
    notQueried: statuses.filter((s) => s === "sin_consultar").length,
    invitationsActive,
    avgRunMs: avg[0]?.avg != null ? Number(avg[0].avg) : null,
    recent: items.slice(0, 8),
  };
}

export async function integrationTimeline(propertyId: string) {
  const [prop] = await db.select({ createdAt: properties.createdAt }).from(properties).where(eq(properties.id, propertyId)).limit(1);
  const runs = await db.select().from(integrationRuns).where(eq(integrationRuns.propertyId, propertyId)).orderBy(desc(integrationRuns.startedAt)).limit(10);
  const logs = await db.select().from(queryLogs).where(eq(queryLogs.propertyId, propertyId)).orderBy(desc(queryLogs.queriedAt)).limit(40);
  const lastFinished = runs.find((r) => r.finishedAt);
  const integrationMinutes = prop && lastFinished?.finishedAt ? (lastFinished.finishedAt.getTime() - prop.createdAt.getTime()) / 60_000 : null;
  return { runs, logs, integrationMinutes };
}
