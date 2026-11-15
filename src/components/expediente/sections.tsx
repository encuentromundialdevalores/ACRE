import type { ReactNode } from "react";
import type { PropertyDatum } from "@/lib/db/schema";
import { FIELD_DEFS, FIELD_KEYS, PROXIMITY_RADIUS_M, type FieldKey } from "@/lib/connectors/fields";
import { Card, StatusBadge, formatDate } from "@/components/ui";
import { formatDistance } from "@/lib/geo";
import type { NearbyPlace } from "@/lib/connectors/types";

export type DataMap = Partial<Record<FieldKey, PropertyDatum>>;
export const toDataMap = (rows: PropertyDatum[]): DataMap => Object.fromEntries(rows.map((r) => [r.fieldKey, r])) as DataMap;

function Missing() { return <span className="text-sm text-ink-subtle">Sin consultar</span>; }

/** `pub`: vista del comprador (enlace compartido). Oculta fuentes, fechas de consulta y metodología. */
export function DatumRow({ label, datum, children, pub = false }: { label: string; datum?: PropertyDatum; children?: ReactNode; pub?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line/70 py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
        <div className="mt-0.5 text-sm">{datum ? (children ?? <span className="font-medium">{datum.value ?? <span className="text-ink-subtle">—</span>}</span>) : <Missing />}</div>
        {!pub && datum?.notes && <p className="mt-1 text-xs text-amber-800">{datum.notes}</p>}
      </div>
      {datum && <div className="shrink-0 text-right"><StatusBadge status={datum.verificationStatus} isDemo={datum.isDemo} />{!pub && <p className="mt-1 text-[11px] text-ink-subtle">{datum.source} · {formatDate(datum.consultedAt, true)}</p>}</div>}
    </div>
  );
}

export function CommercialSection({ data, pub = false }: { data: DataMap; pub?: boolean }) {
  const count = data.denue_comercios_500m;
  const top = data.denue_giros_principales;
  const topJson = top?.valueJson as { top?: { activity: string; count: number }[] } | undefined;
  const max = topJson?.top?.[0]?.count ?? 0;
  return (
    <Card title={pub ? "Entorno comercial" : "Entorno comercial"} description={pub ? `Negocios registrados a ${PROXIMITY_RADIUS_M} m del terreno.` : `Unidades económicas en un radio de ${PROXIMITY_RADIUS_M} m alrededor del punto representativo (DENUE).`}>
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="rounded-2xl bg-brand-50 p-5"><p className="text-xs font-medium uppercase tracking-wide text-brand-700">{pub ? "Negocios cercanos" : "Unidades económicas"}</p><p className="mt-1 font-display text-5xl font-black tracking-[-0.05em] text-ink">{count?.value ?? "—"}</p><p className="text-xs text-brand-700/80">a {PROXIMITY_RADIUS_M} m</p>{count && <div className="mt-2"><StatusBadge status={count.verificationStatus} isDemo={count.isDemo} /></div>}</div>
        <div>
          <DatumRow label="Tres giros principales" datum={top} pub={pub}>
            {topJson?.top?.length ? (
              <ul className="mt-1 space-y-1.5">{topJson.top.map((t) => (
                <li key={t.activity}><div className="flex items-center justify-between text-sm"><span className="truncate pr-3">{t.activity}</span><span className="font-medium">{t.count}</span></div><div className="mt-0.5 h-1.5 rounded bg-line"><div className="h-1.5 rounded bg-accent-500" style={{ width: `${max ? (t.count / max) * 100 : 0}%` }} /></div></li>
              ))}</ul>
            ) : <span className="font-medium">{top?.value}</span>}
          </DatumRow>
          {!pub && count?.method && <p className="mt-2 text-xs text-ink-subtle">Metodología: {count.method}</p>}
        </div>
      </div>
    </Card>
  );
}

