import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listProperties, type PropertyFilters } from "@/lib/services/properties";
import { Card } from "@/components/ui";
import { PropertyTable } from "@/components/terrenos/property-table";

export default async function PropertiesPage({ searchParams }: { searchParams: { q?: string; municipio?: string; estado?: string } }) {
  const user = await requireUser();
  if (user.role === "BUYER") redirect("/dashboard");
  const filters: PropertyFilters = { q: searchParams.q, municipality: searchParams.municipio, status: searchParams.estado as PropertyFilters["status"] };
  const items = await listProperties(user, filters);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="page-title">Terrenos</h2><p className="page-lead">{items.length} terreno{items.length === 1 ? "" : "s"} {user.role === "ADMIN" ? "en la organización" : "a tu nombre"}.</p></div>
        <Link href="/terrenos/nuevo" className="btn-primary">Registrar terreno <span aria-hidden>→</span></Link>
      </div>
      <Card>
        <form className="mb-4 grid gap-3 md:grid-cols-[1fr_200px_200px_auto]">
          <input className="input" name="q" placeholder="Buscar por nombre, código o dirección" defaultValue={searchParams.q ?? ""} />
          <input className="input" name="municipio" placeholder="Municipio" defaultValue={searchParams.municipio ?? ""} />
          <select className="input" name="estado" defaultValue={searchParams.estado ?? ""}>
            <option value="">Todos los estados</option><option value="completo">Completo</option><option value="pendiente">Información pendiente</option><option value="sin_consultar">Sin consultar</option>
          </select>
          <div className="flex gap-2"><button className="btn-secondary">Filtrar</button><Link href="/terrenos" className="btn-ghost">Limpiar</Link></div>
        </form>
        <PropertyTable items={items} />
      </Card>
    </div>
  );
}
