import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/session";

/** Envuelve un handler de ruta y traduce errores a respuestas JSON consistentes. */
export function withApi<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        return NextResponse.json({ error: "Datos inválidos", issues: e.issues }, { status: 400 });
      }
      console.error(e);
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
  };
}

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
