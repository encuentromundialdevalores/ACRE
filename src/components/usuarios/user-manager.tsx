"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Spinner, formatDate } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

type Role = "ADMIN" | "OWNER" | "BUYER";
type Row = { id: string; name: string; email: string; role: Role; active: boolean; createdAt: string | Date; properties: number };

const ROLE: Record<Role, { label: string; pill: string; hint: string }> = {
  ADMIN: { label: "Socio ACRE", pill: "bg-ink text-white", hint: "Acceso completo: registra, consulta, comparte y administra usuarios." },
  OWNER: { label: "Propietario", pill: "bg-brand-100 text-brand-700", hint: "Ve y edita solo los terrenos que tiene asignados." },
  BUYER: { label: "Comprador", pill: "bg-emerald-100 text-emerald-900", hint: "Ve los expedientes que le comparten por enlace o por correo." },
};

/** Muestra una contraseña temporal una sola vez, con botón para copiarla. */
function PasswordReveal({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const toast = useToast();
  return (
    <div className="rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
      <p className="font-semibold text-emerald-900">Contraseña temporal para {email}</p>
      <p className="mt-1 text-sm text-emerald-800">Cópiala y compártela por un medio seguro. No se volverá a mostrar.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <code className="rounded-xl bg-white px-4 py-2.5 font-mono text-lg tracking-wide">{password}</code>
        <button className="btn-primary" onClick={() => { navigator.clipboard.writeText(`${email}\n${password}`); toast.push("Datos de acceso copiados", "success"); }}>Copiar acceso</button>
        <button className="btn-ghost" onClick={onClose}>Listo</button>
      </div>
    </div>
  );
}

export function UserManager({ rows, selfId }: { rows: Row[]; selfId: string }) {
  const router = useRouter(); const toast = useToast(); const confirm = useConfirm();
  const [form, setForm] = useState({ name: "", email: "", role: "OWNER" as Role });
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ email: string; password: string } | null>(null);
  const [filter, setFilter] = useState<"todos" | Role>("todos");

  async function create(e: React.FormEvent) {
    e.preventDefault(); setCreating(true);
    const res = await fetch("/api/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json(); setCreating(false);
    if (!res.ok) { toast.push(data.issues?.[0]?.message ?? data.error ?? "No se pudo crear la cuenta", "error"); return; }
    setReveal({ email: data.user.email, password: data.password });
    setForm({ name: "", email: "", role: form.role });
    toast.push("Cuenta creada", "success"); router.refresh();
  }

  async function patch(u: Row, body: Record<string, unknown>, ok: string) {
    setBusy(u.id);
    const res = await fetch(`/api/usuarios/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json(); setBusy(null);
    if (!res.ok) { toast.push(data.error ?? "No se pudo actualizar", "error"); return; }
    if (data.password) setReveal({ email: u.email, password: data.password });
    toast.push(ok, "success"); router.refresh();
  }

  async function resetPassword(u: Row) {
    if (!(await confirm({ title: "¿Restablecer la contraseña?", message: `${u.name} ya no podrá entrar con su contraseña actual. Se generará una temporal nueva.`, confirmLabel: "Restablecer" }))) return;
    patch(u, { resetPassword: true }, "Contraseña restablecida");
  }
  async function toggleActive(u: Row) {
    if (u.active && !(await confirm({ title: "¿Desactivar esta cuenta?", message: `${u.name} perderá el acceso de inmediato. Sus terrenos y expedientes se conservan y puedes reactivarla después.`, confirmLabel: "Desactivar cuenta", tone: "danger" }))) return;
    patch(u, { active: !u.active }, u.active ? "Cuenta desactivada" : "Cuenta reactivada");
  }
  async function changeRole(u: Row, role: Role) {
    if (role === u.role) return;
    if (!(await confirm({ title: `¿Cambiar a ${ROLE[role].label}?`, message: ROLE[role].hint, confirmLabel: "Cambiar rol" }))) return;
    patch(u, { role }, "Rol actualizado");
  }

  const shown = rows.filter((r) => filter === "todos" || r.role === filter);

  return (
    <div className="space-y-8">
      <section className="card p-6 sm:p-7">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.03em]">Crear una cuenta</h2>
        <p className="mt-1 text-sm text-ink-muted">La plataforma genera una contraseña temporal que verás una sola vez.</p>
        <form onSubmit={create} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_200px_auto] md:items-end">
          <Field label="Nombre completo" required><input className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. María González" /></Field>
          <Field label="Correo" required><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nombre@correo.com" /></Field>
          <Field label="Rol"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>{(Object.keys(ROLE) as Role[]).map((r) => <option key={r} value={r}>{ROLE[r].label}</option>)}</select></Field>
          <button className="btn-primary" disabled={creating}>{creating && <Spinner />}Crear cuenta</button>
        </form>
        <p className="mt-3 text-xs text-ink-subtle">{ROLE[form.role].hint}</p>
        {reveal && <div className="mt-5"><PasswordReveal {...reveal} onClose={() => setReveal(null)} /></div>}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.03em]">Cuentas <span className="text-ink-subtle">{shown.length}</span></h2>
          <div className="inline-flex rounded-full bg-white p-1 shadow-card">
            {(["todos", "ADMIN", "OWNER", "BUYER"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === f ? "bg-ink text-white" : "text-ink-muted hover:text-ink"}`}>{f === "todos" ? "Todos" : ROLE[f].label}</button>
            ))}
          </div>
        </div>
        <ul className="space-y-2.5">
          {shown.map((u) => (
            <li key={u.id} className={`flex flex-wrap items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-card ring-1 ring-line/60 ${u.active ? "" : "opacity-60"}`}>
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-base font-black ${ROLE[u.role].pill}`}>{u.name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-semibold">{u.name}{u.id === selfId && <span className="ml-2 text-sm font-normal text-ink-subtle">(tú)</span>}</p>
                <p className="truncate text-[13px] text-ink-muted">{u.email} · desde {formatDate(u.createdAt)}{u.role === "OWNER" ? ` · ${u.properties} terreno${u.properties === 1 ? "" : "s"}` : ""}</p>
              </div>
              {!u.active && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">Desactivada</span>}
              <select aria-label={`Rol de ${u.name}`} className={`rounded-full border-0 px-3 py-2 text-sm font-semibold ${ROLE[u.role].pill}`} value={u.role} disabled={u.id === selfId || busy === u.id} onChange={(e) => changeRole(u, e.target.value as Role)}>
                {(Object.keys(ROLE) as Role[]).map((r) => <option key={r} value={r} className="bg-white text-ink">{ROLE[r].label}</option>)}
              </select>
              <div className="flex gap-2">
                <button className="btn-secondary px-4 py-2" disabled={busy === u.id || !u.active} onClick={() => resetPassword(u)}>Restablecer contraseña</button>
                {u.id !== selfId && <button className={u.active ? "btn-danger px-4 py-2" : "btn-secondary px-4 py-2"} disabled={busy === u.id} onClick={() => toggleActive(u)}>{busy === u.id ? <Spinner /> : u.active ? "Desactivar" : "Reactivar"}</button>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
