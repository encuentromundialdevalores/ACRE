import { eq } from "drizzle-orm";
import { withApi, json } from "@/lib/api";
import { requireApiUser, HttpError } from "@/lib/session";
import { loadPropertyFor } from "@/lib/services/access";
import { getProperty, propertyInputSchema, updateProperty } from "@/lib/services/properties";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";

type Ctx = { params: { id: string } };

export const GET = withApi(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  await loadPropertyFor(user, params.id, "property.read");
  return json({ property: await getProperty(params.id) });
});

export const PATCH = withApi(async (req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  await loadPropertyFor(user, params.id, "property.update");
  const input = propertyInputSchema.parse(await req.json());
  try {
    return json({ property: await updateProperty(params.id, user, input) });
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
});

export const DELETE = withApi(async (_req: Request, { params }: Ctx) => {
  const user = await requireApiUser();
  await loadPropertyFor(user, params.id, "property.delete");
  await db.delete(properties).where(eq(properties.id, params.id));
  return json({ ok: true });
});
