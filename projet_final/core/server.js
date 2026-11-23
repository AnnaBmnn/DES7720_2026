const http = require("node:http");
const fs = require("node:fs/promises");
const { createWriteStream } = require("node:fs");
const { pipeline } = require("node:stream/promises");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { randomUUID } = require("node:crypto");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const destinations = { png: path.join(root, "renders"), sequence: path.join(root, "renders") };
const sequenceFolders = new Map();
const execute = promisify(execFile);
let choosing = false;

const folderScript = `on run args
  set initialFolder to POSIX file (item 2 of args)
  tell application "Finder"
    activate
    try
      set selectedFolder to choose folder with prompt (item 1 of args) default location initialFolder
      return POSIX path of selectedFolder
    on error number -128
      return ""
    end try
  end tell
end run`;

function json(response, status, value) {
  response.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(value));
}

async function savePNG(request, file) {
  const temporary = `${file}.${randomUUID()}.part`;
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await pipeline(async function* () {
      let bytes = 0;
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        bytes += chunk.length;
        if (bytes > 300 * 1024 * 1024) throw Object.assign(new Error("Frame too large"), { status: 413 });
        yield chunk;
      }
    }, createWriteStream(temporary));
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

http.createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  let url;
  try {
    url = new URL(request.url, "http://localhost");
    if (request.method === "POST" && request.headers.origin && !["http://localhost:8080", "http://127.0.0.1:8080"].includes(request.headers.origin)) {
      response.writeHead(403).end("Local requests only");
      return;
    }
    if (request.method === "GET" && url.pathname === "/paths") {
      json(response, 200, destinations);
      return;
    }
    if (request.method === "GET" && url.pathname === "/project-root") {
      response.writeHead(200, { "Content-Type": "text/plain" }).end(root);
      return;
    }
    if (request.method === "POST" && url.pathname === "/folder") {
      const kind = url.searchParams.get("kind");
      if (!["png", "sequence"].includes(kind)) {
        json(response, 400, { error: "Invalid folder type" });
        return;
      }
      if (process.platform !== "darwin") {
        json(response, 501, { error: "The native folder chooser requires macOS" });
        return;
      }
      if (choosing) {
        json(response, 409, { error: "A folder chooser is already open" });
        return;
      }
      choosing = true;
      try {
        const current = await fs.stat(destinations[kind]).catch(() => null);
        const initial = current?.isDirectory() ? destinations[kind] : root;
        const result = await execute("/usr/bin/osascript", ["-e", folderScript, kind === "png" ? "Choose a folder for PNG images" : "Choose a folder for render sequences", initial], { encoding: "utf8", maxBuffer: 8192 });
        const selected = result.stdout.trim();
        if (selected) destinations[kind] = path.resolve(selected);
        json(response, 200, { ...destinations, cancelled: !selected });
      } finally {
        choosing = false;
      }
      return;
    }
    if (request.method === "POST" && url.pathname === "/still") {
      const camera = url.searchParams.get("camera") || "dome";
      if (!["dome", "viewport", "dome-preview"].includes(camera)) {
        response.writeHead(400).end("Invalid camera");
        return;
      }
      const file = path.join(destinations.png, `${camera}_${Date.now()}.png`);
      await savePNG(request, file);
      response.writeHead(200, { "Content-Type": "text/plain" }).end(file);
      return;
    }
    if (request.method === "POST" && url.pathname === "/frame") {
      const shot = url.searchParams.get("shot");
      const frame = url.searchParams.get("frame");
      if (!/^render_\d+$/.test(shot || "") || !/^\d{1,6}$/.test(frame || "")) {
        response.writeHead(400).end("Invalid frame");
        return;
      }
      if (!sequenceFolders.has(shot)) sequenceFolders.set(shot, path.join(destinations.sequence, shot));
      const folder = sequenceFolders.get(shot);
      await savePNG(request, path.join(folder, `frame_${frame.padStart(6, "0")}.png`));
      response.writeHead(200, { "Content-Type": "text/plain" }).end(folder);
      return;
    }
    if (request.method !== "GET") {
      response.writeHead(405).end("Method not allowed");
      return;
    }
    const file = path.resolve(root, "." + decodeURIComponent(["/", "/dome.html"].includes(url.pathname) ? "/core/core.html" : url.pathname));
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const data = await fs.readFile(file);
    const type = { ".html": "text/html", ".js": "text/javascript", ".md": "text/plain", ".png": "image/png" };
    response.writeHead(200, { "Content-Type": type[path.extname(file)] || "application/octet-stream" });
    response.end(data);
  } catch (error) {
    request.resume();
    if (response.destroyed) return;
    const status = error.status || (error.code === "ENOENT" ? 404 : 500);
    const message = error.status === 413 ? "Frame too large" : url?.pathname === "/folder" ? "Could not open folder chooser" : "Request failed";
    if (url?.pathname === "/folder") json(response, status, { error: message });
    else response.writeHead(status).end(message);
  }
}).listen(8080, "127.0.0.1", () => {
  console.log("http://localhost:8080");
  console.log(`PNG images: ${destinations.png}`);
  console.log(`Sequences: ${destinations.sequence}`);
});
