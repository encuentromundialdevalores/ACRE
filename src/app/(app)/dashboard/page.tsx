import Link from "next/link";
import { requireUser } from "@/lib/session";
import { dashboardStats } from "@/lib/services/dashboard";
import { listInvitationsForEmail } from "@/lib/services/invitations";
import { Card, StatCard, EmptyState, formatDate } from "@/components/ui";
import { PropertyTable } from "@/components/terrenos/property-table";

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "BUYER") {
    const shared = await listInvitationsForEmail(user.email);
    return (
      <div className="space-y-4">
        <div><h2 className="page-title">Expedientes compartidos contigo</h2><p className="page-lead">Acceso de solo lectura mientras la invitación esté vigente. Los enlaces privados que recibas por otros medios funcionan sin iniciar sesión.</p></div>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-medium text-brand-500">Hola, {user.name.split(" ")[0]}</p><h2 className="page-title mt-1">{user.role === "ADMIN" ? "Así van los terrenos de ACRE" : "Así van tus terrenos"}</h2><p className="page-lead">Revisa qué expedientes están listos para compartir y cuáles tienen datos pendientes.</p></div>
        <Link href="/terrenos/nuevo" className="btn-primary sm:hidden">Registrar terreno <span aria-hidden>→</span></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Terrenos registrados" value={s.total} tone="brand" />
        <StatCard label="Expedientes completos" value={s.complete} hint="10/10 campos resueltos" tone="accent" />
        <StatCard label="Con información pendiente" value={s.pending} hint={`${s.notQueried} sin consultar`} tone="amber" />
        {user.role === "ADMIN"
          ? <StatCard label="Invitaciones activas" value={s.invitationsActive} tone="slate" />
          : <StatCard label="Sin consultar" value={s.notQueried} tone="slate" />}
      </div>
      <Card title="Terrenos recientes" description={s.avgRunMs != null ? `Tiempo medio de una ejecución del motor de consultas: ${(s.avgRunMs / 1000).toFixed(1)} s.` : undefined} actions={<Link href="/terrenos" className="btn-ghost">Ver todos</Link>}>
        <PropertyTable items={s.recent} />
      </Card>
    </div>
  );
}
