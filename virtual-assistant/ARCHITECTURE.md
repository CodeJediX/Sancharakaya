# Agent Architecture

## Request lifecycle

1. The browser sends recent conversation messages plus session memory to `/api/agent/chat`.
2. If `GEMINI_MODEL` is blank, the server calls Google's Gemini Models API and selects an available Gemini text model, preferring Flash-class models for speed/cost.
3. Gemini receives the current session memory and the Sancharakaya tool definitions.
4. When Gemini emits a `functionCall`, the Node server executes that function.
5. The server sends the result back as `tool_result`.
6. The loop continues until Gemini returns a normal final answer.
7. Retrieved destination records are enriched with Wikimedia Commons images when available.
8. The UI renders the answer, place cards, weather cards, map pins, itinerary and action buttons.

## Tool boundary

Model reasoning is allowed, but these claims/actions are grounded:

- place/history/culture → `data/places.json`
- current weather → Open-Meteo
- nearby businesses → OpenStreetMap / Overpass
- route navigation → Google Maps action URL
- trains → schedule handoff
- ride request → external ride-app handoff
- budget → traveler-supplied amount only

## Upgrading retrieval

Replace `searchPlaces()` in `server/kb.js` with a vector database implementation.

Keep the output contract:

```json
{
  "count": 3,
  "matches": [{"id":"sigiriya","name":"Ancient City of Sigiriya"}],
  "grounding": "..."
}
```

The frontend and agent tool schema can remain unchanged.