function NearbyCard({ title, datum, pub = false }: { title: string; datum?: PropertyDatum; pub?: boolean }) {
  const j = datum?.valueJson as { count?: number; capped?: boolean; nearestDistanceM?: number | null; nearestName?: string | null; places?: NearbyPlace[] } | undefined;
  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{title}</p>{datum && <StatusBadge status={datum.verificationStatus} isDemo={datum.isDemo} />}</div>
      {!datum ? <p className="mt-3 text-sm text-ink-subtle">Sin consultar</p> : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div><p className="text-[11px] uppercase tracking-wide text-ink-subtle">Encontrados</p><p className="text-2xl font-semibold">{j?.count != null ? `${j.count}${j.capped ? "+" : ""}` : "—"}</p></div>
            <div><p className="text-[11px] uppercase tracking-wide text-ink-subtle">Más cercano</p><p className="text-2xl font-semibold">{formatDistance(j?.nearestDistanceM ?? null)}</p><p className="truncate text-xs text-ink-muted">{j?.nearestName ?? ""}</p></div>
          </div>
          <p className="mt-2 text-[11px] text-ink-subtle">{pub ? "Distancia en línea recta." : "Distancia en línea recta (geodésica), no de recorrido."}</p>
          {!pub && datum.notes && <p className="mt-1 text-xs text-amber-800">{datum.notes}</p>}
          {j?.places && j.places.length > 0 && (
            <details className="mt-2 text-xs"><summary className="cursor-pointer text-brand-700">Ver lista ({j.places.length})</summary>
              <ul className="mt-1 max-h-40 space-y-0.5 overflow-auto">{j.places.map((p, i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{p.name}</span><span className="shrink-0 text-ink-muted">{formatDistance(p.distanceM)}</span></li>)}</ul></details>
          )}
        </>
      )}
    </div>
  );
}

export function ServicesSection({ data, pub = false }: { data: DataMap; pub?: boolean }) {
  return (
    <Card title={pub ? "Servicios cercanos" : "Servicios y amenidades"} description={pub ? `Escuelas, hospitales y transporte público a ${PROXIMITY_RADIUS_M} m.` : `Escuelas, hospitales/clínicas y transporte público en ${PROXIMITY_RADIUS_M} m (Google Places).`}>
      <div className="grid gap-4 md:grid-cols-3">
        <NearbyCard title="Escuelas" datum={data.escuelas} pub={pub} />
        <NearbyCard title="Hospitales y clínicas" datum={data.hospitales} pub={pub} />
        <NearbyCard title="Transporte público" datum={data.transporte} pub={pub} />
      </div>
    </Card>
  );
}

const RISK_TONE: Record<string, string> = { "muy bajo": "bg-emerald-100 text-emerald-900", baja: "bg-emerald-100 text-emerald-900", bajo: "bg-emerald-100 text-emerald-900", medio: "bg-amber-100 text-amber-900", media: "bg-amber-100 text-amber-900", alto: "bg-orange-200 text-orange-950", alta: "bg-orange-200 text-orange-950", "muy alto": "bg-red-200 text-red-950", "muy alta": "bg-red-200 text-red-950" };
export function riskTone(v: string | null | undefined) {
  const s = (v ?? "").toLowerCase();
  const k = Object.keys(RISK_TONE).sort((a, b) => b.length - a.length).find((k) => s.includes(k));
  return k ? RISK_TONE[k] : "bg-slate-100 text-slate-700";
}

