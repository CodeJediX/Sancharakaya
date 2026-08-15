# Migration to Google Gemini

This build replaces the Anthropic/Claude provider layer with Google Gemini while preserving the Sancharakaya tool architecture.

## Required secret

Create `.env` from `.env.example` and set:

```env
GEMINI_API_KEY=your-google-gemini-api-key
```

`GOOGLE_API_KEY` is also accepted as an alias.

## Optional model override

Leave `GEMINI_MODEL` blank for automatic model discovery. To force a specific model your key can access:

```env
GEMINI_MODEL=gemini-2.5-flash
```

## Run

```powershell
npm start
```

Open `http://localhost:8787`. The terminal should print `AI configured: yes — Google Gemini`.

## Agent loop

The browser sends conversation history and session memory to `/api/agent/chat`. The backend calls Gemini with function declarations. Gemini can request a function call, the server executes the matching grounded/live tool, sends a function response back to Gemini, and repeats until Gemini returns a normal text answer.
