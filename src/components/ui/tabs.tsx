"use client";
import { useState, type ReactNode } from "react";

export type TabItem = { id: string; label: string; count?: number; content: ReactNode };

/** Pestañas sencillas en píldora. */
export function Tabs({ tabs, initial }: { tabs: TabItem[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-card sm:inline-flex">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === current.id} onClick={() => setActive(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${t.id === current.id ? "bg-ink text-white" : "text-ink-muted hover:text-ink"}`}>
            {t.label}
            {t.count != null && <span className={`rounded-full px-2 py-0.5 text-xs ${t.id === current.id ? "bg-white/20" : "bg-canvas"}`}>{t.count}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="mt-5">{current.content}</div>
    </div>
  );
}
