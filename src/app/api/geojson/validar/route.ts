import { withApi, json } from "@/lib/api";
import { requireApiUser, HttpError } from "@/lib/session";
import { validatePolygon } from "@/lib/geo";

/** Valida un GeoJSON importado y devuelve la geometría normalizada con su superficie. */
export const POST = withApi(async (req: Request) => {
  await requireApiUser();
  const body = await req.json().catch(() => null);
  const v = validatePolygon(body);
  if (!v.ok) throw new HttpError(400, v.error);
  return json({ feature: v.feature, areaM2: v.areaM2, point: v.representativePoint });
});
