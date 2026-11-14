"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Feature, Polygon } from "geojson";
import { PolygonEditor } from "@/components/map";
import type { GeometryState } from "@/components/map/polygon-editor";
import { Alert, Card, Field, Spinner } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { formatArea } from "@/lib/geo";

type Owner = { id: string; name: string; email: string };
type Initial = { id?: string; name: string; description: string | null; ownerId: string | null; address: string | null; neighborhood: string | null; municipality: string | null; polygon: Feature<Polygon> | null };

export function PropertyForm({ initial, owners, canAssignOwner }: { initial?: Initial; owners: Owner[]; canAssignOwner: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ name: initial?.name ?? "", description: initial?.description ?? "", ownerId: initial?.ownerId ?? "", address: initial?.address ?? "", neighborhood: initial?.neighborhood ?? "", municipality: initial?.municipality ?? "" });
  const [polygon, setPolygon] = useState<Feature<Polygon> | null>(initial?.polygon ?? null);
  const [geo, setGeo] = useState<GeometryState>({ feature: initial?.polygon ?? null, areaM2: null, point: null, error: null });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function importGeoJson(file: File) {
    try {
      const text = await file.text();
      const res = await fetch("/api/geojson/validar", { method: "POST", headers: { "Content-Type": "application/json" }, body: text });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "GeoJSON inválido");
      setPolygon(data.feature);
      toast.push(`Polígono importado: ${formatArea(data.areaM2)}`, "success");
    } catch (e) {
      toast.push((e as Error).message, "error");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (geo.error) { setError(geo.error); return; }
    setSaving(true);
    const body = { ...form, description: form.description || null, ownerId: form.ownerId || null, address: form.address || null, neighborhood: form.neighborhood || null, municipality: form.municipality || null, polygon: geo.feature };
    const res = await fetch(initial?.id ? `/api/terrenos/${initial.id}` : "/api/terrenos", { method: initial?.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "No se pudo guardar"); return; }
    toast.push(initial?.id ? "Terreno actualizado" : "Terreno registrado", "success");
    router.push(`/terrenos/${data.property.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}
      <Card title="1. Ubicación y polígono" description="Dibuja el límite del terreno sobre el mapa o importa un archivo GeoJSON. La superficie se calcula automáticamente."
        actions={<><input ref={fileRef} type="file" accept=".geojson,.json,application/geo+json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importGeoJson(e.target.files[0])} /><button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>Importar GeoJSON</button></>}>
        <PolygonEditor initial={polygon} onChange={setGeo} />
      </Card>

      <Card title="2. Información general" description="Los campos marcados son capturados manualmente. La dirección oficial se obtiene automáticamente al ejecutar las consultas.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre o identificador" required><input className="input" required minLength={2} value={form.name} onChange={set("name")} placeholder="Ej. Lote Valle Oriente 12" /></Field>
          {canAssignOwner ? (
            <Field label="Propietario asociado" hint="Opcional. El propietario verá este terreno en su cuenta.">
              <select className="input" value={form.ownerId} onChange={set("ownerId")}>
                <option value="">Sin propietario asignado</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.email}</option>)}
              </select>
            </Field>
          ) : <Field label="Propietario asociado"><input className="input" disabled value="Tú (propietario)" /></Field>}
          <Field label="Dirección (captura manual)" hint="Se complementará con Google Geocoding."><input className="input" value={form.address} onChange={set("address")} placeholder="Calle y número" /></Field>
          <Field label="Colonia"><input className="input" value={form.neighborhood} onChange={set("neighborhood")} /></Field>
          <Field label="Municipio"><input className="input" value={form.municipality} onChange={set("municipality")} placeholder="Monterrey, San Pedro Garza García…" /></Field>
          <Field label="Superficie calculada" hint="Dato automático (Turf.js)."><input className="input" disabled value={geo.areaM2 != null ? formatArea(geo.areaM2) : "Dibuja el polígono"} /></Field>
          <div className="md:col-span-2"><Field label="Descripción (opcional)"><textarea className="input" rows={3} value={form.description} onChange={set("description")} /></Field></div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancelar</button>
        <button className="btn-primary" disabled={saving}>{saving && <Spinner />}{initial?.id ? "Guardar cambios" : "Registrar terreno"}</button>
      </div>
    </form>
  );
}
