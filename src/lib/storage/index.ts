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

export const maxUploadBytes = () => Number(process.env.MAX_UPLOAD_MB ?? 15) * 1024 * 1024;

export function newStorageKey(propertyId: string, filename: string) {
  const ext = path.extname(filename).toLowerCase().slice(0, 10);
  return `terrenos/${propertyId}/${randomUUID()}${ext}`;
}
