import { ConnectorError } from "./types";

/** fetch con señal de aborto compartida; traduce errores a ConnectorError. */
export async function fetchJson<T>(url: string, init: RequestInit & { signal: AbortSignal }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: "no-store" });
  } catch (e) {
    const err = e as Error;
    if (err.name === "AbortError") throw new ConnectorError("La consulta superó el tiempo límite", "timeout");
    throw new ConnectorError(`Error de conexión: ${err.message}`, "network");
  }
  const text = await res.text();
  if (res.status === 401 || res.status === 403) throw new ConnectorError(`Credenciales rechazadas (HTTP ${res.status})`, "auth");
  if (!res.ok) throw new ConnectorError(`La fuente respondió HTTP ${res.status}: ${text.slice(0, 200)}`, "network");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ConnectorError(`Respuesta no válida de la fuente: ${text.slice(0, 200)}`, "invalid_response");
  }
}
