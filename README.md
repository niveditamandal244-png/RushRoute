# RushRoute — AI-Powered Multimodal Mobility & Smart Journey Platform

> **One Platform. Every Journey. Smarter Decisions.**

RushRoute is a production-grade full-stack multimodal mobility platform that helps daily commuters, college students, office employees, and budget-conscious travellers compare private rides, plan public transport routes, optimize travel budgets, match with compatible carpool partners, report transit incidents, and receive structured AI mobility advice powered by **Google Gemini (`@google/genai`)**.

---

## 1. Problem Statement & Solution

### Problem Statement
Commuters frequently have to switch between multiple fragmented apps to check private ride fares, look up metro/bus connections, calculate multimodal transfer costs, and coordinate shared rides. This fragmentation leads to unnecessary commute expenses, missed connections, and poor visibility into transit disruptions.

### Our Solution
RushRoute unifies everyday urban mobility into a single, intuitive platform:
1. **Smart Ride Booking**: Compares simulated `Bike`, `Auto`, `Mini`, and `Sedan` options via a clean Provider Adapter architecture (`DemoRideProvider` + `FutureUberProvider`, `FutureOlaProvider`, `FutureRapidoProvider`), filters by user budget, prioritizes the cheapest suitable ride, falls back automatically if an option is unavailable, and enforces single-confirmation concurrency safety.
2. **Public Transport & Multimodal Journey Planner**: Computes step-by-step `Bus`, `Metro`, `Auto`, and `Walking` combinations with transfer points, walking distance, and interactive **Leaflet + OpenStreetMap** visualization.
3. **Smart Budget Intelligence**: Deterministically compares costs across private rides, public transit, multimodal combos, and shared carpools against the user's budget cap.
4. **AI Carpool Matching**: Calculates deterministic compatibility scores using pickup proximity, destination similarity, corridor bearing alignment, departure time window, and seat capacity—enforcing strict location privacy until mutual consent is confirmed.
5. **Passenger Incident Reporting**: Enables passengers to report `Delay`, `Skipped stop`, `Overcrowding`, `Road obstruction`, `Service disruption`, and `Other` issues with AI summarization, duplicate detection, and user-approved complaint drafts.
6. **AI Mobility Intelligence**: Integrates Google Gemini (`@google/genai`) exclusively on the backend with strict Zod schema validation and deterministic numerical inputs.

---

## 2. Technology Stack

### Frontend
- **React 19** + **Vite 6**
- **React Router v7**
- **Tailwind CSS v4**
- **Axios** (with JWT interceptor)
- **Leaflet** + **React-Leaflet** + **OpenStreetMap**
- **Lucide React** icons

### Backend
- **Node.js** + **Express.js** (`/api/v1` REST architecture)
- **JSON Web Token (`jsonwebtoken`)** + **`bcryptjs`** custom authentication
- **Zod** request and AI output schema validation
- **Helmet**, **CORS allowlist**, and **`express-rate-limit`** security middleware
- **Google Gemini SDK (`@google/genai`)**

### Database
- **Supabase PostgreSQL** via official `@supabase/supabase-js` client (`database/migrations/001_initial_schema.sql`)
- Automatic local PostgreSQL-compatible transactional persistence fallback (`backend/data/local-store.json`) when running offline or before remote Supabase credentials are supplied.

---

## 3. Repository Structure

```text
rushroute/
├── frontend/                  # React + Vite + Tailwind + Leaflet application
│   ├── src/
│   │   ├── components/        # Reusable UI, Map, Ride, Journey, Carpool, Incident & AI components
│   │   ├── context/           # AuthContext & JWT session management
│   │   ├── layouts/           # AppLayout, Navbar, MobileNavigation, Footer, ProtectedRoute, AdminRoute
│   │   ├── pages/             # All 15 Public, Protected, and Admin route pages
│   │   ├── services/          # Axios API client & hub suggestions
│   │   ├── App.jsx            # Route definitions
│   │   └── main.jsx           # Application entry point
│   ├── .env.example
│   └── vercel.json
├── backend/                   # Express REST API server
│   ├── src/
│   │   ├── config/            # Environment & Supabase/Persistent Database repository
│   │   ├── controllers/       # Auth, User, Ride, Journey, Carpool, Incident, AI & Admin controllers
│   │   ├── middleware/        # JWT authentication, RBAC & Zod validation middleware
│   │   ├── routes/            # /api/v1 router
│   │   ├── services/          # ProviderAdapter, TransitService, CarpoolService, GeminiService
│   │   ├── tests/             # Automated integration test suite (api.test.js)
│   │   ├── utils/             # Haversine distance, bearing & hub coordinate resolution
│   │   ├── validators/        # All 12+ reusable Zod validation schemas
│   │   ├── app.js
│   │   └── server.js
│   └── .env.example
├── database/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed/
│       └── 001_demo_seed.sql
├── docs/
│   ├── API.md
│   ├── DATABASE.md
│   └── DEPLOYMENT.md
├── render.yaml
└── README.md
```

