import { withApi, json } from "@/lib/api";
import { requireApiUser, assertCan, HttpError } from "@/lib/session";
import { createUser, createUserSchema, listUsers } from "@/lib/services/users";

export const GET = withApi(async () => {
  const user = await requireApiUser();
  assertCan(user, "user.manage");
  return json({ users: await listUsers() });
});

export const POST = withApi(async (req: Request) => {
  const user = await requireApiUser();
  assertCan(user, "user.manage");
  const input = createUserSchema.parse(await req.json());
  try {
    return json(await createUser(input), { status: 201 });
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
});
