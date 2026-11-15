import { eq } from "drizzle-orm";
import { withApi, json } from "@/lib/api";
import { requireApiUser, HttpError } from "@/lib/session";
import { loadPropertyFor } from "@/lib/services/access";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { ALLOWED_MIME, contentMatchesMime, maxUploadBytes, newStorageKey, storage } from "@/lib/storage";

type Ctx = { params: { id: string } };

export const GET = withApi(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  await loadPropertyFor(user, params.id, "document.read");
  const rows = await db.select().from(documents).where(eq(documents.propertyId, params.id)).orderBy(documents.createdAt);
  return json({ documents: rows });
});

export const POST = withApi(async (req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  await loadPropertyFor(user, params.id, "document.upload");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Archivo requerido");
  const kind = ALLOWED_MIME[file.type];
  if (!kind) throw new HttpError(400, `Tipo de archivo no permitido: ${file.type || "desconocido"}`);
  if (file.size > maxUploadBytes()) throw new HttpError(400, `El archivo supera el máximo de ${process.env.MAX_UPLOAD_MB ?? 15} MB`);
  const buf = Buffer.from(await file.arrayBuffer());
  if (!contentMatchesMime(buf, file.type)) throw new HttpError(400, "El contenido del archivo no corresponde a su tipo declarado");
  const key = newStorageKey(params.id, file.name);
  await storage().put(key, buf, file.type);
  const [row] = await db.insert(documents).values({
    propertyId: params.id, filename: file.name.slice(0, 200), storageKey: key, mimeType: file.type, sizeBytes: file.size, kind, uploadedBy: user.id,
  }).returning();
  return json({ document: row }, { status: 201 });
});
