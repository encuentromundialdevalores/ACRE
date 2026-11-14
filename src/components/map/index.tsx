"use client";
import dynamic from "next/dynamic";

const Loading = ({ height }: { height?: number }) => <div style={{ height: height ?? 400 }} className="flex items-center justify-center rounded-lg border border-line bg-canvas text-sm text-ink-muted">Cargando mapa…</div>;

export const PolygonEditor = dynamic(() => import("./polygon-editor"), { ssr: false, loading: () => <Loading height={480} /> });
export const PolygonViewer = dynamic(() => import("./polygon-viewer"), { ssr: false, loading: () => <Loading height={380} /> });
