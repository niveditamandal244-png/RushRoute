import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always resolves to c:\Users\nived\RushRoute\backend\.env regardless of process.cwd()
const ENV_FILE_PATH = path.resolve(__dirname, '../../.env');

let envLoaded = false;
let envError = null;

try {
  if (fs.existsSync(ENV_FILE_PATH)) {
    const raw = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    const parsed = dotenv.parse(raw);
    for (const [key, value] of Object.entries(parsed)) {
      // Populate if unset OR if existing process.env[key] is an empty/whitespace string
      if (process.env[key] === undefined || String(process.env[key]).trim() === '') {
        process.env[key] = value;
      }
    }
    envLoaded = true;
  } else {
    envError = 'ENOENT';
  }
} catch (err) {
  envError = err.code || 'LOAD_FAILED';
}

// Non-secret diagnostics: file path, load status, and process start time only (never values)
export const envFileInfo = {
  path: ENV_FILE_PATH,
  loaded: envLoaded,
  error: envError,
  processStartedAt: new Date().toISOString()
};

export const env = {
  get NODE_ENV() {
    return process.env.NODE_ENV || 'development';
  },
  get PORT() {
    return Number(process.env.PORT) || 5000;
  },
  get FRONTEND_URL() {
    return process.env.FRONTEND_URL || 'http://localhost:5173';
  },
  get SUPABASE_URL() {
    return (process.env.SUPABASE_URL || '').trim();
  },
  get SUPABASE_SERVICE_ROLE_KEY() {
    return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  },
  get DATABASE_URL() {
    return (process.env.DATABASE_URL || '').trim();
  },
  get JWT_SECRET() {
    return (
      process.env.JWT_SECRET ||
      'rushroute_super_secret_jwt_signing_key_2026_production_grade'
    );
  },
  get JWT_EXPIRES_IN() {
    return process.env.JWT_EXPIRES_IN || '1d';
  },
  get GEMINI_API_KEY() {
    return (process.env.GEMINI_API_KEY || '').trim();
  },
  get GEMINI_MODEL() {
    return (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
  },
  get MAP_TILE_URL() {
    return (
      process.env.MAP_TILE_URL ||
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    );
  },
  get isSupabaseConfigured() {
    return Boolean(
      this.SUPABASE_URL &&
      this.SUPABASE_URL.startsWith('http') &&
      this.SUPABASE_SERVICE_ROLE_KEY &&
      this.SUPABASE_SERVICE_ROLE_KEY.length > 20
    );
  },
  get isGeminiConfigured() {
    return Boolean(this.GEMINI_API_KEY && this.GEMINI_API_KEY.length > 10);
  },
  get missingConfig() {
    const missing = [];
    if (!this.SUPABASE_URL || !this.SUPABASE_URL.startsWith('http')) {
      missing.push('SUPABASE_URL');
    }
    if (!this.SUPABASE_SERVICE_ROLE_KEY || this.SUPABASE_SERVICE_ROLE_KEY.length <= 20) {
      missing.push('SUPABASE_SERVICE_ROLE_KEY');
    }
    if (!this.isGeminiConfigured) {
      missing.push('GEMINI_API_KEY');
    }
    return missing;
  }
};
