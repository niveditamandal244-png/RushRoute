import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_STORE_PATH = path.resolve(__dirname, '../../data/local-store.json');

// Initialize official Supabase client when credentials are provided
export const supabaseClient = env.isSupabaseConfigured
  ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

// Concurrency mutex for atomic database transactions (prevents duplicate confirmed bookings & duplicate carpool pairs)
let transactionChain = Promise.resolve();
export function withDatabaseTransaction(fn) {
  const next = transactionChain.then(() => fn());
  transactionChain = next.catch(() => {});
  return next;
}

function getInitialSeedData() {
  const demoPasswordHash = bcrypt.hashSync('RushRoute@2026', 10);
  const now = new Date();
  const in35Min = new Date(now.getTime() + 35 * 60 * 1000).toISOString();
  const in50Min = new Date(now.getTime() + 50 * 60 * 1000).toISOString();
  const in75Min = new Date(now.getTime() + 75 * 60 * 1000).toISOString();

  return {
    profiles: [],
    app_users: [
      {
        id: '11111111-1111-4111-8111-111111111101',
        full_name: 'Aarav Sharma (Demo Commuter)',
        email: 'aarav.demo@rushroute.in',
        password_hash: demoPasswordHash,
        phone: '+91-9876543210',
        role: 'user',
        is_active: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: '11111111-1111-4111-8111-111111111102',
        full_name: 'Priya Nair (Demo Carpool Partner)',
        email: 'priya.demo@rushroute.in',
        password_hash: demoPasswordHash,
        phone: '+91-9876543211',
        role: 'user',
        is_active: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: '11111111-1111-4111-8111-111111111103',
        full_name: 'Rohan Verma (Demo Carpool Partner)',
        email: 'rohan.demo@rushroute.in',
        password_hash: demoPasswordHash,
        phone: '+91-9876543212',
        role: 'user',
        is_active: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: '11111111-1111-4111-8111-111111111104',
        full_name: 'Sneha Kulkarni (Demo Carpool Partner)',
        email: 'sneha.demo@rushroute.in',
        password_hash: demoPasswordHash,
        phone: '+91-9876543213',
        role: 'user',
        is_active: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      {
        id: '11111111-1111-4111-8111-111111111199',
        full_name: 'RushRoute Operations Admin',
        email: 'admin@rushroute.in',
        password_hash: demoPasswordHash,
        phone: '+91-9876500000',
        role: 'admin',
        is_active: true,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      }
    ],
    saved_locations: [
      {
        id: '33333333-3333-4333-8333-333333333301',
        user_id: '11111111-1111-4111-8111-111111111101',
        label: 'Home',
        address: 'Indiranagar (100 Feet Road / Metro)',
        latitude: 12.9784,
        longitude: 77.6408,
        created_at: now.toISOString()
      },
      {
        id: '33333333-3333-4333-8333-333333333302',
        user_id: '11111111-1111-4111-8111-111111111101',
        label: 'Office',
        address: 'Whitefield (Kadugodi / ITPL)',
        latitude: 12.9855,
        longitude: 77.7364,
        created_at: now.toISOString()
      }
    ],
    ride_requests: [],
    ride_bookings: [],
    journeys: [],
    carpool_requests: [
      {
        id: '22222222-2222-4222-8222-222222222201',
        user_id: '11111111-1111-4111-8111-111111111102',
        pickup_address: 'Indiranagar (100 Feet Road / Metro)',
        destination_address: 'Whitefield (Kadugodi / ITPL)',
        pickup_latitude: 12.9784,
        pickup_longitude: 77.6408,
        destination_latitude: 12.9855,
        destination_longitude: 77.7364,
        departure_time: in35Min,
        available_seats: 3,
        estimated_budget: 140,
        status: 'open',
        created_at: now.toISOString()
      },
      {
        id: '22222222-2222-4222-8222-222222222202',
        user_id: '11111111-1111-4111-8111-111111111103',
        pickup_address: 'Koramangala (Sony World / 5th Block)',
        destination_address: 'Electronic City Phase 1 (Wipro Gate / Infosys)',
        pickup_latitude: 12.9352,
        pickup_longitude: 77.6245,
        destination_latitude: 12.8452,
        destination_longitude: 77.6602,
        departure_time: in50Min,
        available_seats: 2,
        estimated_budget: 130,
        status: 'open',
        created_at: now.toISOString()
      },
      {
        id: '22222222-2222-4222-8222-222222222203',
        user_id: '11111111-1111-4111-8111-111111111104',
        pickup_address: 'MG Road Metro Station',
        destination_address: 'Hebbal / Manyata Tech Park',
        pickup_latitude: 12.9756,
        pickup_longitude: 77.6066,
        destination_latitude: 13.0475,
        destination_longitude: 77.6212,
        departure_time: in75Min,
        available_seats: 3,
        estimated_budget: 150,
        status: 'open',
        created_at: now.toISOString()
      }
    ],
    carpool_matches: [],
    incident_reports: [
      {
        id: '44444444-4444-4444-8444-444444444401',
        user_id: '11111111-1111-4111-8111-111111111102',
        category: 'Delay',
        description: 'Eastbound feeder bus toward ITPL delayed by approximately 20 minutes near Hoodi junction due to signal congestion.',
        location: 'Hoodi Junction, Whitefield Road',
        route_name: 'Corridor 500-D (Demo Schedule)',
        latitude: 12.9915,
        longitude: 77.7158,
        ai_summary: 'Passenger reported a ~20-minute bus delay on Corridor 500-D near Hoodi Junction caused by traffic signal congestion. Unverified passenger report.',
        status: 'under_review',
        created_at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString()
      },
      {
        id: '44444444-4444-4444-8444-444444444402',
        user_id: '11111111-1111-4111-8111-111111111103',
        category: 'Overcrowding',
        description: 'Heavy peak-hour platform crowding at Silk Board interchange bus bay between 8:45 AM and 9:30 AM.',
        location: 'Silk Board Junction',
        route_name: 'Silk Board - Electronic City Express Corridor',
        latitude: 12.9177,
        longitude: 77.6238,
        ai_summary: 'Passenger reported severe morning peak-hour overcrowding at Silk Board Junction bus bay (8:45–9:30 AM). Unverified passenger report.',
        status: 'reported',
        created_at: new Date(now.getTime() - 4 * 3600 * 1000).toISOString()
      }
    ],
    user_preferences: [
      {
        id: '55555555-5555-4555-8555-555555555501',
        user_id: '11111111-1111-4111-8111-111111111101',
        preferred_transport_modes: ['Metro', 'Bus', 'Auto'],
        default_budget: 250,
        accessibility_preferences: {
          wheelchairAccessible: false,
          avoidLongWalks: false,
          preferDirectRoutes: false
        },
        updated_at: now.toISOString()
      }
    ],
    ai_interactions: []
  };
}

function readLocalStore() {
  try {
    const dir = path.dirname(LOCAL_STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_STORE_PATH)) {
      const seed = getInitialSeedData();
      fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(seed, null, 2), 'utf8');
      return seed;
    }
    const raw = fs.readFileSync(LOCAL_STORE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    const seed = getInitialSeedData();
    return seed;
  }
}

