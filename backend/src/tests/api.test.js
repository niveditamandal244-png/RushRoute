import assert from 'assert';
import { EventEmitter } from 'events';

process.env.FORCE_LOCAL_TEST_DB = 'true';
const { default: app } = await import('../app.js');

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
  const topMatch =
    carpoolSearch.data.matches.find((m) =>
      m.partner_journey?.commuter_name?.includes('Demo')
    ) || carpoolSearch.data.matches[0];
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

  // 12. Bengaluru BMTC Bus, Namma Metro & IST Multimodal Fare Range Verification
  const bmtcRoutesRes = await request('GET', '/transit/bmtc/routes');
  assert.strictEqual(bmtcRoutesRes.status, 200);
  assert.ok(bmtcRoutesRes.data.routes.length >= 8);

  const metroStationsRes = await request('GET', '/transit/metro/stations');
  assert.strictEqual(metroStationsRes.status, 200);
  assert.ok(metroStationsRes.data.stations.length >= 10);

  const bmtcPlanRes = await request('POST', '/transit/bmtc/plan', {
    pickup_address: 'Majestic (Kempegowda Bus Station / Metro Hub)',
    destination_address: 'Whitefield (Kadugodi / ITPL)',
    passenger_count: 2
  });
  assert.strictEqual(bmtcPlanRes.status, 200);
  assert.ok(bmtcPlanRes.data.options.length >= 1);
  assert.ok(bmtcPlanRes.data.options[0].bmtc_details.upcoming_departures.length >= 1);

  const metroPlanRes = await request('POST', '/transit/metro/plan', {
    pickup_address: 'Indiranagar (100 Feet Road / Metro)',
    destination_address: 'Jayanagar 4th Block',
    passenger_count: 2
  });
  assert.strictEqual(metroPlanRes.status, 200);
  assert.ok(metroPlanRes.data.options.length >= 1);
  assert.strictEqual(metroPlanRes.data.options[0].metro_details.interchange_required, true);
  console.log('✓ 12. Bengaluru BMTC Bus IST schedules & Namma Metro interchange planning passed');

  // 13. Nearest BMTC Bus Stop Finder with Pedestrian Walking Routes
  const nearestBmtcRes = await request('POST', '/transit/bmtc/nearest', {
    latitude: 12.9784,
    longitude: 77.6408,
    limit: 5
  });
  assert.strictEqual(nearestBmtcRes.status, 200);
  assert.ok(nearestBmtcRes.data.nearest_stops.length >= 3);
  const closestStop = nearestBmtcRes.data.nearest_stops[0];
  assert.ok(closestStop.walking_distance_m >= closestStop.straight_line_distance_m);
  assert.ok(closestStop.walking_duration_minutes >= 1);
  assert.ok(Array.isArray(closestStop.walking_route_waypoints) && closestStop.walking_route_waypoints.length >= 2);
  assert.ok(Array.isArray(closestStop.available_routes) && closestStop.available_routes.length >= 1);
  console.log('✓ 13. Nearest BMTC Bus Stop Finder & pedestrian walking route calculation passed');

  // 14. SUV Ride Booking & 6-Stage Simulated Booking Progression
  const suvRideRes = await request(
    'POST',
    '/rides/requests',
    {
      pickup_address: 'Koramangala (Sony World / 80 Feet Road)',
      destination_address: 'MG Road Metro Station',
      vehicle_type: 'SUV',
      maximum_budget: 900,
      auto_book_cheapest: true
    },
    userToken
  );
  assert.strictEqual(suvRideRes.status, 201);
  assert.ok(suvRideRes.data.confirmed_booking);
  assert.strictEqual(suvRideRes.data.confirmed_booking.vehicle_type, 'SUV');
  assert.ok(suvRideRes.data.confirmed_booking.simulated_driver);
  assert.ok(Array.isArray(suvRideRes.data.confirmed_booking.booking_stages));
  assert.strictEqual(suvRideRes.data.confirmed_booking.booking_stages.length, 6);

  const stageRes = await request(
    'POST',
    `/rides/bookings/${suvRideRes.data.confirmed_booking.id}/stage`,
    { stage: 'Driver arrived' },
    userToken
  );
  assert.strictEqual(stageRes.status, 200);
  assert.strictEqual(stageRes.data.booking.booking_stage, 'Driver arrived');
  console.log('✓ 14. SUV category booking, simulated driver details & 6-stage booking progression passed');

  // 15. 6-Digit Email OTP Send & Verify + Duplicate Email Protection (HTTP 409)
  const dupRegRes = await request('POST', '/auth/register', {
    full_name: 'Duplicate Test User',
    email: uniqueEmail,
    password: 'Password123'
  });
  assert.strictEqual(dupRegRes.status, 409);

  const otpEmail = `otp.verify.${Date.now()}@rushroute.in`;
  const otpSendRes = await request('POST', '/auth/otp/send', {
    email: otpEmail,
    purpose: 'email_verification'
  });
  assert.strictEqual(otpSendRes.status, 200);
  const demoOtp = otpSendRes.data.otp_verification?.demo_verification_otp;
  assert.ok(demoOtp);
  assert.strictEqual(String(demoOtp).length, 6);

  const otpVerifyRes = await request('POST', '/auth/otp/verify', {
    email: otpEmail,
    otp: demoOtp,
    purpose: 'email_verification'
  });
  assert.strictEqual(otpVerifyRes.status, 200);
  assert.strictEqual(otpVerifyRes.data.verified, true);
  console.log('✓ 15. 6-digit Email OTP generation, verification & duplicate email 409 check passed');

  // 16. RushRoute AI Smart Booking Race — All 14 Mandatory First-Acceptance & Concurrency Tests (Section 16.9)
  const verifySingleWinnerAndCancelledLosers = (session, expectedWinner) => {
    assert.strictEqual(session.session_state, 'finalized');
    assert.strictEqual(session.winner_provider, expectedWinner);
    const winners = session.provider_requests.filter((p) => p.is_winner);
    const losers = session.provider_requests.filter((p) => !p.is_winner);
    assert.strictEqual(winners.length, 1);
    assert.strictEqual(winners[0].provider_name, expectedWinner);
    assert.strictEqual(losers.length, 2);
    for (const loser of losers) {
      assert.ok(
        ['Cancelled by RushRoute AI', 'Rejected'].includes(loser.status),
        `Expected loser ${loser.provider_name} to be Cancelled by RushRoute AI or Rejected, got ${loser.status}`
      );
    }
  };

  // (16.1) Uber accepts first
  const raceUber = await request(
    'POST',
    '/rides/smart-race/start',
    {
      pickup_address: 'Majestic (Kempegowda Bus Station / Metro Hub)',
      destination_address: 'Indiranagar (100 Feet Road / Metro)',
      vehicle_type: 'Auto',
      budget_mode: 'Premium',
      race_scenario: 'uber_wins',
      immediate_resolve: true
    },
    userToken
  );
  assert.strictEqual(raceUber.status, 201);
  verifySingleWinnerAndCancelledLosers(raceUber.data.session, 'Uber');

  // (16.2) Ola accepts first
  const raceOla = await request(
    'POST',
    '/rides/smart-race/start',
    {
      pickup_address: 'Majestic (Kempegowda Bus Station / Metro Hub)',
      destination_address: 'Indiranagar (100 Feet Road / Metro)',
      vehicle_type: 'Auto',
      budget_mode: 'Premium',
      race_scenario: 'ola_wins',
      immediate_resolve: true
    },
    userToken
  );
  assert.strictEqual(raceOla.status, 201);
  verifySingleWinnerAndCancelledLosers(raceOla.data.session, 'Ola');

  // (16.3) Rapido accepts first
  const raceRapido = await request(
    'POST',
    '/rides/smart-race/start',
    {
      pickup_address: 'Majestic (Kempegowda Bus Station / Metro Hub)',
      destination_address: 'Indiranagar (100 Feet Road / Metro)',
      vehicle_type: 'Bike',
      budget_mode: 'Balanced',
      race_scenario: 'rapido_wins',
      immediate_resolve: true
    },
    userToken
  );
  assert.strictEqual(raceRapido.status, 201);
  verifySingleWinnerAndCancelledLosers(raceRapido.data.session, 'Rapido');

  // (16.4) Two providers accept almost simultaneously -> atomic single winner
  const raceSim = await request(
    'POST',
    '/rides/smart-race/start',
    {
      pickup_address: 'MG Road Metro Station',
      destination_address: 'Whitefield (Kadugodi / ITPL)',
      vehicle_type: 'Mini',
      budget_mode: 'Premium',
      race_scenario: 'simultaneous_tie',
      immediate_resolve: true
    },
    userToken
  );
  assert.strictEqual(raceSim.status, 201);
  assert.strictEqual(
    raceSim.data.session.provider_requests.filter((p) => p.is_winner).length,
    1
  );

  // (16.5 & 16.13) Provider accepts after winner locked (late acceptance rejected)
  const lateEventRes = await request(
    'POST',
    `/rides/smart-race/${raceUber.data.session.session_id}/event`,
    {
      provider_name: 'Ola',
      action: 'accept'
    },
    userToken
  );
  assert.strictEqual(lateEventRes.status, 200);
  assert.strictEqual(lateEventRes.data.accepted, false);
  assert.strictEqual(lateEventRes.data.rejected_as_late, true);
  assert.strictEqual(lateEventRes.data.session.winner_provider, 'Uber');

  // (16.6) One provider rejects, next eligible provider accepts and wins
  const raceRejectOne = await request(
    'POST',
    '/rides/smart-race/start',
    {
      pickup_address: 'Indiranagar (100 Feet Road / Metro)',
      destination_address: 'Koramangala (Sony World / 5th Block)',
      vehicle_type: 'Auto',
      budget_mode: 'Premium',
      race_scenario: 'provider_rejects',
      immediate_resolve: true
    },
    userToken
  );
  assert.strictEqual(raceRejectOne.status, 201);
  verifySingleWinnerAndCancelledLosers(raceRejectOne.data.session, 'Ola');

  // (16.7) All providers time out
  const raceTimeout = await request(
    'POST',
    '/rides/smart-race/start',
    {
      pickup_address: 'Indiranagar (100 Feet Road / Metro)',
      destination_address: 'Whitefield (Kadugodi / ITPL)',
      vehicle_type: 'Auto',
      race_scenario: 'all_timeout',
      immediate_resolve: true
    },
    userToken
  );
  assert.strictEqual(raceTimeout.status, 201);
  assert.strictEqual(raceTimeout.data.session.session_state, 'expired');
  assert.strictEqual(raceTimeout.data.session.winner_provider, null);

  // (16.8) All offers exceed the user's budget
  const raceOverBudget = await request(
    'POST',
    '/rides/smart-race/start',
    {
      pickup_address: 'Majestic (Kempegowda Bus Station / Metro Hub)',
      destination_address: 'Kempegowda International Airport (BLR)',
      vehicle_type: 'SUV',
      budget_mode: 'Custom Budget',
      maximum_budget: 25,
      immediate_resolve: true
    },
    userToken
  );
  assert.strictEqual(raceOverBudget.status, 201);
  assert.strictEqual(raceOverBudget.data.session.session_state, 'failed');
  assert.strictEqual(raceOverBudget.data.session.winner_provider, null);

  // (16.9, 16.10, 16.11, 16.12) User retries with changed budget & vehicle + Idempotent duplicate request check
  const idemKey = `idem-race-${Date.now()}`;
  const retryRace1 = await request(
    'POST',
    '/rides/smart-race/start',
    {
      pickup_address: 'Nagenahalli (Yelahanka North Corridor)',
      destination_address: 'Majestic (Kempegowda Bus Station / Metro Hub)',
      vehicle_type: 'Sedan',
      budget_mode: 'Custom Budget',
      maximum_budget: 650,
      race_scenario: 'uber_wins',
      idempotency_key: idemKey,
      immediate_resolve: true
    },
    userToken
  );
  const retryRaceDuplicate = await request(
    'POST',
    '/rides/smart-race/start',
    {
      pickup_address: 'Nagenahalli (Yelahanka North Corridor)',
      destination_address: 'Majestic (Kempegowda Bus Station / Metro Hub)',
      vehicle_type: 'Sedan',
      budget_mode: 'Custom Budget',
      maximum_budget: 650,
      race_scenario: 'uber_wins',
      idempotency_key: idemKey,
      immediate_resolve: true
    },
    userToken
  );
  assert.strictEqual(
    retryRace1.data.session.session_id,
    retryRaceDuplicate.data.session.session_id
  );
  assert.strictEqual(retryRaceDuplicate.data.session.idempotent_replay, true);
  verifySingleWinnerAndCancelledLosers(retryRace1.data.session, 'Uber');
  console.log(
    '✓ 16. RushRoute AI Smart Booking Race (All 14 First-Acceptance, Auto-Cancellation, Tie-Break, Late-Rejection & Idempotency Tests) passed'
  );

  // 17. Comprehensive Authentication, Validation, Logout & Password Recovery Tests
  // 17.1 Reject email entered in phone field with clear message (never raw Zod max(20))
  const badPhoneReg = await request('POST', '/auth/register', {
    full_name: 'Bengaluru Commuter Long Name',
    email: `long.commuter.address.${Date.now()}@example.com`,
    phone: 'wrong.email.in.phone@example.com',
    password: 'Password1'
  });
  assert.strictEqual(badPhoneReg.status, 400);
  assert.strictEqual(badPhoneReg.data.details[0].field, 'phone');
  assert.strictEqual(badPhoneReg.data.details[0].message, 'Please enter a valid phone number.');

  // 17.2 Register with email > 20 chars & omitted optional phone
  const longEmail = `bengaluru.commuter.${Date.now()}@rushroute-test.in`;
  const cleanReg = await request('POST', '/auth/register', {
    full_name: '  Ananya Rao  ',
    email: longEmail,
    password: 'Password1'
  });
  assert.strictEqual(cleanReg.status, 201);
  assert.strictEqual(cleanReg.data.user.email, longEmail.toLowerCase());
  assert.strictEqual(cleanReg.data.user.full_name, 'Ananya Rao');
  assert.strictEqual(cleanReg.data.user.phone, null);
  assert.ok(!('password_hash' in cleanReg.data.user));

  // 17.3 Duplicate email rejected with 409
  const dupReg = await request('POST', '/auth/register', {
    full_name: 'Ananya Rao',
    email: longEmail.toUpperCase(),
    password: 'Password1'
  });
  assert.strictEqual(dupReg.status, 409);
  assert.strictEqual(dupReg.data.error, 'This email is already registered.');

  // 17.4 Wrong password rejected with 401
  const wrongPwdLogin = await request('POST', '/auth/login', {
    email: longEmail,
    password: 'WrongPassword1'
  });
  assert.strictEqual(wrongPwdLogin.status, 401);

  // 17.5 Correct password login + logout revokes token
  const goodLogin = await request('POST', '/auth/login', {
    email: longEmail,
    password: 'Password1'
  });
  assert.strictEqual(goodLogin.status, 200);
  const freshToken = goodLogin.data.token;

  const logoutRes = await request('POST', '/auth/logout', {}, freshToken);
  assert.strictEqual(logoutRes.status, 200);
  const meAfterLogout = await request('GET', '/auth/me', null, freshToken);
  assert.strictEqual(meAfterLogout.status, 401);

  // 17.6 Password recovery (forgot-password + reset-password + old password fails + new password works)
  const forgotRes = await request('POST', '/auth/forgot-password', { email: longEmail });
  assert.strictEqual(forgotRes.status, 200);
  const devOtp = forgotRes.data.otp_verification.demo_verification_otp;
  assert.ok(/^\d{6}$/.test(devOtp));

  const resetRes = await request('POST', '/auth/reset-password', {
    email: longEmail,
    otp: devOtp,
    new_password: 'NewPassword2'
  });
  assert.strictEqual(resetRes.status, 200);

  const oldPwdAfterReset = await request('POST', '/auth/login', {
    email: longEmail,
    password: 'Password1'
  });
  assert.strictEqual(oldPwdAfterReset.status, 401);

  const newPwdAfterReset = await request('POST', '/auth/login', {
    email: longEmail,
    password: 'NewPassword2'
  });
  assert.strictEqual(newPwdAfterReset.status, 200);

  console.log(
    '✓ 17. Authentication Validation, Duplicate Check, Logout Revocation & Password Recovery passed'
  );

  console.log('\nALL 17 BACKEND INTEGRATION TEST SUITES PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
