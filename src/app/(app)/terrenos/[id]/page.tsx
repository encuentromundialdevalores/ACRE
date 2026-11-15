import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import type { Feature, Polygon } from "geojson";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { getProperty, expedienteStatus } from "@/lib/services/properties";
import { integrationTimeline } from "@/lib/services/dashboard";
import { normalizePolygon, formatArea } from "@/lib/geo";
import { PROXIMITY_RADIUS_M } from "@/lib/connectors/fields";
import { currentDataMode } from "@/lib/connectors";
import { Badge, Alert, PageHero, formatDate } from "@/components/ui";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { Glance, Nearby } from "@/components/expediente/glance";
import { invitationState } from "@/lib/invitation-state";
import { PolygonViewer } from "@/components/map";
import { SourcesSection, toDataMap } from "@/components/expediente/sections";
import { DocumentsManager, RunQueriesButton, SharePanel } from "@/components/expediente/actions";
import { ManualEntryButton } from "@/components/expediente/manual-entry";
import { MANUAL_FIELDS } from "@/lib/services/manual-data";

export default async function PropertyPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const prop = await getProperty(params.id);
  if (!prop) notFound();
  if (!can(user, "property.read", prop)) redirect("/dashboard");
  const data = toDataMap(prop.data);
  const polygon = normalizePolygon(prop.polygonGeojson) as Feature<Polygon> | null;
  const point = prop.latitude && prop.longitude ? { lat: Number(prop.latitude), lng: Number(prop.longitude) } : null;
  const counts = { confirmed: prop.data.filter((d) => d.verificationStatus === "CONFIRMADO" && !d.isDemo).length, demo: prop.data.filter((d) => d.isDemo).length, pending: prop.data.filter((d) => d.verificationStatus === "PENDIENTE").length, unavailable: prop.data.filter((d) => d.verificationStatus === "NO_DISPONIBLE").length, total: prop.data.length };
  const status = expedienteStatus(counts);
  const timeline = await integrationTimeline(prop.id);
  const invs = can(user, "invitation.manage") ? await db.select().from(invitations).where(eq(invitations.propertyId, prop.id)).orderBy(desc(invitations.createdAt)) : [];
  const owner = prop.owner?.name ?? null;
  const demoMode = currentDataMode() === "DEMO";

  const officialAddress = data.direccion?.value ?? ([prop.address, prop.neighborhood, prop.municipality].filter(Boolean).join(", ") || null);
  const resolved = status.key === "sin_consultar" ? 0 : status.resolved;
  const pct = Math.round((resolved / (status.required || 10)) * 100);
  const barTone = status.key === "completo" ? "bg-emerald-500" : status.key === "pendiente" ? "bg-amber-500" : status.key === "demo" ? "bg-violet-500" : "bg-brand-500";
  const canShare = can(user, "invitation.manage");
  const ranOnce = prop.data.some((d) => d.fieldKey !== "superficie_m2");
  const manualTargets = can(user, "data.manual_entry", prop) && ranOnce
    ? MANUAL_FIELDS.map((k) => ({ fieldKey: k, status: data[k]?.verificationStatus ?? "SIN_CONSULTAR" })).filter((t) => t.status !== "CONFIRMADO")
    : [];
  const activeInvs = invs.filter((i) => invitationState(i) === "activa").length;

  const tabs: TabItem[] = [
    { id: "archivos", label: "Archivos", count: prop.documents.length, content: <div className="card p-6"><DocumentsManager propertyId={prop.id} documents={prop.documents} canUpload={can(user, "document.upload", prop)} canDelete={can(user, "document.delete", prop)} /></div> },
    ...(canShare ? [{ id: "compartir", label: "Compartir", count: activeInvs, content: <div className="card p-6"><p className="mb-5 max-w-2xl text-[15px] text-ink-muted">Genera un enlace privado de solo lectura para un comprador. El comprador no ve fuentes ni datos internos. Puedes revocarlo cuando quieras.</p><SharePanel propertyId={prop.id} invitations={invs} /></div> }] : []),
    ...(can(user, "data.review") ? [{ id: "fuentes", label: "Fuentes", content: <SourcesSection rows={prop.data} /> }] : []),
    ...(can(user, "data.review") && timeline.runs.length > 0 ? [{ id: "historial", label: "Historial", count: timeline.runs.length, content: (
      <div className="card p-6"><div className="grid gap-6 lg:grid-cols-2">
        <div><p className="mb-2 text-xs font-medium text-ink-muted">Consultas ejecutadas</p><ul className="space-y-2 text-sm">{timeline.runs.map((r) => { const sm = r.summary as { byStatus?: Record<string, number> } | null; return <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3"><span>{formatDate(r.startedAt, true)} <Badge tone={r.mode === "DEMO" ? "violet" : "brand"}>{r.mode === "DEMO" ? "Demo" : "Real"}</Badge></span><span className="text-ink-muted">{r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)} s` : "en curso"}{sm?.byStatus && ` · ${sm.byStatus.CONFIRMADO ?? 0} ok · ${sm.byStatus.PENDIENTE ?? 0} pend.`}</span></li>; })}</ul></div>
        <div><p className="mb-2 text-xs font-medium text-ink-muted">Detalle por fuente</p><ul className="max-h-80 space-y-1.5 overflow-auto text-xs">{timeline.logs.map((l) => <li key={l.id} className="flex items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2"><span className="font-medium">{l.provider}</span><span className="truncate text-ink-muted">{l.errorMessage ?? ""}</span><span className="shrink-0">{l.status}{l.cacheHit ? " (caché)" : ""} · {l.durationMs} ms</span></li>)}</ul></div>
      </div></div>
    ) }] : []),
  ];

  return (
    <div>
      <PageHero
        eyebrow={`${prop.code} · ${prop.municipality ?? "Municipio sin capturar"}`}
        title={prop.name}
        lead={officialAddress ?? "Ejecuta las consultas para obtener la dirección oficial."}
        actions={<>
          {can(user, "property.update", prop) && <Link href={`/terrenos/${prop.id}/editar`} className="btn-secondary">Editar</Link>}
          {can(user, "property.run_queries", prop) && <RunQueriesButton propertyId={prop.id} hasGeometry={!!polygon || !!point} />}
        </>}
      >
        <div className="mt-8 flex flex-wrap items-end gap-x-12 gap-y-6">
          <div><p className="text-sm text-ink-muted">Superficie</p><p className="font-display text-5xl font-black tracking-[-0.05em]">{formatArea(prop.areaM2)}</p></div>
          <div className="min-w-[240px] flex-1 sm:max-w-sm">
            <div className="flex items-baseline justify-between text-sm"><span className="text-ink-muted">Expediente</span><span className="font-semibold">{status.label} · {resolved} de {status.required || 10} datos</span></div>
            <div className="mt-2 h-2.5 rounded-full bg-white/80"><div className={`h-2.5 rounded-full ${barTone}`} style={{ width: `${pct}%` }} /></div>
          </div>
          {owner && <div><p className="text-sm text-ink-muted">Propietario</p><p className="text-[15px] font-semibold">{owner}</p></div>}
        </div>
      </PageHero>

      <div className="space-y-8">
        {manualTargets.length > 0 ? <ManualEntryButton propertyId={prop.id} targets={manualTargets} /> : status.key === "pendiente" && <Alert tone="warn">Hay datos pendientes. Vuelve a ejecutar las consultas antes de presentar este expediente como verificado.</Alert>}
        {demoMode && counts.demo > 0 && <Alert tone="info">Modo demostración: los datos marcados como <strong>Demostrativo</strong> son sintéticos.</Alert>}
        {!polygon && <Alert tone="warn">El terreno no tiene polígono. <Link className="underline" href={`/terrenos/${prop.id}/editar`}>Dibújalo</Link> para calcular la superficie y ejecutar las consultas.</Alert>}

        <section>
          <h2 className="mb-4 font-display text-2xl font-extrabold tracking-[-0.03em]">De un vistazo</h2>
          <Glance data={data} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="card overflow-hidden p-2"><PolygonViewer feature={polygon} point={point} radiusM={PROXIMITY_RADIUS_M} height={460} /></div>
          <Nearby data={data} />
        </section>

        {prop.description && <p className="rounded-3xl bg-white px-6 py-5 text-[15px] text-ink-muted shadow-card"><span className="font-semibold text-ink">Notas: </span>{prop.description}</p>}

        <section><Tabs tabs={tabs} /></section>
      </div>
    </div>
  );
}
