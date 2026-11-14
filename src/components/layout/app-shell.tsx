"use client";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Sidebar } from "./sidebar";
import type { Role } from "@/lib/db/schema";
import { ROLE_LABELS } from "@/lib/permissions";

const TITLES: [RegExp, string][] = [
  [/^\/dashboard/, "Dashboard"], [/^\/terrenos\/nuevo/, "Registrar terreno"], [/^\/terrenos\/[^/]+\/editar/, "Editar terreno"],
  [/^\/terrenos\/[^/]+/, "Expediente del terreno"], [/^\/terrenos/, "Terrenos"], [/^\/expedientes/, "Expedientes"],
  [/^\/invitaciones/, "Invitaciones"], [/^\/cuenta/, "Mi cuenta"],
];

export function AppShell({ user, demoMode, children }: { user: { name: string; email: string; role: Role }; demoMode: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? "ACRE";
  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button className="btn-ghost -ml-2 px-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="hidden text-[11px] uppercase tracking-wide text-ink-subtle sm:block">ACRE Consulting · Plataforma de Gestión Territorial</p>
            <h1 className="truncate text-sm font-semibold sm:text-base">{title}</h1>
          </div>
          {demoMode && <span className="hidden rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-600/20 sm:inline">Modo demostración</span>}
          <Link href="/cuenta" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-canvas">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{user.name.slice(0, 1).toUpperCase()}</span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium leading-tight">{user.name}</span>
              <span className="block text-[11px] text-ink-subtle">{ROLE_LABELS[user.role]}</span>
            </span>
          </Link>
          <button className="btn-ghost px-2" onClick={() => signOut({ callbackUrl: "/login" })} title="Cerrar sesión">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 17l5-5-5-5M15 12H3M21 3v18" /></svg>
          </button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
