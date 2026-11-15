"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, Polygon } from "geojson";
import { MONTERREY_CENTER, MONTERREY_ZOOM } from "@/lib/geo";

type Marker = { lat: number; lng: number; label: string; color?: string };

export default function PolygonViewer({ feature, point, markers = [], radiusM, height = 380 }: { feature: Feature<Polygon> | null; point?: { lat: number; lng: number } | null; markers?: Marker[]; radiusM?: number; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const map = L.map(ref.current, { center: MONTERREY_CENTER, zoom: MONTERREY_ZOOM, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
    const layers: L.Layer[] = [];
    if (feature) {
      const poly = L.geoJSON(feature, { style: { color: "#2F6690", weight: 2, fillOpacity: 0.2 } }).addTo(map);
      layers.push(poly);
      map.fitBounds(poly.getBounds(), { padding: [30, 30] });
    } else if (point) {
      map.setView([point.lat, point.lng], 16);
    }
    if (point && radiusM) {
      L.circle([point.lat, point.lng], { radius: radiusM, color: "#254880", weight: 1, dashArray: "4 4", fillOpacity: 0.03 }).addTo(map);
      L.circleMarker([point.lat, point.lng], { radius: 4, color: "#254880", fillOpacity: 1 }).bindTooltip("Punto representativo").addTo(map);
    }
    for (const m of markers) {
      L.circleMarker([m.lat, m.lng], { radius: 5, color: m.color ?? "#b45309", weight: 2, fillColor: "#fff", fillOpacity: 1 }).bindTooltip(m.label).addTo(map);
    }
    setTimeout(() => map.invalidateSize(), 50);
    return () => { map.remove(); };
  }, [feature, point, markers, radiusM]);
  return <div ref={ref} style={{ height }} className="z-0 w-full overflow-hidden rounded-lg border border-line" />;
}
