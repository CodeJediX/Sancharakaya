window.SANCHARAKAYA_CONFIG = {
  // Supabase Auth uses public browser credentials only. Never place service_role keys here.
  SUPABASE_URL: "",
  SUPABASE_PUBLISHABLE_KEY: "",

  get SUPABASE_READY() {
    return Boolean(this.SUPABASE_URL && this.SUPABASE_PUBLISHABLE_KEY);
  }
};
