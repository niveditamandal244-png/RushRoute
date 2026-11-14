-- ============================================================================
-- RushRoute Production Database Migration (PostgreSQL / Supabase)
-- File: database/migrations/001_initial_schema.sql
-- ============================================================================

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper trigger function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10.1 profiles (Included for Supabase Auth compatibility if needed;
--                app_users is the authoritative custom JWT + bcrypt table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10.2 app_users (Authoritative Custom JWT + bcrypt Authentication Table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_app_users_updated_at ON app_users;
CREATE TRIGGER trg_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10.3 saved_locations
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10.4 ride_requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  pickup_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  pickup_latitude DOUBLE PRECISION,
  pickup_longitude DOUBLE PRECISION,
  destination_latitude DOUBLE PRECISION,
  destination_longitude DOUBLE PRECISION,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('Bike', 'Auto', 'Mini', 'Sedan')),
  minimum_budget NUMERIC(10,2) CHECK (minimum_budget IS NULL OR minimum_budget > 0),
  maximum_budget NUMERIC(10,2) CHECK (maximum_budget IS NULL OR maximum_budget > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'confirmed', 'cancelled', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_budget_range CHECK (
    minimum_budget IS NULL OR maximum_budget IS NULL OR minimum_budget <= maximum_budget
  )
);

-- ============================================================================
-- 10.5 ride_bookings
-- ============================================================================
CREATE TABLE IF NOT EXISTS ride_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  ride_request_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('Bike', 'Auto', 'Mini', 'Sedan')),
  estimated_fare NUMERIC(10,2) NOT NULL CHECK (estimated_fare > 0),
  estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
  booking_status TEXT NOT NULL DEFAULT 'pending' CHECK (booking_status IN ('pending', 'confirmed', 'cancelled', 'failed', 'completed')),
  is_simulated BOOLEAN DEFAULT TRUE,
  provider_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_ride_bookings_updated_at ON ride_bookings;
CREATE TRIGGER trg_ride_bookings_updated_at
  BEFORE UPDATE ON ride_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Database-level protection against multiple confirmed bookings for the same ride request
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_confirmed_booking_per_request
  ON ride_bookings (ride_request_id)
  WHERE booking_status = 'confirmed';

-- ============================================================================
-- 10.6 journeys
-- ============================================================================
CREATE TABLE IF NOT EXISTS journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  pickup_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  transport_modes JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_fare NUMERIC(10,2),
  estimated_duration_minutes INTEGER,
  route_details JSONB,
  journey_status TEXT DEFAULT 'planned' CHECK (journey_status IN ('planned', 'selected', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10.7 carpool_requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS carpool_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  pickup_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  pickup_latitude DOUBLE PRECISION,
  pickup_longitude DOUBLE PRECISION,
  destination_latitude DOUBLE PRECISION,
  destination_longitude DOUBLE PRECISION,
  departure_time TIMESTAMPTZ NOT NULL,
  available_seats INTEGER NOT NULL CHECK (available_seats >= 1 AND available_seats <= 6),
  estimated_budget NUMERIC(10,2) CHECK (estimated_budget IS NULL OR estimated_budget > 0),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'matched', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10.8 carpool_matches
-- ============================================================================
CREATE TABLE IF NOT EXISTS carpool_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES carpool_requests(id) ON DELETE CASCADE,
  matched_request_id UUID NOT NULL REFERENCES carpool_requests(id) ON DELETE CASCADE,
  compatibility_score NUMERIC(5,2) NOT NULL CHECK (compatibility_score >= 0 AND compatibility_score <= 100),
  estimated_shared_cost NUMERIC(10,2) CHECK (estimated_shared_cost IS NULL OR estimated_shared_cost >= 0),
  match_status TEXT DEFAULT 'pending' CHECK (match_status IN ('pending', 'requester_accepted', 'partner_accepted', 'accepted', 'declined', 'cancelled', 'reported')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_distinct_carpool_requests CHECK (request_id <> matched_request_id)
);

-- Prevent duplicate match pairs regardless of direction
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_carpool_match_pair
  ON carpool_matches (
    LEAST(request_id, matched_request_id),
    GREATEST(request_id, matched_request_id)
  );

-- ============================================================================
-- 10.9 incident_reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('Delay', 'Skipped stop', 'Overcrowding', 'Road obstruction', 'Service disruption', 'Other')),
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  route_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ai_summary TEXT,
  status TEXT DEFAULT 'reported' CHECK (status IN ('reported', 'under_review', 'verified', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10.10 user_preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  preferred_transport_modes JSONB DEFAULT '["Metro", "Bus", "Auto"]'::jsonb,
  default_budget NUMERIC(10,2) DEFAULT 250.00,
  accessibility_preferences JSONB DEFAULT '{"wheelchairAccessible": false, "avoidLongWalks": false, "preferDirectRoutes": false}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10.11 ai_interactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  model_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10.12 Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_saved_locations_user_id ON saved_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_user_id ON ride_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests(status);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_user_id ON ride_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_ride_request_id ON ride_bookings(ride_request_id);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_status ON ride_bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_journeys_user_id ON journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_journeys_created_at ON journeys(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_carpool_requests_user_id ON carpool_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_carpool_requests_departure_time ON carpool_requests(departure_time);
CREATE INDEX IF NOT EXISTS idx_carpool_requests_status ON carpool_requests(status);
CREATE INDEX IF NOT EXISTS idx_carpool_matches_request_id ON carpool_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_carpool_matches_matched_request_id ON carpool_matches(matched_request_id);
CREATE INDEX IF NOT EXISTS idx_incident_reports_category ON incident_reports(category);
CREATE INDEX IF NOT EXISTS idx_incident_reports_created_at ON incident_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_reports_status ON incident_reports(status);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON ai_interactions(user_id);

-- ============================================================================
-- 11. Row Level Security (RLS) & Data Isolation
-- ============================================================================
-- Enable RLS across all application tables.
-- Because RushRoute uses custom JWT authentication verified by the Express backend,
-- direct anonymous/public access is denied by default, and all data access flows
-- through the Express backend with strict ownership and role-based checks.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpool_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpool_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
