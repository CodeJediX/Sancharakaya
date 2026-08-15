    function bindPrices() {
      document.getElementById("priceFilter")?.addEventListener("input", () => {
        renderPrices();
      });
      document.querySelectorAll(".price-filter").forEach(button => {
        button.addEventListener("click", () => {
          document.querySelectorAll(".price-filter").forEach(item => item.classList.remove("active"));
          button.classList.add("active");
          renderPrices();
        });
      });
      document.getElementById("quoteCheckBtn")?.addEventListener("click", runQuoteCheck);
      document.getElementById("quoteCheckInput")?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          runQuoteCheck();
        }
      });
    }

    function bindTheme() {
      const button = document.getElementById("themeToggle");
      if (!button) return;
      const savedTheme = localStorage.getItem("sriGuideTheme");
      setSiteTheme(savedTheme === "dark" ? "dark" : "light");
      button.addEventListener("click", () => {
        const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
        setSiteTheme(nextTheme);
      });

      document.querySelectorAll(".assistant-frame").forEach(frame => {
        frame.addEventListener("load", () => {
          syncAssistantTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
        });
      });

      window.addEventListener("message", event => {
        if (event.origin !== window.location.origin) return;
        const theme = event.data?.theme;
        if (event.data?.type === "sancharakaya-theme-change" && (theme === "dark" || theme === "light")) {
          setSiteTheme(theme);
        }
      });
    }

    function bindMotionEffects() {
      const preloader = document.getElementById("sitePreloader");
      if (preloader) {
        const hidePreloader = () => {
          preloader.classList.add("hide");
          setTimeout(() => preloader.remove(), 650);
        };

        if (document.readyState === "complete") {
          setTimeout(hidePreloader, 450);
        } else {
          window.addEventListener("load", () => setTimeout(hidePreloader, 450), { once: true });
        }
      }

      const revealItems = document.querySelectorAll(".panel, .trust-band, .hero-card, .hero-stat");
      revealItems.forEach(item => item.classList.add("reveal-ready"));

      if (!("IntersectionObserver" in window)) {
        revealItems.forEach(item => item.classList.add("is-visible"));
        return;
      }

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.14, rootMargin: "0px 0px -40px 0px" });

      revealItems.forEach(item => observer.observe(item));
    }

    function setSiteTheme(theme) {
      const isDark = theme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      localStorage.setItem("sriGuideTheme", isDark ? "dark" : "light");
      updateThemeButton();
      syncAssistantTheme(isDark ? "dark" : "light");
    }

    function syncAssistantTheme(theme) {
      document.querySelectorAll(".assistant-frame").forEach(frame => {
        try {
          frame.contentWindow?.postMessage({ type: "sancharakaya-theme", theme }, window.location.origin);
        } catch {
          // The assistant can still be toggled independently if the iframe is unavailable.
        }
      });
    }

    function updateThemeButton() {
      const button = document.getElementById("themeToggle");
      if (!button) return;
      const isDark = document.documentElement.classList.contains("dark");
      button.querySelector(".theme-label").textContent = isDark ? "Light mode" : "Dark mode";
      button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    }

    function activePriceItems() {
      const search = (document.getElementById("priceFilter")?.value || "").toLowerCase();
      const category = document.querySelector(".price-filter.active")?.dataset.priceFilter || "all";
      return priceData.filter(p => {
        const categoryMatch = category === "all" || p.category === category;
        const searchText = `${p.item} ${p.fair} ${p.tourist} ${p.notes} ${(p.keywords || []).join(" ")}`.toLowerCase();
        return categoryMatch && searchText.includes(search);
      });
    }

    function renderPrices() {
      const tbody = document.querySelector("#priceTable tbody");
      const cardGrid = document.getElementById("priceCards");
      if (!tbody) return;
      const items = activePriceItems();

      if (cardGrid) {
        cardGrid.innerHTML = items.slice(0, 4).map(p => `
          <article class="price-mini-card">
            <span>${p.category}</span>
            <strong>${p.item}</strong>
            <b>${p.fair}</b>
            <small>${p.notes}</small>
          </article>
        `).join("") || `<div class="price-empty">No quick cards match this filter.</div>`;
      }

      const rows = items
        .map(p => `
          <tr>
            <td><span class="price-type-pill">${p.category}</span></td>
            <td>${p.item}</td>
            <td>${p.fair}</td>
            <td>${p.tourist}</td>
            <td>${p.notes}</td>
          </tr>
        `)
        .join("");

      tbody.innerHTML = rows || `<tr><td colspan="5">No matching price entries found.</td></tr>`;
    }

    function numberFromPriceText(text) {
      const matches = String(text || "").match(/\d[\d,]*/g);
      if (!matches?.length) return null;
      return Math.max(...matches.map(value => Number(value.replace(/,/g, ""))).filter(Number.isFinite));
    }

    function bestPriceMatch(text) {
      const lower = text.toLowerCase();
      return priceData
        .map(item => ({
          item,
          score: (item.keywords || []).reduce((sum, keyword) => sum + (lower.includes(keyword) ? 1 : 0), 0)
        }))
        .filter(match => match.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.item || null;
    }

    function runQuoteCheck() {
      localStorage.setItem("sancharakayaPriceUsed", "true");
      window.SancharakayaAuth?.renderProfile();
      const input = document.getElementById("quoteCheckInput");
      const result = document.getElementById("quoteCheckResult");
      if (!input || !result) return;
      const text = input.value.trim();
      const quoted = numberFromPriceText(text);
      const match = bestPriceMatch(text);

      if (!text) {
        result.className = "quote-result";
        result.textContent = "Type an offer first, then Sancharakaya will compare it with common traveler price ranges.";
        return;
      }

      if (!match) {
        result.className = "quote-result medium";
        result.innerHTML = `<strong>Not enough context yet.</strong><span>Add the service type, distance or place, and LKR amount. Example: tuk-tuk 2 km for LKR 1500.</span>`;
        return;
      }

      const hasRange = Number.isFinite(match.fairMax);
      const ratio = hasRange && quoted ? quoted / match.fairMax : 0;
      let level = "low";
      let title = "Looks within the normal planning range.";
      if (!quoted || !hasRange) {
        level = "medium";
        title = "Verify with an official or trusted local source.";
      } else if (ratio > 2) {
        level = "high";
        title = "Likely high for this guide range.";
      } else if (ratio > 1.25) {
        level = "medium";
        title = "A little high. Compare before accepting.";
      }

      result.className = `quote-result ${level}`;
      result.innerHTML = `
        <strong>${title}</strong>
        <span><b>Matched:</b> ${match.item}</span>
        <span><b>Guide range:</b> ${match.fair}</span>
        <span><b>Next move:</b> ${match.notes}</span>
        <button type="button" class="quote-ask-btn" id="quoteAskAssistant">Ask assistant about this quote</button>
      `;

      document.getElementById("quoteAskAssistant")?.addEventListener("click", () => {
        activateTab("chat");
        setTimeout(() => {
          const frame = document.querySelector(".assistant-frame");
          frame?.scrollIntoView({ behavior: "smooth", block: "start" });
          try {
            frame?.contentWindow?.postMessage({ type: "sancharakaya-send-prompt", prompt: `Is this Sri Lanka travel quote fair? ${text}. Compare it with ${match.item} and advise what to do.` }, window.location.origin);
          } catch {
            // The traveler can still type the same question in the assistant.
          }
        }, 80);
      });
    }

    function renderSafety() {
      const grid = document.getElementById("safetyGrid");
      if (!grid) return;
      const activeFilter = document.querySelector(".safety-filter.active")?.dataset.safetyFilter || "all";
      const items = activeFilter === "all"
        ? safetyData
        : safetyData.filter(item => item.category === activeFilter);

      grid.innerHTML = items.map(item => `
        <article class="safety-card">
          <div class="safety-card-top">
            <span class="safety-icon">${item.icon}</span>
            <div>
              <strong>${item.title}</strong>
              <div class="safety-tags">
                <span>${item.region}</span>
                <span>${item.category}</span>
                <span>${item.level}</span>
              </div>
            </div>
          </div>
          <p>${item.guidance}</p>
          <div class="safety-watch">
            <b>Watch for</b>
            <span>${item.watchFor}</span>
          </div>
          <div class="safety-next">
            <b>Best move</b>
            <span>${item.action}</span>
          </div>
          <button class="safety-ask-btn" type="button" data-safety-question="How should I handle this in Sri Lanka: ${item.title}?">
            Ask assistant about this
          </button>
        </article>
      `).join("");

      document.querySelectorAll(".safety-ask-btn").forEach(button => {
        button.addEventListener("click", () => {
          const question = button.dataset.safetyQuestion;
          activateTab("chat");
          setTimeout(() => {
            const frame = document.querySelector(".assistant-frame");
            frame?.scrollIntoView({ behavior: "smooth", block: "start" });
            try {
              frame?.contentWindow?.postMessage({ type: "sancharakaya-send-prompt", prompt: question }, window.location.origin);
            } catch {
              // The traveler can still type the same question in the assistant.
            }
          }, 80);
        });
      });
    }

    function bindSafetyTools() {
      document.querySelectorAll(".safety-filter").forEach(button => {
        button.addEventListener("click", () => {
          document.querySelectorAll(".safety-filter").forEach(item => item.classList.remove("active"));
          button.classList.add("active");
          renderSafety();
        });
      });

      const scamButton = document.getElementById("scamCheckBtn");
      const scamInput = document.getElementById("scamCheckInput");
      if (!scamButton || !scamInput) return;

      scamButton.addEventListener("click", runScamCheck);
      scamInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          runScamCheck();
        }
      });
    }

    function runScamCheck() {
      localStorage.setItem("sancharakayaSafetyUsed", "true");
      window.SancharakayaAuth?.renderProfile();
      const input = document.getElementById("scamCheckInput");
      const result = document.getElementById("scamCheckResult");
      if (!input || !result) return;

      const text = input.value.trim().toLowerCase();
      if (!text) {
        result.className = "scam-result";
        result.textContent = "Type an offer first, then Sancharakaya will flag common risk patterns.";
        return;
      }

      const rules = [
        { terms: ["no meter", "meter broken", "without meter"], risk: 3, note: "Meter refusal is a common overcharging signal." },
        { terms: ["pay now", "advance", "deposit"], risk: 2, note: "Avoid paying upfront unless you trust the provider and have a receipt." },
        { terms: ["shortcut", "special entrance", "counter closed", "ticket office closed"], risk: 3, note: "False shortcut or closed-counter claims are common around attractions." },
        { terms: ["gem", "spice", "souvenir", "antique"], risk: 2, note: "Compare shops and avoid pressure purchases." },
        { terms: ["3000", "5000", "8000", "10000"], risk: 1, note: "High round-number prices should be compared before accepting." },
        { terms: ["night", "late", "remote"], risk: 1, note: "Use trusted transport for late or remote travel." }
      ];

      const matches = rules.filter(rule => rule.terms.some(term => text.includes(term)));
      const score = matches.reduce((sum, item) => sum + item.risk, 0);

      let level = "low";
      let title = "Looks okay, but still confirm details.";
      if (score >= 5) {
        level = "high";
        title = "High caution: this has multiple scam or safety signals.";
      } else if (score >= 2) {
        level = "medium";
        title = "Use caution: compare and verify before accepting.";
      }

      const advice = matches.length
        ? matches.map(item => `- ${item.note}`).join("<br>")
        : "- Ask for the final price in LKR, route/details, and a receipt where relevant.";

      result.className = `scam-result ${level}`;
      result.innerHTML = `<strong>${title}</strong><br>${advice}<br><br><span>Best move: pause, compare with the Fair-Price Guide, and walk away if pressured.</span>`;
    }

    function renderSustainability() {
      const grid = document.getElementById("sustainableGrid");

      grid.innerHTML = sustainabilityData.map(item => `
        <div class="card">
          <strong>${item.name}</strong>
          <p class="muted">${item.region} · ${item.type}</p>
          <p>${item.impact}</p>
        </div>
      `).join("");
    }

    function renderPersonas() {
      const grid = document.getElementById("personaGrid");
      if (!grid) return;

      grid.innerHTML = personaData.map(persona => `
        <div class="card">
          <strong>${persona.name}</strong>
          <p>${persona.description}</p>
          <p><strong>Needs:</strong> ${persona.needs}</p>
          <p><strong>Sancharakaya (සංචාරකයා) modules:</strong> ${persona.features}</p>
        </div>
      `).join("");
    }

    function renderRoadmap() {
      const body = document.getElementById("roadmapBody");
      if (!body) return;

      body.innerHTML = roadmapData.map(item => `
        <tr>
          <td>${item.phase}</td>
          <td>${item.timeline}</td>
          <td>${item.deliverables}</td>
        </tr>
      `).join("");
    }

    function updateChatStatus() {
      const el = document.getElementById("chatStatus");
      if (!el) return;
      if (document.querySelector(".assistant-frame")) {
        el.textContent = "Embedded AI agent";
        return;
      }

      el.textContent = "Gemini travel assistant ready";
    }

    init();
