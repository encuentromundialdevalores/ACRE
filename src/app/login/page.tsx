import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const demo = (process.env.DATA_MODE ?? "demo").toLowerCase() !== "real";
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 font-bold">A</span>
          <span className="text-sm font-semibold tracking-wide">ACRE Consulting</span>
        </div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight">Plataforma de Gestión Territorial</h1>
          <p className="mt-4 max-w-md text-brand-100/80">Registra terrenos, dibuja su polígono, consulta fuentes oficiales y comparte el expediente técnico con compradores en minutos, no en horas.</p>
          <ul className="mt-8 grid gap-3 text-sm text-brand-100/90">
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent-500" />INEGI · DENUE, Google Maps Platform y Atlas Nacional de Riesgos</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent-500" />Fuente, fecha y estado de verificación de cada dato</li>
            <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent-500" />Enlaces privados y temporales para compartir</li>
          </ul>
        </div>
        <p className="text-xs text-brand-100/60">Área Metropolitana de Monterrey, Nuevo León. Sin avalúos ni dictámenes oficiales.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">A</span>
            <span className="font-semibold">ACRE Consulting</span>
          </div>
          <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-ink-muted">Accede con tu correo y contraseña.</p>
          <LoginForm callbackUrl={searchParams.callbackUrl} initialError={searchParams.error} />
          {demo && (
            <div className="mt-8 rounded-md border border-violet-200 bg-violet-50 p-3 text-xs text-violet-800">
              <p className="font-semibold">Modo demostración activo</p>
              <p className="mt-1">Cuentas de prueba (ver <code>scripts/seed.ts</code>): admin@acre.local / Admin1234! · propietario@acre.local / Owner1234! · comprador@acre.local / Buyer1234!</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
