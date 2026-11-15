import type { Feature, Polygon } from "geojson";
import { resolveInvitationToken } from "@/lib/services/invitations";
import { getProperty, expedienteStatus } from "@/lib/services/properties";
import { normalizePolygon, formatArea } from "@/lib/geo";
import { PROXIMITY_RADIUS_M } from "@/lib/connectors/fields";
import { Card, formatDate } from "@/components/ui";
import { PolygonViewer } from "@/components/map";
import { Cerro, Logo } from "@/components/brand";
import { toDataMap } from "@/components/expediente/sections";
import { Glance, Nearby } from "@/components/expediente/glance";

export const dynamic = "force-dynamic";

/** Vista del comprador: solo lectura, sin fuentes, metodología ni datos internos de ACRE. */
export default async function SharedPage({ params }: { params: { token: string } }) {
  const inv = await resolveInvitationToken(params.token);
  const prop = inv ? await getProperty(inv.propertyId) : null;
  if (!inv || !prop) {
    return (
      <main className="sky relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
        <div className="relative z-10 max-w-md rounded-3xl bg-white/90 p-8 text-center shadow-card backdrop-blur">
          <Logo />
          <h1 className="mt-6 font-display text-3xl font-extrabold tracking-[-0.03em]">Este enlace ya no funciona</h1>
          <p className="mt-2 text-[15px] text-ink-muted">Expiró o fue revocado. Pide un enlace nuevo a la persona de ACRE que te lo compartió.</p>
        </div>
        <Cerro className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full sm:h-40" />
      </main>
    );
  }
  const data = toDataMap(prop.data);
  const polygon = normalizePolygon(prop.polygonGeojson) as Feature<Polygon> | null;
  const point = prop.latitude && prop.longitude ? { lat: Number(prop.latitude), lng: Number(prop.longitude) } : null;
  const counts = { confirmed: prop.data.filter((d) => d.verificationStatus === "CONFIRMADO" && !d.isDemo).length, demo: prop.data.filter((d) => d.isDemo).length, pending: prop.data.filter((d) => d.verificationStatus === "PENDIENTE").length, unavailable: prop.data.filter((d) => d.verificationStatus === "NO_DISPONIBLE").length, total: prop.data.length };
  const status = expedienteStatus(counts);
  const photos = prop.documents.filter((d) => d.kind === "FOTO"), docs = prop.documents.filter((d) => d.kind === "DOCUMENTO");
  const address = data.direccion?.value ?? [prop.address, prop.neighborhood, prop.municipality].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-canvas">
      <section className="sky relative overflow-hidden">
        <header className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <Logo subtitle="Expediente de terreno" />
          <span className="rounded-full bg-white/70 px-3.5 py-1.5 text-xs text-ink-muted backdrop-blur">Disponible hasta {formatDate(inv.expiresAt, true)}</span>
        </header>
        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6 sm:pb-40 sm:pt-12">
          <p className="text-sm font-medium text-brand-700">{prop.municipality ?? "Área Metropolitana de Monterrey"}</p>
          <h1 className="mt-2 max-w-3xl font-display text-5xl font-black leading-[0.95] tracking-[-0.045em] sm:text-7xl">{prop.name}</h1>
          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <div><dt className="text-xs text-ink-muted">Superficie</dt><dd className="font-display text-3xl font-extrabold tracking-[-0.03em]">{formatArea(prop.areaM2)}</dd></div>
            {address && <div className="max-w-md"><dt className="text-xs text-ink-muted">Ubicación</dt><dd className="mt-1 text-[15px] font-medium">{address}</dd></div>}
          </dl>
          {(status.key === "pendiente" || counts.demo > 0) && (
            <p className="mt-6 inline-block rounded-full bg-white/80 px-4 py-2 text-xs text-ink-muted backdrop-blur">
              {counts.demo > 0 ? "Incluye datos de demostración que no son oficiales." : "Algunos datos siguen en verificación."}
            </p>
          )}
        </div>
        <Cerro className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full sm:h-32" tone="white" />
      </section>

      <main className="mx-auto -mt-2 max-w-6xl space-y-8 px-4 pb-16 sm:px-6">
        <section>
          <h2 className="mb-4 font-display text-2xl font-extrabold tracking-[-0.03em]">De un vistazo</h2>
          <Glance data={data} />
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="card overflow-hidden p-2"><PolygonViewer feature={polygon} point={point} radiusM={PROXIMITY_RADIUS_M} height={460} /></div>
          <Nearby data={data} />
        </section>
        {prop.documents.length > 0 && (
          <Card title="Fotos y documentos">
            <div className="space-y-4">
              {photos.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{photos.map((p) => <a key={p.id} href={`/api/compartido/${params.token}/documentos/${p.id}?inline=1`} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl"><img src={`/api/compartido/${params.token}/documentos/${p.id}?inline=1`} alt={p.filename} className="aspect-[4/3] w-full object-cover transition hover:scale-[1.02]" /></a>)}</div>}
              {docs.length > 0 && <ul className="divide-y divide-line">{docs.map((d) => <li key={d.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="truncate font-medium">{d.filename}</span><a className="btn-secondary px-4 py-2" href={`/api/compartido/${params.token}/documentos/${d.id}`}>Descargar</a></li>)}</ul>}
            </div>
          </Card>
        )}
        <p className="pt-4 text-center text-xs text-ink-subtle">Información territorial para análisis preliminar. No es un avalúo ni un dictamen oficial. Preparado por ACRE Consulting.</p>
      </main>
    </div>
  );
}
