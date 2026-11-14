# RushRoute Deployment Guide (Supabase + Render + Vercel)

## 1. Database Setup (Supabase PostgreSQL)
1. Create a new Supabase project at [https://supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run `database/migrations/001_initial_schema.sql`.
3. Run `database/seed/001_demo_seed.sql` to seed demonstration accounts.
4. Retrieve `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from **Project Settings → API**.

## 2. Backend Deployment (Render)
1. Push this repository to GitHub.
2. In [Render](https://render.com), create a new **Web Service** connected to the GitHub repository (or use the included `render.yaml` Blueprint).
3. Configure the service:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add Environment Variables in Render:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `FRONTEND_URL=https://your-rushroute-frontend.vercel.app`
   - `SUPABASE_URL=<your_supabase_url>`
   - `SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>`
   - `JWT_SECRET=<strong_random_secret>`
   - `JWT_EXPIRES_IN=1d`
   - `GEMINI_API_KEY=<your_google_gemini_api_key>`
   - `GEMINI_MODEL=gemini-2.5-flash`
   - `MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

## 3. Frontend Deployment (Vercel)
1. In [Vercel](https://vercel.com), import the GitHub repository.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite** (`npm run build`, output directory `dist`).
4. Configure Environment Variables in Vercel:
   - `VITE_API_BASE_URL=https://your-rushroute-backend.onrender.com/api/v1`
   - `VITE_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
5. Deploy and verify `/health` and login flows.
