import { eq } from "drizzle-orm";
import { withApi, json } from "@/lib/api";
import { requireApiUser, HttpError } from "@/lib/session";
import { loadPropertyFor } from "@/lib/services/access";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { storage } from "@/lib/storage";
import { fileResponse } from "@/lib/file-response";

type Ctx = { params: { id: string } };

/** Descarga autenticada: nunca se expone la ubicación real del archivo. */
export const GET = withApi(async (req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const [doc] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
  if (!doc) throw new HttpError(404, "Documento no encontrado");
  await loadPropertyFor(user, doc.propertyId, "document.read");
  const file = await storage().get(doc.storageKey);
  if (!file) throw new HttpError(404, "El archivo ya no está disponible");
  const inline = new URL(req.url).searchParams.get("inline") === "1";
  return fileResponse(file.body, doc.mimeType, doc.filename, inline);
});

export const DELETE = withApi(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  const [doc] = await db.select().from(documents).where(eq(documents.id, params.id)).limit(1);
  if (!doc) throw new HttpError(404, "Documento no encontrado");
  await loadPropertyFor(user, doc.propertyId, "document.delete");
  await storage().delete(doc.storageKey);
  await db.delete(documents).where(eq(documents.id, doc.id));
  return json({ ok: true });
});
