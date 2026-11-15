import { withApi, json } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { loadPropertyFor } from "@/lib/services/access";
import { manualEntrySchema, saveManualEntry, type ManualEntry } from "@/lib/services/manual-data";

/** Captura manual de un dato que la fuente automática no devolvió. */
export const POST = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  const user = await requireApiUser();
  await loadPropertyFor(user, params.id, "data.manual_entry");
  const entry = manualEntrySchema.parse(await req.json()) as unknown as ManualEntry;
  return json({ datum: await saveManualEntry(params.id, user.id, user.name, entry) }, { status: 201 });
});
