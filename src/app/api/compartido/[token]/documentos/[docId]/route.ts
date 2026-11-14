import { and, eq } from "drizzle-orm";
import { withApi } from "@/lib/api";
import { HttpError } from "@/lib/session";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { resolveInvitationToken } from "@/lib/services/invitations";
import { storage } from "@/lib/storage";
import { fileResponse } from "@/lib/file-response";

/** Descarga de documento mediante invitación vigente (sin sesión). */
export const GET = withApi(async (req: Request, { params }: { params: { token: string; docId: string } }) => {
  const inv = await resolveInvitationToken(params.token);
  if (!inv) throw new HttpError(404, "Enlace no válido o expirado");
  const [doc] = await db.select().from(documents).where(and(eq(documents.id, params.docId), eq(documents.propertyId, inv.propertyId))).limit(1);
  if (!doc) throw new HttpError(404, "Documento no encontrado");
  const file = await storage().get(doc.storageKey);
  if (!file) throw new HttpError(404, "El archivo ya no está disponible");
  return fileResponse(file.body, doc.mimeType, doc.filename, new URL(req.url).searchParams.get("inline") === "1");
});
