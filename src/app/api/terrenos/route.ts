import { withApi, json } from "@/lib/api";
import { requireApiUser, assertCan, HttpError } from "@/lib/session";
import { createProperty, listProperties, propertyInputSchema } from "@/lib/services/properties";

export const GET = withApi(async (req: Request) => {
  const user = await requireApiUser();
  const url = new URL(req.url);
  const items = await listProperties(user, { q: url.searchParams.get("q") ?? undefined, municipality: url.searchParams.get("municipio") ?? undefined });
  return json({ items });
});

export const POST = withApi(async (req: Request) => {
  const user = await requireApiUser();
  assertCan(user, "property.create");
  const input = propertyInputSchema.parse(await req.json());
  try {
    const row = await createProperty(user, input);
    return json({ property: row }, { status: 201 });
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
});
