-- ============================================================================
-- RushRoute Demonstration Seed Data (PostgreSQL / Supabase)
-- File: database/seed/001_demo_seed.sql
-- Password for all demo accounts: RushRoute@2026 (Verified 10-round bcrypt hash)
-- Safe to run multiple times (idempotent via ON CONFLICT DO NOTHING)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Parent Table: app_users (No foreign key dependencies)
-- ============================================================================
INSERT INTO app_users (id, full_name, email, password_hash, phone, role, is_active)
VALUES
  (
    '11111111-1111-4111-8111-111111111101',
    'Aarav Sharma (Demo Commuter)',
    'aarav.demo@rushroute.in',
    '$2b$10$Eibz9nSbH.y31b7LDnG0r.tMxYeqXiB/5pUmEO/jtJAGl3X/SJFCu',
    '+91-9876543210',
    'user',
    TRUE
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'Priya Nair (Demo Carpool Partner)',
    'priya.demo@rushroute.in',
    '$2b$10$Eibz9nSbH.y31b7LDnG0r.tMxYeqXiB/5pUmEO/jtJAGl3X/SJFCu',
    '+91-9876543211',
    'user',
    TRUE
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'Rohan Verma (Demo Carpool Partner)',
    'rohan.demo@rushroute.in',
    '$2b$10$Eibz9nSbH.y31b7LDnG0r.tMxYeqXiB/5pUmEO/jtJAGl3X/SJFCu',
    '+91-9876543212',
    'user',
    TRUE
  ),
  (
    '11111111-1111-4111-8111-111111111104',
    'Sneha Kulkarni (Demo Carpool Partner)',
    'sneha.demo@rushroute.in',
    '$2b$10$Eibz9nSbH.y31b7LDnG0r.tMxYeqXiB/5pUmEO/jtJAGl3X/SJFCu',
    '+91-9876543213',
    'user',
    TRUE
  ),
  (
    '11111111-1111-4111-8111-111111111199',
    'RushRoute Operations Admin',
    'admin@rushroute.in',
    '$2b$10$Eibz9nSbH.y31b7LDnG0r.tMxYeqXiB/5pUmEO/jtJAGl3X/SJFCu',
    '+91-9876500000',
    'admin',
    TRUE
  )
ON CONFLICT (email) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- 2. Dependent Table: user_preferences (user_id -> app_users.id)
-- ============================================================================
INSERT INTO user_preferences (
  id,
  user_id,
  preferred_transport_modes,
  default_budget,
  accessibility_preferences
)
SELECT
  '55555555-5555-4555-8555-555555555501',
  u.id,
  '["Metro", "Bus", "Auto"]'::jsonb,
  250.00,
  '{"wheelchairAccessible": false, "avoidLongWalks": false, "preferDirectRoutes": false}'::jsonb
FROM app_users u
WHERE u.email = 'aarav.demo@rushroute.in'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- 3. Dependent Table: saved_locations (user_id -> app_users.id)
-- ============================================================================
INSERT INTO saved_locations (id, user_id, label, address, latitude, longitude)
SELECT
  '33333333-3333-4333-8333-333333333301',
  u.id,
  'Home',
  'Indiranagar (100 Feet Road / Metro)',
  12.9784,
  77.6408
FROM app_users u
WHERE u.email = 'aarav.demo@rushroute.in'
ON CONFLICT (id) DO NOTHING;

INSERT INTO saved_locations (id, user_id, label, address, latitude, longitude)
SELECT
  '33333333-3333-4333-8333-333333333302',
  u.id,
  'Office',
  'Whitefield (Kadugodi / ITPL)',
  12.9855,
  77.7364
