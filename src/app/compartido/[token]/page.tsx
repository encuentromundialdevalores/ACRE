import type { Feature, Polygon } from "geojson";
import { resolveInvitationToken } from "@/lib/services/invitations";
import { getProperty, expedienteStatus } from "@/lib/services/properties";
import { normalizePolygon, formatArea } from "@/lib/geo";
import { PROXIMITY_RADIUS_M } from "@/lib/connectors/fields";
import { Card, Badge, Alert, formatDate } from "@/components/ui";
import { PolygonViewer } from "@/components/map";
import { CommercialSection, DatumRow, RisksSection, ServicesSection, SourcesSection, toDataMap } from "@/components/expediente/sections";

export const dynamic = "force-dynamic";

export default async function SharedPage({ params }: { params: { token: string } }) {
  const inv = await resolveInvitationToken(params.token);
  const prop = inv ? await getProperty(inv.propertyId) : null;
  if (!inv || !prop) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md p-8 text-center"><h1 className="text-lg font-semibold">Enlace no válido</h1><p className="mt-2 text-sm text-ink-muted">Esta invitación no existe, expiró o fue revocada por ACRE Consulting. Solicita un nuevo enlace al socio que te lo compartió.</p></div>
      </main>
    );
  }
  const data = toDataMap(prop.data);
  const polygon = normalizePolygon(prop.polygonGeojson) as Feature<Polygon> | null;
  const point = prop.latitude && prop.longitude ? { lat: Number(prop.latitude), lng: Number(prop.longitude) } : null;
  const counts = { confirmed: prop.data.filter((d) => d.verificationStatus === "CONFIRMADO" && !d.isDemo).length, demo: prop.data.filter((d) => d.isDemo).length, pending: prop.data.filter((d) => d.verificationStatus === "PENDIENTE").length, unavailable: prop.data.filter((d) => d.verificationStatus === "NO_DISPONIBLE").length, total: prop.data.length };
  const status = expedienteStatus(counts);
  const photos = prop.documents.filter((d) => d.kind === "FOTO"), docs = prop.documents.filter((d) => d.kind === "DOCUMENTO");
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">A</span><div><p className="text-sm font-semibold">ACRE Consulting</p><p className="text-xs text-ink-subtle">Expediente compartido · solo lectura</p></div></div>
        <p className="text-xs text-ink-muted">Acceso válido hasta {formatDate(inv.expiresAt, true)}</p>
      </div></header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold">{prop.name}</h1><Badge tone="brand">{prop.code}</Badge><Badge tone={status.key === "completo" ? "green" : status.key === "pendiente" ? "amber" : status.key === "demo" ? "violet" : "slate"}>{status.label}</Badge></div><p className="mt-1 text-sm text-ink-muted">{prop.municipality ?? ""}</p></div>
        {status.key === "pendiente" && <Alert tone="warn">Este expediente contiene datos pendientes de verificación.</Alert>}
        {counts.demo > 0 && <Alert tone="info">Los datos marcados como <strong>Demostrativo</strong> son sintéticos y no provienen de fuentes oficiales.</Alert>}
        <Alert tone="info">Esta plataforma centraliza información territorial verificable para análisis preliminares. No constituye un avalúo ni un dictamen oficial de viabilidad.</Alert>
        <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
          <Card title="A. Información general">
            <DatumRow label="Dirección oficial" datum={data.direccion} />
            <DatumRow label="Superficie del polígono" datum={data.superficie_m2}><span className="text-lg font-semibold">{formatArea(prop.areaM2)}</span></DatumRow>
            <div className="py-3"><p className="text-xs font-medium uppercase tracking-wide text-ink-subtle">Registro</p><p className="mt-0.5 text-sm">{formatDate(prop.createdAt)}</p></div>
          </Card>
          <Card title="B. Ubicación geográfica"><PolygonViewer feature={polygon} point={point} radiusM={PROXIMITY_RADIUS_M} height={360} /></Card>
        </div>
        <CommercialSection data={data} /><ServicesSection data={data} /><RisksSection data={data} />
        <Card title="F. Documentos y fotografías autorizados">
          {prop.documents.length === 0 ? <p className="text-sm text-ink-subtle">Sin archivos compartidos.</p> : (
            <div className="space-y-4">
              {photos.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{photos.map((p) => <a key={p.id} href={`/api/compartido/${params.token}/documentos/${p.id}?inline=1`} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-line"><img src={`/api/compartido/${params.token}/documentos/${p.id}?inline=1`} alt={p.filename} className="aspect-[4/3] w-full object-cover" /></a>)}</div>}
              {docs.length > 0 && <ul className="divide-y divide-line rounded-lg border border-line">{docs.map((d) => <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm"><span className="truncate">{d.filename}</span><a className="btn-secondary px-2.5 py-1" href={`/api/compartido/${params.token}/documentos/${d.id}`}>Descargar</a></li>)}</ul>}
            </div>
          )}
        </Card>
        <SourcesSection rows={prop.data} />
      </main>
    </div>
  );
}
