import { withApi, json } from "@/lib/api";
import { requireApiUser, HttpError } from "@/lib/session";
import { loadPropertyFor } from "@/lib/services/access";
import { runIntegration } from "@/lib/connectors/runner";

export const maxDuration = 60;

export const POST = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  const user = await requireApiUser();
  await loadPropertyFor(user, params.id, "property.run_queries");
  const url = new URL(req.url);
  try {
    const summary = await runIntegration(params.id, user.id, { useCache: url.searchParams.get("cache") !== "0" });
    return json({ summary });
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
});
