# Sancharakaya

**Sancharakaya** is a customer-ready Sri Lanka AI travel companion for planning safer, smarter trips. It combines an itinerary planner, Gemini-powered virtual assistant, interactive trip map, fair-price guidance, safety and scam awareness, sustainable travel matching, and Supabase-powered user login.

## Live Experience

- Main website: https://codejedix.github.io/Sancharakaya/
- Virtual assistant: https://sancharakaya-kx2n.vercel.app/virtual-assistant/index.html
- Backend/API hosting: Vercel
- Authentication: Supabase Auth

## Product Highlights

- **Glass login and signup gate** shown after the preloader.
- **Supabase email confirmation** with a branded Sancharakaya signup email template.
- **User profile dashboard** with account identity, trip stats, chat stats, and achievement badges.
- **AI Virtual Assistant** for Sri Lanka travel questions, routes, safety, weather prompts, fair prices, and saved trip context.
- **New chats, previous chats, and delete chat** functions in the assistant.
- **Interactive trip map** with popular tourist destinations, category filters, saved places, and map popups.
- **Fair-Price Guide** with quote checking, category filters, and traveler-friendly advice.
- **Safety & Scam Alerts** with emergency contacts, scam checks, practical risk signals, and action guidance.
- **Dark mode**, glass effects, animations, and branded preloader using the Sancharakaya logo.
- **Optimized logo assets** using lightweight WebP for faster loading.

## Authentication

The main website uses Supabase Auth with email/password and Google OAuth support.

Browser-safe Supabase config lives in:

```text
js/config.js
```

Only public Supabase browser values are stored there:

```js
SUPABASE_URL: "https://your-project-ref.supabase.co",
SUPABASE_PUBLISHABLE_KEY: "your-public-publishable-or-anon-key"
```

Never commit a Supabase `service_role` key or private SMTP password.

## Signup Email Template

The branded confirmation email is saved at:

```text
supabase/email-templates/confirm-signup.html
```

Use it in Supabase:

```text
Authentication -> Email Templates -> Confirm sign up
```

Recommended subject:

```text
Confirm your Sancharakaya account
```

The app also shows this reminder after signup:

```text
Account created. Please check your email inbox and spam/junk folder for the confirmation link.
```

## Project Structure

```text
.
├── index.html                       # Main customer-facing website
├── css/styles.css                   # Main site theme, glass UI, animations, dark mode
├── js/
│   ├── auth.js                      # Supabase login/signup/profile logic
│   ├── config.js                    # Public Supabase browser config
│   ├── planner.js                   # Itinerary planner and page navigation
│   ├── features.js                  # Fair-price, safety, theme, UI features
│   └── data.js                      # Curated site data
├── virtual-assistant/
│   ├── index.html                   # Full AI assistant UI
│   ├── css/app.css                  # Assistant app theme
│   ├── js/app.js                    # Assistant chat/map/profile/session logic
│   └── server/                      # Gemini backend logic
├── api/[...path].js                 # Vercel API bridge
├── supabase/email-templates/        # Branded Supabase email templates
└── vercel.json                      # Vercel routing/function configuration
```

## Local Development

Run a simple local server from the repo root:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:8080/
```

## Backend Environment

Server-side keys belong in Vercel or local `.env`, not in browser JavaScript.

Required for the Gemini backend:

```text
GEMINI_API_KEY=your-server-side-key
```

Optional:

```text
GOOGLE_MAPS_API_KEY=your-server-side-key
ALLOWED_ORIGIN=http://localhost:8080,https://codejedix.github.io
RATE_LIMIT_PER_MINUTE=60
```

## Security Notes

- Public Supabase publishable/anon keys can be used in the browser.
- Supabase `service_role` keys must stay private and must never be committed.
- Gemini and Google Maps keys are server-side only.
- SMTP passwords should stay inside Supabase/Vercel provider settings, never in GitHub.

## Final Product Status

Sancharakaya is now structured as a polished travel product rather than a prototype:

- Branded first impression with fast logo loading and preloader.
- Full-site auth gate and user profile system.
- AI assistant embedded into the main site and available as a standalone app.
- Travel-planning, fair-price, safety, sustainability, and map workflows ready for real visitors.
- GitHub and Vercel deployment paths prepared for production updates.
