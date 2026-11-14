import { z } from "zod";
import { withApi, json } from "@/lib/api";
import { requireApiUser } from "@/lib/session";
import { loadPropertyFor } from "@/lib/services/access";
import { createInvitation, listInvitations } from "@/lib/services/invitations";

const schema = z.object({ days: z.number().int().min(1).max(90), label: z.string().max(120).optional().nullable(), inviteeEmail: z.string().email().optional().nullable().or(z.literal("")) });

export const GET = withApi(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = await requireApiUser();
  await loadPropertyFor(user, params.id, "invitation.manage");
  return json({ invitations: await listInvitations(params.id) });
});

export const POST = withApi(async (req: Request, { params }: { params: { id: string } }) => {
  const user = await requireApiUser();
  await loadPropertyFor(user, params.id, "invitation.manage");
  const input = schema.parse(await req.json());
  const { invitation, token } = await createInvitation(params.id, user.id, { days: input.days, label: input.label, inviteeEmail: input.inviteeEmail || null });
  const origin = process.env.AUTH_URL ?? new URL(req.url).origin;
  return json({ invitation, url: `${origin}/compartido/${token}` }, { status: 201 });
});