export function RisksSection({ data, pub = false }: { data: DataMap; pub?: boolean }) {
  const items: { key: FieldKey; title: string }[] = [{ key: "riesgo_inundacion", title: "Inundación" }, { key: "riesgo_sismico", title: "Sísmico" }, { key: "riesgo_laderas", title: "Deslizamiento de laderas" }];
  return (
    <Card title={pub ? "Riesgos naturales" : "Riesgos naturales"} description={pub ? "Nivel de peligro oficial para la zona. Un dato pendiente no significa que no haya riesgo." : "Niveles de peligro según la clasificación publicada por el Atlas Nacional de Riesgos (CENAPRED). Un dato pendiente no significa ausencia de riesgo."}>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(({ key, title }) => {
          const d = data[key];
          return (
            <div key={key} className="rounded-2xl border border-line p-5">
              <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{title}</p>{d && <StatusBadge status={d.verificationStatus} isDemo={d.isDemo} />}</div>
              {!d ? <p className="mt-3 text-sm text-ink-subtle">Sin consultar</p> : d.verificationStatus === "CONFIRMADO" ? (
                <p className={`mt-3 inline-block rounded-md px-2.5 py-1 text-sm font-semibold ${riskTone(d.value)}`}>{d.value}</p>
              ) : <p className="mt-3 text-sm text-ink-muted">{d.verificationStatus === "PENDIENTE" ? "Consulta pendiente" : "Dato no disponible en la fuente"}</p>}
              {!pub && d?.notes && <p className="mt-2 text-xs text-amber-800">{d.notes}</p>}
              {!pub && d?.method && <p className="mt-2 text-[11px] text-ink-subtle">{d.method}</p>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function SourcesSection({ rows }: { rows: PropertyDatum[] }) {
  const sorted = [...rows].sort((a, b) => (FIELD_DEFS[a.fieldKey as FieldKey]?.order ?? 99) - (FIELD_DEFS[b.fieldKey as FieldKey]?.order ?? 99));
  const missing = FIELD_KEYS.filter((k) => !rows.some((r) => r.fieldKey === k));
  return (
    <Card title="Fuentes y verificaciones" description="De dónde viene cada dato, cuándo se consultó y si está confirmado.">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-subtle"><th className="py-2 pr-3 font-medium">#</th><th className="py-2 pr-3 font-medium">Campo</th><th className="py-2 pr-3 font-medium">Valor</th><th className="py-2 pr-3 font-medium">Fuente</th><th className="py-2 pr-3 font-medium">Fecha de consulta</th><th className="py-2 pr-3 font-medium">Estado</th></tr></thead>
          <tbody>
            {sorted.map((r) => { const def = FIELD_DEFS[r.fieldKey as FieldKey]; return (
              <tr key={r.id} className="border-b border-line/70 align-top last:border-0">
                <td className="py-2 pr-3 text-ink-subtle">{def?.order ?? "—"}</td>
                <td className="py-2 pr-3 font-medium">{def?.label ?? r.fieldKey}</td>
                <td className="max-w-xs py-2 pr-3"><span className="line-clamp-2">{r.value ?? "—"}</span>{r.notes && <span className="block text-xs text-amber-800">{r.notes}</span>}</td>
                <td className="py-2 pr-3">{r.sourceUrl ? <a className="text-brand-700 underline-offset-2 hover:underline" href={r.sourceUrl} target="_blank" rel="noreferrer">{r.source}</a> : r.source}{r.method && <span className="block text-[11px] text-ink-subtle">{r.method}</span>}</td>
                <td className="whitespace-nowrap py-2 pr-3">{formatDate(r.consultedAt, true)}</td>
                <td className="py-2 pr-3"><StatusBadge status={r.verificationStatus} isDemo={r.isDemo} /></td>
              </tr>
            ); })}
            {missing.map((k) => <tr key={k} className="border-b border-line/70 last:border-0"><td className="py-2 pr-3 text-ink-subtle">{FIELD_DEFS[k].order}</td><td className="py-2 pr-3 font-medium text-ink-muted">{FIELD_DEFS[k].label}</td><td className="py-2 pr-3 text-ink-subtle">Sin consultar</td><td className="py-2 pr-3 text-ink-subtle">{FIELD_DEFS[k].expectedSource}</td><td className="py-2 pr-3 text-ink-subtle">—</td><td className="py-2 pr-3 text-ink-subtle">—</td></tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
