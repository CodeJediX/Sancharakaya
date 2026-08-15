const { GEMINI_API_KEY, GEMINI_MODEL } = require("./config");
const { searchPlaces, getPlace, buildItinerary, budgetFromUserInput } = require("./kb");
const {
  getWeather,
  findNearby,
  trainScheduleAction,
  rideActions,
  transportActions,
  enrichPlacesWithImages
} = require("./integrations");

const MEMORY_FIELDS = new Set([
  "starting_location", "days", "budget_style", "daily_budget_lkr", "group_type",
  "group_size", "vibes", "interests", "travel_dates", "transport_preference",
  "language", "hidden_gems", "accessibility_needs", "pending_ride_destination"
]);

let modelCache = { values: [], expires: 0 };

const STATIC_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function uniqueModels(models = []) {
  return [...new Set(
    models
      .map(normalizeModelName)
      .filter(Boolean)
  )];
}

function mergeMemory(current = {}, update = {}) {
  const next = { ...(current || {}) };
  for (const [key, value] of Object.entries(update || {})) {
    if (!MEMORY_FIELDS.has(key) || value === undefined || value === null || value === "") continue;

    if (["days", "group_size", "daily_budget_lkr"].includes(key)) {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed > 0) next[key] = parsed;
    } else if (["vibes", "interests", "accessibility_needs"].includes(key)) {
      const list = Array.isArray(value) ? value : [value];
      next[key] = [...new Set(list.map(x => String(x).trim()).filter(Boolean))];
    } else if (key === "hidden_gems") {
      next[key] = Boolean(value);
    } else {
      next[key] = value;
    }
  }
  return next;
}

