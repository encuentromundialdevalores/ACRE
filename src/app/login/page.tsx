import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "./login-form";
import { Cerro, Logo } from "@/components/brand";

export default async function LoginPage({ searchParams }: { searchParams: { callbackUrl?: string; error?: string } }) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const demo = (process.env.DATA_MODE ?? "demo").toLowerCase() !== "real";
  return (
    <main className="sky relative flex min-h-screen flex-col overflow-hidden">
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo subtitle="Gestión Territorial" />
        <span className="text-sm text-ink-muted">Área Metropolitana de Monterrey</span>
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-4 pb-48 pt-6 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:pb-56">
        <div>
          <h1 className="font-display text-[44px] font-black leading-[0.95] tracking-[-0.045em] text-ink sm:text-6xl lg:text-7xl">
            Vende terrenos<br />con información<br />que da confianza.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-ink-muted">
            <span className="font-medium text-ink">Muestra a tus compradores ubicación, entorno y riesgos de cada terreno.</span>{" "}
            Todo en un expediente listo para compartir.
          </p>
        </div>

        <div className="w-full max-w-md justify-self-center rounded-3xl border border-white/70 bg-white/90 p-7 shadow-[0_30px_60px_-30px_rgb(20_22_23/0.35)] backdrop-blur sm:p-8 lg:justify-self-end">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em]">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-ink-muted">Entra con el correo que te dio ACRE.</p>
          <LoginForm callbackUrl={searchParams.callbackUrl} initialError={searchParams.error} />
          {demo && (
            <p className="mt-6 rounded-xl bg-violet-50 p-3 text-xs text-violet-800">
              <strong>Modo demostración.</strong> Cuentas de prueba: admin@acre.local / Admin1234! · propietario@acre.local / Owner1234! · comprador@acre.local / Buyer1234!
            </p>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <Cerro tone="sky" className="absolute bottom-10 h-40 w-full opacity-70 sm:h-52" />
        <Cerro className="relative h-28 w-full sm:h-40" />
      </div>
    </main>
  );
}
