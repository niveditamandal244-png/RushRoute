-- ============================================================================
-- RushRoute Demonstration Seed Data (PostgreSQL / Supabase)
-- File: database/seed/001_demo_seed.sql
-- Password for demo accounts: RushRoute@2026 (bcrypt hashed)
-- ============================================================================

INSERT INTO app_users (id, full_name, email, password_hash, phone, role, is_active)
VALUES
  (
    '11111111-1111-4111-8111-111111111101',
    'Aarav Sharma (Demo Commuter)',
    'aarav.demo@rushroute.in',
    '$2b$10$wT3yI9G1Z2O.7K8p8q0qB.M3h8E2mO6L1k9F7X4c5V2b8N0r1P3qW',
    '+91-9876543210',
    'user',
    TRUE
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    'Priya Nair (Demo Carpool Partner)',
    'priya.demo@rushroute.in',
    '$2b$10$wT3yI9G1Z2O.7K8p8q0qB.M3h8E2mO6L1k9F7X4c5V2b8N0r1P3qW',
    '+91-9876543211',
    'user',
    TRUE
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    'Rohan Verma (Demo Carpool Partner)',
    'rohan.demo@rushroute.in',
    '$2b$10$wT3yI9G1Z2O.7K8p8q0qB.M3h8E2mO6L1k9F7X4c5V2b8N0r1P3qW',
    '+91-9876543212',
    'user',
    TRUE
  ),
  (
    '11111111-1111-4111-8111-111111111199',
    'RushRoute Operations Admin',
    'admin@rushroute.in',
    '$2b$10$wT3yI9G1Z2O.7K8p8q0qB.M3h8E2mO6L1k9F7X4c5V2b8N0r1P3qW',
    '+91-9876500000',
    'admin',
    TRUE
  )
ON CONFLICT (email) DO NOTHING;

INSERT INTO carpool_requests (
  id, user_id, pickup_address, destination_address,
  pickup_latitude, pickup_longitude, destination_latitude, destination_longitude,
  departure_time, available_seats, estimated_budget, status
)
VALUES
  (
    '22222222-2222-4222-8222-222222222201',
    '11111111-1111-4111-8111-111111111102',
    'Indiranagar Metro Station, Bengaluru',
    'Manyata Tech Park, Hebbal, Bengaluru',
    12.9784, 77.6408, 13.0475, 77.6212,
    NOW() + INTERVAL '45 minutes',
    3,
    180.00,
    'open'
  ),
  (
    '22222222-2222-4222-8222-222222222202',
    '11111111-1111-4111-8222-111111111103',
    'Koramangala Sony World Signal, Bengaluru',
    'Electronic City Phase 1, Bengaluru',
    12.9352, 77.6245, 12.8452, 77.6602,
    NOW() + INTERVAL '30 minutes',
    2,
    150.00,
    'open'
  )
ON CONFLICT (id) DO NOTHING;
