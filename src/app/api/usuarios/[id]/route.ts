import { withApi, json } from "@/lib/api";
import { requireApiUser, assertCan, HttpError } from "@/lib/session";
import { updateUser, updateUserSchema } from "@/lib/services/users";

export const PATCH = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  const user = await requireApiUser();
  assertCan(user, "user.manage");
  const input = updateUserSchema.parse(await req.json());
  try {
    return json(await updateUser(user.id, params.id, input));
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
});
