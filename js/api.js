    async function getClaudeResponse(userText) {
      const settings = JSON.parse(localStorage.getItem("sriGuideSettings") || "{}");

      if (!settings.useClaude) {
        return null;
      }

      chatHistory.push({ role: "user", content: userText });

      if (chatHistory.length > 16) {
        chatHistory = chatHistory.slice(-16);
      }

      const systemPrompt = `You are Sancharakaya (සංචාරකයා), a Sri Lanka travel companion for independent tourists.
You are aligned with the Sancharakaya (සංචාරකයා) travel product:
- AI Itinerary Planner
- 24/7 Multilingual Virtual Assistant
- Predictive Recommendation Engine
- Fair-Price Guide
- Safety & Scam-Alert System
- Sustainable Tourism Matching

Give practical, concise, traveler-friendly advice.
When relevant, include fair-price guidance, safety awareness, seasonality, and sustainable tourism suggestions.
If something may vary locally, tell the user to verify with official sources.`;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: settings.model || "claude-3-5-sonnet-latest",
            max_tokens: 1000,
            system: systemPrompt,
            messages: chatHistory.slice(-8)
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP ${response.status} ${errText.slice(0, 220)}`);
        }

        const data = await response.json();
        const text = data?.content?.[0]?.text || "";

        chatHistory.push({ role: "assistant", content: text });

        return { ok: true, text };
      } catch (error) {
        chatHistory.pop();
        return { ok: false, error: error.message };
      }
    }
