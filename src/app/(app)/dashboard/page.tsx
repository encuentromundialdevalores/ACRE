import Link from "next/link";
import { requireUser } from "@/lib/session";
import { dashboardStats } from "@/lib/services/dashboard";
import { listInvitationsForEmail } from "@/lib/services/invitations";
import { Card, EmptyState, PageHero, formatDate } from "@/components/ui";
import { PropertyTable } from "@/components/terrenos/property-table";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "BUYER") {
    const shared = await listInvitationsForEmail(user.email);
    return (
      <div>
        <PageHero eyebrow={`Hola, ${user.name.split(" ")[0]}`} title="Terrenos compartidos contigo." lead="Abre cada uno con el enlace privado que te enviaron. Funciona sin iniciar sesión." />
        <Card>
          {shared.length === 0 ? <EmptyState title="Sin expedientes compartidos" description="Cuando un socio de ACRE comparta un expediente con tu correo aparecerá aquí." /> : (
            <ul className="divide-y divide-line">
              {shared.map(({ inv, propertyName, propertyCode, municipality }) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><p className="font-medium">{propertyName}</p><p className="text-xs text-ink-subtle">{propertyCode}{municipality ? ` · ${municipality}` : ""} · vigente hasta {formatDate(inv.expiresAt, true)}</p></div>
                  <span className="text-xs text-ink-muted">Usa el enlace privado que recibiste para abrirlo.</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    );
  }
  const s = await dashboardStats(user);
  return (
    <div>
      <PageHero
        eyebrow={`Hola, ${user.name.split(" ")[0]}`}
        title={user.role === "ADMIN" ? <>Así van los<br />terrenos de ACRE.</> : <>Así van<br />tus terrenos.</>}
        lead="Revisa qué expedientes están listos para compartir y cuáles tienen datos pendientes."
        actions={<Link href="/terrenos/nuevo" className="btn-primary sm:hidden">Registrar terreno <span aria-hidden>→</span></Link>}
        stats={[
          { label: "Terrenos", value: s.total, dot: "bg-ink" },
          { label: "Listos para compartir", value: s.complete, dot: "bg-emerald-500" },
          { label: "Con pendientes", value: s.pending, dot: "bg-amber-500" },
          user.role === "ADMIN" ? { label: "Enlaces activos", value: s.invitationsActive, dot: "bg-brand-500" } : { label: "Sin consultar", value: s.notQueried, dot: "bg-brand-500" },
        ]}
      />
      <Card title="Terrenos recientes" description={s.avgRunMs != null ? `Las consultas tardan ${(s.avgRunMs / 1000).toFixed(1)} s en promedio.` : undefined} actions={<Link href="/terrenos" className="btn-ghost">Ver todos →</Link>}>
        <PropertyTable items={s.recent} />
      </Card>
    </div>
  );
}
