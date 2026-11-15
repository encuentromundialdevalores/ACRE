"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Options = { title: string; message?: string; confirmLabel: string; cancelLabel?: string; tone?: "danger" | "default" };
type Pending = Options & { resolve: (ok: boolean) => void };
const Ctx = createContext<(o: Options) => Promise<boolean>>(async () => false);

/** Diálogo de confirmación propio (sustituye a window.confirm). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const ask = useCallback((o: Options) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })), []);
  const close = useCallback((ok: boolean) => { setPending((p) => { p?.resolve(ok); return null; }); }, []);

  useEffect(() => {
    if (!pending) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  return (
    <Ctx.Provider value={ask}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[1100] flex items-end justify-center p-4 sm:items-center" role="presentation">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => close(false)} />
          <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg"
            className="relative w-full max-w-md rounded-3xl bg-white p-7 shadow-[0_30px_80px_-20px_rgb(20_22_23/0.45)]">
            {pending.tone === "danger" && (
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 8v5M12 16.5v.5M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
              </span>
            )}
            <h2 id="confirm-title" className="font-display text-2xl font-extrabold tracking-[-0.03em]">{pending.title}</h2>
            {pending.message && <p id="confirm-msg" className="mt-2 text-[15px] text-ink-muted">{pending.message}</p>}
            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="btn-secondary" onClick={() => close(false)}>{pending.cancelLabel ?? "Cancelar"}</button>
              <button ref={confirmRef} onClick={() => close(true)}
                className={pending.tone === "danger" ? "btn bg-red-600 text-white hover:bg-red-700" : "btn-primary"}>{pending.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
export const useConfirm = () => useContext(Ctx);
