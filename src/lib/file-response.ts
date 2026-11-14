export function fileResponse(body: ReadableStream | Buffer, mime: string, filename: string, inline: boolean) {
  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
