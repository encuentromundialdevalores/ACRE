import { straightLineDistanceM } from "@/lib/geo";
import { fetchJson } from "./http";
import { ConnectorError, type Connector, type ConnectorInput, type ConnectorOutput, type NearbyPlace } from "./types";

type DenueRow = {
  Id: string; Nombre: string; Razon_social: string; Clase_actividad: string; Estrato: string;
  Calle: string; Colonia: string; Latitud: string; Longitud: string; Tipo: string;
};

export const DENUE_DOCS_URL = "https://www.inegi.org.mx/servicios/api_denue.html";

export function topActivities(rows: { Clase_actividad: string }[], n = 3): { activity: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = (r.Clase_actividad || "Sin clasificar").trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([activity, count]) => ({ activity, count }));
}

export const denueConnector: Connector = {
  id: "denue",
  label: "INEGI · DENUE",
  fields: ["denue_comercios_500m", "denue_giros_principales"],
  notConfiguredReason() {
    return process.env.INEGI_DENUE_TOKEN ? null : "Falta INEGI_DENUE_TOKEN (token gratuito de INEGI).";
  },
  async run(input: ConnectorInput): Promise<ConnectorOutput> {
    const token = process.env.INEGI_DENUE_TOKEN!;
    const { lat, lng } = input.point;
    const radius = Math.min(input.radiusM, 5000);
    const url = `https://www.inegi.org.mx/app/api/denue/v1/consulta/Buscar/todos/${lat.toFixed(6)},${lng.toFixed(6)}/${radius}/${encodeURIComponent(token)}`;
    const publicUrl = url.replace(encodeURIComponent(token), "{token}");

    let rows: DenueRow[];
    try {
      rows = await fetchJson<DenueRow[]>(url, { signal: input.signal });
    } catch (e) {
      // DENUE responde texto plano "No Autorizado" con HTTP 200 cuando el token es inválido.
      if (e instanceof ConnectorError && e.kind === "invalid_response" && /No Autorizado/i.test(e.message)) {
        throw new ConnectorError("INEGI rechazó el token de DENUE", "auth");
      }
      throw e;
    }
    if (!Array.isArray(rows)) throw new ConnectorError("DENUE devolvió un formato inesperado", "invalid_response");

    const method = `Punto representativo del polígono (${lat.toFixed(5)}, ${lng.toFixed(5)}) y radio de ${radius} m según el método Buscar de la API DENUE.`;
    const places: NearbyPlace[] = rows
      .map((r) => {
        const plat = Number(r.Latitud), plng = Number(r.Longitud);
        return {
          name: r.Nombre || r.Razon_social,
          lat: plat, lng: plng,
          distanceM: Number.isFinite(plat) && Number.isFinite(plng) ? straightLineDistanceM(input.point, { lat: plat, lng: plng }) : NaN,
          category: r.Clase_actividad,
        };
      })
      .sort((a, b) => (a.distanceM || 0) - (b.distanceM || 0));
    const top = topActivities(rows);
    const consulted = new Date().toISOString();

    return {
      cacheable: true,
      fields: [
        {
          fieldKey: "denue_comercios_500m",
          status: "CONFIRMADO",
          value: String(rows.length),
          unit: "unidades económicas",
          valueJson: { count: rows.length, radiusM: radius, sample: places.slice(0, 25), consulted },
          source: "INEGI · DENUE (API oficial)",
          sourceUrl: publicUrl,
          method,
          notes: rows.length === 0 ? "La fuente no reportó unidades económicas en el radio consultado." : null,
        },
        {
          fieldKey: "denue_giros_principales",
          status: "CONFIRMADO",
          value: top.length ? top.map((t) => `${t.activity} (${t.count})`).join("; ") : "Sin unidades económicas en el radio",
          valueJson: { top, total: rows.length },
          source: "INEGI · DENUE (API oficial)",
          sourceUrl: publicUrl,
          method: `${method} Giros según el campo Clase_actividad (SCIAN).`,
        },
      ],
    };
  },
};
