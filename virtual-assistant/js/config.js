(function () {
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const isLocal = localHosts.has(window.location.hostname);

  window.SANCHARAKAYA_CONFIG = {
    // Local development runs the Node/Gemini backend on this port.
    LOCAL_API_BASE_URL: "http://localhost:8787",

    // Production Gemini backend. GitHub Pages must never call a visitor's localhost.
    PRODUCTION_API_BASE_URL: "https://sancharakaya-kx2n.vercel.app",

    // Add your Google OAuth Web Client ID here to enable Google Sign-In.
    GOOGLE_CLIENT_ID: "",

    get API_BASE_URL() {
      if (isLocal) return this.LOCAL_API_BASE_URL;
      return this.PRODUCTION_API_BASE_URL;
    }
  };
})();
