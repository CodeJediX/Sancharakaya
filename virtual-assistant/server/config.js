const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(file = path.join(process.cwd(), ".env")) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvFile();

function cleanSecret(value = "") {
  const secret = String(value || "").trim();
  if (!secret || /^replace-with/i.test(secret)) return "";
  return secret;
}

const GEMINI_API_KEY = cleanSecret(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);

module.exports = {
  PORT: Number(process.env.PORT || 8787),
  GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || "",
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || "http://localhost:8080",
  TRUST_PROXY: process.env.TRUST_PROXY === "true",
  ENABLE_NEARBY_OSM: process.env.ENABLE_NEARBY_OSM !== "false"
};