function normalizeModelName(name) {
  return String(name || "").replace(/^models\//, "").trim();
}

function modelScore(model) {
  const name = normalizeModelName(model?.name || model?.baseModelId || "").toLowerCase();
  const display = String(model?.displayName || "").toLowerCase();
  const text = `${name} ${display}`;

  if (!/gemini/.test(text)) return -1000;

  // Exclude model families that are not appropriate for this text + function-calling agent.
  if (
    /embedding|imagen|image|video|veo|tts|robotics|live|native-audio|audio-native|computer-use|deep-research/.test(text)
  ) {
    return -1000;
  }

  let score = 0;

  // Prefer Flash for a responsive travel assistant.
  if (/flash-lite|flash lite/.test(text)) score += 125;
  else if (/flash/.test(text)) score += 140;
  if (/pro/.test(text)) score += 70;

  // Prefer stable model IDs over preview / experimental variants.
  if (!/preview|experimental|exp/.test(text)) score += 40;
  else score -= 30;

  if (/latest/.test(text)) score += 5;

  // Prefer newer generations when Google exposes them to this API key.
  const version = name.match(/gemini-(\d+(?:\.\d+)?)/)?.[1];
  if (version) score += Number(version) * 25;

  return score;
}

async function fetchAvailableModels() {
  if (modelCache.values.length && modelCache.expires > Date.now()) {
    return modelCache.values;
  }

  if (!GEMINI_API_KEY) return [];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(GEMINI_API_KEY)}&pageSize=1000`
    );

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data?.error?.message || `Google Models API HTTP ${response.status}.`);
      error.status = response.status;
      throw error;
    }

    const discovered = (data.models || [])
      .filter(model => (model.supportedGenerationMethods || []).includes("generateContent"))
      .map(model => ({ ...model, score: modelScore(model) }))
      .filter(model => model.score > -1000)
      .sort((a, b) => b.score - a.score)
      .map(model => normalizeModelName(model.name))
      .filter(Boolean);

    // GEMINI_MODEL is a preference, not a single point of failure.
    const ordered = uniqueModels([
      GEMINI_MODEL,
      ...discovered,
      ...STATIC_FALLBACK_MODELS
    ]);

    modelCache = {
      values: ordered,
      expires: Date.now() + 10 * 60 * 1000
    };

    return ordered;
  } catch (error) {
    console.warn(`[Gemini] Could not list models: ${error.message}`);

    // We can still try configured / known stable models if the Models API itself is unavailable.
    return uniqueModels([
      GEMINI_MODEL,
      ...STATIC_FALLBACK_MODELS
    ]);
  }
}

async function resolveModel() {
  const models = await fetchAvailableModels();
  return models[0] || null;
}

function toolDefinitions() {
  return [
    {
      name: "save_traveler_context",
      description: "Save only traveler information explicitly stated or changed. Use when the user gives trip days, starting point, group, interests, vibe, budget, dates, language, transport preference, hidden-gems preference or accessibility needs. Never invent missing values.",
      parameters: {
        type: "OBJECT",
        properties: {
          starting_location: { type: "STRING" },
          days: { type: "INTEGER" },
          budget_style: { type: "STRING" },
          daily_budget_lkr: { type: "NUMBER" },
          group_type: { type: "STRING" },
          group_size: { type: "INTEGER" },
          vibes: { type: "ARRAY", items: { type: "STRING" } },
          interests: { type: "ARRAY", items: { type: "STRING" } },
          travel_dates: { type: "STRING" },
          transport_preference: { type: "STRING" },
          language: { type: "STRING" },
          hidden_gems: { type: "BOOLEAN" },
          accessibility_needs: { type: "ARRAY", items: { type: "STRING" } },
          pending_ride_destination: {
            type: "STRING",
            description: "Destination remembered only while waiting for the traveler to confirm an Uber handoff."
          }
        }
      }
    },
    {
      name: "search_places",
      description: "Search the curated Sancharakaya Sri Lanka destination knowledge base. MUST be used for destination recommendations and factual place/history/culture claims. If no match exists, say the database has no verified match rather than fabricating.",
      parameters: {
        type: "OBJECT",
        properties: {
          query: { type: "STRING" },
          categories: { type: "ARRAY", items: { type: "STRING" } },
          vibes: { type: "ARRAY", items: { type: "STRING" } },
          region: { type: "STRING" },
          hidden_gems: { type: "BOOLEAN" },
          limit: { type: "INTEGER" }
        }
      }
    },
    {
      name: "get_place_details",
      description: "Get the complete grounded record for one destination. Use before detailed heritage, etiquette, safety or transport guidance about a named place.",
      parameters: { type: "OBJECT", properties: { place: { type: "STRING" } }, required: ["place"] }
    },
    {
      name: "get_weather",
      description: "Get current conditions and a 5-day forecast using Open-Meteo. Use for current or near-term weather; never infer live weather yourself.",
      parameters: { type: "OBJECT", properties: { place: { type: "STRING" } }, required: ["place"] }
    },
    {
      name: "build_itinerary",
      description: "Build a grounded multi-day Sri Lanka route from the curated destination dataset. Use whenever the user asks for a trip plan or itinerary.",
      parameters: {
        type: "OBJECT",
        properties: {
          days: { type: "INTEGER" },
          starting_location: { type: "STRING" },
          interests: { type: "ARRAY", items: { type: "STRING" } },
          vibes: { type: "ARRAY", items: { type: "STRING" } },
          region: { type: "STRING" },
          hidden_gems: { type: "BOOLEAN" },
          place_ids: { type: "ARRAY", items: { type: "STRING" } },
          query: { type: "STRING" }
        },
        required: ["days"]
      }
    },
    {
      name: "find_nearby",
      description: "Discover nearby named restaurants or accommodation around a grounded destination using OpenStreetMap/Overpass. Results are discovery only; never claim live prices or availability.",
      parameters: {
        type: "OBJECT",
        properties: {
          place: { type: "STRING" },
          kind: { type: "STRING", enum: ["restaurant", "accommodation"] },
          radius_m: { type: "INTEGER" }
        },
        required: ["place", "kind"]
      }
    },
    {
      name: "estimate_budget",
      description: "Allocate a traveler-supplied daily LKR budget. This does NOT estimate current market prices. Use only when daily budget is known.",
      parameters: {
        type: "OBJECT",
        properties: {
          days: { type: "INTEGER" },
          group_size: { type: "INTEGER" },
          daily_budget_lkr: { type: "NUMBER" }
        },
        required: ["days", "group_size", "daily_budget_lkr"]
      }
    },
    {
      name: "get_transport_options",
      description: "Return grounded transport notes plus Google Maps direction links and train handoff when available. Use instead of inventing fares or travel durations.",
      parameters: {
        type: "OBJECT",
        properties: {
          destination: { type: "STRING" },
          starting_location: { type: "STRING" }
        },
        required: ["destination"]
      }
    },
    {
      name: "open_train_schedule",
      description: "Return the train schedule handoff URL when the traveler wants rail travel. Never invent train times or seat availability.",
      parameters: {
        type: "OBJECT",
        properties: { from: { type: "STRING" }, to: { type: "STRING" } }
      }
    },
    {
      name: "open_ride_app",
      description: "Create an Uber handoff ONLY after the traveler explicitly confirms that they want Uber, for example yes, okay, sure, open Uber, or book Uber. Use the confirmed destination from the current request or pending_ride_destination in session memory. This tool only opens Uber; it does not book, pay for, or confirm a ride.",
      parameters: {
        type: "OBJECT",
        properties: {
          destination: {
            type: "STRING",
            description: "Confirmed ride destination. If omitted, the server will use pending_ride_destination from session memory."
          },
          starting_location: {
            type: "STRING",
            description: "Known starting or pickup area when available."
          }
        }
      }
    }
  ];
}

function systemPrompt(memory) {
  return `You are Sancharakaya (සංචාරකයා), a warm, locally aware AI travel agent for Sri Lanka.

CURRENT SESSION MEMORY:
${JSON.stringify(memory || {}, null, 2)}

RULES:
1. Never re-ask information already in session memory.
2. Ask only the minimum missing questions that materially change the answer; usually 0–3.
3. For place recommendations or factual place/history/culture claims, use search_places or get_place_details first.
4. Never invent current prices, opening hours, entry fees, train times, weather, business availability, hotel prices or travel duration.
5. If the grounded database has no verified match, say so plainly.
6. If the traveler states or changes preferences, call save_traveler_context.
7. For current weather, call get_weather.
8. For itineraries, call build_itinerary and explain that live route timing must be verified.
9. For food/stays, call find_nearby and label results as discovery, not endorsements or availability.
10. For transport use get_transport_options/open_train_schedule/open_ride_app instead of guessing.
11. Budget calculations must use the traveler’s own daily budget.
12. Explain religious etiquette where relevant and encourage responsible wildlife/tourism behaviour.
13. Reply in ${memory?.language || "English"}. Keep place names recognisable in English when useful.
14. If enough information is known, act instead of forcing a questionnaire.
15. When Uber would be useful, DO NOT immediately call open_ride_app.
16. First save the intended ride destination with save_traveler_context using pending_ride_destination, then ask: "Would you like me to open Uber for this ride?"
17. Only call open_ride_app after the traveler explicitly confirms with something such as "yes", "okay", "sure", "open Uber", "book Uber", or another clear confirmation.
18. If the user's confirmation is only "yes" or another short confirmation, use pending_ride_destination from session memory. Do not ask for the destination again when it is already known.
19. open_ride_app is only a handoff to Uber. Never say Sancharakaya booked, paid for, reserved, or confirmed the ride.
20. After open_ride_app succeeds, tell the traveler to use the displayed "Open Uber" button and verify pickup, destination, vehicle and fare inside Uber before confirming.

STYLE: friendly Sri Lankan guide, concise but useful. For recommendations explain fit. For itineraries give a clear day-by-day summary. Mention action buttons when the UI provides them.`;
}

function toGeminiContents(messages = []) {
  return messages
    .filter(m => m && (m.role === "user" || m.role === "assistant" || m.role === "model"))
    .map(m => ({
      role: m.role === "assistant" ? "model" : m.role,
      parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }]
    }));
}

function extractCandidate(data) {
  const candidate = data?.candidates?.[0];
  if (!candidate?.content) {
    const blocked = data?.promptFeedback?.blockReason;
    if (blocked) throw new Error(`Gemini blocked the request: ${blocked}.`);
    throw new Error("Gemini returned no candidate response.");
  }
  return candidate;
}

class GeminiApiError extends Error {
  constructor(message, { status = 0, model = "", payload = null, cause = null } = {}) {
    super(message);
    this.name = "GeminiApiError";
    this.status = Number(status) || 0;
    this.model = normalizeModelName(model);
    this.payload = payload;
    this.retryable = this.status === 0 || RETRYABLE_STATUS_CODES.has(this.status);
    if (cause) this.cause = cause;
  }
}

async function callGemini(model, contents, memory) {
  const normalizedModel = normalizeModelName(model);

  if (!normalizedModel) {
    throw new GeminiApiError("No Gemini model name was provided.");
  }

  const modelPath = `models/${normalizedModel}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  let response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(memory) }] },
        contents,
        tools: [{ functionDeclarations: toolDefinitions() }],
        toolConfig: { functionCallingConfig: { mode: "AUTO" } },
        generationConfig: {
          maxOutputTokens: 2500,
          temperature: 0.3
        }
      })
    });
  } catch (error) {
    const message =
      error?.name === "AbortError"
        ? `Google Gemini request timed out for ${normalizedModel}.`
        : `Google Gemini network request failed for ${normalizedModel}: ${error.message}`;

    throw new GeminiApiError(message, {
      status: error?.name === "AbortError" ? 408 : 0,
      model: normalizedModel,
      cause: error
    });
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();
  let data = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new GeminiApiError(
        `Google Gemini returned non-JSON HTTP ${response.status} for ${normalizedModel}.`,
        {
          status: response.status,
          model: normalizedModel,
          payload: raw.slice(0, 1000)
        }
      );
    }
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `Google Gemini HTTP ${response.status} for ${normalizedModel}.`;

    throw new GeminiApiError(message, {
      status: response.status,
      model: normalizedModel,
      payload: data
    });
  }

  return data;
}

