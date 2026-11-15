import { notFound, redirect } from "next/navigation";
import type { Feature, Polygon } from "geojson";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getProperty, listOwners } from "@/lib/services/properties";
import { PropertyForm } from "@/components/terrenos/property-form";
import { normalizePolygon } from "@/lib/geo";

export default async function EditPropertyPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const prop = await getProperty(params.id);
  if (!prop) notFound();
  if (!can(user, "property.update", prop)) redirect(`/terrenos/${prop.id}`);
  const owners = user.role === "ADMIN" ? await listOwners() : [];
  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div><h2 className="page-title">Editar {prop.code} · {prop.name}</h2><p className="page-lead">Si modificas el polígono, vuelve a ejecutar las consultas para actualizar el expediente.</p></div>
      <PropertyForm owners={owners} canAssignOwner={user.role === "ADMIN"}
        initial={{ id: prop.id, name: prop.name, description: prop.description, ownerId: prop.ownerId, address: prop.address, neighborhood: prop.neighborhood, municipality: prop.municipality, polygon: normalizePolygon(prop.polygonGeojson) as Feature<Polygon> | null }} />
    </div>
  );
}
