    let lastResult = null;
    let lastParams = null;
    let chatHistory = [];

    function init() {
      setDefaultDate();
      bindTabs();
      bindPlanner();
      bindChat();
      bindPrices();
      bindSetup();
      bindDemo();
      bindTheme();
      renderPrices();
      renderSafety();
      renderSustainability();
      renderPersonas();
      renderRoadmap();
      loadClaudeSettings();
      updateChatStatus();
      addMessage("bot", "Hello! I am Sancharakaya (සංචාරකයා). I can help with itineraries, fair prices, safety, transport, seasons, food, and sustainable travel in Sri Lanka.");
    }

    function setDefaultDate() {
      const dateInput = document.getElementById("startDate");
      const today = new Date().toISOString().split("T")[0];
      dateInput.value = today;
    }

    function bindTabs() {
      document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => activateTab(btn.dataset.tab));
      });
    }

    function activateTab(tabId) {
      document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabId);
      });

      document.querySelectorAll("main > section").forEach(sec => {
        sec.classList.toggle("hidden", sec.id !== tabId);
      });
    }

    function bindPlanner() {
      document.getElementById("generateBtn").addEventListener("click", generateItinerary);
      document.getElementById("makeTripBtn").addEventListener("click", toggleCustomTripBuilder);
      document.getElementById("customGoBtn").addEventListener("click", generateCustomItinerary);
      document.getElementById("persona").addEventListener("change", (e) => applyPersona(e.target.value));
    }

    function toggleCustomTripBuilder() {
      const builder = document.getElementById("customTripBuilder");
      builder.classList.toggle("hidden");
      if (!builder.classList.contains("hidden")) {
        renderCustomTripDays();
        builder.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function renderCustomTripDays() {
      const days = Math.max(1, Math.min(21, parseInt(document.getElementById("days").value || "7", 10)));
      const currentPlan = lastResult?.plan || [];
      document.getElementById("customTripDays").innerHTML = Array.from({ length: days }, (_, index) => {
        const current = currentPlan[index]?.title || locationCatalog[index % locationCatalog.length].title;
        return `
          <label class="custom-day-choice">
            <span><b>Day ${index + 1}</b><small>${addDays(document.getElementById("startDate").value, index)}</small></span>
            <select data-custom-day="${index}">${locationCatalog.map(location => `
              <option value="${location.title}" ${location.title === current ? "selected" : ""}>${location.title} · ${location.region}</option>
            `).join("")}</select>
          </label>
        `;
      }).join("");
    }

    function applyPersona(personaName) {
      const preset = personaPresets[personaName];
      if (!preset) return;

      document.getElementById("budget").value = preset.budget;
      setInterests(preset.interests);
    }

    function setInterests(values) {
      document.querySelectorAll(".interest").forEach(box => {
        box.checked = values.includes(box.value);
      });
    }

    async function generateItinerary() {
      const days = Math.max(1, Math.min(21, parseInt(document.getElementById("days").value || "7", 10)));
      const startDate = document.getElementById("startDate").value;
      const startLocation = document.getElementById("startLocation").value.trim() || "Bandaranaike International Airport (CMB)";
      const persona = document.getElementById("persona").value;
      const budget = document.getElementById("budget").value;
      const pace = document.getElementById("pace").value;
      const group = Math.max(1, parseInt(document.getElementById("groupSize").value || "1", 10));
      const region = document.getElementById("region").value;
      const interests = Array.from(document.querySelectorAll(".interest:checked")).map(i => i.value);

      const params = {
        days,
        startDate,
        startLocation,
        persona,
        budget,
        pace,
        group,
        region,
        interests: interests.length ? interests : ["culture", "nature", "food"]
      };

      lastParams = params;
      lastResult = buildItinerary(params);
      renderItinerary(lastResult, params);
      setStatus("Itinerary generated. Loading route, live exchange rate, hotels, and sources...");
      await loadItineraryServices(lastResult, params);
    }

    async function generateCustomItinerary() {
      const params = readPlannerParams();
      const selections = Array.from(document.querySelectorAll("[data-custom-day]")).map(select => select.value);
      if (!selections.length) {
        document.getElementById("customTripStatus").textContent = "Choose at least one destination.";
        return;
      }

      lastParams = { ...params, days: selections.length, customSelections: selections };
      lastResult = buildCustomItinerary(lastParams, selections);
      renderItinerary(lastResult, lastParams);
      setStatus("Custom route generated. Recalculating map, hotels, and distance...");
      document.getElementById("customTripStatus").textContent = "Route rebuilt from your selections.";
      await loadItineraryServices(lastResult, lastParams);
    }

    function readPlannerParams() {
      const interests = Array.from(document.querySelectorAll(".interest:checked")).map(i => i.value);
      return {
        days: Math.max(1, Math.min(21, parseInt(document.getElementById("days").value || "7", 10))),
        startDate: document.getElementById("startDate").value,
        startLocation: document.getElementById("startLocation").value.trim() || "Bandaranaike International Airport (CMB)",
        persona: document.getElementById("persona").value,
        budget: document.getElementById("budget").value,
        pace: document.getElementById("pace").value,
        group: Math.max(1, parseInt(document.getElementById("groupSize").value || "1", 10)),
        region: document.getElementById("region").value,
        interests: interests.length ? interests : ["culture", "nature", "food"]
      };
    }

    function buildCustomItinerary(params, selections) {
      const plan = selections.map((title, index) => {
        const location = locationCatalog.find(item => item.title === title) || locationCatalog[0];
        const source = findLocationTemplate(location);
        return {
          ...source,
          title: location.title,
          region: location.region,
          day: index + 1,
          budgetEstimate: calculateCost(source.cost || regionPlans[location.region]?.baseCost || 45, params.budget, params.pace)
        };
      });
      const totalPerPerson = plan.reduce((sum, day) => sum + day.budgetEstimate, 0);
      return {
        plan,
        totalPerPerson,
        totalGroup: totalPerPerson * params.group,
        route: [...new Set(plan.map(day => day.region))],
        seasonNote: getSeasonNote(params.startDate),
        persona: params.persona
      };
    }

    function findLocationTemplate(location) {
      const regionalPlan = regionPlans[location.region]?.days || [];
      return regionalPlan.find(day => day.title === location.title) ||
        extraThemes.find(day => day.title === location.title) ||
        getExtraDay(location.region, 0);
    }

    function getLogicalAlternatives(dayIndex, plan) {
      const day = plan[dayIndex];
      const adjacentRegions = [plan[dayIndex - 1]?.region, plan[dayIndex + 1]?.region].filter(Boolean);
      const allowedRegions = new Set([day.region, ...adjacentRegions]);
      return locationCatalog.filter(location => allowedRegions.has(location.region));
    }

    async function replaceDayLocation(dayIndex, title) {
      if (!lastResult || !lastParams) return;
      const selections = lastResult.plan.map(day => day.title);
      selections[dayIndex] = title;
      lastParams = { ...lastParams, days: selections.length, customSelections: selections };
      lastResult = buildCustomItinerary(lastParams, selections);
      renderItinerary(lastResult, lastParams);
      setStatus(`Day ${dayIndex + 1} updated. Recalculating the full roadmap...`);
      await loadItineraryServices(lastResult, lastParams);
    }

    function setStatus(message) {
      const el = document.getElementById("status");
      el.textContent = message;
      setTimeout(() => {
        el.textContent = "";
      }, 3500);
    }

    function buildItinerary(params) {
      const route = getRoute(params);
      let templateDays = [];

      route.forEach(region => {
        const plan = regionPlans[region];
        if (plan && plan.days) {
          plan.days.forEach(day => {
            templateDays.push({ ...day, region });
          });
        }
      });

      if (templateDays.length > params.days) {
        templateDays = templateDays.slice(0, params.days);
      }

      let extraIndex = 0;
      while (templateDays.length < params.days) {
        const region = route[extraIndex % route.length];
        templateDays.push(getExtraDay(region, extraIndex));
        extraIndex++;
      }

      const plan = templateDays.map((day, index) => ({
        ...day,
        day: index + 1,
        budgetEstimate: calculateCost(day.cost || regionPlans[day.region]?.baseCost || 40, params.budget, params.pace)
      }));

      const totalPerPerson = plan.reduce((sum, day) => sum + day.budgetEstimate, 0);
      const usedRoute = [...new Set(plan.map(day => day.region))];

      return {
        plan,
        totalPerPerson,
        totalGroup: totalPerPerson * params.group,
        route: usedRoute,
        seasonNote: getSeasonNote(params.startDate),
        persona: params.persona
      };
    }

    function getRoute(params) {
      if (params.region !== "Auto") {
        return [params.region];
      }

      const d = params.days;

      if (d <= 3) return ["Cultural Triangle"];
      if (d <= 5) return ["Cultural Triangle", "Hill Country"];
      if (d <= 7) return ["Cultural Triangle", "Hill Country", "South Coast"];
      if (d <= 9) return ["Cultural Triangle", "Hill Country", "South Coast", "East Coast"];

      return [
        "Cultural Triangle",
        "Hill Country",
        "South Coast",
        "East Coast",
        "Wildlife & National Parks",
        "Colombo & West"
      ];
    }

    function getExtraDay(region, index) {
      const theme = extraThemes[index % extraThemes.length];
      const base = regionPlans[region]?.baseCost || 40;

      return {
        ...theme,
        region,
        cost: Math.round(theme.cost + base * 0.35)
      };
    }

    function calculateCost(baseCost, budget, pace) {
      const budgetMultiplier = {
        budget: 0.75,
        mid: 1.45,
        luxury: 2.8
      }[budget] || 1;

      const paceMultiplier = {
        relaxed: 0.92,
        balanced: 1.0,
        active: 1.12
      }[pace] || 1;

      return Math.round(Number(baseCost || 45) * budgetMultiplier * paceMultiplier);
    }

    function getSeasonNote(startDate) {
      const date = startDate ? new Date(startDate) : new Date();
      const month = date.getMonth();

      if ([11, 0, 1, 2].includes(month)) {
        return "December to March is generally strong for the west/south coasts, Cultural Triangle, and hill country.";
      }

      if ([3, 4].includes(month)) {
        return "April to May is an inter-monsoon period. Keep outdoor plans flexible and carry rain protection.";
      }

      if ([5, 6, 7, 8].includes(month)) {
        return "May to September is often better for the east coast and cultural sites, while the southwest coast may see more rain.";
      }

      return "October to November is an inter-monsoon period. Check short-term forecasts and add buffer days.";
    }

    function renderItinerary(result, params) {
      const output = document.getElementById("itineraryOutput");

      output.innerHTML = `
        <div class="panel">
          <h3>Generated prototype itinerary</h3>
          <p class="muted"><strong>Persona:</strong> ${result.persona}</p>
          <p class="muted"><strong>Starting location:</strong> ${params.startLocation}</p>
          <p class="muted"><strong>Route:</strong> ${result.route.join(" -> ")}</p>
          <div class="integration-grid">
            <div class="integration-card">
              <div class="section-kicker">LIVE ROUTE</div>
              <h4>Google Maps directions</h4>
              <p id="routeSummary" class="muted">Calculating the full route with itinerary stops...</p>
              <a id="mapsRouteLink" class="text-link" target="_blank" rel="noopener">Open route in Google Maps</a>
              <div id="routeMap" class="route-map-placeholder">Directions preview will appear here.</div>
            </div>
            <div class="integration-card">
              <div class="section-kicker">LIVE CURRENCY</div>
              <h4>USD and Sri Lankan Rupees</h4>
              <p id="currencySummary" class="muted">Fetching the latest USD/LKR exchange rate...</p>
              <div id="currencyRates" class="rate-list"></div>
            </div>
          </div>
          <p><strong>Season note:</strong> ${result.seasonNote}</p>
          <p>
            <strong>Budget estimate:</strong>
            <span id="budgetSummary">$${result.totalPerPerson.toLocaleString()} per person · $${result.totalGroup.toLocaleString()} for ${params.group} traveler(s).</span>
            This estimate covers daily experience-level costs and excludes international flights.
          </p>

          <div class="toolbar">
            <button class="btn" id="copyBtn">Copy itinerary</button>
            <button class="btn" id="printBtn">Print / Save PDF</button>
            <button class="btn" id="saveBtn">Save locally</button>
            <span id="actionStatus" class="status"></span>
          </div>
        </div>

        <div class="panel">
          <div class="section-heading">
            <div>
              <div class="section-kicker">LIVE SEARCH</div>
              <h3>Hotel booking view</h3>
            </div>
            <span id="hotelSearchStatus" class="status">Searching current stays...</span>
          </div>
          <p class="muted hotel-data-note">
            <strong>How hotel data is gathered:</strong> Sancharakaya sends the selected location and dates to the server-side live-search connector. When Gemini is configured, it returns current hotel candidates and their source links; otherwise, verified booking-source search links remain available without exposing any API key in the browser.
          </p>
          <div class="toolbar hotel-filters">
            <label>Max nightly price (USD)
              <input id="hotelPriceFilter" type="number" min="0" value="${hotelFilterState.maxPrice}" />
            </label>
            <label>Minimum star rating
              <select id="hotelStarFilter">
                <option value="0">Any rating</option>
                <option value="3">3+ stars</option>
                <option value="4">4+ stars</option>
                <option value="5">5 stars</option>
              </select>
            </label>
            <button class="btn" id="hotelFilterBtn">Apply filters</button>
          </div>
          <div id="hotelResults" class="hotel-grid"></div>
        </div>

        <div class="panel">
          <div class="section-heading">
            <div>
              <div class="section-kicker">SOURCE PREVIEWS</div>
              <h3>Referenced websites</h3>
            </div>
            <span class="muted">Live links from the itinerary search</span>
          </div>
          <div id="sourcePreviews" class="source-grid"></div>
        </div>

        ${result.plan.map(day => `
          <div class="panel day-card">
            <div class="day-top">
              <span class="badge">Day ${day.day}</span>
              <strong>${day.title}</strong>
              <span class="muted">${day.region}</span>
            </div>
            <div class="day-location-editor">
              <label>
                <span>Not your ideal stop?</span>
                <select class="day-location-select" data-day-index="${day.day - 1}">
                  ${getLogicalAlternatives(day.day - 1, result.plan).map(location => `
                    <option value="${location.title}" ${location.title === day.title ? "selected" : ""}>${location.title} · ${location.region}</option>
                  `).join("")}
                </select>
              </label>
              <small>Nearby alternatives keep the route practical for adjacent days.</small>
            </div>

            <p><strong>Morning:</strong> ${day.morning}</p>
            <p><strong>Afternoon:</strong> ${day.afternoon}</p>
            <p><strong>Evening:</strong> ${day.evening}</p>

            <div class="meta-grid">
              <div>
                <strong>Travel</strong><br />
                ${day.travel || "Local travel within the area."}
              </div>
              <div>
                <strong>Estimated day cost</strong><br />
                <span class="day-cost" data-usd="${day.budgetEstimate}">$${day.budgetEstimate.toLocaleString()} / LKR ${(day.budgetEstimate * latestExchangeRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} per person</span>
              </div>
              <div>
                <strong>Safety tip</strong><br />
                ${day.safety}
              </div>
              <div>
                <strong>Sustainability tip</strong><br />
                ${day.sustainable}
              </div>
            </div>
          </div>
        `).join("")}
      `;

      document.getElementById("copyBtn").addEventListener("click", async () => {
        const text = itineraryToText(result, params);
        await copyText(text);
        setActionStatus("Itinerary copied to clipboard.");
      });

      document.getElementById("printBtn").addEventListener("click", () => {
        window.print();
      });

      document.getElementById("saveBtn").addEventListener("click", () => {
        localStorage.setItem("sriGuidePrototype", JSON.stringify({ result, params }));
        setActionStatus("Itinerary saved in this browser.");
      });

      document.getElementById("hotelFilterBtn").addEventListener("click", () => {
        hotelFilterState.maxPrice = Number(document.getElementById("hotelPriceFilter").value || 0);
        hotelFilterState.minStars = Number(document.getElementById("hotelStarFilter").value || 0);
        renderHotels(hotelFilterState.results);
      });

      document.querySelectorAll(".day-location-select").forEach(select => {
        select.addEventListener("change", event => {
          replaceDayLocation(Number(event.target.dataset.dayIndex), event.target.value);
        });
      });
    }

    const hotelFilterState = { maxPrice: 250, minStars: 0, results: [] };
    let latestExchangeRate = 335.05;
    const locationCatalog = [
      { title: "Sigiriya & Dambulla", region: "Cultural Triangle" },
      { title: "Polonnaruwa & Minneriya", region: "Cultural Triangle" },
      { title: "Community & Hidden Gems Day", region: "Cultural Triangle" },
      { title: "Kandy & Cultural Highlands", region: "Hill Country" },
      { title: "Nuwara Eliya / Ella Scenic Corridor", region: "Hill Country" },
      { title: "Nature & Slow Travel Day", region: "Hill Country" },
      { title: "Galle & Coastal Heritage", region: "South Coast" },
      { title: "Mirissa / Tangalle Beach Day", region: "South Coast" },
      { title: "Food & Culture Day", region: "South Coast" },
      { title: "Trincomalee & Nilaveli", region: "East Coast" },
      { title: "Arugam Bay & Lagoon Communities", region: "East Coast" },
      { title: "Colombo City & Culture", region: "Colombo & West" },
      { title: "Yala / Udawalawe Safari Experience", region: "Wildlife & National Parks" },
      { title: "Flexible Discovery Day", region: "Colombo & West" }
    ];

    async function loadItineraryServices(result, params) {
      const stops = getMapStops(result);
      const mapsUrl = createGoogleMapsUrl(params.startLocation, stops);
      document.getElementById("mapsRouteLink").href = mapsUrl;
      document.getElementById("routeMap").innerHTML = `
        <div class="route-stop-list">
          <strong>Route stops</strong>
          ${stops.map((stop, index) => `<span><b>${index + 1}</b>${stop}</span>`).join("")}
        </div>`;
      renderSourcePreviews(stops, mapsUrl);

      const dailyHotelSearches = result.plan.map(day => {
        const stayLocation = `${day.title}, ${day.region}, Sri Lanka`;
        const dayParams = { ...params, startDate: addDays(params.startDate, day.day - 1), region: day.region };
        return fetchHotels(dayParams, [stayLocation]).then(hotels => hotels.map(hotel => ({
          ...hotel,
          day: day.day,
          stayLocation,
          stayDate: dayParams.startDate
        })));
      });

      const [directions, currency, dailyHotels] = await Promise.all([
        fetchDirections(params.startLocation, stops),
        fetchExchangeRate(),
        Promise.all(dailyHotelSearches)
      ]);
      const hotels = dailyHotels.flat();

      const routeSummary = document.getElementById("routeSummary");
      routeSummary.textContent = directions
        ? `${directions.distanceText} · ${directions.durationText} · ${stops.length} itinerary stop(s)`
        : `Approx. ${estimateRouteDistance(params.startLocation, stops)} km · ${stops.length} itinerary stop(s). Add GOOGLE_MAPS_API_KEY for live travel time.`;

      updateCurrencyDisplay(result, params, currency);
      hotelFilterState.results = hotels;
      renderHotels(hotels);
      const status = document.getElementById("hotelSearchStatus");
      status.textContent = hotels.length
        ? `${hotels.length} ${hotels.some(hotel => hotel.live) ? "live " : ""}options found · checked ${new Date().toLocaleTimeString()}`
        : "No live hotel results; showing booking links.";
      setStatus("Live route, currency, hotel, and source previews are ready.");
    }

    function getMapStops(result) {
      const seen = new Set();
      return result.plan.map(day => `${day.title}, ${day.region}, Sri Lanka`).filter(stop => {
        if (seen.has(stop)) return false;
        seen.add(stop);
        return true;
      }).slice(0, 10);
    }

    function addDays(dateValue, days) {
      const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();
      date.setDate(date.getDate() + days);
      return date.toISOString().split("T")[0];
    }

    function createGoogleMapsUrl(origin, stops) {
      const destination = stops[stops.length - 1] || "Colombo, Sri Lanka";
      const waypoints = stops.slice(0, -1).join("|");
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}`;
    }

    function estimateRouteDistance(origin, stops) {
      const coordinates = {
        airport: [7.18, 79.88],
        colombo: [6.93, 79.86],
        "Cultural Triangle": [7.95, 80.75],
        "Hill Country": [7.1, 80.7],
        "South Coast": [6.1, 80.3],
        "East Coast": [7.8, 81.5],
        "Wildlife & National Parks": [6.4, 81.3]
      };
      const getCoordinate = value => {
        const key = Object.keys(coordinates).find(name => value.includes(name));
        return coordinates[key] || coordinates.colombo;
      };
      const points = [getCoordinate(origin), ...stops.map(getCoordinate)];
      let distance = 0;
      for (let index = 1; index < points.length; index += 1) {
        distance += haversineDistance(points[index - 1], points[index]);
      }
      return Math.round(distance * 1.25);
    }

    function haversineDistance(from, to) {
      const earthRadius = 6371;
      const radians = value => value * Math.PI / 180;
      const latitudeDelta = radians(to[0] - from[0]);
      const longitudeDelta = radians(to[1] - from[1]);
      const a = Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(radians(from[0])) * Math.cos(radians(to[0])) * Math.sin(longitudeDelta / 2) ** 2;
      return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    async function fetchDirections(origin, stops) {
      try {
        const response = await fetch("/api/directions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ origin, stops })
        });
        if (!response.ok) return null;
        return await response.json();
      } catch (error) {
        return null;
      }
    }

    async function fetchExchangeRate() {
      try {
        let response = await fetch("/api/exchange");
        if (!response.ok) {
          response = await fetch("https://open.er-api.com/v6/latest/USD");
        }
        if (!response.ok) throw new Error("Exchange rate unavailable");
        const data = await response.json();
        latestExchangeRate = Number(data.rate || data.rates?.LKR) || latestExchangeRate;
      } catch (error) {
        latestExchangeRate = 335.05;
      }
      return latestExchangeRate;
    }

    async function fetchHotels(params, stops) {
      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type: "hotels", query: stops[0] || params.region, budget: params.budget, startDate: params.startDate })
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.results)) return data.results.map(result => ({ ...result, live: true }));
        }
      } catch (error) {
        // The curated fallback keeps the planner useful without a server key.
      }
      return createFallbackHotels(stops[0] || params.region).map(result => ({ ...result, live: false }));
    }

    function createFallbackHotels(location) {
      const query = encodeURIComponent(`hotels near ${location}`);
      return [
        { name: "Verified local stays", location, stars: 4, priceUsd: 68, url: `https://www.google.com/travel/search?q=${query}`, source: "Google Hotels", sourceDomain: "google.com", summary: "Compare current rates and availability across hotel partners." },
        { name: "Sri Lanka hotel collection", location, stars: 4, priceUsd: 76, url: "https://www.hotelsinsrilanka.lk/", source: "HotelsInSriLanka.lk", sourceDomain: "hotelsinsrilanka.lk", summary: "Local Sri Lankan hotel directory and direct property listings." },
        { name: "Country-wide booking options", location: "Sri Lanka", stars: 3, priceUsd: 54, url: "https://www.booking.com/country/lk.en.html", source: "Booking.com", sourceDomain: "booking.com", summary: "Large country-wide inventory with guest reviews and availability." },
        { name: "Budget guesthouses", location, stars: 3, priceUsd: 32, url: `https://www.agoda.com/search?text=${query}`, source: "Agoda", sourceDomain: "agoda.com", summary: "Search hotels, villas, and guesthouses by location and dates." },
        { name: "International hotel search", location, stars: 4, priceUsd: 91, url: `https://www.expedia.com/Hotel-Search?destination=${query}`, source: "Expedia", sourceDomain: "expedia.com", summary: "International inventory with flexible booking and package options." },
        { name: "Traveler-reviewed stays", location, stars: 4, priceUsd: 83, url: `https://www.tripadvisor.com/Search?q=${query}`, source: "Tripadvisor", sourceDomain: "tripadvisor.com", summary: "Traveler reviews and hotel comparison before booking." }
      ];
    }

    function renderHotels(hotels) {
      const grid = document.getElementById("hotelResults");
      if (!grid) return;
      const filtered = hotels.filter(hotel => hotel.priceUsd <= hotelFilterState.maxPrice && hotel.stars >= hotelFilterState.minStars);
      if (!filtered.length) {
        grid.innerHTML = `<p class="muted">No stays match these filters. Increase the price limit or lower the star rating.</p>`;
        return;
      }

      const dayGroups = [...new Set(filtered.map(hotel => hotel.day))];
      grid.innerHTML = dayGroups.map(dayNumber => {
        const dayHotels = filtered.filter(hotel => hotel.day === dayNumber);
        const first = dayHotels[0];
        return `
          <section class="hotel-day-group">
            <div class="hotel-day-heading">
              <div>
                <span class="badge">DAY ${dayNumber}</span>
                <h4>${first.stayLocation}</h4>
              </div>
              <span class="muted">${first.stayDate} · ${dayHotels.length} option(s)</span>
            </div>
            <div class="hotel-day-grid">
              ${dayHotels.map(hotel => `
                <article class="hotel-card">
                  <div class="hotel-image" aria-hidden="true">HOTEL</div>
                  <div>
                    <div class="hotel-stars">${"★".repeat(Math.min(5, hotel.stars || 3))}</div>
                    <h4>${hotel.name}</h4>
                    <p class="hotel-source"><img src="https://www.google.com/s2/favicons?domain=${hotel.sourceDomain || "google.com"}&sz=32" alt="" /> <span>${hotel.source || "Live search"}</span></p>
                    <p class="muted">${hotel.location || "Sri Lanka"} · ${hotel.summary || "Current search result from the linked booking source."}</p>
                    <strong>$${Number(hotel.priceUsd).toLocaleString()} / night · LKR ${(Number(hotel.priceUsd) * latestExchangeRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                    <a class="text-link" href="${hotel.url}" target="_blank" rel="noopener">View booking options</a>
                  </div>
                </article>
              `).join("")}
            </div>
          </section>
        `;
      }).join("");
    }

    function updateCurrencyDisplay(result, params, rate) {
      document.getElementById("currencySummary").textContent = `1 USD = LKR ${rate.toLocaleString(undefined, { maximumFractionDigits: 2 })} · updated ${new Date().toLocaleTimeString()}`;
      document.getElementById("currencyRates").innerHTML = `
        <span><strong>Per person</strong> $${result.totalPerPerson.toLocaleString()} · LKR ${(result.totalPerPerson * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        <span><strong>Group total</strong> $${result.totalGroup.toLocaleString()} · LKR ${(result.totalGroup * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>`;
      document.getElementById("budgetSummary").innerHTML = `$${result.totalPerPerson.toLocaleString()} / LKR ${(result.totalPerPerson * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })} per person · $${result.totalGroup.toLocaleString()} / LKR ${(result.totalGroup * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })} for ${params.group} traveler(s).`;
      document.querySelectorAll(".day-cost").forEach(element => {
        const usd = Number(element.dataset.usd);
        element.textContent = `$${usd.toLocaleString()} / LKR ${(usd * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })} per person`;
      });
    }

    function renderSourcePreviews(stops, mapsUrl) {
      const previews = [
        { title: "Google Maps route", description: "Full route with stops from your generated plan.", url: mapsUrl, label: "Maps" },
        { title: "HotelsInSriLanka.lk", description: "Local Sri Lankan hotel directory and direct property listings.", url: "https://www.hotelsinsrilanka.lk/", label: "Local hotels", domain: "hotelsinsrilanka.lk" },
        { title: "Booking.com Sri Lanka", description: "Country-wide inventory, reviews, and availability.", url: "https://www.booking.com/country/lk.en.html", label: "Booking", domain: "booking.com" },
        { title: "Google Hotels", description: "Compare current availability around the first stop.", url: `https://www.google.com/travel/search?q=${encodeURIComponent(`hotels near ${stops[0] || "Sri Lanka"}`)}`, label: "Hotels", domain: "google.com" },
        { title: "Sri Lanka Tourism", description: "Official destination and experience references.", url: "https://www.srilanka.travel/", label: "Official guide", domain: "srilanka.travel" }
      ];
      document.getElementById("sourcePreviews").innerHTML = previews.map(preview => `
        <a class="source-preview" href="${preview.url}" target="_blank" rel="noopener">
          <span class="preview-thumb">${preview.domain ? `<img src="https://www.google.com/s2/favicons?domain=${preview.domain}&sz=64" alt="" />` : preview.label}</span>
          <strong>${preview.title}</strong>
          <span class="muted">${preview.description}</span>
          <small>Open source ↗</small>
        </a>
      `).join("");
    }

    function setActionStatus(message) {
      const el = document.getElementById("actionStatus");
      if (!el) return;
      el.textContent = message;
      setTimeout(() => {
        el.textContent = "";
      }, 3500);
    }

    function itineraryToText(result, params) {
      return [
        "Sancharakaya (සංචාරකයා) Prototype Itinerary",
        `Persona: ${params.persona}`,
        `Trip length: ${params.days} days | Budget: ${params.budget} | Pace: ${params.pace} | Group: ${params.group}`,
        `Route: ${result.route.join(" -> ")}`,
        `Estimated budget: $${result.totalPerPerson} per person; $${result.totalGroup} total`,
        `Season note: ${result.seasonNote}`,
        "",
        ...result.plan.map(day =>
          `Day ${day.day}: ${day.title} (${day.region})\n` +
          `Morning: ${day.morning}\n` +
          `Afternoon: ${day.afternoon}\n` +
          `Evening: ${day.evening}\n` +
          `Travel: ${day.travel || "N/A"}\n` +
          `Estimated cost: $${day.budgetEstimate} / LKR ${(day.budgetEstimate * latestExchangeRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} per person\n` +
          `Safety: ${day.safety}\n` +
          `Sustainability: ${day.sustainable}`
        )
      ].join("\n\n");
    }

    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
        return true;
      }
    }
