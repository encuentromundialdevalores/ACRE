import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listProperties, expedienteStatus } from "@/lib/services/properties";
import { Card, EmptyState, PageHero } from "@/components/ui";
import { PropertyTable } from "@/components/terrenos/property-table";

export default async function ExpedientesPage() {
  const user = await requireUser();
  if (user.role === "BUYER") redirect("/dashboard");
  const items = await listProperties(user);
  const groups = { completo: items.filter((i) => ["completo", "demo"].includes(expedienteStatus(i).key)), pendiente: items.filter((i) => expedienteStatus(i).key === "pendiente"), sin: items.filter((i) => expedienteStatus(i).key === "sin_consultar") };
  const sections = [
    { key: "pendiente", title: "Con datos pendientes", description: "Vuelve a ejecutar las consultas para completarlos.", items: groups.pendiente },
    { key: "sin", title: "Sin consultar", description: "Abre el expediente y pulsa Ejecutar consultas.", items: groups.sin },
    { key: "completo", title: "Listos para compartir", description: "Todos sus datos están confirmados.", items: groups.completo },
  ].filter((g) => g.items.length > 0);
  return (
    <div>
      <PageHero
        title="Expedientes."
        lead="Cada terreno tiene un expediente con 10 datos. Aquí ves cuáles están completos y cuáles necesitan atención."
        stats={[
          { label: "Listos para compartir", value: groups.completo.length, dot: "bg-emerald-500" },
          { label: "Con pendientes", value: groups.pendiente.length, dot: "bg-amber-500" },
          { label: "Sin consultar", value: groups.sin.length, dot: "bg-brand-500" },
        ]}
      />
      <div className="space-y-6">
        {sections.length === 0
          ? <Card><EmptyState title="Aún no hay expedientes" description="Registra un terreno para crear su expediente." action={{ href: "/terrenos/nuevo", label: "Registrar terreno" }} /></Card>
          : sections.map((g) => <Card key={g.key} title={g.title} description={g.description}><PropertyTable items={g.items} emptyAction={false} /></Card>)}
      </div>
    </div>
  );
}
