const http = require("node:http");

const port = Number(process.env.PORT || 8787);
const apiKey = process.env.ANTHROPIC_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;
const mapsKey = process.env.GOOGLE_MAPS_API_KEY;

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 1000000) {
        reject(new Error("Request body is too large."));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/api/exchange") {
    try {
      const upstream = await fetch("https://open.er-api.com/v6/latest/USD");
      const data = await upstream.json();
      if (!upstream.ok || data.result !== "success" || !Number(data.rates?.LKR)) {
        sendJson(response, 502, { error: "Live USD/LKR exchange rate unavailable." });
        return;
      }
      sendJson(response, 200, {
        base: "USD",
        target: "LKR",
        rate: Number(data.rates.LKR),
        updatedAt: data.time_last_update_utc,
        provider: "ExchangeRate-API"
      });
    } catch (error) {
      sendJson(response, 502, { error: error.message });
    }
    return;
  }

  if (request.method !== "POST" || !["/api/chat", "/api/search", "/api/directions"].includes(request.url)) {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  try {
    const body = await readBody(request);
    const payload = JSON.parse(body);
    if (request.url === "/api/search") {
      if (!geminiKey) {
        sendJson(response, 503, { error: "The server is not configured with GEMINI_API_KEY." });
        return;
      }

      const prompt = `Find current hotel booking options in Sri Lanka for this location: ${payload.query || "Sri Lanka"}.
Search or reference these reputable sources where relevant: HotelsInSriLanka.lk (https://www.hotelsinsrilanka.lk/), Booking.com Sri Lanka (https://www.booking.com/country/lk.en.html), Google Hotels, Agoda, Expedia, and Tripadvisor.
Return JSON only as an array of objects with name, location, stars (number), priceUsd (number per night), url, source, sourceDomain, and summary.
Use only links and prices you can verify from the source. If price or availability cannot be verified, omit that hotel rather than inventing it. Budget style: ${payload.budget || "mid"}.`;
      const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(geminiKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await upstream.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const results = JSON.parse(cleaned);
      sendJson(response, upstream.ok ? 200 : upstream.status, { results: Array.isArray(results) ? results : [] });
      return;
    }

    if (request.url === "/api/directions") {
      if (!mapsKey) {
        sendJson(response, 503, { error: "The server is not configured with GOOGLE_MAPS_API_KEY." });
        return;
      }

      const stops = Array.isArray(payload.stops) ? payload.stops : [];
      const destination = stops[stops.length - 1] || "Colombo, Sri Lanka";
      const waypoints = stops.slice(0, -1).join("|");
      const query = new URLSearchParams({
        origin: payload.origin || "Bandaranaike International Airport (CMB)",
        destination,
        key: mapsKey
      });
      if (waypoints) query.set("waypoints", waypoints);
      const upstream = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${query}`);
      const data = await upstream.json();
      if (!upstream.ok || data.status !== "OK") {
        sendJson(response, 502, { error: data.error_message || "Directions lookup failed." });
        return;
      }
      const distanceMeters = data.routes[0].legs.reduce((sum, leg) => sum + leg.distance.value, 0);
      const durationSeconds = data.routes[0].legs.reduce((sum, leg) => sum + leg.duration.value, 0);
      sendJson(response, 200, {
        distanceText: `${(distanceMeters / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })} km`,
        durationText: `${Math.round(durationSeconds / 3600)} hr ${(Math.round(durationSeconds / 60) % 60).toString().padStart(2, "0")} min`
      });
      return;
    }

    if (!apiKey) {
      sendJson(response, 503, { error: "The server is not configured with ANTHROPIC_API_KEY." });
      return;
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: payload.model || "claude-3-5-sonnet-latest",
        max_tokens: 1000,
        system: payload.system,
        messages: Array.isArray(payload.messages) ? payload.messages.slice(-8) : []
      })
    });

    const responseText = await upstream.text();
    response.writeHead(upstream.status, { "content-type": "application/json" });
    response.end(responseText);
  } catch (error) {
    sendJson(response, 400, { error: error.message });
  }
});

server.listen(port, () => {
  console.log(`Sancharakaya API proxy listening on http://localhost:${port}`);
});
