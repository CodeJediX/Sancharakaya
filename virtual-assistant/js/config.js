(function () {
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const isLocal = localHosts.has(window.location.hostname);

  window.SANCHARAKAYA_CONFIG = {
    // Local development runs the Node/Gemini backend on this port.
    LOCAL_API_BASE_URL: "http://localhost:8787",

    // Set this after deploying the backend, for example:
    // "https://sancharakaya-api.example.com"
    // GitHub Pages must never call a visitor's localhost.
    PRODUCTION_API_BASE_URL: "",

    get API_BASE_URL() {
      if (isLocal) return this.LOCAL_API_BASE_URL;
      return this.PRODUCTION_API_BASE_URL;
    }
  };
})();
