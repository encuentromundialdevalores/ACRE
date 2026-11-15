/** Silueta del Cerro de la Silla: el gesto gráfico de la plataforma. */
export function Cerro({ className = "", tone = "ink" }: { className?: string; tone?: "ink" | "white" | "sky" }) {
  const fill = tone === "white" ? "#FFFFFF" : tone === "sky" ? "#B9D0E3" : "#141617";
  return (
    <svg viewBox="0 0 1200 220" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path
        fill={fill}
        d="M0 220V186c60-6 118-14 170-28 46-12 84-30 122-52 30-18 56-40 82-58 14-10 28-14 40-8 14 8 22 24 34 40 16 22 34 40 56 52 22 12 44 14 62 6 16-8 26-24 38-42 14-22 28-48 44-70 10-14 22-22 34-18 14 4 22 18 32 34 18 30 38 62 64 88 30 30 66 50 108 64 52 18 108 24 160 30 54 6 104 10 154 12V220Z"
      />
    </svg>
  );
}

export function Logo({ inverted = false, subtitle }: { inverted?: boolean; subtitle?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`font-display text-[22px] font-black leading-none tracking-[-0.06em] ${inverted ? "text-white" : "text-ink"}`}>
        ACRE<span className="text-brand-500">.</span>
      </span>
      {subtitle && <span className={`hidden border-l pl-2.5 text-xs leading-tight sm:block ${inverted ? "border-white/30 text-white/70" : "border-line text-ink-subtle"}`}>{subtitle}</span>}
    </span>
  );
}