---

## 4. Local Setup & Running the Application

### Prerequisites
- Node.js v18+ and npm

### Step 1 — Install Dependencies
```bash
npm --prefix backend install
npm --prefix frontend install
```

### Step 2 — Configure Environment Variables
Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`.

**`backend/.env.example`**:
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=1d
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GEOAPIFY_API_KEY=
MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

**`frontend/.env.example`**:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_GEOAPIFY_API_KEY=
VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
```

#### Geoapify & Leaflet + OpenStreetMap Mapping Configuration
- RushRoute uses **Leaflet + OpenStreetMap** out of the box with zero mandatory paid API dependencies, and automatically upgrades to **Geoapify** map tiles (`osm-bright`), **Geoapify Location Autocomplete**, **Geoapify Reverse Geocoding**, and **Geoapify Pedestrian/Driving Routing API** when `VITE_GEOAPIFY_API_KEY` is provided in `frontend/.env`.
- To enable Geoapify:
  1. Create a free account at `https://myprojects.geoapify.com` (3,000 free credits/day, no credit card required).
  2. Copy your API key and set `VITE_GEOAPIFY_API_KEY=your_geoapify_key` in `frontend/.env` (and optionally `GEOAPIFY_API_KEY=your_geoapify_key` in `backend/.env`).
- If `VITE_GEOAPIFY_API_KEY` is left empty, `RouteMap.jsx` and `LocationInput` seamlessly fall back to **Leaflet + OpenStreetMap** tiles and deterministic Bengaluru street-grid routing.

### Step 3 — Database Setup (Supabase PostgreSQL)
Execute [`database/migrations/001_initial_schema.sql`](database/migrations/001_initial_schema.sql) and [`database/seed/001_demo_seed.sql`](database/seed/001_demo_seed.sql) in your Supabase SQL Editor. (If `SUPABASE_URL` is left blank during local development, the backend automatically persists all tables and constraints in `backend/data/local-store.json` seeded with the demo accounts.)

### Step 4 — Start Backend & Frontend
```bash
# Terminal 1: Start Express API on http://localhost:5000
npm --prefix backend start

# Terminal 2: Start Vite React app on http://localhost:5173
npm --prefix frontend run dev
```

### Step 5 — Run Automated Backend Integration Tests
```bash
npm --prefix backend test
```

---

## 5. Demo Accounts (Pre-Seeded)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Commuter (User)** | `aarav.demo@rushroute.in` | `RushRoute@2026` |
| **Carpool Partner (User)** | `priya.demo@rushroute.in` | `RushRoute@2026` |
| **Administrator (Admin)** | `admin@rushroute.in` | `RushRoute@2026` |

---

## 6. Documentation & Deployment Links

- **REST API Reference**: [`docs/API.md`](docs/API.md)
- **Database Schema & RLS Guide**: [`docs/DATABASE.md`](docs/DATABASE.md)
- **Production Deployment Guide (Vercel + Render + Supabase)**: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

---

## 7. Known Limitations & Transparency Disclosures

1. **Third-Party Ride Providers**: Real-time Uber, Ola, and Rapido booking APIs require commercial partner agreements. RushRoute implements `DemoRideProvider` for functional simulated quotes/bookings alongside explicit `FutureUberProvider`, `FutureOlaProvider`, and `FutureRapidoProvider` adapter stubs. Every simulated fare and booking is clearly labelled as demonstration data.
2. **Public Transport Telemetry**: Public bus and metro routes use a schedule-based demonstration corridor dataset. Live BMTC GPS tracking is never claimed without an authorized transit feed.
3. **Passenger Complaint Submission**: AI-drafted transit complaints require explicit passenger review and approval and are never automatically transmitted to external authorities without an official grievance API integration.
