    function bindChat() {
      const form = document.getElementById("chatForm");
      if (!form) return;

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await sendChat();
      });

      document.querySelectorAll(".chip-btn").forEach(chip => {
        chip.addEventListener("click", async () => {
          document.getElementById("chatInput").value = chip.dataset.q;
          await sendChat();
        });
      });
    }

    async function sendChat() {
      const input = document.getElementById("chatInput");
      const value = input.value.trim();

      if (!value) return;

      addMessage("user", escapeHTML(value));
      input.value = "";

      addMessage("bot", getOfflineResponse(value));
    }

    function addMessage(sender, html) {
      const log = document.getElementById("chatLog");
      if (!log) return;
      const div = document.createElement("div");
      div.className = `msg ${sender}`;
      div.innerHTML = html;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    }

    function escapeHTML(str) {
      return str.replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[m]));
    }

    function getOfflineResponse(query) {
      const text = query.toLowerCase();

      if (text.includes("hello") || text === "hi" || text.includes("hi ")) {
        return "Hello! I can help with itineraries, fair prices, safety tips, transport, seasons, food, and sustainable travel in Sri Lanka.";
      }

      if ((text.includes("create") || text.includes("generate") || text.includes("make")) && text.includes("itinerar")) {
        const match = query.match(/\d+/);
        if (match) {
          const requestedDays = Math.max(1, Math.min(21, parseInt(match[0], 10)));
          document.getElementById("days").value = requestedDays;
        }

        activateTab("planner");
        generateItinerary();

        return "I switched to the AI Itinerary Planner and generated an itinerary based on your requested days. You can adjust persona, budget, pace, interests, and region there.";
      }

      if (text.includes("price") || text.includes("fare") || text.includes("cost") || text.includes("scam") || text.includes("overcharg")) {
        return priceAdvice(text);
      }

      if (text.includes("safety") || text.includes("emergency") || text.includes("solo")) {
        return safetyAdvice();
      }

      if (text.includes("weather") || text.includes("season") || text.includes("best time") || text.includes("monsoon")) {
        return seasonAdvice(text);
      }

      if (text.includes("train")) {
        return trainAdvice();
      }

      if (text.includes("visa")) {
        return visaAdvice();
      }

      if (text.includes("food") || text.includes("eat") || text.includes("restaurant")) {
        return foodAdvice();
      }

      if (text.includes("sustain") || text.includes("community") || text.includes("eco")) {
        return sustainableAdvice();
      }

      if (text.includes("sigiriya")) {
        return "Sigiriya is best visited early in the morning. Use official ticket counters, carry water, and consider a licensed guide. If you want a lower-cost alternative, Pidurangala Rock offers beautiful views of Sigiriya.";
      }

      if (text.includes("kandy") || text.includes("ella")) {
        return "The Kandy to Ella corridor is one of Sri Lanka's most scenic routes. The train is highly recommended, but book through official channels and avoid overpriced unofficial agents.";
      }

      if (text.includes("beach")) {
        return "For south coast beaches, December to March is generally best. For east coast beaches like Trincomalee and Arugam Bay, May to September is usually better. Always check sea conditions before swimming.";
      }

      if (lastResult) {
        return `Your current itinerary has ${lastResult.plan.length} days and follows this route: ${lastResult.route.join(" -> ")}. You can copy, print, or save it from the AI Itinerary Planner tab.`;
      }

      return "I can help with itineraries, fair pricing, safety alerts, transport, weather windows, food recommendations, and sustainable travel options. Try asking: What is a fair tuk-tuk price? or Create a 7-day itinerary.";
    }

    function priceAdvice(text) {
      if (text.includes("tuk")) {
        const tuk = priceData.find(p => p.item.toLowerCase().includes("tuk"));
        return `<strong>Tuk-tuk fair-price guidance:</strong><br />
        Fair range: ${tuk.fair}<br />
        Typical overcharge: ${tuk.tourist}<br />
        Advice: ${tuk.notes}`;
      }

      return `<strong>Fair-price quick guide:</strong><br />
      ${priceData.slice(0, 4).map(p => `- ${p.item}: ${p.fair}`).join("<br />")}
      <br /><br />Open the Fair-Price Guide tab for the full reference table.`;
    }

    function safetyAdvice() {
      return `<strong>Safety guidance:</strong><br />
      - Use licensed guides and official transport counters.<br />
      - Agree prices before travel.<br />
      - Check sea and weather conditions before outdoor activities.<br />
      - Emergency: Police 119, Tourist Police 1912, Ambulance 110, Fire 111.<br /><br />
      Open the Safety Alerts tab for region-specific guidance.`;
    }

    function seasonAdvice(text) {
      if (text.includes("east")) {
        return "The east coast, including Trincomalee and Arugam Bay, is generally best from May to September.";
      }

      if (text.includes("south") || text.includes("west")) {
        return "The south and west coasts are generally best from December to March, though weather can vary year to year.";
      }

      if (text.includes("hill") || text.includes("kandy") || text.includes("ella")) {
        return "Hill Country can be visited most of the year, but rain is more likely during inter-monsoon periods. Carry a light rain jacket.";
      }

      return getSeasonNote(document.getElementById("startDate").value);
    }

    function trainAdvice() {
      return "Sri Lanka's train routes are scenic and affordable. The Kandy to Ella route is especially popular. Use official railway fares, avoid scalpers, and book early where possible during peak season.";
    }

    function visaAdvice() {
      return "Most travelers need an Electronic Travel Authorization (ETA) or visa before arrival, depending on nationality. Always check the latest official Sri Lanka immigration guidance before travel.";
    }

    function foodAdvice() {
      return `<strong>Must-try Sri Lankan foods:</strong><br />
      - Rice and curry<br />
      - Kottu roti<br />
      - Hoppers (egg or plain)<br />
      - String hoppers with curry<br />
      - Seafood on the coast<br />
      - Curd with treacle<br /><br />
      For fair pricing, local eateries are often better value than tourist-focused restaurants.`;
    }

    function sustainableAdvice() {
      return `<strong>Sustainable travel suggestions:</strong><br />
      - Visit community-based village experiences.<br />
      - Use local guides and small guesthouses.<br />
      - Avoid attractions that exploit wildlife.<br />
      - Spread your itinerary beyond overcrowded hotspots.<br /><br />
      Open the Sustainable Matching tab to see responsible travel recommendations.`;
    }
