import http from "node:http";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const host = process.env.UPDATE_HOST || "0.0.0.0";
const port = Number(process.env.UPDATE_PORT || 8090);
const releaseDir = path.resolve(process.cwd(), process.env.UPDATE_DIR || "release");

const contentTypes = {
  ".7z": "application/x-7z-compressed",
  ".blockmap": "application/octet-stream",
  ".exe": "application/vnd.microsoft.portable-executable",
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
};

function resolveContentType(filePath) {
  return (
    contentTypes[path.extname(filePath).toLowerCase()] ||
    "application/octet-stream"
  );
}

function listNetworkUrls() {
  const interfaces = os.networkInterfaces();
  const urls = [];

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family !== "IPv4" || entry.internal) {
        continue;
      }

      urls.push(`http://${entry.address}:${port}`);
    }
  }

  return urls;
}

function normalizeArtifactName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function resolveRequestedFile(requestedPath) {
  const directPath = path.normalize(path.join(releaseDir, requestedPath));

  if (!directPath.startsWith(releaseDir)) {
    return null;
  }

  try {
    const stat = await fs.stat(directPath);

    if (stat.isFile()) {
      return directPath;
    }
  } catch {
    // Falls back to normalized name matching below.
  }

  const requestedFileName = path.basename(requestedPath);
  const requestedSlug = normalizeArtifactName(requestedFileName);
  const files = await fs.readdir(releaseDir);

  const matchedFile = files.find((fileName) => {
    return normalizeArtifactName(fileName) === requestedSlug;
  });

  return matchedFile ? path.join(releaseDir, matchedFile) : null;
}

function buildIndexPage(files) {
  const listItems = files
    .map((fileName) => `<li><a href="/${encodeURI(fileName)}">${fileName}</a></li>`)
    .join("");

  return [
    "<!doctype html>",
    "<html lang=\"pt-BR\">",
    "<head><meta charset=\"utf-8\"><title>Fabiana Updates</title></head>",
    "<body style=\"font-family:Segoe UI,Arial,sans-serif;padding:24px;\">",
    "<h1>Servidor de atualizacoes</h1>",
    `<p>Pasta publicada: <code>${releaseDir}</code></p>`,
    "<ul>",
    listItems,
    "</ul>",
    "</body>",
    "</html>",
  ].join("");
}

async function serveFile(response, filePath) {
  const file = await fs.readFile(filePath);

  response.writeHead(200, {
    "Content-Type": resolveContentType(filePath),
    "Cache-Control": filePath.endsWith(".yml")
      ? "no-cache"
      : "public, max-age=3600",
  });
  response.end(file);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(
    request.url || "/",
    `http://${request.headers.host || "localhost"}`,
  );
  const requestedPath = decodeURIComponent(requestUrl.pathname);

  if (requestedPath === "/health") {
    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (requestedPath === "/") {
    const files = (await fs.readdir(releaseDir)).sort();
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
    });
    response.end(buildIndexPage(files));
    return;
  }

  const resolvedPath = await resolveRequestedFile(requestedPath);

  if (!resolvedPath) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  if (!resolvedPath.startsWith(releaseDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const stat = await fs.stat(resolvedPath);

    if (!stat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    await serveFile(response, resolvedPath);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(port, host, async () => {
  const files = await fs.readdir(releaseDir).catch(() => []);

  console.log(`Servidor de updates online em http://localhost:${port}`);
  for (const url of listNetworkUrls()) {
    console.log(`Rede local: ${url}`);
  }
  console.log(`Arquivos encontrados: ${files.join(", ")}`);
});