function writeLocalStore(data) {
  const dir = path.dirname(LOCAL_STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(LOCAL_STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Unified Database Repository Interface supporting Supabase PostgreSQL + Local Persistent Adapter
export const db = {
  getMode() {
    return supabaseClient ? 'supabase_postgresql' : 'local_postgresql_compatible_persistence';
  },

  async insert(table, record) {
    const now = new Date().toISOString();
    const row = {
      id: record.id || crypto.randomUUID(),
      created_at: record.created_at || now,
      ...record
    };
    if (['app_users', 'profiles', 'ride_bookings', 'user_preferences'].includes(table)) {
      row.updated_at = record.updated_at || now;
    }

    if (supabaseClient) {
      const { data, error } = await supabaseClient.from(table).insert(row).select().single();
      if (error) {
        const err = new Error(error.message);
        err.code = error.code;
        throw err;
      }
      return data;
    }

    const store = readLocalStore();
    if (!store[table]) store[table] = [];

    // Enforce unique constraints identical to PostgreSQL schema
    if (table === 'app_users') {
      const exists = store.app_users.some(
        (u) => u.email.toLowerCase() === String(row.email).toLowerCase()
      );
      if (exists) {
        const err = new Error('Duplicate key value violates unique constraint "app_users_email_key"');
        err.code = '23505';
        throw err;
      }
    }

    if (table === 'ride_bookings' && row.booking_status === 'confirmed') {
      const alreadyConfirmed = store.ride_bookings.some(
        (b) => b.ride_request_id === row.ride_request_id && b.booking_status === 'confirmed'
      );
      if (alreadyConfirmed) {
        const err = new Error(
          'Duplicate confirmed booking blocked by idx_unique_confirmed_booking_per_request'
        );
        err.code = '23505';
        throw err;
      }
    }

    if (table === 'carpool_matches') {
      if (row.request_id === row.matched_request_id) {
        const err = new Error('chk_distinct_carpool_requests: request_id and matched_request_id cannot be identical');
        err.code = '23514';
        throw err;
      }
      const pairKeyA = [row.request_id, row.matched_request_id].sort().join(':');
      const duplicatePair = store.carpool_matches.some((m) => {
        const pairKeyB = [m.request_id, m.matched_request_id].sort().join(':');
        return pairKeyA === pairKeyB;
      });
      if (duplicatePair) {
        const err = new Error('Duplicate carpool match pair blocked by idx_unique_carpool_match_pair');
        err.code = '23505';
        throw err;
      }
    }

    store[table].push(row);
    writeLocalStore(store);
    return row;
  },

  async findMany(table, filterFnOrObj = {}, options = {}) {
    if (supabaseClient && typeof filterFnOrObj === 'object' && filterFnOrObj !== null) {
      let query = supabaseClient.from(table).select('*');
      for (const [k, v] of Object.entries(filterFnOrObj)) {
        if (v !== undefined) {
          query = query.eq(k, v);
        }
      }
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: Boolean(options.ascending) });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    }

    const store = readLocalStore();
    const rows = store[table] || [];
    let filtered = rows.filter((r) => {
      if (typeof filterFnOrObj === 'function') {
        return filterFnOrObj(r);
      }
      for (const [k, v] of Object.entries(filterFnOrObj)) {
        if (v !== undefined && r[k] !== v) return false;
      }
      return true;
    });

    const sortKey = options.orderBy || 'created_at';
    const asc = Boolean(options.ascending);
    filtered.sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });

    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    return filtered;
  },

  async findOne(table, filterFnOrObj = {}) {
    const list = await this.findMany(table, filterFnOrObj);
    return list[0] || null;
  },

  async update(table, id, updates) {
    const now = new Date().toISOString();
    const payload = { ...updates };
    if (['app_users', 'profiles', 'ride_bookings', 'user_preferences'].includes(table)) {
      payload.updated_at = now;
    }

    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from(table)
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        const err = new Error(error.message);
        err.code = error.code;
        throw err;
      }
      return data;
    }

    const store = readLocalStore();
    const rows = store[table] || [];
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) return null;

    const updatedRow = { ...rows[idx], ...payload };

    if (table === 'ride_bookings' && updatedRow.booking_status === 'confirmed') {
      const conflict = rows.some(
        (b, i) =>
          i !== idx &&
          b.ride_request_id === updatedRow.ride_request_id &&
          b.booking_status === 'confirmed'
      );
      if (conflict) {
        const err = new Error(
          'Duplicate confirmed booking blocked by idx_unique_confirmed_booking_per_request'
        );
        err.code = '23505';
        throw err;
      }
    }

    rows[idx] = updatedRow;
    writeLocalStore(store);
    return updatedRow;
  },

  async deleteWhere(table, filterFn) {
    const store = readLocalStore();
    const rows = store[table] || [];
    store[table] = rows.filter((r) => !filterFn(r));
    writeLocalStore(store);
  }
};
