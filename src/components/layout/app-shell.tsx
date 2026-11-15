"use client";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Role } from "@/lib/db/schema";
import { ROLE_LABELS } from "@/lib/permissions";
import { Logo } from "@/components/brand";

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: "/dashboard", label: "Inicio", roles: ["ADMIN", "OWNER", "BUYER"] },
  { href: "/terrenos", label: "Terrenos", roles: ["ADMIN", "OWNER"] },
  { href: "/expedientes", label: "Expedientes", roles: ["ADMIN", "OWNER"] },
  { href: "/invitaciones", label: "Enlaces compartidos", roles: ["ADMIN"] },
  { href: "/usuarios", label: "Usuarios", roles: ["ADMIN"] },
];

function isActive(href: string, pathname: string) {
  if (href === "/terrenos") return pathname === "/terrenos" || /^\/terrenos\/(?!nuevo)/.test(pathname);
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
}

export function AppShell({ user, demoMode, children }: { user: { name: string; email: string; role: Role }; demoMode: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const nav = NAV.filter((n) => n.roles.includes(user.role));
  const canCreate = user.role !== "BUYER";

  return (
    <div className="min-h-screen overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" aria-label="Inicio"><Logo subtitle="Gestión Territorial" /></Link>

          <nav className="mx-auto hidden items-center gap-1 md:flex" aria-label="Principal">
            {nav.map((n) => (
              <Link key={n.href} href={n.href}
                className={`rounded-full px-4 py-2 text-[15px] transition ${isActive(n.href, pathname) ? "bg-ink/[0.06] font-semibold text-ink" : "text-ink-muted hover:text-ink"}`}>
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {demoMode && <span className="hidden rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 lg:inline">Modo demostración</span>}
            {canCreate && <Link href="/terrenos/nuevo" className="btn-primary hidden sm:inline-flex">Registrar terreno</Link>}
            <Link href="/cuenta" title={`${user.name} · ${ROLE_LABELS[user.role]}`}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white font-display text-sm font-bold hover:border-ink/30">
              {user.name.slice(0, 1).toUpperCase()}
            </Link>
            <button className="btn-ghost hidden px-3 md:inline-flex" onClick={() => signOut({ callbackUrl: "/login" })}>Salir</button>
            <button className="btn-ghost px-2.5 md:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Menú">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}</svg>
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-line bg-white px-4 py-3 md:hidden" aria-label="Menú móvil">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                className={`block rounded-xl px-3 py-3 text-base ${isActive(n.href, pathname) ? "bg-ink/[0.06] font-semibold" : "text-ink-muted"}`}>{n.label}</Link>
            ))}
            {canCreate && <Link href="/terrenos/nuevo" onClick={() => setOpen(false)} className="btn-primary mt-2 w-full">Registrar terreno</Link>}
            <button className="btn-secondary mt-2 w-full" onClick={() => signOut({ callbackUrl: "/login" })}>Salir</button>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>
    </div>
  );
}
