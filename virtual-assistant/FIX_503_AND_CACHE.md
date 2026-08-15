# Fix for Gemini 503 and stale Anthropic message

## What was happening

1. Google Gemini returned HTTP 503 because the selected model was temporarily at high demand.
2. The browser service worker could keep an older `js/app.js` in cache, which is why an Anthropic-specific setup sentence could still appear even after migrating the backend to Gemini.

## What v1.2 changes

- Exponential retry with jitter for transient 408, 429 and 5xx responses.
- Model fallback: Gemini 2.5 Flash-Lite -> Gemini 2.5 Flash -> other compatible models.
- Grounded deterministic fallback for common weather/place/train/itinerary requests when Gemini capacity is temporarily unavailable.
- Service worker cache changed to `sancharakaya-gemini-v1.2`.
- Same-origin app shell uses network-first caching.
- JS and service-worker files are served with no-store during local serving.
- All frontend runtime error text now references `GEMINI_API_KEY`, never `ANTHROPIC_API_KEY`.

## First run after replacing an older build

1. Stop the old server.
2. Extract this project into a new folder.
3. Copy your `.env` into the new folder (do not share it).
4. Run `npm start`.
5. In Chrome, press **Ctrl+Shift+R**. If old Anthropic text still appears: **DevTools -> Application -> Service Workers -> Unregister**, then reload.
