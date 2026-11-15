import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { listOwners } from "@/lib/services/properties";
import { PropertyForm } from "@/components/terrenos/property-form";

export default async function NewPropertyPage() {
  const user = await requireUser();
  if (!can(user, "property.create")) redirect("/dashboard");
  const owners = user.role === "ADMIN" ? await listOwners() : [];
  return (
    <div className="sky -mb-8 -mt-8 ml-[calc(50%-50vw)] min-h-[calc(100vh-4rem)] w-screen px-4 pb-16 pt-10 sm:px-6 lg:-mb-10 lg:-mt-10 lg:px-8 lg:pt-14">
      <div className="mx-auto max-w-5xl">
        <h2 className="font-display text-4xl font-black leading-[0.95] tracking-[-0.045em] sm:text-6xl">Registra un terreno<br />en tres pasos.</h2>
        <p className="mt-4 max-w-xl text-lg text-ink-muted"><span className="font-medium text-ink">Dibuja, describe y confirma.</span> Toma unos minutos.</p>
        <div className="mt-8"><PropertyForm owners={owners} canAssignOwner={user.role === "ADMIN"} /></div>
      </div>
    </div>
  );
}
