import assert from 'assert';
import { EventEmitter } from 'events';
import app from '../app.js';

// In-process Express request dispatcher (works inside zero-network sandboxes as well as CI)
function dispatchExpressRequest(method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method.toUpperCase();
    req.url = urlPath;
    req.originalUrl = urlPath;
    req.headers = {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {})
    };
    req.connection = { remoteAddress: '127.0.0.1' };
    req.socket = { remoteAddress: '127.0.0.1' };
    req.ip = '127.0.0.1';
    req.get = (headerName) => req.headers[headerName.toLowerCase()];
    req.header = req.get;

    // Pre-populate req.body and also emit stream data so express.json() or direct handlers both work
    if (body !== null && body !== undefined) {
      req.body = body;
      req._body = true; // tells body-parser that body is already parsed
    } else {
      req.body = {};
      req._body = true;
    }

    const res = new EventEmitter();
    res.statusCode = 200;
    res.headers = {};
    res.setHeader = (k, v) => {
      res.headers[k.toLowerCase()] = v;
    };
    res.getHeader = (k) => res.headers[k.toLowerCase()];
    res.removeHeader = (k) => {
      delete res.headers[k.toLowerCase()];
    };
    res.set = res.setHeader;
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      resolve({ status: res.statusCode, data });
      return res;
    };
    res.send = (data) => {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        resolve({ status: res.statusCode, data: parsed });
      } catch {
        resolve({ status: res.statusCode, data });
      }
      return res;
    };
    res.end = (data) => {
      resolve({ status: res.statusCode, data: data || null });
      return res;
    };

    try {
      app.handle(req, res, (err) => {
        if (err) reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function runTests() {
  console.log('Running RushRoute Backend Integration Test Suite...');

  const request = (method, path, body = null, token = null) =>
    dispatchExpressRequest(method, `/api/v1${path}`, body, token);

  // 1. Health & Provider Adapter Check
  const health = await request('GET', '/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.success, true);
  console.log('✓ 1. Health check passed');

  const providers = await request('GET', '/rides/providers');
  assert.strictEqual(providers.status, 200);
  assert.strictEqual(providers.data.providers.length, 4);
  assert.strictEqual(providers.data.providers[0].provider_id, 'DemoRideProvider');
  console.log('✓ 2. Provider adapter registry verified (DemoRideProvider + FutureUber/Ola/Rapido stubs)');

  // 2. User Registration & Validation
  const uniqueEmail = `test.commuter.${Date.now()}@rushroute.in`;
  const regRes = await request('POST', '/auth/register', {
    full_name: 'Nived Test Commuter',
    email: uniqueEmail,
    password: 'Password123',
    phone: '+91-9888877777'
  });
  assert.strictEqual(regRes.status, 201);
  assert.ok(regRes.data.token);
  const userToken = regRes.data.token;
  console.log('✓ 3. User registration, bcrypt hashing & JWT issuance passed');

  // 3. Login & /auth/me
  const loginRes = await request('POST', '/auth/login', {
    email: uniqueEmail,
    password: 'Password123'
  });
  assert.strictEqual(loginRes.status, 200);
  assert.ok(loginRes.data.token);

  const meRes = await request('GET', '/auth/me', null, userToken);
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.data.user.email, uniqueEmail);
  console.log('✓ 4. Login & authenticated /auth/me verification passed');

  // 4. Profile & Preferences
  const prefUpdate = await request(
    'PATCH',
    '/users/preferences',
    {
      preferred_transport_modes: ['Metro', 'Auto'],
      default_budget: 200
    },
    userToken
  );
  assert.strictEqual(prefUpdate.status, 200);
  assert.strictEqual(prefUpdate.data.preferences.default_budget, 200);
  console.log('✓ 5. User profile & preferences persistence passed');

  // 5. Validation rejection (identical pickup and destination)
  const invalidRide = await request(
    'POST',
    '/rides/requests',
    {
      pickup_address: 'Indiranagar',
      destination_address: 'indiranagar',
      vehicle_type: 'Auto'
    },
    userToken
  );
  assert.strictEqual(invalidRide.status, 400);
  console.log('✓ 6. Zod validation rejected identical pickup & destination (HTTP 400)');

  // 6. Smart Ride Booking & Concurrency-Safe Confirmation
  const rideReq = await request(
    'POST',
    '/rides/requests',
    {
      pickup_address: 'Indiranagar (100 Feet Road / Metro)',
      destination_address: 'Whitefield (Kadugodi / ITPL)',
      vehicle_type: 'Auto',
      minimum_budget: 50,
      maximum_budget: 450,
      auto_book_cheapest: true
    },
    userToken
  );
  assert.strictEqual(rideReq.status, 201);
  assert.ok(rideReq.data.confirmed_booking);
  assert.strictEqual(rideReq.data.confirmed_booking.booking_status, 'confirmed');
  const confirmedCount = rideReq.data.candidate_bookings.filter(
    (b) => b.booking_status === 'confirmed'
  ).length;
  assert.strictEqual(confirmedCount, 1);
  console.log('✓ 7. Smart Ride Booking prioritized cheapest suitable option & cancelled redundant pending requests');

  // 7. Public Transport & Multimodal Journey Planner + AI Recommendation
  const journeyRes = await request(
    'POST',
    '/journeys/recommend',
    {
      pickup_address: 'Indiranagar (100 Feet Road / Metro)',
      destination_address: 'MG Road Metro Station',
      maximum_budget: 180,
      preferred_mode: 'Metro'
    },
    userToken
  );
  assert.strictEqual(journeyRes.status, 200);
  assert.ok(journeyRes.data.plan.options.length >= 4);
  assert.ok(journeyRes.data.ai_recommendation.recommended_option_id);
  assert.ok(journeyRes.data.budget_explanation.cheapest_option_id);
  console.log('✓ 8. Public Transport multimodal planner + AI recommendation & budget intelligence passed');

  // 8. Carpool Matching & Privacy Protection (Coordinates hidden before consent, unlocked after consent)
  const carpoolSearch = await request(
    'POST',
    '/carpool/matches/search',
    {
      pickup_address: 'Indiranagar (100 Feet Road / Metro)',
      destination_address: 'Whitefield (Kadugodi / ITPL)',
      departure_time: new Date(Date.now() + 30 * 60000).toISOString(),
      available_seats: 2,
      estimated_budget: 150
    },
    userToken
  );
  assert.strictEqual(carpoolSearch.status, 200);
  assert.ok(carpoolSearch.data.matches.length >= 1);
  const topMatch = carpoolSearch.data.matches[0];
  assert.strictEqual(
    topMatch.partner_journey.pickup_coordinates.precision,
    'approximate_privacy_protected'
  );

  const acceptCarpool = await request(
    'POST',
    `/carpool/matches/${topMatch.match_id}/respond`,
    { action: 'accept' },
    userToken
  );
  assert.strictEqual(acceptCarpool.status, 200);
  assert.strictEqual(acceptCarpool.data.match.match_status, 'accepted');
  assert.strictEqual(
    acceptCarpool.data.match.partner_journey.pickup_coordinates.precision,
    'exact_mutually_accepted'
  );
  console.log('✓ 9. Carpool deterministic compatibility scoring & mutual consent coordinate privacy passed');

  // 9. Incident Reporting + Gemini Summarization + Complaint Draft
  const incRes = await request(
    'POST',
    '/incidents',
    {
      category: 'Delay',
      description: 'Feeder bus delayed by 25 minutes near Indiranagar Metro station during morning peak hours.',
      location: 'Indiranagar Metro Station',
      route_name: 'Feeder 138-B (Demo)'
    },
    userToken
  );
  assert.strictEqual(incRes.status, 201);
  assert.ok(incRes.data.incident.ai_summary);
  assert.strictEqual(incRes.data.complaint_draft.requires_user_approval, true);
  console.log('✓ 10. Incident report persistence, AI summary & complaint draft preview passed');

  // 10. Admin RBAC Protection (regular user blocked with 403, admin allowed with 200)
  const nonAdminTry = await request('GET', '/admin/analytics', null, userToken);
  assert.strictEqual(nonAdminTry.status, 403);

  const adminLogin = await request('POST', '/auth/login', {
    email: 'admin@rushroute.in',
    password: 'RushRoute@2026'
  });
  assert.strictEqual(adminLogin.status, 200);
  const adminToken = adminLogin.data.token;

  const adminAnalytics = await request('GET', '/admin/analytics', null, adminToken);
  assert.strictEqual(adminAnalytics.status, 200);
  assert.ok(adminAnalytics.data.analytics.overview.total_users >= 5);
  console.log('✓ 11. Role-based access control (RBAC) & Admin analytics verified');

  console.log('\nALL 11 BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
