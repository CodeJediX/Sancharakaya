const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { PORT, ALLOWED_ORIGIN, GEMINI_API_KEY } = require("./config");
const { runAgent, resolveModel } = require("./agent");
const { searchPlaces, getPlace, buildItinerary, budgetFromUserInput, places } = require("./kb");
const { getWeather, enrichPlacesWithImages } = require("./integrations");

const ROOT = path.resolve(__dirname, "..");
const MAX_BODY = 1_000_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = Number(process.env.RATE_LIMIT_PER_MINUTE || 60);
const buckets = new Map();

function allowedOrigins() {
  return String(ALLOWED_ORIGIN || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

function cors(req) {
  const origins = allowedOrigins();
  const requestOrigin = req.headers.origin || "";
  const allowOrigin = origins.includes("*")
    ? "*"
    : origins.includes(requestOrigin)
      ? requestOrigin
      : origins[0] || "http://localhost:8080";

  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "cache-control": "no-store",
    vary: "Origin"
  };
}

function sendJson(req, res, status, payload) {
  res.writeHead(status, { ...cors(req), "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function clientKey(req) {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown")
    .toString()
    .split(",")[0]
    .trim();
}

function rateLimited(req) {
  if (!req.url.startsWith("/api/")) return false;
  const key = clientKey(req);
  const now = Date.now();
  const current = buckets.get(key) || { count: 0, reset: now + RATE_WINDOW_MS };
  if (current.reset < now) {
    current.count = 0;
    current.reset = now + RATE_WINDOW_MS;
  }
  current.count += 1;
  buckets.set(key, current);
  return current.count > RATE_LIMIT;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      body += chunk;
      if (body.length > MAX_BODY) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const body = await readBody(req);
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Invalid JSON request body.");
    error.status = 400;
    throw error;
  }
}

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  const rel = clean || "index.html";
  const allowed = rel === "index.html" || rel === "manifest.webmanifest" || rel === "sw.js" ||
    rel.startsWith("css/") || rel.startsWith("js/") || rel.startsWith("assets/");
  if (!allowed || rel.includes("..")) return null;
  const full = path.resolve(ROOT, rel);
  return full === ROOT || full.startsWith(ROOT + path.sep) ? full : null;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".webmanifest": "application/manifest+json"
};

function serveStatic(req, res) {
  const file = safePath(req.url);
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const fallback = path.join(ROOT, "index.html");
    res.writeHead(200, { "content-type": MIME[".html"], "cache-control": "no-cache" });
    fs.createReadStream(fallback).pipe(res);
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const noCache = ext === ".html" || ext === ".js" || path.basename(file) === "sw.js";
  res.writeHead(200, {
    "content-type": MIME[ext] || "application/octet-stream",
    "cache-control": noCache ? "no-store" : "public, max-age=3600"
  });
  fs.createReadStream(file).pipe(res);
}

async function handleRequest(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, cors(req));
    res.end();
    return;
  }

  if (rateLimited(req)) {
    sendJson(req, res, 429, { error: "Too many requests. Please try again shortly." });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "GET" && (url.pathname === "/api/health" || url.pathname === "/health")) {
      const model = GEMINI_API_KEY ? await resolveModel() : null;
      sendJson(req, res, 200, {
        ok: true,
        service: "Sancharakaya Gemini Travel Agent",
        ai_configured: Boolean(GEMINI_API_KEY),
        provider: "Google Gemini",
        model,
        knowledge_base_places: places.length,
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/places") {
      const result = searchPlaces({
        query: url.searchParams.get("q") || "",
        interests: (url.searchParams.get("interests") || "").split(",").filter(Boolean),
        region: url.searchParams.get("region") || "",
        hidden_gems: url.searchParams.get("hidden") === "true",
        limit: 12
      });
      result.matches = await enrichPlacesWithImages(result.matches, 8);
      sendJson(req, res, 200, result);
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/place/")) {
      const id = url.pathname.split("/").pop();
      const place = getPlace(id);
      if (!place) {
        sendJson(req, res, 404, { error: "Place not found." });
        return;
      }
      const [enriched] = await enrichPlacesWithImages([place], 1);
      sendJson(req, res, 200, enriched);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/weather") {
      const ref = url.searchParams.get("place");
      if (!ref) {
        sendJson(req, res, 400, { error: "Missing place parameter." });
        return;
      }
      const result = await getWeather(ref);
      sendJson(req, res, result.error ? 404 : 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/itinerary") {
      sendJson(req, res, 200, buildItinerary(await readJson(req)));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/budget") {
      sendJson(req, res, 200, budgetFromUserInput(await readJson(req)));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/agent/chat") {
      const body = await readJson(req);
      if (!Array.isArray(body.messages) || !body.messages.some(message => message?.role === "user" && String(message.content || "").trim())) {
        sendJson(req, res, 400, { error: "At least one user message is required." });
        return;
      }
      const result = await runAgent({
        messages: Array.isArray(body.messages) ? body.messages : [],
        memory: body.memory && typeof body.memory === "object" ? body.memory : {}
      });
      const status = result.error ? (result.retryable ? 503 : 500) : 200;
      sendJson(req, res, status, result);
      return;
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/")) {
      sendJson(req, res, 404, { error: "API route not found." });
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res);
      return;
    }

    sendJson(req, res, 404, { error: "Not found." });
  } catch (error) {
    const status = Number(error.status) || 500;
    sendJson(req, res, status, {
      error: status >= 500
        ? "Sancharakaya service is temporarily unavailable."
        : error.message
    });
  }
}

if (require.main === module) {
  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`Sancharakaya Gemini backend running at http://localhost:${PORT}`);
    console.log(`AI configured: ${GEMINI_API_KEY ? "yes - Google Gemini" : "no - add GEMINI_API_KEY to .env"}`);
  });
}

module.exports = handleRequest;
