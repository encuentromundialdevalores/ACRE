import Link from "next/link";
import { Badge, EmptyState, formatDate } from "@/components/ui";
import { formatArea } from "@/lib/geo";
import { expedienteStatus, type ExpedienteStatus, type PropertyListItem } from "@/lib/services/properties";

/** Color por estado del expediente: franja, barra de avance y píldora comparten tono. */
const TONE: Record<ExpedienteStatus["key"], { rail: string; bar: string; pill: string; soft: string; label: string }> = {
  completo:      { rail: "bg-emerald-500", bar: "bg-emerald-500", pill: "bg-emerald-100 text-emerald-900", soft: "bg-emerald-50", label: "Listo para compartir" },
  pendiente:     { rail: "bg-amber-400",   bar: "bg-amber-400",   pill: "bg-amber-100 text-amber-900",     soft: "bg-amber-50",   label: "Datos pendientes" },
  sin_consultar: { rail: "bg-brand-500",   bar: "bg-brand-500",   pill: "bg-brand-100 text-brand-700",     soft: "bg-brand-50",   label: "Sin consultar" },
  demo:          { rail: "bg-violet-500",  bar: "bg-violet-500",  pill: "bg-violet-100 text-violet-900",   soft: "bg-violet-50",  label: "Demostración" },
};

export function ExpedienteBadge({ item }: { item: PropertyListItem }) {
  const s = expedienteStatus(item);
  const tone = s.key === "completo" ? "green" : s.key === "pendiente" ? "amber" : s.key === "demo" ? "violet" : "slate";
  return <Badge tone={tone}>{s.label}{s.key !== "sin_consultar" ? ` · ${s.resolved}/${s.required}` : ""}</Badge>;
}

function Progress({ item }: { item: PropertyListItem }) {
  const s = expedienteStatus(item); const t = TONE[s.key];
  const done = s.key === "sin_consultar" ? 0 : s.resolved; const total = s.required || 10;
  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-2 text-[13px]"><span className={`rounded-full px-2.5 py-0.5 font-semibold ${t.pill}`}>{t.label}</span><span className="text-ink-muted">{done}/{total}</span></div>
      <div className="mt-2 h-2 rounded-full bg-canvas"><div className={`h-2 rounded-full ${t.bar}`} style={{ width: `${(done / total) * 100}%` }} /></div>
    </div>
  );
}

export function PropertyTable({ items, emptyAction = true, view = "lista" }: { items: PropertyListItem[]; emptyAction?: boolean; view?: "lista" | "tarjetas" }) {
  if (!items.length) return <EmptyState title="Sin terrenos" description="Aún no hay terrenos que coincidan. Registra el primero para generar su expediente." action={emptyAction ? { href: "/terrenos/nuevo", label: "Registrar terreno" } : undefined} />;

  if (view === "tarjetas") {
    return (
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((p) => { const t = TONE[expedienteStatus(p).key]; return (
          <li key={p.id}>
            <Link href={`/terrenos/${p.id}`} className="group block h-full overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-line/60 transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgb(20_22_23/0.25)]">
              <div className={`px-6 pb-5 pt-6 ${t.soft}`}>
                <p className="text-[13px] font-medium text-ink-muted">{p.code} · {p.municipality ?? "Sin municipio"}</p>
                <p className="mt-1 font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] group-hover:underline">{p.name}</p>
                <p className="mt-4 font-display text-4xl font-black tracking-[-0.05em]">{p.areaM2 ? formatArea(p.areaM2).replace(/\s*\(.*\)$/, "") : "—"}</p>
              </div>
              <div className="px-6 py-5"><Progress item={p} /><p className="mt-3 text-xs text-ink-subtle">Registrado {formatDate(p.createdAt)}{p.ownerName ? ` · ${p.ownerName}` : ""}</p></div>
            </Link>
          </li>
        ); })}
      </ul>
    );
  }

  return (
    <div>
      <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.8fr)_auto] gap-6 px-6 pb-3 text-xs font-semibold uppercase tracking-wider text-ink-subtle lg:grid">
        <span>Terreno</span><span>Municipio</span><span>Superficie</span><span>Expediente</span><span className="w-6" />
      </div>
      <ul className="space-y-2.5">
        {items.map((p) => { const t = TONE[expedienteStatus(p).key]; return (
          <li key={p.id}>
            <Link href={`/terrenos/${p.id}`} className="group relative grid grid-cols-1 gap-3 overflow-hidden rounded-2xl bg-white py-4 pl-7 pr-6 shadow-card ring-1 ring-line/60 transition hover:ring-ink/20 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1.8fr)_auto] lg:items-center lg:gap-6">
              <span className={`absolute inset-y-0 left-0 w-1.5 ${t.rail}`} aria-hidden />
              <span className="min-w-0"><span className="block truncate text-[17px] font-semibold group-hover:underline">{p.name}</span><span className="block text-[13px] text-ink-subtle">{p.code}{p.ownerName ? ` · ${p.ownerName}` : ""} · {formatDate(p.createdAt)}</span></span>
              <span className="text-[15px] text-ink-muted"><span className="text-xs text-ink-subtle lg:hidden">Municipio · </span>{p.municipality ?? "—"}</span>
              <span className="font-display text-xl font-extrabold tracking-[-0.03em]">{p.areaM2 ? formatArea(p.areaM2).replace(/\s*\(.*\)$/, "") : <span className="font-sans text-sm font-normal text-ink-subtle">Sin polígono</span>}</span>
              <Progress item={p} />
              <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink transition group-hover:bg-ink group-hover:text-white lg:flex" aria-hidden>→</span>
            </Link>
          </li>
        ); })}
      </ul>
    </div>
  );
}
