# Sancharakaya — Full Sri Lanka AI Travel Agent

> **AI provider:** This build uses the Google Gemini API. It no longer requires an Anthropic/Claude API key. `GEMINI_API_KEY` is preferred, and `GOOGLE_API_KEY` is accepted as an alias. If `GEMINI_MODEL` is blank, the backend queries Google's Models API and selects an available Gemini text model automatically.


This ZIP is a **complete standalone project**, not a patch. It includes the frontend, Node.js backend, grounded Sri Lanka destination knowledge base, agent tool loop, session memory and the major competition-demo integrations.

## Included phases

| Phase | Feature | Included |
|---|---|---|
| 1 | Agentic chat + session memory | ✅ |
| 2 | Grounded destination retrieval | ✅ |
| 3 | Personalized recommendations | ✅ |
| 4 | Multi-day itinerary builder | ✅ |
| 5 | Heritage / culture / etiquette layer | ✅ |
| 6 | Destination images | ✅ Wikimedia Commons |
| 7 | Interactive map | ✅ Leaflet + OpenStreetMap |
| 8 | Live weather | ✅ Open-Meteo |
| 9 | Transport + train handoff | ✅ |
| 10 | Budget tool | ✅ uses traveler-supplied budget |
| 11 | Nearby food + accommodation discovery | ✅ OpenStreetMap / Overpass |
| 12 | English / Sinhala / Tamil response preference | ✅ |
| 13 | Hidden Gems mode | ✅ |
| 14 | Trip sharing + Print/Save PDF | ✅ |
| 15 | Ride handoff | ✅ User-confirmed Uber handoff + destination deep link |

## Fastest VS Code run

### 1. Requirements

- Node.js 18+
- Google Gemini API key
- Internet connection for Gemini, live weather, map tiles, images and nearby discovery

### 2. Create `.env`

Copy:

```text
.env.example
```

to:

```text
.env
```

Then edit `.env`:

```env
GEMINI_API_KEY=your-real-google-gemini-key-here
PORT=8787
```

Do not commit `.env` to GitHub.

### 3. Run

Open a VS Code terminal in this project folder:

```powershell
npm start
```

No `npm install` is required because this project uses only Node.js built-in modules.

You can also run:

```powershell
node server/index.js
```

### 4. Open

```text
http://localhost:8787
```

Health check:

```text
http://localhost:8787/api/health
```

## Test prompts

```text
I have 4 days from Colombo. We are a couple and love culture and photography.
```

Then ask:

```text
What should we do on our last day?
```

It should reuse the session context instead of asking again.

Live tools:

```text
What is the weather in Ella for the next few days?
```

```text
Find restaurants near Galle Fort.
```

```text
I want to travel to Kandy by train. Give me the correct next actions.
```

```text
My budget is LKR 15,000 per person per day for 5 days. How should I allocate it?
```

## Architecture

```text
Browser
  ├─ chat UI + session memory
  ├─ place cards + images
  ├─ Leaflet map
  ├─ itinerary / share / print-PDF
  └─ saved offline-friendly cards
        │
        ▼
Node.js API
        │
        ├─ Google Gemini function-calling agent
        │    ├─ save_traveler_context()
        │    ├─ search_places()
        │    ├─ get_place_details()
        │    ├─ get_weather()
        │    ├─ build_itinerary()
        │    ├─ find_nearby()
        │    ├─ estimate_budget()
        │    ├─ get_transport_options()
        │    ├─ open_train_schedule()
        │    └─ open_ride_app()
        │
        ├─ data/places.json
        ├─ Open-Meteo
        ├─ Wikimedia Commons
        ├─ OpenStreetMap / Overpass
        ├─ Google Maps URLs
        └─ Train / confirmed Uber handoffs
```

## Grounding rules

The agent is instructed not to invent:

- current attraction fees
- opening hours
- live hotel availability
- live restaurant availability
- current train times
- current transport fares
- current road travel times
- current weather

Destination facts are retrieved from `data/places.json`. Live weather comes from Open-Meteo. Nearby business names come from OpenStreetMap/Overpass. Transport and ride tools return action URLs rather than pretending to know live timing/pricing.

## Knowledge base

`data/places.json` contains 34 curated destinations covering cultural heritage, hill country, beaches, wildlife, northern Sri Lanka and hidden gems.

Each record contains:

- name, region and coordinates
- categories / traveler vibes
- visit-duration guidance
- heritage / cultural context
- etiquette
- safety notes
- transport notes
- source links
- hidden-gem flag

The current retriever is weighted local text retrieval. You can replace `searchPlaces()` in `server/kb.js` with Qdrant, pgvector, Pinecone or another vector database later without changing the frontend tool contract.

## Images

Destination card images are searched at runtime through Wikimedia Commons. If Wikimedia is unavailable, the UI shows a styled fallback card instead of failing the request.

## Weather

Weather uses Open-Meteo and grounded destination coordinates.

## Maps

The UI uses Leaflet + OpenStreetMap for the interactive map.

Direction buttons use Google Maps universal URLs, so a Google Maps API key is not required just to open directions.

## Nearby restaurants / accommodation

The `find_nearby` tool uses OpenStreetMap Overpass. These are discovery records only. Sancharakaya does not claim live opening status, availability, price, rating or endorsement.

If Overpass is unavailable, the tool returns a live Google Maps search link.

## Train integration

The agent can return:

```text
https://trainschedule.lk/
```

It does not invent train schedules.

## Ride integration

- Uber: destination-prefilled native deep link.
- Uber: uses the official Sri Lanka ride page for the web handoff and a mobile deep link for a destination-prefilled app handoff. Sancharakaya asks for confirmation before presenting the ride action.
- Google Maps directions are included as a fallback.

Test native ride links on real Android/iOS devices before production.

## Share / PDF / offline

- **Share link:** itinerary is encoded into the URL fragment.
- **PDF:** Itinerary → `Print / Save PDF`.
- **Offline:** app shell is cached by a service worker; saved place cards remain in localStorage. AI/weather/maps still need internet.

## Deployment

GitHub Pages cannot run the Node backend by itself.

For the simplest production deployment, host the whole repository on Render, Railway, Fly.io, a VPS or similar Node-capable service, set `GEMINI_API_KEY` as a server-side environment variable, then use:

```text
npm start
```

If you keep the frontend on GitHub Pages, deploy the backend separately and edit `js/config.js`:

```js
window.SANCHARAKAYA_CONFIG = {
  API_BASE_URL: "https://YOUR-BACKEND-DOMAIN"
};
```

Then set `ALLOWED_ORIGIN` on the backend to the frontend origin.

## Self-test

Run:

```powershell
npm test
```

This checks the local knowledge base, retrieval, hidden-gem matching, itinerary generation and budget math without making paid API calls.

## Security

Never put `GEMINI_API_KEY` in:

- `index.html`
- `js/app.js`
- `js/config.js`
- GitHub commits
- screenshots
- chat messages

Keep it only in `.env` locally or in your hosting provider's secret/environment-variable settings.

## Gemini 503 / high-demand resilience (v1.2)

This build automatically:

- retries transient 408/429/5xx Gemini errors with exponential backoff and jitter;
- prefers `gemini-2.5-flash-lite`, then falls back to `gemini-2.5-flash`;
- can try additional compatible models returned by the Google Models API;
- keeps common weather, destination, train and itinerary functions available through deterministic tools if Gemini is temporarily unavailable;
- uses a new service-worker cache version to prevent old Claude/Anthropic UI text from surviving an upgrade.

If you previously ran the Claude build on the same `localhost:8787`, clear/unregister the old service worker once or use a hard reload.
