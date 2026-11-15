"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Feature, Polygon } from "geojson";
import { PolygonEditor } from "@/components/map";
import type { GeometryState } from "@/components/map/polygon-editor";
import { Alert, Field, Spinner } from "@/components/ui";
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
  const [step, setStep] = useState(0);
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

  const isEdit = !!initial?.id;
  const ownerName = owners.find((o) => o.id === form.ownerId)?.name;
  const steps = [
    { title: "Dibuja el terreno", hint: "Marca sus esquinas en el mapa." },
    { title: "Agrega sus datos", hint: "Nombre, dirección y propietario." },
    { title: "Revisa y registra", hint: "Confirma que todo esté bien." },
  ];
  const canNext = step === 0 ? !!geo.feature && !geo.error : step === 1 ? form.name.trim().length >= 2 : true;

  function go(next: number) {
    setError(null);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Leaflet necesita recalcular su tamaño al volver a mostrarse.
    setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
  }

  return (
    <form onSubmit={(e) => { if (step < 2) { e.preventDefault(); if (canNext) go(step + 1); return; } onSubmit(e); }} className="space-y-6">
      <ol className="grid gap-2 sm:grid-cols-3" aria-label="Pasos">
        {steps.map((st, i) => {
          const done = i < step, active = i === step;
          return (
            <li key={st.title}>
              <button type="button" disabled={i > step} onClick={() => go(i)} aria-current={active ? "step" : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${active ? "border-ink bg-white shadow-card" : done ? "border-line bg-white/70 hover:border-ink/30" : "border-transparent bg-white/40 opacity-70"}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${active ? "bg-ink text-white" : done ? "bg-brand-500 text-white" : "bg-white text-ink-subtle"}`}>
                  {done ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg> : i + 1}
                </span>
                <span className="min-w-0"><span className="block text-sm font-semibold">{st.title}</span><span className="block truncate text-xs text-ink-muted">{st.hint}</span></span>
              </button>
            </li>
          );
        })}
      </ol>

      {error && <Alert tone="error">{error}</Alert>}

      <section className={step === 0 ? "card p-5 sm:p-7" : "hidden"} aria-hidden={step !== 0}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-500">Paso 1 de 3</p>
            <h3 className="font-display text-2xl font-extrabold tracking-[-0.03em]">Dibuja el terreno en el mapa</h3>
            <p className="mt-1 max-w-xl text-[15px] text-ink-muted">Pulsa el icono de polígono (arriba a la derecha del mapa), haz clic en cada esquina y cierra en el primer punto. La superficie se calcula sola.</p>
          </div>
          <input ref={fileRef} type="file" accept=".geojson,.json,application/geo+json,application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importGeoJson(e.target.files[0])} />
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>Importar archivo GeoJSON</button>
        </div>
        <PolygonEditor initial={polygon} onChange={setGeo} />
      </section>

      <section className={step === 1 ? "card p-5 sm:p-7" : "hidden"} aria-hidden={step !== 1}>
        <p className="text-sm font-medium text-brand-500">Paso 2 de 3</p>
        <h3 className="font-display text-2xl font-extrabold tracking-[-0.03em]">Agrega los datos del terreno</h3>
        <p className="mt-1 max-w-xl text-[15px] text-ink-muted">Solo el nombre es obligatorio. La dirección oficial se completa sola al ejecutar las consultas.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Nombre del terreno" required><input className="input" required={step === 1} minLength={2} value={form.name} onChange={set("name")} placeholder="Ej. Lote Valle Oriente 12" /></Field>
          {canAssignOwner ? (
            <Field label="Propietario" hint="Opcional. El propietario verá este terreno en su cuenta.">
              <select className="input" value={form.ownerId} onChange={set("ownerId")}>
                <option value="">Sin propietario</option>
                {owners.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.email}</option>)}
              </select>
            </Field>
          ) : <Field label="Propietario"><input className="input" disabled value="Tú" /></Field>}
          <Field label="Calle y número"><input className="input" value={form.address} onChange={set("address")} placeholder="Ej. Av. Lázaro Cárdenas 1000" /></Field>
          <Field label="Colonia"><input className="input" value={form.neighborhood} onChange={set("neighborhood")} /></Field>
          <Field label="Municipio"><input className="input" value={form.municipality} onChange={set("municipality")} placeholder="Monterrey, San Pedro Garza García…" /></Field>
          <div className="md:col-span-2"><Field label="Notas (opcional)"><textarea className="input" rows={3} value={form.description} onChange={set("description")} placeholder="Algo que el equipo deba saber de este terreno" /></Field></div>
        </div>
      </section>

      <section className={step === 2 ? "card p-5 sm:p-7" : "hidden"} aria-hidden={step !== 2}>
        <p className="text-sm font-medium text-brand-500">Paso 3 de 3</p>
        <h3 className="font-display text-2xl font-extrabold tracking-[-0.03em]">Revisa antes de {isEdit ? "guardar" : "registrar"}</h3>
        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div className="rounded-2xl bg-brand-50 p-5 sm:row-span-2"><dt className="text-xs text-brand-700">Superficie</dt><dd className="mt-1 font-display text-4xl font-black tracking-[-0.04em]">{geo.areaM2 != null ? formatArea(geo.areaM2) : "—"}</dd></div>
          <div><dt className="text-xs text-ink-muted">Nombre</dt><dd className="mt-0.5 text-[15px] font-semibold">{form.name || "—"}</dd></div>
          <div><dt className="text-xs text-ink-muted">Ubicación</dt><dd className="mt-0.5 text-[15px]">{[form.address, form.neighborhood, form.municipality].filter(Boolean).join(", ") || "Se completará con las consultas"}</dd></div>
          {canAssignOwner && <div><dt className="text-xs text-ink-muted">Propietario</dt><dd className="mt-0.5 text-[15px]">{ownerName ?? "Sin propietario"}</dd></div>}
        </dl>
        {!isEdit && <p className="mt-6 rounded-2xl bg-canvas px-4 py-3 text-sm text-ink-muted">Al registrar se abrirá el expediente. Ahí pulsa <strong className="text-ink">Ejecutar consultas</strong> para traer la información de INEGI, Google y el Atlas de Riesgos.</p>}
      </section>

      <div className="flex items-center justify-between gap-3">
        {step === 0
          ? <button type="button" className="btn-ghost" onClick={() => router.back()}>Cancelar</button>
          : <button type="button" className="btn-secondary" onClick={() => go(step - 1)}><span aria-hidden>←</span> Atrás</button>}
        {step < 2
          ? <button type="submit" className="btn-primary" disabled={!canNext}>Continuar <span aria-hidden>→</span></button>
          : <button type="submit" className="btn-primary" disabled={saving}>{saving && <Spinner />}{isEdit ? "Guardar cambios" : "Registrar terreno"}</button>}
      </div>
    </form>
  );
}
