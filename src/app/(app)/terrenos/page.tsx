import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { listProperties, type PropertyFilters } from "@/lib/services/properties";
import { PageHero } from "@/components/ui";
import { PropertyTable } from "@/components/terrenos/property-table";

export default async function PropertiesPage({ searchParams }: { searchParams: { q?: string; municipio?: string; estado?: string; vista?: string } }) {
  const user = await requireUser();
  if (user.role === "BUYER") redirect("/dashboard");
  const filters: PropertyFilters = { q: searchParams.q, municipality: searchParams.municipio, status: searchParams.estado as PropertyFilters["status"] };
  const items = await listProperties(user, filters);
  return (
    <div>
      <PageHero title="Terrenos." lead={`${items.length} terreno${items.length === 1 ? "" : "s"} ${user.role === "ADMIN" ? "registrados en ACRE" : "a tu nombre"}. Busca uno o abre su expediente.`}
        actions={<Link href="/terrenos/nuevo" className="btn-primary sm:hidden">Registrar terreno <span aria-hidden>→</span></Link>} />
      <div className="space-y-5">
        <form className="grid gap-3 rounded-3xl bg-white p-3 shadow-card md:grid-cols-[1fr_200px_200px_auto]">
          {searchParams.vista && <input type="hidden" name="vista" value={searchParams.vista} />}
          <input className="input" name="q" placeholder="Buscar por nombre, clave o dirección" defaultValue={searchParams.q ?? ""} />
          <input className="input" name="municipio" placeholder="Municipio" defaultValue={searchParams.municipio ?? ""} />
          <select className="input" name="estado" defaultValue={searchParams.estado ?? ""}>
            <option value="">Todos los estados</option><option value="completo">Completo</option><option value="pendiente">Información pendiente</option><option value="sin_consultar">Sin consultar</option>
          </select>
          <div className="flex gap-2"><button className="btn-primary">Buscar</button><Link href={searchParams.vista ? `/terrenos?vista=${searchParams.vista}` : "/terrenos"} className="btn-ghost">Limpiar</Link></div>
        </form>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">{items.length} resultado{items.length === 1 ? "" : "s"}</p>
          <div className="inline-flex rounded-full bg-white p-1 shadow-card" role="group" aria-label="Vista">
            {(["lista", "tarjetas"] as const).map((v) => { const qs = new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), ...(searchParams.municipio ? { municipio: searchParams.municipio } : {}), ...(searchParams.estado ? { estado: searchParams.estado } : {}), vista: v }); const on = (searchParams.vista ?? "lista") === v; return <Link key={v} href={`/terrenos?${qs}`} aria-pressed={on} className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${on ? "bg-ink text-white" : "text-ink-muted hover:text-ink"}`}>{v}</Link>; })}
          </div>
        </div>
        <PropertyTable items={items} view={searchParams.vista === "tarjetas" ? "tarjetas" : "lista"} />
      </div>
    </div>
  );
}