async function callGeminiWithRetry(model, contents, memory, maxAttempts = 4) {
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      console.log(
        `[Gemini] Trying ${normalizeModelName(model)} - attempt ${attempt + 1}/${maxAttempts}`
      );

      return await callGemini(model, contents, memory);
    } catch (error) {
      lastError = error;

      console.warn(
        `[Gemini] ${normalizeModelName(model)} failed` +
        `${error.status ? ` (HTTP ${error.status})` : ""}: ${error.message}`
      );

      if (!error.retryable || attempt === maxAttempts - 1) {
        throw error;
      }

      // Exponential backoff: ~1s, ~2s, ~4s, with a small random jitter.
      const baseDelay = Math.min(8000, 1000 * (2 ** attempt));
      const jitter = Math.floor(Math.random() * 500);
      const delay = baseDelay + jitter;

      console.log(`[Gemini] Retrying in ${delay} ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

async function callGeminiAcrossModels(models, contents, memory, preferredModel = null) {
  const ordered = uniqueModels([
    preferredModel,
    GEMINI_MODEL,
    ...(models || []),
    ...STATIC_FALLBACK_MODELS
  ]);

  if (!ordered.length) {
    throw new Error("No compatible Google Gemini model is available.");
  }

  let lastError = null;

  for (const model of ordered) {
    try {
      const data = await callGeminiWithRetry(model, contents, memory, 4);
      console.log(`[Gemini] Success with model: ${model}`);
      return { data, model };
    } catch (error) {
      lastError = error;

      const status = Number(error?.status) || 0;
      const canTryAnotherModel =
        status === 0 ||
        status === 404 ||
        status === 408 ||
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504;

      if (!canTryAnotherModel) {
        // 400/401/403 usually mean request/API-key/permission problems.
        // Trying every model would only hide the actual configuration error.
        throw error;
      }

      console.warn(
        `[Gemini] Switching model after ${model} failed` +
        `${status ? ` with HTTP ${status}` : ""}.`
      );
    }
  }

  throw lastError || new Error("All compatible Gemini models failed.");
}

function extractText(parts = []) {
  return parts.filter(p => typeof p.text === "string").map(p => p.text).join("\n").trim();
}

function dedupe(items, key = "place_id") {
  const seen = new Set();
  return (items || []).filter(item => {
    const value = item?.[key] || item?.id || JSON.stringify(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function hasExplicitRideConfirmation(text = "") {
  const normalized = String(text || "").trim().toLowerCase();

  // Short confirmations after Sancharakaya has already offered the ride.
  if (/^(yes|yeah|yep|yup|ok|okay|sure|please|go ahead|do it|yes please|okay please)[.! ]*$/.test(normalized)) {
    return true;
  }

  // Explicit Uber requests also count as confirmation.
  return /\b(open|book|get|use|take|call|launch)\b.*\buber\b|\buber\b.*\b(open|book|get|please|yes|okay|sure)\b/.test(normalized);
}

async function execute(functionCall, state) {
  const name = functionCall.name;
  const i = functionCall.args || {};

  switch (name) {
    case "save_traveler_context":
      state.memory = mergeMemory(state.memory, i);
      return { ok: true, memory: state.memory };

    case "search_places": {
      const result = searchPlaces(i);
      state.places.push(...result.matches);
      return result;
    }

    case "get_place_details": {
      const place = getPlace(i.place);
      if (!place) return { error: "No verified record exists for that place." };
      state.places.push(place);
      return place;
    }

    case "get_weather": {
      const result = await getWeather(i.place);
      if (!result.error) state.weather.push(result);
      return result;
    }

    case "build_itinerary": {
      const result = buildItinerary({
        ...i,
        starting_location: i.starting_location || state.memory.starting_location,
        interests: i.interests?.length ? i.interests : state.memory.interests,
        vibes: i.vibes?.length ? i.vibes : state.memory.vibes,
        hidden_gems: i.hidden_gems ?? state.memory.hidden_gems
      });
      state.itinerary = result;
      for (const day of result.plan || []) {
        const place = getPlace(day.place_id);
        if (place) state.places.push(place);
      }
      return result;
    }

    case "find_nearby": {
      const result = await findNearby(i.place, i.kind, i.radius_m);
      state.nearby.push(result);
      return result;
    }

    case "estimate_budget": {
      const result = budgetFromUserInput(i);
      state.budget = result;
      return result;
    }

    case "get_transport_options": {
      const result = transportActions(
        i.destination,
        i.starting_location || state.memory.starting_location || ""
      );
      state.actions.push({ type: "transport", ...result });
      return result;
    }

    case "open_train_schedule": {
      const result = trainScheduleAction(i.from, i.to);
      state.actions.push(result);
      return result;
    }

    case "open_ride_app": {
      // Enforce confirmation on the server too; do not rely only on the model prompt.
      if (!hasExplicitRideConfirmation(state.last_user_text)) {
        return {
          error:
            "Explicit traveler confirmation is required before opening Uber. Ask: Would you like me to open Uber for this ride?"
        };
      }

      const destination =
        i.destination ||
        state.memory.pending_ride_destination;

      if (!destination) {
        return {
          error: "No confirmed Uber destination is available. Ask the traveler which destination they want first."
        };
      }

      const startingLocation =
        i.starting_location ||
        state.memory.starting_location ||
        "";

      const result = rideActions(
        destination,
        startingLocation
      );

      if (result?.error) {
        return result;
      }

      state.actions.push({
        type: "ride",
        ...result
      });

      // The confirmation has now been consumed.
      delete state.memory.pending_ride_destination;

      return result;
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function runAgent({ messages = [], memory = {} }) {
  if (!GEMINI_API_KEY) {
    return {
      error: "GEMINI_API_KEY (or GOOGLE_API_KEY) is not configured.",
      code: "AI_NOT_CONFIGURED"
    };
  }

  const availableModels = await fetchAvailableModels();

  if (!availableModels.length) {
    throw new Error("No compatible Google Gemini generateContent model is available.");
  }

  const state = {
    memory: mergeMemory({}, memory),
    places: [],
    weather: [],
    nearby: [],
    actions: [],
    itinerary: null,
    budget: null,
    last_user_text:
      [...(Array.isArray(messages) ? messages : [])]
        .reverse()
        .find(message => message?.role === "user")?.content || ""
  };

  let contents = toGeminiContents(
    Array.isArray(messages) ? messages.slice(-18) : []
  );

  // After the first successful call, prefer the same model for subsequent
  // tool rounds. If it becomes temporarily unavailable, the fallback logic
  // can move to another compatible Gemini model.
  let activeModel = normalizeModelName(GEMINI_MODEL) || null;

  for (let round = 0; round < 8; round += 1) {
    const result = await callGeminiAcrossModels(
      availableModels,
      contents,
      state.memory,
      activeModel
    );

    const data = result.data;
    activeModel = result.model;

    const candidate = extractCandidate(data);
    const modelContent = candidate.content;
    const parts = modelContent.parts || [];
    const calls = parts
      .filter(part => part.functionCall)
      .map(part => part.functionCall);

    if (!calls.length) {
      const uniquePlaces = [...new Map(
        state.places.map(place => [place.id, place])
      ).values()];

      const places = await enrichPlacesWithImages(uniquePlaces, 6);

      return {
        text: extractText(parts) || "I could not produce a response.",
        memory: state.memory,
        places,
        itinerary: state.itinerary,
        weather: dedupe(state.weather),
        nearby: state.nearby,
        actions: state.actions,
        budget: state.budget,
        model: activeModel,
        provider: "Google Gemini",
        stop_reason: candidate.finishReason || null
      };
    }

    // Preserve the model's complete parts, including any thought signatures
    // attached by Gemini to function-call turns.
    contents.push({
      role: "model",
      parts
    });

    const functionResponseParts = [];

    for (const call of calls) {
      let output;

      try {
        output = await execute(call, state);
      } catch (error) {
        output = { error: error.message };
      }

      functionResponseParts.push({
        functionResponse: {
          name: call.name,
          response:
            output && typeof output === "object"
              ? output
              : { result: output }
        }
      });
    }

    contents.push({
      role: "user",
      parts: functionResponseParts
    });
  }

  return {
    text: "I reached the tool-use safety limit. Please narrow the request slightly.",
    memory: state.memory,
    places: await enrichPlacesWithImages(
      [...new Map(state.places.map(place => [place.id, place])).values()],
      6
    ),
    itinerary: state.itinerary,
    weather: dedupe(state.weather),
    nearby: state.nearby,
    actions: state.actions,
    budget: state.budget,
    model: activeModel,
    provider: "Google Gemini",
    stop_reason: "tool_loop_limit"
  };
}

module.exports = { runAgent, resolveModel, mergeMemory, fetchAvailableModels };
