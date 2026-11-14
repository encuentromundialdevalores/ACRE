import { denueConnector } from "./denue";
import { googleGeocodingConnector, googlePlacesConnector } from "./google";
import { anrConnector } from "./anr";
import { demoConnector } from "./demo";
import type { Connector } from "./types";

export type DataMode = "REAL" | "DEMO";

export function currentDataMode(): DataMode {
  return (process.env.DATA_MODE ?? "demo").toLowerCase() === "real" ? "REAL" : "DEMO";
}

export function connectorsForMode(mode: DataMode): Connector[] {
  return mode === "DEMO" ? [demoConnector] : [googleGeocodingConnector, denueConnector, googlePlacesConnector, anrConnector];
}

export const REAL_CONNECTORS: Connector[] = [googleGeocodingConnector, denueConnector, googlePlacesConnector, anrConnector];
