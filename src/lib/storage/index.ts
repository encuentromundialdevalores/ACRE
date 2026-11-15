import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export interface StorageAdapter {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream | Buffer; contentType?: string } | null>;
  delete(key: string): Promise<void>;
}

const safeSegment = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_");

class LocalDiskStorage implements StorageAdapter {
  constructor(private root: string) {}
  private resolve(key: string) {
    const p = path.resolve(this.root, ...key.split("/").map(safeSegment));
    if (!p.startsWith(path.resolve(this.root))) throw new Error("Ruta de almacenamiento inválida");
    return p;
  }
  async put(key: string, data: Buffer) {
    const p = this.resolve(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, data);
  }
  async get(key: string) {
    try { return { body: await fs.readFile(this.resolve(key)) }; } catch { return null; }
  }
  async delete(key: string) {
    try { await fs.unlink(this.resolve(key)); } catch { /* ya no existe */ }
  }
}

class VercelBlobStorage implements StorageAdapter {
  async put(key: string, data: Buffer, contentType: string) {
    const { put } = await import("@vercel/blob");
    await put(key, data, { access: "private" as never, contentType, addRandomSuffix: false });
  }
  async get(key: string) {
    const { get } = await import("@vercel/blob");
    const res = await (get as unknown as (k: string, o: { access: string }) => Promise<{ statusCode: number; stream: ReadableStream; blob?: { contentType?: string } } | null>)(key, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream, contentType: res.blob?.contentType };
  }
  async delete(key: string) {
    const { del } = await import("@vercel/blob");
    await del(key);
  }
}

let adapter: StorageAdapter | null = null;
export function storage(): StorageAdapter {
  if (adapter) return adapter;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  adapter = driver === "vercel-blob"
    ? new VercelBlobStorage()
    : new LocalDiskStorage(process.env.STORAGE_LOCAL_DIR ?? "./storage");
  return adapter;
}

export const ALLOWED_MIME: Record<string, "FOTO" | "DOCUMENTO"> = {
  "image/jpeg": "FOTO", "image/png": "FOTO", "image/webp": "FOTO",
  "application/pdf": "DOCUMENTO",
  "application/msword": "DOCUMENTO",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCUMENTO",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "DOCUMENTO",
  "application/geo+json": "DOCUMENTO", "application/json": "DOCUMENTO",
};

/** Comprueba la firma real del archivo (magic bytes): el tipo declarado por el navegador no es confiable. */
export function contentMatchesMime(buf: Buffer, mime: string): boolean {
  const starts = (...b: number[]) => b.every((x, i) => buf[i] === x);
  switch (mime) {
    case "image/jpeg": return starts(0xff, 0xd8, 0xff);
    case "image/png": return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/webp": return buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP";
    case "application/pdf": return buf.subarray(0, 5).toString("latin1") === "%PDF-";
    case "application/msword": return starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": return starts(0x50, 0x4b, 0x03, 0x04);
    case "application/geo+json":
    case "application/json": {
      try { JSON.parse(buf.toString("utf8")); return true; } catch { return false; }
    }
    default: return false;
  }
}

export const maxUploadBytes = () => Number(process.env.MAX_UPLOAD_MB ?? 15) * 1024 * 1024;

export function newStorageKey(propertyId: string, filename: string) {
  const ext = path.extname(filename).toLowerCase().slice(0, 10);
  return `terrenos/${propertyId}/${randomUUID()}${ext}`;
}
