window.SANCHARAKAYA_CONFIG = {
  // Supabase Auth uses public browser credentials only. Never place service_role keys here.
  SUPABASE_URL: "https://orxqywcvqtwjrkwtyayj.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_UhsvpjpeLb6WYwNBDvq7dw_5huMweDM",

  get SUPABASE_READY() {
    return Boolean(this.SUPABASE_URL && this.SUPABASE_PUBLISHABLE_KEY);
  }
};
