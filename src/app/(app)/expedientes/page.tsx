import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listProperties, expedienteStatus } from "@/lib/services/properties";
import { Card, StatCard } from "@/components/ui";
import { PropertyTable } from "@/components/terrenos/property-table";

export default async function ExpedientesPage() {
  const user = await requireUser();
  if (user.role === "BUYER") redirect("/dashboard");
  const items = await listProperties(user);
  const groups = { completo: items.filter((i) => ["completo", "demo"].includes(expedienteStatus(i).key)), pendiente: items.filter((i) => expedienteStatus(i).key === "pendiente"), sin: items.filter((i) => expedienteStatus(i).key === "sin_consultar") };
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold">Expedientes técnicos</h2><p className="text-sm text-ink-muted">Estado de integración de los 10 campos consultables de cada terreno. Fuente y fecha acompañan a cada dato dentro del expediente.</p></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Completos" value={groups.completo.length} tone="accent" /><StatCard label="Con pendientes" value={groups.pendiente.length} tone="amber" /><StatCard label="Sin consultar" value={groups.sin.length} tone="slate" />
      </div>
      <Card title="Con información pendiente" description="Requieren volver a ejecutar consultas o verificación manual."><PropertyTable items={groups.pendiente} emptyAction={false} /></Card>
      <Card title="Sin consultar"><PropertyTable items={groups.sin} emptyAction={false} /></Card>
      <Card title="Completos"><PropertyTable items={groups.completo} emptyAction={false} /></Card>
    </div>
  );
}
