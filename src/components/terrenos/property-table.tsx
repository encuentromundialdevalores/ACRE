import Link from "next/link";
import { Badge, EmptyState, formatDate } from "@/components/ui";
import { formatArea } from "@/lib/geo";
import { expedienteStatus, type PropertyListItem } from "@/lib/services/properties";

export function ExpedienteBadge({ item }: { item: PropertyListItem }) {
  const s = expedienteStatus(item);
  const tone = s.key === "completo" ? "green" : s.key === "pendiente" ? "amber" : s.key === "demo" ? "violet" : "slate";
  return <Badge tone={tone}>{s.label}{s.key !== "sin_consultar" ? ` · ${s.resolved}/${s.required}` : ""}</Badge>;
}

export function PropertyTable({ items, emptyAction = true }: { items: PropertyListItem[]; emptyAction?: boolean }) {
  if (!items.length) return <EmptyState title="Sin terrenos" description="Aún no hay terrenos que coincidan. Registra el primero para generar su expediente." action={emptyAction ? { href: "/terrenos/nuevo", label: "Registrar terreno" } : undefined} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-subtle">
          <th className="py-2 pr-4 font-medium">Terreno</th><th className="py-2 pr-4 font-medium">Municipio</th><th className="py-2 pr-4 font-medium">Superficie</th><th className="py-2 pr-4 font-medium">Expediente</th><th className="py-2 pr-4 font-medium">Registro</th><th className="py-2 text-right font-medium">Acción</th>
        </tr></thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/60">
              <td className="py-3 pr-4"><p className="font-medium">{p.name}</p><p className="text-xs text-ink-subtle">{p.code}{p.ownerName ? ` · ${p.ownerName}` : ""}</p></td>
              <td className="py-3 pr-4">{p.municipality ?? <span className="text-ink-subtle">—</span>}</td>
              <td className="py-3 pr-4 whitespace-nowrap">{p.areaM2 ? formatArea(p.areaM2) : <span className="text-ink-subtle">Sin polígono</span>}</td>
              <td className="py-3 pr-4"><ExpedienteBadge item={p} /></td>
              <td className="py-3 pr-4 whitespace-nowrap text-ink-muted">{formatDate(p.createdAt)}</td>
              <td className="py-3 text-right"><Link href={`/terrenos/${p.id}`} className="btn-secondary px-3 py-1.5">Ver expediente</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
