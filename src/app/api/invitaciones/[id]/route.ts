import { eq } from "drizzle-orm";
import { withApi, json } from "@/lib/api";
import { requireApiUser, assertCan, HttpError } from "@/lib/session";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { revokeInvitation } from "@/lib/services/invitations";

export const DELETE = withApi(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireApiUser();
  assertCan(user, "invitation.manage");
  const [inv] = await db.select().from(invitations).where(eq(invitations.id, params.id)).limit(1);
  if (!inv) throw new HttpError(404, "Invitación no encontrada");
  const row = await revokeInvitation(params.id);
  return json({ invitation: row ?? inv });
});
