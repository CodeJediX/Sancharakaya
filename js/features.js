    function bindPrices() {
      document.getElementById("priceFilter").addEventListener("input", (e) => {
        renderPrices(e.target.value.toLowerCase());
      });
    }

    function bindTheme() {
      const button = document.getElementById("themeToggle");
      const savedTheme = localStorage.getItem("sriGuideTheme");
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
      updateThemeButton();
      button.addEventListener("click", () => {
        document.documentElement.classList.toggle("dark");
        localStorage.setItem(
          "sriGuideTheme",
          document.documentElement.classList.contains("dark") ? "dark" : "light"
        );
        updateThemeButton();
      });
    }

    function updateThemeButton() {
      const button = document.getElementById("themeToggle");
      const isDark = document.documentElement.classList.contains("dark");
      button.querySelector(".theme-label").textContent = isDark ? "Light mode" : "Dark mode";
      button.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    }

    function renderPrices(filter = "") {
      const tbody = document.querySelector("#priceTable tbody");

      const rows = priceData
        .filter(p =>
          (p.item + " " + p.fair + " " + p.notes).toLowerCase().includes(filter)
        )
        .map(p => `
          <tr>
            <td>${p.item}</td>
            <td>${p.fair}</td>
            <td>${p.tourist}</td>
            <td>${p.notes}</td>
          </tr>
        `)
        .join("");

      tbody.innerHTML = rows || `<tr><td colspan="4">No matching price entries found.</td></tr>`;
    }

    function renderSafety() {
      const grid = document.getElementById("safetyGrid");

      grid.innerHTML = safetyData.map(item => `
        <div class="card">
          <strong>${item.title}</strong>
          <span class="badge">${item.region}</span>
          <p class="muted">Risk type: ${item.level}</p>
          <p>${item.guidance}</p>
        </div>
      `).join("");
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

    function bindSetup() {
      document.getElementById("saveSettingsBtn")?.addEventListener("click", saveClaudeSettings);
    }

    function saveClaudeSettings() {
      const settings = {
        useClaude: document.getElementById("useClaude")?.checked || false,
        model: document.getElementById("model")?.value.trim() || "claude-3-5-sonnet-latest"
      };

      localStorage.setItem("sriGuideSettings", JSON.stringify(settings));
      const setupStatus = document.getElementById("setupStatus");
      if (!setupStatus) return;
      setupStatus.textContent = "Settings saved.";
      updateChatStatus();

      setTimeout(() => {
        setupStatus.textContent = "";
      }, 3000);
    }

    function loadClaudeSettings() {
      localStorage.removeItem("sriGuideClaude");
      const settings = JSON.parse(localStorage.getItem("sriGuideSettings") || "{}");

      if (settings.model) {
        const model = document.getElementById("model");
        if (model) model.value = settings.model;
      }

      const useClaude = document.getElementById("useClaude");
      if (useClaude) useClaude.checked = !!settings.useClaude;
    }

    function updateChatStatus() {
      const settings = JSON.parse(localStorage.getItem("sriGuideSettings") || "{}");
      const el = document.getElementById("chatStatus");
      if (!el) return;
      if (document.querySelector(".assistant-frame")) {
        el.textContent = "Embedded AI agent";
        return;
      }

      if (settings.useClaude) {
        el.textContent = "Secure proxy mode";
      } else {
        el.textContent = "Travel assistant ready";
      }
    }

    function bindDemo() {
      document.getElementById("runDemoBtn")?.addEventListener("click", runCompetitionDemo);
    }

    function runCompetitionDemo() {
      document.getElementById("persona").value = "First-Time Independent Traveler";
      applyPersona("First-Time Independent Traveler");

      document.getElementById("days").value = 7;
      document.getElementById("region").value = "Auto";
      document.getElementById("budget").value = "mid";
      document.getElementById("pace").value = "balanced";
      document.getElementById("groupSize").value = 2;

      activateTab("planner");
      generateItinerary();

      const demoStatus = document.getElementById("demoStatus");
      if (!demoStatus) return;
      demoStatus.textContent = "Sample itinerary generated.";
      setTimeout(() => {
        demoStatus.textContent = "";
      }, 3500);
    }

    init();
