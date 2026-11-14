"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import type { Feature, Polygon } from "geojson";
import { MONTERREY_CENTER, MONTERREY_ZOOM, validatePolygon, formatArea } from "@/lib/geo";

export type GeometryState = { feature: Feature<Polygon> | null; areaM2: number | null; point: { lat: number; lng: number } | null; error: string | null };

type Props = { initial?: Feature<Polygon> | null; onChange: (state: GeometryState) => void; height?: number; readOnly?: boolean };

/** Editor de polígonos con Leaflet.draw. Componente cliente; cargar con dynamic(..., { ssr:false }). */
export default function PolygonEditor({ initial, onChange, height = 480, readOnly = false }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const [state, setState] = useState<GeometryState>({ feature: null, areaM2: null, point: null, error: null });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  function emit() {
    const layers = groupRef.current.getLayers();
    if (layers.length === 0) {
      const s = { feature: null, areaM2: null, point: null, error: null };
      setState(s); onChangeRef.current(s); return;
    }
    const gj = (layers[0] as L.Polygon).toGeoJSON() as Feature<Polygon>;
    const v = validatePolygon(gj);
    const s: GeometryState = v.ok
      ? { feature: v.feature, areaM2: v.areaM2, point: v.representativePoint, error: null }
      : { feature: null, areaM2: null, point: null, error: v.error };
    setState(s); onChangeRef.current(s);
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: MONTERREY_CENTER, zoom: MONTERREY_ZOOM, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
    const group = groupRef.current;
    group.addTo(map);

    if (initial) {
      const layer = L.geoJSON(initial, { style: { color: "#14968c", weight: 2, fillOpacity: 0.18 } });
      layer.eachLayer((l) => group.addLayer(l));
      map.fitBounds(group.getBounds(), { padding: [24, 24] });
    }

    if (!readOnly) {
      const drawControl = new L.Control.Draw({
        position: "topright",
        draw: { polygon: { allowIntersection: false, showArea: false, shapeOptions: { color: "#14968c", weight: 2, fillOpacity: 0.18 } }, polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false },
        edit: { featureGroup: group, remove: true },
      });
      map.addControl(drawControl);
      map.on(L.Draw.Event.CREATED, (e) => {
        group.clearLayers(); // un solo polígono por terreno
        group.addLayer((e as L.DrawEvents.Created).layer);
        emit();
      });
      map.on(L.Draw.Event.EDITED, emit);
      map.on(L.Draw.Event.DELETED, emit);
    }
    mapRef.current = map;
    setTimeout(() => { map.invalidateSize(); if (initial) emit(); }, 50);
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Reemplaza el polígono actual (p. ej. tras importar GeoJSON). */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || initial === undefined) return;
    const current = groupRef.current.getLayers()[0] as L.Polygon | undefined;
    const currentJson = current ? JSON.stringify((current.toGeoJSON() as Feature<Polygon>).geometry) : null;
    const nextJson = initial ? JSON.stringify(initial.geometry) : null;
    if (currentJson === nextJson) return;
    groupRef.current.clearLayers();
    if (initial) {
      L.geoJSON(initial, { style: { color: "#14968c", weight: 2, fillOpacity: 0.18 } }).eachLayer((l) => groupRef.current.addLayer(l));
      map.fitBounds(groupRef.current.getBounds(), { padding: [24, 24] });
    }
    emit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div ref={containerRef} style={{ height }} className="z-0 w-full overflow-hidden rounded-lg border border-line" />
      <aside className="card p-4 text-sm">
        <h3 className="font-semibold">Geometría</h3>
        {!readOnly && <p className="mt-1 text-xs text-ink-muted">Usa el icono de polígono (arriba a la derecha del mapa) para dibujar. Edita o elimina vértices con el icono de edición.</p>}
        <dl className="mt-4 space-y-3">
          <div><dt className="label">Superficie</dt><dd className="text-lg font-semibold">{state.areaM2 != null ? formatArea(state.areaM2) : "—"}</dd></div>
          <div><dt className="label">Vértices</dt><dd>{state.feature ? state.feature.geometry.coordinates[0].length - 1 : "—"}</dd></div>
          <div><dt className="label">Punto representativo</dt><dd className="font-mono text-xs">{state.point ? `${state.point.lat.toFixed(6)}, ${state.point.lng.toFixed(6)}` : "—"}</dd></div>
          <div><dt className="label">Validez</dt><dd>{state.error ? <span className="text-red-700">{state.error}</span> : state.feature ? <span className="text-emerald-700">Polígono válido, sin autointersecciones</span> : <span className="text-ink-subtle">Sin polígono</span>}</dd></div>
        </dl>
        <p className="mt-4 text-[11px] text-ink-subtle">Área geodésica calculada con Turf.js; coordenadas guardadas como GeoJSON (WGS84, [lng, lat]).</p>
      </aside>
    </div>
  );
}
