import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getMe,
  login,
  logout,
  register
} from '../controllers/authController.js';
import {
  getPreferences,
  getProfile,
  updatePreferences,
  updateProfile
} from '../controllers/userController.js';
import {
  acceptRideBooking,
  cancelRideBooking,
  createRideRequest,
  estimateRides,
  getProviders,
  getRideRequestById,
  listRideBookings
} from '../controllers/rideController.js';
import {
  getJourneyById,
  getJourneyHistory,
  recommendJourney,
  searchJourneys
} from '../controllers/journeyController.js';
import {
  cancelCarpoolMatch,
  createCarpoolRequest,
  listCarpoolRequests,
  respondToCarpoolMatch,
  searchCarpoolMatches
} from '../controllers/carpoolController.js';
import {
  analyzeIncidentById,
  createIncident,
  getIncidentById,
  listIncidents,
  updateIncident
} from '../controllers/incidentController.js';
import {
  getCarpoolExplanation,
  getIncidentSummary,
  getJourneyAdvice,
  getRouteExplanation
} from '../controllers/aiController.js';
import {
  getAdminAnalytics,
  getAdminIncidents,
  updateAdminIncidentStatus
} from '../controllers/adminController.js';
import {
  authenticate,
  optionalAuthenticate,
  requireAdmin
} from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  carpoolRequestSchema,
  carpoolResponseSchema,
  incidentReportSchema,
  incidentUpdateSchema,
  journeySearchSchema,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  rideRequestSchema,
  userPreferencesUpdateSchema,
  uuidParamSchema
} from '../validators/schemas.js';
import { db } from '../config/database.js';
import { env } from '../config/env.js';
import { KNOWN_LOCATIONS } from '../utils/geo.js';

const router = express.Router();

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many AI intelligence requests. Please wait a moment before trying again.'
  }
});

// System Health & Hub Metadata
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    service: 'RushRoute Mobility API',
    version: '1.0.0',
    database_mode: db.getMode(),
    gemini_configured: env.isGeminiConfigured,
    gemini_model: env.GEMINI_MODEL,
    timestamp: new Date().toISOString()
  });
});

router.get('/locations/hubs', (_req, res) => {
  res.status(200).json({
    success: true,
    hubs: KNOWN_LOCATIONS
  });
});

// 1. Authentication Routes
router.post('/auth/register', validateBody(registerSchema), register);
router.post('/auth/login', validateBody(loginSchema), login);
router.get('/auth/me', authenticate, getMe);
router.post('/auth/logout', authenticate, logout);

// 2. Profile & Preferences Routes
router.get('/users/profile', authenticate, getProfile);
router.patch('/users/profile', authenticate, validateBody(profileUpdateSchema), updateProfile);
router.get('/users/preferences', authenticate, getPreferences);
router.patch('/users/preferences', authenticate, validateBody(userPreferencesUpdateSchema), updatePreferences);

// 3. Ride Booking Routes
router.get('/rides/providers', getProviders);
router.post('/rides/estimate', optionalAuthenticate, estimateRides);
router.post('/rides/requests', authenticate, validateBody(rideRequestSchema), createRideRequest);
router.get('/rides/requests/:id', authenticate, validateParams(uuidParamSchema), getRideRequestById);
router.get('/rides/bookings', authenticate, listRideBookings);
router.post('/rides/bookings/:id/accept', authenticate, validateParams(uuidParamSchema), acceptRideBooking);
router.post('/rides/bookings/:id/cancel', authenticate, validateParams(uuidParamSchema), cancelRideBooking);

// 4. Public Transport & Journey Routes
router.post('/journeys/search', optionalAuthenticate, validateBody(journeySearchSchema), searchJourneys);
router.get('/journeys/history', authenticate, getJourneyHistory);
router.post('/journeys/recommend', optionalAuthenticate, validateBody(journeySearchSchema), recommendJourney);
router.get('/journeys/:id', authenticate, validateParams(uuidParamSchema), getJourneyById);

// 5. Carpool Routes
router.post('/carpool/requests', authenticate, validateBody(carpoolRequestSchema), createCarpoolRequest);
router.get('/carpool/requests', authenticate, listCarpoolRequests);
router.post('/carpool/matches/search', authenticate, searchCarpoolMatches);
router.post(
  '/carpool/matches/:id/respond',
  authenticate,
  validateParams(uuidParamSchema),
  validateBody(carpoolResponseSchema),
  respondToCarpoolMatch
);
router.post(
  '/carpool/matches/:id/cancel',
  authenticate,
  validateParams(uuidParamSchema),
  cancelCarpoolMatch
);

// 6. Incident Reporting Routes
router.post('/incidents', authenticate, validateBody(incidentReportSchema), createIncident);
router.get('/incidents', authenticate, listIncidents);
router.get('/incidents/:id', authenticate, validateParams(uuidParamSchema), getIncidentById);
router.patch(
  '/incidents/:id',
  authenticate,
  validateParams(uuidParamSchema),
  validateBody(incidentUpdateSchema),
  updateIncident
);
router.post('/incidents/:id/analyze', authenticate, validateParams(uuidParamSchema), analyzeIncidentById);

// 7. AI Mobility Intelligence Routes
router.post('/ai/journey-advice', authenticate, aiRateLimiter, getJourneyAdvice);
router.post('/ai/route-explanation', authenticate, aiRateLimiter, getRouteExplanation);
router.post('/ai/incident-summary', authenticate, aiRateLimiter, getIncidentSummary);
router.post('/ai/carpool-explanation', authenticate, aiRateLimiter, getCarpoolExplanation);

// 8. Administration Routes
router.get('/admin/analytics', authenticate, requireAdmin, getAdminAnalytics);
router.get('/admin/incidents', authenticate, requireAdmin, getAdminIncidents);
router.patch(
  '/admin/incidents/:id/status',
  authenticate,
  requireAdmin,
  validateParams(uuidParamSchema),
  validateBody(incidentUpdateSchema),
  updateAdminIncidentStatus
);

export default router;
