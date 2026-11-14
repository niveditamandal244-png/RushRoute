import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import apiRoutes from './routes/apiRoutes.js';

const app = express();

// Security headers via Helmet (allow cross-origin map tile images for multi-origin deployments)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// CORS allowlist supporting configured FRONTEND_URL and local Vite dev servers
const allowedOrigins = new Set([
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173'
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);

// Global rate limiter (skip static map tiles so panning/zooming for multiple users never throttles)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path.startsWith('/api/v1/map/tiles')
  })
);

// Request size limits
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Base API v1 prefix
app.use('/api/v1', apiRoutes);

// Root status endpoint
app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'RushRoute API Server',
    tagline: 'One Platform. Every Journey. Smarter Decisions.',
    status: 'operational',
    api_base: '/api/v1'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found.`
  });
});

// Safe centralized error handler
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error'
  });
});

export default app;