FROM app_users u
WHERE u.email = 'aarav.demo@rushroute.in'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. Dependent Table: carpool_requests (user_id -> app_users.id)
-- ============================================================================
INSERT INTO carpool_requests (
  id,
  user_id,
  pickup_address,
  destination_address,
  pickup_latitude,
  pickup_longitude,
  destination_latitude,
  destination_longitude,
  departure_time,
  available_seats,
  estimated_budget,
  status
)
SELECT
  '22222222-2222-4222-8222-222222222201',
  u.id,
  'Indiranagar (100 Feet Road / Metro)',
  'Whitefield (Kadugodi / ITPL)',
  12.9784,
  77.6408,
  12.9855,
  77.7364,
  NOW() + INTERVAL '45 minutes',
  3,
  140.00,
  'open'
FROM app_users u
WHERE u.email = 'priya.demo@rushroute.in'
ON CONFLICT (id) DO NOTHING;

INSERT INTO carpool_requests (
  id,
  user_id,
  pickup_address,
  destination_address,
  pickup_latitude,
  pickup_longitude,
  destination_latitude,
  destination_longitude,
  departure_time,
  available_seats,
  estimated_budget,
  status
)
SELECT
  '22222222-2222-4222-8222-222222222202',
  u.id,
  'Koramangala (Sony World / 5th Block)',
  'Electronic City Phase 1 (Wipro Gate / Infosys)',
  12.9352,
  77.6245,
  12.8452,
  77.6602,
  NOW() + INTERVAL '30 minutes',
  2,
  130.00,
  'open'
FROM app_users u
WHERE u.email = 'rohan.demo@rushroute.in'
ON CONFLICT (id) DO NOTHING;

INSERT INTO carpool_requests (
  id,
  user_id,
  pickup_address,
  destination_address,
  pickup_latitude,
  pickup_longitude,
  destination_latitude,
  destination_longitude,
  departure_time,
  available_seats,
  estimated_budget,
  status
)
SELECT
  '22222222-2222-4222-8222-222222222203',
  u.id,
  'MG Road Metro Station',
  'Hebbal / Manyata Tech Park',
  12.9756,
  77.6066,
  13.0475,
  77.6212,
  NOW() + INTERVAL '75 minutes',
  3,
  150.00,
  'open'
FROM app_users u
WHERE u.email = 'sneha.demo@rushroute.in'
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. Dependent Table: incident_reports (user_id -> app_users.id)
-- ============================================================================
INSERT INTO incident_reports (
  id,
  user_id,
  category,
  description,
  location,
  route_name,
  latitude,
  longitude,
  ai_summary,
  status
)
SELECT
  '44444444-4444-4444-8444-444444444401',
  u.id,
  'Delay',
  'Eastbound feeder bus toward ITPL delayed by approximately 20 minutes near Hoodi junction due to signal congestion.',
  'Hoodi Junction, Whitefield Road',
  'Corridor 500-D (Demo Schedule)',
  12.9915,
  77.7158,
  'Passenger reported a ~20-minute bus delay on Corridor 500-D near Hoodi Junction caused by traffic signal congestion. Unverified passenger report.',
  'under_review'
FROM app_users u
WHERE u.email = 'priya.demo@rushroute.in'
ON CONFLICT (id) DO NOTHING;

INSERT INTO incident_reports (
  id,
  user_id,
  category,
  description,
  location,
  route_name,
  latitude,
  longitude,
  ai_summary,
  status
)
SELECT
  '44444444-4444-4444-8444-444444444402',
  u.id,
  'Overcrowding',
  'Heavy peak-hour platform crowding at Silk Board interchange bus bay between 8:45 AM and 9:30 AM.',
  'Silk Board Junction',
  'Silk Board - Electronic City Express Corridor',
  12.9177,
  77.6238,
  'Passenger reported severe morning peak-hour overcrowding at Silk Board Junction bus bay (8:45–9:30 AM). Unverified passenger report.',
  'reported'
FROM app_users u
WHERE u.email = 'rohan.demo@rushroute.in'
ON CONFLICT (id) DO NOTHING;

COMMIT;
