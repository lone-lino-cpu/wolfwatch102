import { createServer } from "node:http";
import { access, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL(".", import.meta.url));
const distDirectory = resolve(projectDirectory, "dist");
const indexPath = resolve(distDirectory, "index.html");
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection; shutting down:", reason);
  process.exit(1);
});

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: ${process.env.PORT}`);
}

await access(indexPath);

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method Not Allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch (error) {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad Request");
    return;
  }

  if (pathname === "/health") {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(request.method === "HEAD" ? undefined : "OK");
    return;
  }

  try {
    let filePath = resolve(distDirectory, `.${pathname}`);
    if (filePath !== distDirectory && !filePath.startsWith(`${distDirectory}${sep}`)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    let contents;
    try {
      contents = await readFile(filePath);
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "EISDIR") {
        throw error;
      }

      if (
        pathname === "/" ||
        pathname === "/admin" ||
        pathname === "/citizen" ||
        request.headers.accept?.includes("text/html")
      ) {
        filePath = indexPath;
        contents = await readFile(indexPath);
      } else {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not Found");
        return;
      }
    }

    response.writeHead(200, {
      "Content-Type":
        contentTypes[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    });
    response.end(request.method === "HEAD" ? undefined : contents);
  } catch (error) {
    console.error("Failed to serve request:", error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Internal Server Error");
  }
});

server.on("error", (error) => {
  console.error("HTTP server failed:", error);
  process.exit(1);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`WolfWatch listening on 0.0.0.0:${port}`);
});
