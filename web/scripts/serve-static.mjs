import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../dist");
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

const server = createServer(async (request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname);
  const candidate = resolve(root, `.${requestPath === "/" ? "/index.html" : requestPath}`);
  if (!candidate.startsWith(`${root}/`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  const info = await stat(candidate).catch(() => null);
  const target = info?.isFile() ? candidate : resolve(root, "index.html");
  try {
    await access(target);
    response.writeHead(200, { "content-type": types[extname(target).toLowerCase()] ?? "application/octet-stream", "cache-control": "no-store" });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => console.log(`공개 상태 보드: http://127.0.0.1:${port}`));
