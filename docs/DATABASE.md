# RushRoute Database Architecture & Migration Guide

## 1. Authoritative Authentication & Schema Design

RushRoute implements custom JWT authentication with `bcrypt` password hashing as required by the specification.
- **`app_users`** is the authoritative user account table storing `password_hash`, `role` (`user` | `admin`), and profile metadata.
- **`profiles`** is included for schema completeness if Supabase Auth is ever linked in future deployments.
- All 11 tables use UUID primary keys (`gen_random_uuid()`), foreign key constraints, check constraints, and `updated_at` triggers.

## 2. Tables Overview
1. `profiles`
2. `app_users`
3. `saved_locations`
4. `ride_requests`
5. `ride_bookings` (with partial unique index `idx_unique_confirmed_booking_per_request` preventing duplicate confirmed bookings for the same ride request)
6. `journeys`
7. `carpool_requests`
8. `carpool_matches` (with `chk_distinct_carpool_requests` and unique pair index `idx_unique_carpool_match_pair`)
9. `incident_reports`
10. `user_preferences`
11. `ai_interactions` (stores sanitized interaction summaries; never stores tokens, passwords, or sensitive PII)

## 3. Executing the SQL Migration on Supabase PostgreSQL

1. Open your Supabase project dashboard and navigate to the **SQL Editor**.
2. Copy the contents of [`database/migrations/001_initial_schema.sql`](../database/migrations/001_initial_schema.sql) and execute the query.
3. Optional: Run [`database/seed/001_demo_seed.sql`](../database/seed/001_demo_seed.sql) to populate the demonstration commuter and admin accounts (`aarav.demo@rushroute.in`, `priya.demo@rushroute.in`, `rohan.demo@rushroute.in`, `admin@rushroute.in` — password: `RushRoute@2026`).
4. Copy your project's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into `backend/.env` (never into `frontend/.env`).

## 4. Row Level Security (RLS) & Data Isolation

- RLS is enabled on all application tables in `001_initial_schema.sql`.
- Because RushRoute uses custom application JWTs verified by the Express backend middleware (`src/middleware/auth.js`), the frontend never queries Supabase directly and never receives `SUPABASE_SERVICE_ROLE_KEY`.
- Every user-owned query in the Express controllers filters strictly by `req.user.id` derived from the verified JWT.
