"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Spinner, formatDate, Badge } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import type { Document, Invitation } from "@/lib/db/schema";
import type { RunSummary } from "@/lib/connectors/runner";
import { INVITATION_DAYS, invitationState } from "@/lib/invitation-state";

export function RunQueriesButton({ propertyId, hasGeometry }: { propertyId: string; hasGeometry: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  async function run(noCache = false) {
    setLoading(true); setSummary(null);
    const res = await fetch(`/api/terrenos/${propertyId}/consultar${noCache ? "?cache=0" : ""}`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { toast.push(data.error ?? "No se pudo ejecutar la consulta", "error"); return; }
    setSummary(data.summary);
    const s = data.summary as RunSummary;
    toast.push(`Consulta terminada en ${(s.durationMs / 1000).toFixed(1)} s · ${s.byStatus.CONFIRMADO} confirmados, ${s.byStatus.PENDIENTE} pendientes`, s.byStatus.PENDIENTE ? "info" : "success");
    router.refresh();
  }
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button className="btn-accent" disabled={loading || !hasGeometry} onClick={() => run(false)} title={hasGeometry ? "" : "Dibuja el polígono antes de consultar"}>{loading ? <Spinner /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5" /></svg>}{loading ? "Consultando fuentes…" : "Ejecutar consultas"}</button>
        <button className="btn-secondary" disabled={loading || !hasGeometry} onClick={() => run(true)} title="Ignorar caché">Sin caché</button>
      </div>
      {loading && <p className="text-xs text-ink-muted">Cada fuente tiene un límite de 60 s. Las que no respondan quedarán como pendientes.</p>}
      {summary && (
        <ul className="w-full max-w-md space-y-1 text-xs">
          {summary.providers.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-line px-2.5 py-1.5"><span>{p.label}</span><span className="flex items-center gap-2 text-ink-muted"><span>{(p.durationMs / 1000).toFixed(1)} s</span><Badge tone={p.status === "ok" || p.status === "cache" ? "green" : p.status === "not_configured" ? "slate" : "amber"}>{{ ok: "OK", cache: "Caché", error: "Error", timeout: "Tiempo agotado", not_configured: "Sin configurar" }[p.status]}</Badge></span></li>)}
        </ul>
      )}
    </div>
  );
}

export function DocumentsManager({ propertyId, documents, canUpload, canDelete }: { propertyId: string; documents: Document[]; canUpload: boolean; canDelete: boolean }) {
  const router = useRouter();
  const toast = useToast(); const confirm = useConfirm();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  async function upload(files: FileList) {
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(`/api/terrenos/${propertyId}/documentos`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) toast.push(`${file.name}: ${data.error}`, "error"); else toast.push(`${file.name} subido`, "success");
    }
    setUploading(false); router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }
  async function remove(doc: Document) {
    if (!(await confirm({ title: "¿Eliminar este archivo?", message: `"${doc.filename}" se borrará del expediente. Esta acción no se puede deshacer.`, confirmLabel: "Eliminar archivo", tone: "danger" }))) return;
    const res = await fetch(`/api/documentos/${doc.id}`, { method: "DELETE" });
    if (res.ok) { toast.push("Archivo eliminado", "success"); router.refresh(); } else toast.push("No se pudo eliminar", "error");
  }
  const photos = documents.filter((d) => d.kind === "FOTO"), docs = documents.filter((d) => d.kind === "DOCUMENTO");
  return (
    <div className="space-y-5">
      {canUpload && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-line bg-canvas/60 p-4">
          <input ref={inputRef} type="file" multiple className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xlsx,.geojson,.json" onChange={(e) => e.target.files?.length && upload(e.target.files)} />
          <button className="btn-secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>{uploading && <Spinner />}Subir archivos</button>
          <p className="text-xs text-ink-muted">PDF, JPG, PNG, WebP, Word, Excel o GeoJSON. Máximo 15 MB por archivo. Almacenamiento privado; las descargas requieren autorización.</p>
        </div>
      )}
      <div>
        <h4 className="mb-2 text-sm font-semibold">Fotografías ({photos.length})</h4>
        {photos.length === 0 ? <p className="text-sm text-ink-subtle">Sin fotografías.</p> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <figure key={p.id} className="group relative overflow-hidden rounded-lg border border-line">
                <a href={`/api/documentos/${p.id}?inline=1`} target="_blank" rel="noreferrer"><img src={`/api/documentos/${p.id}?inline=1`} alt={p.filename} className="aspect-[4/3] w-full object-cover" /></a>
                <figcaption className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs"><span className="truncate">{p.filename}</span>{canDelete && <button className="text-red-700 hover:underline" onClick={() => remove(p)}>Eliminar</button>}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold">Documentos ({docs.length})</h4>
        {docs.length === 0 ? <p className="text-sm text-ink-subtle">Sin documentos.</p> : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="min-w-0"><p className="truncate font-medium">{d.filename}</p><p className="text-xs text-ink-subtle">{(d.sizeBytes / 1024).toFixed(0)} KB · {formatDate(d.createdAt, true)}</p></div>
                <div className="flex gap-2"><a className="btn-secondary px-2.5 py-1" href={`/api/documentos/${d.id}?inline=1`} target="_blank" rel="noreferrer">Ver</a><a className="btn-secondary px-2.5 py-1" href={`/api/documentos/${d.id}`}>Descargar</a>{canDelete && <button className="btn-danger px-2.5 py-1" onClick={() => remove(d)}>Eliminar</button>}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function SharePanel({ propertyId, invitations }: { propertyId: string; invitations: Invitation[] }) {
  const router = useRouter();
  const toast = useToast(); const confirm = useConfirm();
  const [days, setDays] = useState<number>(7);
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function create() {
    setLoading(true);
    const res = await fetch(`/api/terrenos/${propertyId}/invitaciones`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days, label: label || null, inviteeEmail: email || null }) });
    const data = await res.json(); setLoading(false);
    if (!res.ok) { toast.push(data.error ?? "No se pudo crear la invitación", "error"); return; }
    setUrl(data.url); setLabel(""); setEmail(""); router.refresh();
  }
  async function revoke(id: string) {
    if (!(await confirm({ title: "¿Revocar este enlace?", message: "Quien lo tenga dejará de ver el expediente de inmediato. Esta acción no se puede deshacer.", confirmLabel: "Revocar enlace", tone: "danger" }))) return;
    const res = await fetch(`/api/invitaciones/${id}`, { method: "DELETE" });
    if (res.ok) { toast.push("Enlace revocado", "success"); router.refresh(); }
  }
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]">
        <input className="input" placeholder="Etiqueta (ej. Desarrollador Norte)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className="input" type="email" placeholder="Correo del comprador (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <select className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>{INVITATION_DAYS.map((d) => <option key={d} value={d}>{d} día{d > 1 ? "s" : ""}</option>)}</select>
        <button className="btn-primary" disabled={loading} onClick={create}>{loading && <Spinner />}Generar enlace</button>
      </div>
      {url && (
        <Alert tone="success">
          <p className="font-medium">Enlace privado generado. Cópialo ahora: por seguridad no se vuelve a mostrar.</p>
          <div className="mt-2 flex gap-2"><input className="input font-mono text-xs" readOnly value={url} onFocus={(e) => e.target.select()} /><button className="btn-secondary shrink-0" onClick={() => { navigator.clipboard.writeText(url); toast.push("Enlace copiado", "success"); }}>Copiar</button></div>
        </Alert>
      )}
      <ul className="divide-y divide-line rounded-lg border border-line">
        {invitations.length === 0 && <li className="px-3 py-3 text-sm text-ink-subtle">Aún no se ha compartido este expediente.</li>}
        {invitations.map((inv) => { const st = invitationState(inv); return (
          <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
            <div><p className="font-medium">{inv.label ?? "Invitación"}{inv.inviteeEmail ? <span className="text-ink-muted"> · {inv.inviteeEmail}</span> : null}</p><p className="text-xs text-ink-subtle">Creada {formatDate(inv.createdAt, true)} · expira {formatDate(inv.expiresAt, true)} · {inv.accessCount} acceso{inv.accessCount === 1 ? "" : "s"}</p></div>
            <div className="flex items-center gap-2"><Badge tone={st === "activa" ? "green" : st === "expirada" ? "slate" : "red"}>{st[0].toUpperCase() + st.slice(1)}</Badge>{st === "activa" && <button className="btn-danger px-2.5 py-1" onClick={() => revoke(inv.id)}>Revocar</button>}</div>
          </li>
        ); })}
      </ul>
    </div>
  );
}
