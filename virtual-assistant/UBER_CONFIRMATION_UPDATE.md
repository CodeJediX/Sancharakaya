# Uber Confirmation Update

This build adds a user-confirmed Uber handoff.

1. Sancharakaya grounds the destination.
2. If Uber is useful, it stores `pending_ride_destination`.
3. It asks: **Would you like me to open Uber for this ride?**
4. The traveler confirms with `yes`, `okay`, `sure`, `open Uber`, etc.
5. The agent calls `open_ride_app` using the remembered destination.
6. The UI shows:
   - **Open Uber** → `https://www.uber.com/lk/en/ride/`
   - **Open Uber App** → destination-prefilled native deep link when supported
   - **View Route** → Google Maps directions
7. Sancharakaya never claims it booked, paid for, or confirmed the ride.

This build also includes the Gemini-only automatic model discovery, retry and fallback logic.

The backend also checks the latest real user message before creating the Uber action, so the handoff is not generated without explicit confirmation.
