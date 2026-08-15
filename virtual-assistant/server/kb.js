const fs = require("node:fs");
const path = require("node:path");

const places = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "places.json"), "utf8"));

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
}
function words(value) { return normalize(value).split(" ").filter(token => token.length > 2); }
function unique(values) { return [...new Set((values || []).filter(Boolean))]; }
function placeText(place) {
  return normalize([place.name, place.region, place.district, ...(place.categories || []),
    ...(place.vibes || []), place.summary, place.heritage_culture].join(" "));
}
function scorePlace(place, query = {}) {
  const haystack = placeText(place);
  const queryText = normalize(query.query);
  const categories = unique(query.categories || query.interests || []).map(normalize);
  const vibes = unique(query.vibes || []).map(normalize);
  const region = normalize(query.region);
  let score = 0;

  if (queryText) {
    const name = normalize(place.name);
    if (name === queryText) score += 50;
    else if (name.includes(queryText) || queryText.includes(name)) score += 24;
    for (const token of words(queryText)) {
      if (name.includes(token)) score += 8;
      else if (haystack.includes(token)) score += 3;
    }
  }
  for (const item of [...categories, ...vibes]) {
    if ((place.categories || []).map(normalize).includes(item)) score += 10;
    else if ((place.vibes || []).map(normalize).includes(item)) score += 9;
    else if (haystack.includes(item)) score += 3;
  }
  if (region && region !== "auto") {
    if (normalize(place.region).includes(region) || region.includes(normalize(place.region))) score += 16;
    else score -= 2;
  }
  if (query.hidden_gems === true) score += place.hidden_gem ? 16 : -2;
  if (query.hidden_gems === false && !place.hidden_gem) score += 2;
  if (!queryText && !categories.length && !vibes.length && !region) score = 1;
  return score;
}
function searchPlaces(query = {}) {
  const limit = Math.max(1, Math.min(12, Number(query.limit || 6)));
  const ranked = places.map(place => ({ place, score: scorePlace(place, query) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name))
    .slice(0, limit).map(item => ({ ...item.place, retrieval_score: item.score }));
  return { count: ranked.length, matches: ranked, grounding: "Curated Sancharakaya destination knowledge base (data/places.json)." };
}
function getPlace(value) {
  const key = normalize(value);
  if (!key) return null;
  return places.find(place => normalize(place.id) === key || normalize(place.name) === key ||
    normalize(place.name).includes(key) || key.includes(normalize(place.name))) || null;
}
function toRad(value) { return value * Math.PI / 180; }
function distanceKm(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const R = 6371, dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
  const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
const START_POINTS = [
  { keys:["colombo","cmb city"], coordinates:{lat:6.9271,lng:79.8612} },
  { keys:["airport","bandaranaike","katunayake","cmb"], coordinates:{lat:7.1808,lng:79.8841} },
  { keys:["kandy"], coordinates:{lat:7.2906,lng:80.6337} },
  { keys:["galle"], coordinates:{lat:6.0329,lng:80.2168} },
  { keys:["ella"], coordinates:{lat:6.8667,lng:81.0466} },
  { keys:["jaffna"], coordinates:{lat:9.6615,lng:80.0255} }
];
function resolveStartCoordinates(startingLocation) {
  const text = normalize(startingLocation);
  const known = START_POINTS.find(item => item.keys.some(key => text.includes(key)));
  return known?.coordinates || {lat:6.9271,lng:79.8612};
}
function buildItinerary(input = {}) {
  const days = Math.max(1, Math.min(21, Number(input.days || 5)));
  const requestedIds = Array.isArray(input.place_ids) ? input.place_ids : [];
  let candidates = requestedIds.length
    ? requestedIds.map(getPlace).filter(Boolean)
    : searchPlaces({ query:input.query||"", interests:input.interests||[], vibes:input.vibes||[],
        region:input.region||"", hidden_gems:input.hidden_gems===true, limit:Math.max(days+8,12)}).matches;

  if (!candidates.length) candidates = places.filter(place => !place.hidden_gem).slice(0, Math.max(days,6));
  const selected = [], remaining = [...new Map(candidates.map(p => [p.id,p])).values()];
  let cursor = resolveStartCoordinates(input.starting_location);

  while (remaining.length && selected.length < days) {
    remaining.sort((a,b)=>distanceKm(cursor,a.coordinates)-distanceKm(cursor,b.coordinates));
    const next = remaining.shift(); selected.push(next); cursor = next.coordinates;
  }
  if (selected.length < days) {
    for (const extra of places.filter(place => !selected.some(item => item.id===place.id))) {
      if (selected.length >= days) break; selected.push(extra);
    }
  }
  const plan = selected.slice(0,days).map((place,index)=>({
    day:index+1, place_id:place.id, name:place.name, region:place.region, coordinates:place.coordinates,
    focus:place.categories.slice(0,3), suggested_visit_duration:`${place.visit_duration_hours} hours`,
    best_time_of_day:place.best_time_of_day, why_it_fits:place.summary, culture_note:place.heritage_culture,
    etiquette:place.etiquette.slice(0,2), safety:place.safety.slice(0,2)
  }));
  return { days, starting_location:input.starting_location||"Colombo", plan,
    route:plan.map(item=>item.name),
    note:"Built from the grounded destination dataset and geographic proximity. Verify live road/train times, closures and availability." };
}
function budgetFromUserInput(input = {}) {
  const days=Math.max(1,Math.min(60,Number(input.days||1)));
  const groupSize=Math.max(1,Math.min(50,Number(input.group_size||1)));
  const daily=Number(input.daily_budget_lkr||0);
  if (!Number.isFinite(daily)||daily<=0) return {available:false,message:"A user-supplied daily budget in LKR is required. Sancharakaya does not invent current market prices."};
  const total=Math.round(daily*days*groupSize);
  const shares={accommodation:.40,transport:.20,food:.20,activities:.15,buffer:.05};
  return {available:true,currency:"LKR",days,group_size:groupSize,daily_budget_per_person:daily,
    trip_budget_envelope:total,
    suggested_allocation:Object.fromEntries(Object.entries(shares).map(([k,s])=>[k,Math.round(total*s)])),
    note:"Allocation of the traveler-supplied budget, not a live market-price estimate."};
}
module.exports={places,normalize,searchPlaces,getPlace,buildItinerary,budgetFromUserInput,resolveStartCoordinates};
