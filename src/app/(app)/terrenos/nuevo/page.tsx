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
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h2 className="text-xl font-semibold">Registrar terreno</h2><p className="text-sm text-ink-muted">Tres pasos: dibuja el polígono, captura la información general y ejecuta las consultas desde el expediente.</p></div>
      <PropertyForm owners={owners} canAssignOwner={user.role === "ADMIN"} />
    </div>
  );
}
