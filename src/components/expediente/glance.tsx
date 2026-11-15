import type { ReactNode } from "react";
import type { PropertyDatum } from "@/lib/db/schema";
import { PROXIMITY_RADIUS_M } from "@/lib/connectors/fields";
import { formatDistance } from "@/lib/geo";
import type { NearbyPlace } from "@/lib/connectors/types";
import { riskTone, type DataMap } from "./sections";

type Nearby = { count?: number; capped?: boolean; nearestDistanceM?: number | null; nearestName?: string | null; places?: NearbyPlace[] };

function Tile({ label, value, sub, tone, pending }: { label: string; value: ReactNode; sub?: ReactNode; tone: string; pending?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-3xl p-5 ${tone}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-2 font-display text-4xl font-black leading-none tracking-[-0.05em] sm:text-5xl">{value}</p>
      {sub && <p className="mt-2 truncate text-[13px] opacity-75">{sub}</p>}
      {pending && <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-amber-500" title="Pendiente" />}
    </div>
  );
}

function status(d?: PropertyDatum) {
  if (!d) return "none" as const;
  return d.verificationStatus === "CONFIRMADO" ? ("ok" as const) : ("pending" as const);
}

/** Resumen visual de un expediente: números clave y riesgos coloreados por nivel. */
export function Glance({ data }: { data: DataMap }) {
  const services: { key: "escuelas" | "hospitales" | "transporte"; label: string }[] = [
    { key: "escuelas", label: "Escuelas" }, { key: "hospitales", label: "Hospitales y clínicas" }, { key: "transporte", label: "Transporte público" },
  ];
  const risks: { key: "riesgo_inundacion" | "riesgo_sismico" | "riesgo_laderas"; label: string }[] = [
    { key: "riesgo_inundacion", label: "Inundación" }, { key: "riesgo_sismico", label: "Sismo" }, { key: "riesgo_laderas", label: "Deslave de laderas" },
  ];
  const commerce = data.denue_comercios_500m;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Negocios cercanos" tone="bg-ink text-white" value={commerce?.value ?? "—"} sub={`a ${PROXIMITY_RADIUS_M} m del terreno`} pending={status(commerce) === "pending"} />
        {services.map(({ key, label }) => {
          const d = data[key]; const j = d?.valueJson as Nearby | undefined;
          return <Tile key={key} label={label} tone="bg-brand-100 text-ink"
            value={j?.count != null ? `${j.count}${j.capped ? "+" : ""}` : "—"}
            sub={j?.nearestDistanceM != null ? `el más cercano a ${formatDistance(j.nearestDistanceM)}` : d ? "sin datos" : "sin consultar"}
            pending={status(d) === "pending"} />;
        })}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {risks.map(({ key, label }) => {
          const d = data[key]; const ok = status(d) === "ok";
          return (
            <div key={key} className={`flex items-center justify-between gap-3 rounded-3xl px-5 py-4 ${ok ? riskTone(d?.value) : "bg-white text-ink-muted ring-1 ring-inset ring-line"}`}>
              <span className="text-sm font-medium">Riesgo de {label.toLowerCase()}</span>
              <span className="font-display text-lg font-extrabold tracking-[-0.02em]">{ok ? (d?.value ?? "").replace(/\s*\(.*\)$/, "") : d ? "Pendiente" : "Sin consultar"}</span>
            </div>
          );
        })}
      </div>
      <p className="px-1 text-xs text-ink-subtle">Distancias en línea recta. Un riesgo pendiente no significa que no exista.</p>
    </div>
  );
}

/** Giros principales y lugares más cercanos, en una sola tarjeta. */
export function Nearby({ data }: { data: DataMap }) {
  const top = (data.denue_giros_principales?.valueJson as { top?: { activity: string; count: number }[] } | undefined)?.top ?? [];
  const max = top[0]?.count ?? 0;
  const lists: { key: "escuelas" | "hospitales" | "transporte"; label: string }[] = [
    { key: "escuelas", label: "Escuelas" }, { key: "hospitales", label: "Hospitales" }, { key: "transporte", label: "Transporte" },
  ];
  return (
    <div className="card h-full p-6">
      <h3 className="font-display text-lg font-bold tracking-[-0.02em]">Qué hay alrededor</h3>
      {top.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-ink-muted">Giros más comunes</p>
          <ul className="mt-2 space-y-2.5">{top.map((t) => (
            <li key={t.activity}>
              <div className="flex justify-between gap-3 text-sm"><span className="line-clamp-1">{t.activity}</span><span className="font-semibold">{t.count}</span></div>
              <div className="mt-1 h-2 rounded-full bg-canvas"><div className="h-2 rounded-full bg-ink" style={{ width: `${max ? (t.count / max) * 100 : 0}%` }} /></div>
            </li>
          ))}</ul>
        </div>
      )}
      <div className="mt-6 space-y-2">
        <p className="text-xs font-medium text-ink-muted">Lo más cercano</p>
        {lists.map(({ key, label }) => {
          const j = data[key]?.valueJson as Nearby | undefined;
          if (!j?.places?.length) return null;
          return (
            <details key={key} className="group rounded-2xl bg-canvas px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
                <span><span className="font-semibold">{label}</span> <span className="text-ink-muted">· {j.nearestName}</span></span>
                <span className="shrink-0 font-medium">{formatDistance(j.nearestDistanceM ?? null)} <span className="inline-block transition group-open:rotate-180">▾</span></span>
              </summary>
              <ul className="mt-2 max-h-44 space-y-1 overflow-auto text-[13px]">{j.places.map((p, i) => <li key={i} className="flex justify-between gap-3"><span className="truncate text-ink-muted">{p.name}</span><span className="shrink-0">{formatDistance(p.distanceM)}</span></li>)}</ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
