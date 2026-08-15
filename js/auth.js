(function () {
  const config = window.SANCHARAKAYA_CONFIG || {};
  const authState = {
    client: null,
    user: null,
    mode: "login"
  };

  function $(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value || "");
  }

  function nameFromUser(user) {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Traveler";
  }

  function pictureFromUser(user) {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
  }

  function scopedKey(suffix) {
    return authState.user?.email ? `sancharakaya_${authState.user.email}_${suffix}` : `sancharakaya_guest_${suffix}`;
  }

  function loadJSON(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || "") || fallback;
    } catch {
      return fallback;
    }
  }

  function setStatus(message, type) {
    const el = $("authStatus");
    if (!el) return;
    el.textContent = message || "";
    el.dataset.type = type || "";
  }

  function setMode(mode) {
    authState.mode = mode;
    $("loginModeBtn")?.classList.toggle("active", mode === "login");
    $("signupModeBtn")?.classList.toggle("active", mode === "signup");
    if ($("authSubmitBtn")) $("authSubmitBtn").textContent = mode === "login" ? "Login" : "Create account";
    if ($("authPassword")) $("authPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
    setStatus("");
  }

  function showGate(show) {
    $("authGate")?.classList.toggle("hidden", !show);
    document.documentElement.classList.toggle("app-locked", show);
  }

  function postAuthToAssistant() {
    document.querySelectorAll(".assistant-frame").forEach(frame => {
      frame.contentWindow?.postMessage({
        type: "sancharakaya-auth",
        user: authState.user ? {
          name: nameFromUser(authState.user),
          email: authState.user.email,
          picture: pictureFromUser(authState.user)
        } : null
      }, window.location.origin);
    });
  }

  function badges() {
    const trips = loadJSON("sriGuideTrip", null) ? 1 : 0;
    const chats = loadJSON(scopedKey("chatSessions"), []);
    const saved = loadJSON(scopedKey("savedPlaces"), []);
    return [
      { icon: "GO", name: "Trip Starter", desc: "Signed in to the travel workspace.", earned: Boolean(authState.user) },
      { icon: "MAP", name: "Route Builder", desc: "Generate and save a travel plan.", earned: trips > 0 },
      { icon: "AI", name: "AI Explorer", desc: "Start a previous-chat history.", earned: chats.length > 0 },
      { icon: "SAVE", name: "Place Collector", desc: "Save three destination cards.", earned: saved.length >= 3 },
      { icon: "SAFE", name: "Safety Aware", desc: "Use safety and scam checks.", earned: localStorage.getItem("sancharakayaSafetyUsed") === "true" },
      { icon: "FAIR", name: "Fair Price Pro", desc: "Check local travel quotes.", earned: localStorage.getItem("sancharakayaPriceUsed") === "true" }
    ];
  }

  function renderProfile() {
    const user = authState.user;
    const name = nameFromUser(user);
    const email = user?.email || "";
    const picture = pictureFromUser(user);
    const badgeItems = badges();
    const earned = badgeItems.filter(item => item.earned);
    const chats = loadJSON(scopedKey("chatSessions"), []);
    const trips = loadJSON("sriGuideTrip", null) ? 1 : 0;

    if ($("mainProfileName")) $("mainProfileName").textContent = name;
    if ($("mainProfileEmail")) $("mainProfileEmail").textContent = email || "Signed in traveler";
    if ($("mainProfileAvatar")) {
      const avatar = $("mainProfileAvatar");
      avatar.textContent = "";
      if (picture) {
        const img = document.createElement("img");
        img.src = picture;
        img.alt = "";
        avatar.appendChild(img);
      } else {
        avatar.textContent = name.slice(0, 2).toUpperCase();
      }
    }
    if ($("mainTripsCount")) $("mainTripsCount").textContent = trips;
    if ($("mainChatsCount")) $("mainChatsCount").textContent = chats.length;
    if ($("mainBadgeCount")) $("mainBadgeCount").textContent = earned.length;
    if ($("mainProfilePills")) {
      $("mainProfilePills").innerHTML = ["Signed in", "Sri Lanka planner", "Private browser workspace"].map(item => `<span>${item}</span>`).join("");
    }
    if ($("mainBadgeGrid")) {
      $("mainBadgeGrid").innerHTML = badgeItems.map(item => `
        <article class="main-badge-card ${item.earned ? "" : "locked"}">
          <span>${item.icon}</span>
          <strong>${item.name}</strong>
          <p>${item.desc}</p>
          <small>${item.earned ? "Earned" : "Locked"}</small>
        </article>
      `).join("");
    }
  }

  async function handleEmailAuth(event) {
    event.preventDefault();
    if (!authState.client) {
      setStatus("Add Supabase URL and publishable key in js/config.js first.", "error");
      return;
    }
    const email = $("authEmail")?.value.trim();
    const password = $("authPassword")?.value;
    if (!email || !password) return;
    $("authSubmitBtn").disabled = true;
    setStatus(authState.mode === "login" ? "Logging in..." : "Creating your account...");
    const action = authState.mode === "login" ? "signInWithPassword" : "signUp";
    const { error } = await authState.client.auth[action]({ email, password });
    $("authSubmitBtn").disabled = false;
    if (error) {
      setStatus(error.message, "error");
      return;
    }
    setStatus(authState.mode === "login" ? "Welcome back." : "Account created. Please check your email inbox and spam/junk folder for the confirmation link.", "ok");
  }

  async function handleGoogleAuth() {
    if (!authState.client) {
      setStatus("Add Supabase URL and publishable key in js/config.js first.", "error");
      return;
    }
    const { error } = await authState.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) setStatus(error.message, "error");
  }

  async function signOut() {
    if (authState.client) await authState.client.auth.signOut();
    authState.user = null;
    showGate(true);
    renderProfile();
    postAuthToAssistant();
  }

  async function applySession(session) {
    authState.user = session?.user || null;
    showGate(!authState.user);
    renderProfile();
    postAuthToAssistant();
  }

  async function initAuthGate() {
    $("loginModeBtn")?.addEventListener("click", () => setMode("login"));
    $("signupModeBtn")?.addEventListener("click", () => setMode("signup"));
    $("authForm")?.addEventListener("submit", handleEmailAuth);
    $("authGoogleBtn")?.addEventListener("click", handleGoogleAuth);
    $("mainSignOutBtn")?.addEventListener("click", signOut);
    document.querySelectorAll(".assistant-frame").forEach(frame => {
      frame.addEventListener("load", postAuthToAssistant);
    });

    if (!config.SUPABASE_READY || !window.supabase?.createClient) {
      $("authConfigNotice")?.classList.remove("hidden");
      showGate(true);
      renderProfile();
      return;
    }

    authState.client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_PUBLISHABLE_KEY);
    const { data } = await authState.client.auth.getSession();
    await applySession(data.session);
    authState.client.auth.onAuthStateChange((_event, session) => applySession(session));
  }

  window.SancharakayaAuth = {
    init: initAuthGate,
    renderProfile,
    getUser: () => authState.user
  };
})();
