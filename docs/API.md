# RushRoute REST API Documentation (`/api/v1`)

All endpoints are prefixed with `/api/v1`. Protected routes require an HTTP header:
`Authorization: Bearer <jwt_token>`

---

## 1. System & Health
- `GET /api/v1/health` — Returns service health, active database persistence mode (`supabase_postgresql` or `local_postgresql_compatible_persistence`), and Gemini AI configuration status.
- `GET /api/v1/locations/hubs` — Returns supported commuter hubs and coordinates.

---

## 2. Authentication
- `POST /api/v1/auth/register`
  - **Body**: `{ "full_name": "string", "email": "string", "password": "string", "phone": "string?" }`
  - **Response (`201`)**: `{ "success": true, "token": "<jwt>", "user": { ... } }`
- `POST /api/v1/auth/login`
  - **Body**: `{ "email": "string", "password": "string" }`
  - **Response (`200`)**: `{ "success": true, "token": "<jwt>", "user": { ... } }`
- `GET /api/v1/auth/me` (Protected)
  - **Response (`200`)**: `{ "success": true, "user": { ... } }`
- `POST /api/v1/auth/logout` (Protected)
  - Revokes the active session token.

---

## 3. User Profile & Mobility Preferences
- `GET /api/v1/users/profile` (Protected)
- `PATCH /api/v1/users/profile` (Protected)
- `GET /api/v1/users/preferences` (Protected)
- `PATCH /api/v1/users/preferences` (Protected)

---

## 4. Smart Private Ride Booking
- `GET /api/v1/rides/providers` — Lists the Provider Adapter Registry (`DemoRideProvider`, `FutureUberProvider`, `FutureOlaProvider`, `FutureRapidoProvider`).
- `POST /api/v1/rides/estimate` — Returns simulated quotes across `Bike`, `Auto`, `Mini`, and `Sedan` filtered by budget.
- `POST /api/v1/rides/requests` (Protected) — Creates a ride request, filters by budget, prioritizes the cheapest suitable option, confirms the first accepted simulated ride, and cancels competing pending requests inside an atomic transaction.
- `GET /api/v1/rides/requests/:id` (Protected)
- `GET /api/v1/rides/bookings` (Protected)
- `POST /api/v1/rides/bookings/:id/accept` (Protected)
- `POST /api/v1/rides/bookings/:id/cancel` (Protected)

---

## 5. Public Transport & Multimodal Journey Planner
- `POST /api/v1/journeys/search` — Returns schedule-based public transit (`Bus`, `Metro`, `Walking`) and multimodal (`Auto + Metro`, `Carpool`, `Private Ride`) alternatives with deterministic cost and time breakdowns.
- `POST /api/v1/journeys/recommend` — Computes multimodal options and calls Google Gemini (`@google/genai`) for structured recommendation and budget trade-off explanation.
- `GET /api/v1/journeys/history` (Protected)
- `GET /api/v1/journeys/:id` (Protected)

---

## 6. AI Carpool Matching
- `POST /api/v1/carpool/requests` (Protected)
- `GET /api/v1/carpool/requests` (Protected)
- `POST /api/v1/carpool/matches/search` (Protected) — Computes deterministic compatibility scores (pickup proximity, destination similarity, corridor bearing overlap, departure window, and seat capacity) and Gemini compatibility explanations.
- `POST /api/v1/carpool/matches/:id/respond` (Protected) — Accept, decline, report, or block a carpool match. Precise coordinates remain hidden until mutual acceptance.
- `POST /api/v1/carpool/matches/:id/cancel` (Protected)

---

## 7. Passenger Incident Reporting
- `POST /api/v1/incidents` (Protected) — Stores incident report (`Delay`, `Skipped stop`, `Overcrowding`, `Road obstruction`, `Service disruption`, `Other`), detects related reports, summarizes via Gemini, and generates a user-reviewable complaint draft.
- `GET /api/v1/incidents` (Protected)
- `GET /api/v1/incidents/:id` (Protected)
- `PATCH /api/v1/incidents/:id` (Protected)
- `POST /api/v1/incidents/:id/analyze` (Protected)

---

## 8. AI Mobility Intelligence (`@google/genai`)
- `POST /api/v1/ai/journey-advice` (Protected)
- `POST /api/v1/ai/route-explanation` (Protected)
- `POST /api/v1/ai/incident-summary` (Protected)
- `POST /api/v1/ai/carpool-explanation` (Protected)

---

## 9. Administration (Requires `admin` Role)
- `GET /api/v1/admin/analytics`
- `GET /api/v1/admin/incidents`
- `PATCH /api/v1/admin/incidents/:id/status`
