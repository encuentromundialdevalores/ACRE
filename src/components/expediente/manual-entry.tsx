"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Spinner } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

const RISK_LEVELS = ["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"];
const LABELS: Record<string, string> = {
  direccion: "Dirección", denue_comercios_500m: "Negocios a 500 m", denue_giros_principales: "Giros principales",
  escuelas: "Escuelas", hospitales: "Hospitales y clínicas", transporte: "Transporte público",
  riesgo_inundacion: "Riesgo de inundación", riesgo_sismico: "Riesgo sísmico", riesgo_laderas: "Riesgo de deslave de laderas",
};
const SOURCE_HINT: Record<string, string> = {
  direccion: "Google Maps", denue_comercios_500m: "Portal DENUE de INEGI", denue_giros_principales: "Portal DENUE de INEGI",
  escuelas: "Google Maps", hospitales: "Google Maps", transporte: "Google Maps",
  riesgo_inundacion: "Portal del Atlas Nacional de Riesgos", riesgo_sismico: "Portal del Atlas Nacional de Riesgos", riesgo_laderas: "Portal del Atlas Nacional de Riesgos",
};

export type ManualTarget = { fieldKey: string; status: string };

/** Botón + diálogo para capturar a mano los datos que la fuente no devolvió. */
export function ManualEntryButton({ propertyId, targets, variant = "callout" }: { propertyId: string; targets: ManualTarget[]; variant?: "callout" | "inline" }) {
  const router = useRouter(); const toast = useToast();
  const [open, setOpen] = useState(false);
  const [fieldKey, setFieldKey] = useState(targets[0]?.fieldKey ?? "");
  const [v, setV] = useState<Record<string, string>>({});
  const [giros, setGiros] = useState([{ activity: "", count: "" }]);
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((x) => ({ ...x, [k]: e.target.value }));

  useEffect(() => { if (!open) return; const f = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false); window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [open]);
  useEffect(() => { setV((x) => ({ source: SOURCE_HINT[fieldKey] ?? "", sourceUrl: x.sourceUrl ?? "", notes: "" })); setGiros([{ activity: "", count: "" }]); }, [fieldKey]);
  if (targets.length === 0) return null;

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const body: Record<string, unknown> = { fieldKey, source: v.source, sourceUrl: v.sourceUrl || undefined, notes: v.notes || undefined };
    if (fieldKey === "direccion") body.text = v.text;
    else if (fieldKey === "denue_comercios_500m") body.count = v.count;
    else if (fieldKey === "denue_giros_principales") body.giros = giros.filter((g) => g.activity.trim()).map((g) => ({ activity: g.activity, count: g.count || 0 }));
    else if (["escuelas", "hospitales", "transporte"].includes(fieldKey)) { body.count = v.count; if (v.nearestDistanceM) body.nearestDistanceM = v.nearestDistanceM; if (v.nearestName) body.nearestName = v.nearestName; }
    else body.level = v.level;
    const res = await fetch(`/api/terrenos/${propertyId}/datos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json(); setSaving(false);
    if (!res.ok) { toast.push(data.issues?.[0]?.message ?? data.error ?? "No se pudo guardar", "error"); return; }
    toast.push(`${LABELS[fieldKey]} guardado como captura manual`, "success");
    setOpen(false); setV({}); router.refresh();
  }

  const isService = ["escuelas", "hospitales", "transporte"].includes(fieldKey);
  const isRisk = fieldKey.startsWith("riesgo_");

  return (
    <>
      {variant === "callout" ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-amber-50 px-6 py-5 ring-1 ring-amber-200">
          <div>
            <p className="font-semibold text-amber-950">{targets.length} dato{targets.length === 1 ? "" : "s"} sin obtener de la fuente</p>
            <p className="text-sm text-amber-900">{targets.map((t) => LABELS[t.fieldKey] ?? t.fieldKey).join(" · ")}. Vuelve a consultar o captúralos a mano desde el portal oficial.</p>
          </div>
          <button className="btn-primary" onClick={() => setOpen(true)}>Capturar manualmente</button>
        </div>
      ) : <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>Capturar</button>}

      {open && (
        <div className="fixed inset-0 z-[1100] flex items-end justify-center overflow-y-auto p-4 sm:items-center">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="manual-title" className="relative w-full max-w-lg rounded-3xl bg-white p-7 shadow-[0_30px_80px_-20px_rgb(20_22_23/0.45)]">
            <h2 id="manual-title" className="font-display text-2xl font-extrabold tracking-[-0.03em]">Captura manual</h2>
            <p className="mt-1 text-sm text-ink-muted">Consulta el dato en el portal oficial y escríbelo aquí. Quedará marcado como manual y con la fuente que indiques.</p>
            <div className="mt-6 space-y-4">
              <Field label="Dato">
                <select className="input" value={fieldKey} onChange={(e) => setFieldKey(e.target.value)}>
                  {targets.map((t) => <option key={t.fieldKey} value={t.fieldKey}>{LABELS[t.fieldKey]} · {t.status === "NO_DISPONIBLE" ? "no disponible" : t.status === "PENDIENTE" ? "pendiente" : "sin consultar"}</option>)}
                </select>
              </Field>
              {fieldKey === "direccion" && <Field label="Dirección" required><input className="input" required minLength={5} value={v.text ?? ""} onChange={set("text")} placeholder="Calle y número, colonia, municipio" /></Field>}
              {fieldKey === "denue_comercios_500m" && <Field label="Número de negocios a 500 m" required><input className="input" type="number" min={0} required value={v.count ?? ""} onChange={set("count")} /></Field>}
              {fieldKey === "denue_giros_principales" && (
                <div className="space-y-2">
                  <span className="label">Hasta 3 giros más comunes y cuántos hay</span>
                  {giros.map((g, i) => (
                    <div key={i} className="grid grid-cols-[1fr_90px] gap-2">
                      <input className="input" required={i === 0} value={g.activity} onChange={(e) => setGiros(giros.map((x, j) => j === i ? { ...x, activity: e.target.value } : x))} placeholder={`Giro ${i + 1}`} />
                      <input className="input" type="number" min={0} value={g.count} onChange={(e) => setGiros(giros.map((x, j) => j === i ? { ...x, count: e.target.value } : x))} placeholder="Núm." />
                    </div>
                  ))}
                  {giros.length < 3 && <button type="button" className="btn-ghost px-0 text-sm" onClick={() => setGiros([...giros, { activity: "", count: "" }])}>+ Agregar giro</button>}
                </div>
              )}
              {isService && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Cuántos hay a 500 m" required><input className="input" type="number" min={0} required value={v.count ?? ""} onChange={set("count")} /></Field>
                  <Field label="Distancia al más cercano (m)"><input className="input" type="number" min={0} value={v.nearestDistanceM ?? ""} onChange={set("nearestDistanceM")} /></Field>
                  <div className="sm:col-span-2"><Field label="Nombre del más cercano"><input className="input" value={v.nearestName ?? ""} onChange={set("nearestName")} /></Field></div>
                </div>
              )}
              {isRisk && (
                <div><span className="label">Nivel de peligro</span>
                  <div className="grid grid-cols-5 gap-1.5">{RISK_LEVELS.map((l) => (
                    <label key={l} className={`cursor-pointer rounded-xl px-2 py-2.5 text-center text-xs font-semibold ring-1 transition ${v.level === l ? "bg-ink text-white ring-ink" : "bg-white ring-line hover:ring-ink/30"}`}>
                      <input type="radio" name="level" className="sr-only" required value={l} checked={v.level === l} onChange={set("level")} />{l}
                    </label>
                  ))}</div>
                </div>
              )}
              <Field label="¿De dónde lo obtuviste?" required hint="Ej. Portal del Atlas Nacional de Riesgos, consulta del 14 nov"><input className="input" required minLength={3} value={v.source ?? ""} onChange={set("source")} /></Field>
              <Field label="Enlace a la fuente (opcional)"><input className="input" type="url" value={v.sourceUrl ?? ""} onChange={set("sourceUrl")} placeholder="https://" /></Field>
              <Field label="Notas (opcional)"><textarea className="input" rows={2} value={v.notes ?? ""} onChange={set("notes")} /></Field>
            </div>
            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn-primary" disabled={saving}>{saving && <Spinner />}Guardar dato</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
