import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { listInvitations, invitationState } from "@/lib/services/invitations";
import { Card, Badge, EmptyState, PageHero, formatDate } from "@/components/ui";
import { RevokeButton } from "./revoke-button";

export default async function InvitationsPage() {
  const user = await requireUser();
  if (!can(user, "invitation.list_all")) redirect("/dashboard");
  const rows = await listInvitations();
  const active = rows.filter((r) => invitationState(r.inv) === "activa").length;
  const order = { activa: 0, expirada: 1, revocada: 2 } as const;
  const sorted = [...rows].sort((a, b) => order[invitationState(a.inv)] - order[invitationState(b.inv)]);
  return (
    <div>
      <PageHero
        title="Enlaces compartidos."
        lead="Los enlaces privados que has enviado a compradores. Revoca uno y dejará de funcionar al momento."
        stats={[{ label: "Activos", value: active, dot: "bg-emerald-500" }, { label: "Total", value: rows.length, dot: "bg-ink" }]}
      />
      <Card>
        {rows.length === 0 ? <EmptyState title="Aún no has compartido nada" description="Abre el expediente de un terreno y pulsa Compartir expediente." action={{ href: "/terrenos", label: "Ir a terrenos" }} /> : (
          <ul className="divide-y divide-line">
            {sorted.map(({ inv, propertyName, propertyCode }) => { const st = invitationState(inv); return (
              <li key={inv.id} className={`flex flex-wrap items-center justify-between gap-4 py-4 ${st === "activa" ? "" : "opacity-60"}`}>
                <div className="min-w-0">
                  <Link href={`/terrenos/${inv.propertyId}`} className="font-semibold hover:underline">{propertyName}</Link>
                  <p className="mt-0.5 text-sm text-ink-muted">{inv.label ?? "Sin etiqueta"}{inv.inviteeEmail ? ` · ${inv.inviteeEmail}` : ""}</p>
                  <p className="mt-0.5 text-xs text-ink-subtle">{propertyCode} · {st === "activa" ? `vence ${formatDate(inv.expiresAt, true)}` : `creado ${formatDate(inv.createdAt)}`} · {inv.accessCount} {inv.accessCount === 1 ? "visita" : "visitas"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={st === "activa" ? "green" : st === "expirada" ? "slate" : "red"}>{st[0].toUpperCase() + st.slice(1)}</Badge>
                  {st === "activa" && <RevokeButton id={inv.id} />}
                </div>
              </li>
            ); })}
          </ul>
        )}
      </Card>
    </div>
  );
}
