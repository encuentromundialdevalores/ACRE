import { requireUser } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/permissions";
import { PageHero } from "@/components/ui";
import { currentDataMode, REAL_CONNECTORS } from "@/lib/connectors";
import { SignOutButton } from "@/components/cuenta/sign-out";

const ROLE_DESCRIPTION = {
  ADMIN: "Registras terrenos, ejecutas consultas y compartes expedientes con compradores.",
  OWNER: "Ves y actualizas los terrenos que tienes a tu nombre.",
  BUYER: "Consultas los expedientes que ACRE comparte contigo.",
} as const;

function Check({ ok }: { ok: boolean }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`} aria-hidden>
      {ok
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 7v6M12 17v.5" /></svg>}
    </span>
  );
}

export default async function AccountPage() {
  const user = await requireUser();
  const real = currentDataMode() !== "DEMO";
  const privateFiles = process.env.STORAGE_DRIVER === "vercel-blob";
  const timeout = Number(process.env.CONNECTOR_TIMEOUT_MS ?? 60000) / 1000;
  const cacheH = Number(process.env.CONNECTOR_CACHE_TTL_HOURS ?? 24);
  const sources = REAL_CONNECTORS.map((c) => ({ label: c.label, ok: !c.notConfiguredReason() }));

  return (
    <div>
      <PageHero eyebrow="Mi cuenta" title={user.name} lead={ROLE_DESCRIPTION[user.role]}>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink font-display text-2xl font-black text-white">{user.name.slice(0, 1).toUpperCase()}</span>
          <div>
            <p className="text-[15px] font-semibold">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700">{ROLE_LABELS[user.role]}</span>
          </div>
        </div>
      </PageHero>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="card p-6 sm:p-7">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.03em]">Tu acceso</h2>
          <dl className="mt-5 divide-y divide-line">
            <div className="flex justify-between gap-4 py-3"><dt className="text-ink-muted">Nombre</dt><dd className="text-right font-medium">{user.name}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-ink-muted">Correo</dt><dd className="truncate text-right font-medium">{user.email}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="text-ink-muted">Rol</dt><dd className="text-right font-medium">{ROLE_LABELS[user.role]}</dd></div>
          </dl>
          <p className="mt-4 rounded-2xl bg-canvas px-4 py-3 text-sm text-ink-muted">¿Necesitas cambiar tu correo o contraseña? Pídelo a un socio de ACRE.</p>
          <div className="mt-5"><SignOutButton /></div>
        </section>

        {user.role === "ADMIN" && (
          <section className="card p-6 sm:p-7">
            <h2 className="font-display text-xl font-extrabold tracking-[-0.03em]">Estado de la plataforma</h2>
            <p className="mt-1 text-sm text-ink-muted">Lo que necesita la plataforma para traer datos reales. Las claves nunca se muestran.</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              <li className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3"><Check ok={real} /><span><span className="block text-sm font-semibold">{real ? "Datos reales" : "Modo demostración"}</span><span className="block text-xs text-ink-muted">{real ? "Se consultan las fuentes oficiales" : "Los datos son sintéticos"}</span></span></li>
              {sources.map((s) => (
                <li key={s.label} className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3"><Check ok={s.ok} /><span><span className="block text-sm font-semibold">{s.label}</span><span className="block text-xs text-ink-muted">{s.ok ? "Conectado" : "Falta configurar la clave"}</span></span></li>
              ))}
              <li className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3"><Check ok={privateFiles} /><span><span className="block text-sm font-semibold">Archivos privados</span><span className="block text-xs text-ink-muted">{privateFiles ? "Guardados en almacenamiento privado" : "Guardados en el equipo local"}</span></span></li>
              <li className="flex items-center gap-3 rounded-2xl bg-canvas px-4 py-3"><Check ok /><span><span className="block text-sm font-semibold">Espera por fuente: {timeout} s</span><span className="block text-xs text-ink-muted">Resultados guardados {cacheH} h</span></span></li>
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
