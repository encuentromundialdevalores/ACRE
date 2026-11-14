"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/db/schema";

const NAV: { href: string; label: string; roles: Role[]; icon: string }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "OWNER", "BUYER"], icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { href: "/terrenos", label: "Terrenos", roles: ["ADMIN", "OWNER"], icon: "M4 6l6-2 4 2 6-2v14l-6 2-4-2-6 2z" },
  { href: "/terrenos/nuevo", label: "Registrar terreno", roles: ["ADMIN", "OWNER"], icon: "M12 5v14M5 12h14" },
  { href: "/expedientes", label: "Expedientes", roles: ["ADMIN", "OWNER"], icon: "M7 3h7l5 5v13H7zM14 3v5h5M9 13h6M9 17h6" },
  { href: "/invitaciones", label: "Invitaciones", roles: ["ADMIN"], icon: "M4 6h16v12H4zM4 7l8 6 8-6" },
  { href: "/cuenta", label: "Mi cuenta", roles: ["ADMIN", "OWNER", "BUYER"], icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
];

export function Sidebar({ role, open, onClose }: { role: Role; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-900 text-white transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 font-bold">A</span>
          <div>
            <p className="text-sm font-semibold leading-tight">ACRE Consulting</p>
            <p className="text-[11px] text-brand-100/70">Gestión Territorial</p>
          </div>
        </div>
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {NAV.filter((n) => n.roles.includes(role)).map((n) => {
            const active = n.href === "/terrenos" ? pathname === "/terrenos" || /^\/terrenos\/(?!nuevo)/.test(pathname) : pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href + "/"));
            return (
              <Link key={n.href} href={n.href} onClick={onClose}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${active ? "bg-white/10 font-medium text-white" : "text-brand-100/80 hover:bg-white/5 hover:text-white"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <p className="px-5 py-4 text-[11px] text-brand-100/50">Área Metropolitana de Monterrey · v0.1</p>
      </aside>
    </>
  );
}
