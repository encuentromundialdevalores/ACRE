import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { listInvitations, invitationState } from "@/lib/services/invitations";
import { Card, Badge, EmptyState, formatDate } from "@/components/ui";
import { RevokeButton } from "./revoke-button";

export default async function InvitationsPage() {
  const user = await requireUser();
  if (!can(user, "invitation.list_all")) redirect("/dashboard");
  const rows = await listInvitations();
  const active = rows.filter((r) => invitationState(r.inv) === "activa").length;
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-semibold">Invitaciones</h2><p className="text-sm text-ink-muted">{active} activa{active === 1 ? "" : "s"} de {rows.length}. Los enlaces se generan desde el expediente de cada terreno y sólo se muestran una vez.</p></div>
      <Card>
        {rows.length === 0 ? <EmptyState title="Sin invitaciones" description="Comparte un expediente desde la sección «Compartir expediente» de un terreno." action={{ href: "/terrenos", label: "Ir a terrenos" }} /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-subtle"><th className="py-2 pr-3 font-medium">Terreno</th><th className="py-2 pr-3 font-medium">Etiqueta / destinatario</th><th className="py-2 pr-3 font-medium">Creada</th><th className="py-2 pr-3 font-medium">Expira</th><th className="py-2 pr-3 font-medium">Accesos</th><th className="py-2 pr-3 font-medium">Estado</th><th className="py-2 text-right font-medium">Acción</th></tr></thead>
            <tbody>{rows.map(({ inv, propertyName, propertyCode, creatorName }) => { const st = invitationState(inv); return (
              <tr key={inv.id} className="border-b border-line/70 last:border-0">
                <td className="py-2.5 pr-3"><Link href={`/terrenos/${inv.propertyId}`} className="font-medium text-brand-700 hover:underline">{propertyName}</Link><p className="text-xs text-ink-subtle">{propertyCode} · por {creatorName}</p></td>
                <td className="py-2.5 pr-3">{inv.label ?? "—"}{inv.inviteeEmail && <p className="text-xs text-ink-muted">{inv.inviteeEmail}</p>}</td>
                <td className="whitespace-nowrap py-2.5 pr-3">{formatDate(inv.createdAt, true)}</td>
                <td className="whitespace-nowrap py-2.5 pr-3">{formatDate(inv.expiresAt, true)}</td>
                <td className="py-2.5 pr-3">{inv.accessCount}{inv.lastAccessedAt && <p className="text-xs text-ink-subtle">último {formatDate(inv.lastAccessedAt, true)}</p>}</td>
                <td className="py-2.5 pr-3"><Badge tone={st === "activa" ? "green" : st === "expirada" ? "slate" : "red"}>{st[0].toUpperCase() + st.slice(1)}</Badge></td>
                <td className="py-2.5 text-right">{st === "activa" && <RevokeButton id={inv.id} />}</td>
              </tr>
            ); })}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  );
}
