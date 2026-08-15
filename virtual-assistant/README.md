# Sancharakaya Gemini Travel Assistant

Sancharakaya uses a static frontend plus a Node.js backend that calls Google Gemini with server-side secrets.

## Local Development

1. Copy `.env.example` to `.env`.
2. Add a real Google AI Studio key:

```env
GEMINI_API_KEY=your-real-google-ai-studio-key
PORT=8787
ALLOWED_ORIGIN=http://localhost:8080
```

3. Start the backend from `virtual-assistant/`:

```powershell
npm start
```

4. Start the static main site from the repository root:

```powershell
python -m http.server 8080
```

5. Open `http://localhost:8080`.

Health checks:

- `http://localhost:8787/health`
- `http://localhost:8787/api/health`

## Production With GitHub Pages

GitHub Pages hosts only static files. It cannot run the Node/Gemini backend.

When `PRODUCTION_API_BASE_URL` is empty, the hosted assistant automatically runs in offline guide mode using the bundled Sri Lanka destination data. This keeps chat and Explore usable on GitHub Pages without exposing secrets.

Deploy `virtual-assistant/server` to a Node-capable host such as Render, Railway, Fly.io, a VPS, or another backend platform.

Set backend environment variables on that host:

```env
GEMINI_API_KEY=your-server-side-key
GEMINI_MODEL=gemini-3.6-flash
ALLOWED_ORIGIN=https://codejedix.github.io
RATE_LIMIT_PER_MINUTE=60
PORT=8787
```

Then edit `virtual-assistant/js/config.js` and set:

```js
PRODUCTION_API_BASE_URL: "https://your-deployed-backend.example.com"
```

Never use `http://localhost:8787` as the production backend URL.

## Security Rules

Never put `GEMINI_API_KEY` or `GOOGLE_API_KEY` in:

- HTML
- frontend JavaScript
- localStorage
- screenshots
- GitHub commits
- GitHub Pages configuration

Secrets belong only in local `.env` files or hosted backend environment variables.

## Features

- Gemini-powered AI guide with tool calling
- Session memory for traveler profile
- Grounded Sri Lanka destination retrieval
- Itinerary generation
- Budget allocation from user-supplied budget
- Open-Meteo weather
- Leaflet/OpenStreetMap trip map
- Nearby food and accommodation discovery through OpenStreetMap/Overpass
- Train, map, and ride handoff links
- Local saved places and shareable itinerary state

## Fallback Behavior

If the backend is not configured, offline chat, static destination search, saved places, and safety guidance remain usable. Live Gemini answers, weather, and nearby discovery require the deployed backend and internet access.
