import { requireUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions";
import { Card, Badge, PageHero } from "@/components/ui";
import { currentDataMode, REAL_CONNECTORS } from "@/lib/connectors";

export default async function AccountPage() {
  const user = await requireUser();
  const mode = currentDataMode();
  return (
    <div>
    <PageHero title="Mi cuenta." lead="Tus datos de acceso a la plataforma." />
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Perfil">
        <dl className="space-y-3 text-sm">
          <div><dt className="label">Nombre</dt><dd className="font-medium">{user.name}</dd></div>
          <div><dt className="label">Correo</dt><dd>{user.email}</dd></div>
          <div><dt className="label">Rol</dt><dd><Badge tone="brand">{ROLE_LABELS[user.role]}</Badge></dd></div>
        </dl>
      </Card>
      {user.role === "ADMIN" && (
        <Card title="Estado de la plataforma" description="Configuración detectada en el servidor. Las credenciales nunca se muestran ni se envían al navegador.">
          <dl className="space-y-3 text-sm">
            <div><dt className="label">Modo de datos</dt><dd><Badge tone={mode === "DEMO" ? "violet" : "green"}>{mode === "DEMO" ? "Demostración (datos sintéticos)" : "Real (APIs oficiales)"}</Badge></dd></div>
            <div><dt className="label">Conectores</dt><dd><ul className="mt-1 space-y-1">{REAL_CONNECTORS.map((c) => { const r = c.notConfiguredReason(); return <li key={c.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5"><span>{c.label}</span><Badge tone={r ? "amber" : "green"}>{r ? "Sin credenciales" : "Configurado"}</Badge></li>; })}</ul></dd></div>
            <div><dt className="label">Almacenamiento</dt><dd>{process.env.STORAGE_DRIVER === "vercel-blob" ? "Vercel Blob (privado)" : "Disco local (desarrollo)"}</dd></div>
            <div><dt className="label">Límite por fuente</dt><dd>{Number(process.env.CONNECTOR_TIMEOUT_MS ?? 60000) / 1000} s · caché {process.env.CONNECTOR_CACHE_TTL_HOURS ?? 24} h</dd></div>
          </dl>
        </Card>
      )}
    </div>
    </div>
  );
}
