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
import { Card, Badge, Alert, formatDate } from "@/components/ui";
import { PolygonViewer } from "@/components/map";
import { CommercialSection, DatumRow, RisksSection, ServicesSection, SourcesSection, toDataMap } from "@/components/expediente/sections";
import { DocumentsManager, RunQueriesButton, SharePanel } from "@/components/expediente/actions";

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
  const addr = data.direccion?.valueJson as { street?: string | null; neighborhood?: string | null; municipality?: string | null } | undefined;
  const demoMode = currentDataMode() === "DEMO";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h2 className="page-title">{prop.name}</h2><Badge tone="brand">{prop.code}</Badge><Badge tone={status.key === "completo" ? "green" : status.key === "pendiente" ? "amber" : status.key === "demo" ? "violet" : "slate"}>{status.label}{status.key !== "sin_consultar" ? ` · ${status.resolved}/${status.required}` : ""}</Badge></div>
          <p className="mt-1 text-sm text-ink-muted">{prop.municipality ?? "Municipio sin capturar"} · registrado {formatDate(prop.createdAt, true)}{timeline.integrationMinutes != null && ` · tiempo de integración ${timeline.integrationMinutes < 60 ? `${timeline.integrationMinutes.toFixed(1)} min` : `${(timeline.integrationMinutes / 60).toFixed(1)} h`}`}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {can(user, "property.update", prop) && <Link href={`/terrenos/${prop.id}/editar`} className="btn-secondary">Editar</Link>}
          {can(user, "property.run_queries", prop) && <RunQueriesButton propertyId={prop.id} hasGeometry={!!polygon || !!point} />}
        </div>
      </div>

      {status.key === "pendiente" && <Alert tone="warn">Este expediente contiene datos pendientes. No debe presentarse como completamente verificado.</Alert>}
      {demoMode && counts.demo > 0 && <Alert tone="info">Modo demostración: los datos marcados como <strong>Demostrativo</strong> son sintéticos y no provienen de INEGI, Google ni CENAPRED.</Alert>}
      {!polygon && <Alert tone="warn">El terreno no tiene polígono. <Link className="underline" href={`/terrenos/${prop.id}/editar`}>Dibújalo</Link> para calcular la superficie y ejecutar las consultas.</Alert>}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <Card title="A. Información general">
          <DatumRow label="Dirección oficial (Geocoding)" datum={data.direccion}>
            <span className="font-medium">{data.direccion?.value}</span>
            {addr && (addr.street || addr.neighborhood || addr.municipality) && <span className="block text-xs text-ink-muted">Calle: {addr.street ?? "—"} · Colonia: {addr.neighborhood ?? "—"} · Municipio: {addr.municipality ?? "—"}</span>}
          </DatumRow>
          <div className="grid gap-x-6 sm:grid-cols-2">
            <div className="py-3"><p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Dirección capturada</p><p className="mt-0.5 text-sm">{[prop.address, prop.neighborhood, prop.municipality].filter(Boolean).join(", ") || <span className="text-ink-subtle">—</span>}</p></div>
            <div className="py-3"><p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Propietario</p><p className="mt-0.5 text-sm">{prop.owner?.name ?? <span className="text-ink-subtle">Sin asignar</span>}</p></div>
          </div>
          <DatumRow label="Superficie del polígono" datum={data.superficie_m2}><span className="font-display text-2xl font-extrabold tracking-[-0.03em]">{formatArea(prop.areaM2)}</span></DatumRow>
          {prop.description && <div className="py-3"><p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Descripción</p><p className="mt-0.5 text-sm text-ink-muted">{prop.description}</p></div>}
        </Card>
        <Card title="B. Ubicación geográfica" description={`Polígono del terreno, punto representativo y radio de ${PROXIMITY_RADIUS_M} m usado en las consultas de proximidad.`}>
          <PolygonViewer feature={polygon} point={point} radiusM={PROXIMITY_RADIUS_M} height={360} />
          {point && <p className="mt-2 font-mono text-xs text-ink-subtle">Punto representativo: {point.lat.toFixed(6)}, {point.lng.toFixed(6)}</p>}
        </Card>
      </div>

      <CommercialSection data={data} />
      <ServicesSection data={data} />
      <RisksSection data={data} />

      <Card title="F. Documentos y fotografías" description="Archivos privados asociados al terreno.">
        <DocumentsManager propertyId={prop.id} documents={prop.documents} canUpload={can(user, "document.upload", prop)} canDelete={can(user, "document.delete", prop)} />
      </Card>

      <SourcesSection rows={prop.data} />

      {can(user, "invitation.manage") && (
        <Card title="Compartir expediente" description="Genera un enlace privado y temporal de solo lectura para un comprador o desarrollador. Puedes revocarlo en cualquier momento.">
          <SharePanel propertyId={prop.id} invitations={invs} />
        </Card>
      )}

      {can(user, "data.review") && timeline.runs.length > 0 && (
        <Card title="Historial de consultas" description="Ejecuciones del motor y registro por proveedor (duración, caché y errores).">
          <div className="grid gap-4 lg:grid-cols-2">
            <ul className="space-y-1 text-sm">{timeline.runs.map((r) => { const s = r.summary as { byStatus?: Record<string, number> } | null; return <li key={r.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2"><span>{formatDate(r.startedAt, true)} · <Badge tone={r.mode === "DEMO" ? "violet" : "brand"}>{r.mode}</Badge></span><span className="text-xs text-ink-muted">{r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)} s` : "en curso"}{s?.byStatus && ` · ${s.byStatus.CONFIRMADO ?? 0} ok / ${s.byStatus.PENDIENTE ?? 0} pend.`}</span></li>; })}</ul>
            <ul className="max-h-64 space-y-1 overflow-auto text-xs">{timeline.logs.map((l) => <li key={l.id} className="flex items-center justify-between gap-2 rounded-md bg-canvas px-2.5 py-1.5"><span className="font-medium">{l.provider}</span><span className="truncate text-ink-muted">{l.errorMessage ?? ""}</span><span className="shrink-0">{l.status}{l.cacheHit ? " (caché)" : ""} · {l.durationMs} ms</span></li>)}</ul>
          </div>
        </Card>
      )}
    </div>
  );
}
