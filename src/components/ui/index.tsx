import type { ReactNode } from "react";
import Link from "next/link";
import type { VerificationStatus } from "@/lib/db/schema";

export function Card({ title, description, actions, children, className = "" }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-6 pb-2 pt-5">
          <div>
            {title && <h2 className="font-display text-lg font-bold tracking-[-0.02em] text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="px-6 pb-6 pt-3">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, tone = "brand" }: { label: string; value: string | number; hint?: string; tone?: "brand" | "accent" | "amber" | "slate" }) {
  const dot = { brand: "bg-ink", accent: "bg-emerald-500", amber: "bg-amber-500", slate: "bg-brand-500" }[tone];
  return (
    <div className="card p-4 sm:p-6">
      <p className="flex items-center gap-2 text-[13px] text-ink-muted sm:text-sm"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</p>
      <p className="mt-2 font-display text-4xl font-black sm:mt-3 sm:text-5xl tracking-[-0.05em] text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>}
    </div>
  );
}

export const STATUS_META: Record<VerificationStatus, { label: string; cls: string; dot: string }> = {
  CONFIRMADO: { label: "Confirmado", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  PENDIENTE: { label: "Pendiente", cls: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
  NO_DISPONIBLE: { label: "No disponible", cls: "bg-slate-100 text-slate-700 ring-slate-500/20", dot: "bg-slate-400" },
};

export function StatusBadge({ status, isDemo }: { status: VerificationStatus; isDemo?: boolean }) {
  if (isDemo) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20"><span className="h-1.5 w-1.5 rounded-full bg-violet-500" />Demostrativo</span>;
  }
  const m = STATUS_META[status];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${m.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />{m.label}</span>;
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" | "amber" | "red" | "violet" | "brand" }) {
  const map = {
    slate: "bg-slate-100 text-slate-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-700", violet: "bg-violet-50 text-violet-700", brand: "bg-brand-50 text-brand-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-canvas px-6 py-14 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-card">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
      </div>
      <p className="font-display text-lg font-bold tracking-[-0.02em] text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <Link href={action.href} className="btn-primary mt-4">{action.label}</Link>}
    </div>
  );
}

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="label">{label}{required && <span className="text-red-600"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-subtle">{hint}</span>}
    </label>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <svg className={`h-4 w-4 animate-spin ${className}`} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" className="opacity-90" /></svg>;
}

export function Alert({ tone = "info", children }: { tone?: "info" | "warn" | "error" | "success"; children: ReactNode }) {
  const map = {
    info: "border-brand-100 bg-brand-50 text-brand-700",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    error: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm ${map[tone]}`}>{children}</div>;
}

export function formatDate(d: Date | string | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("es-MX", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}) });
}
