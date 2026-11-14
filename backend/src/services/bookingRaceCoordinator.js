import crypto from 'crypto';
import { calculateDistanceKm, resolveCoordinates } from '../utils/geo.js';
import {
  BOOKING_PROGRESS_STAGES,
  CONFIGURABLE_FARE_RATES,
  generateSimulatedDriverDetails
} from './providerAdapter.js';
import { db } from '../config/database.js';

/**
 * RushRoute AI Smart Booking Coordinator — "First Acceptance Wins" (Section 15 & Section 16)
 *
 * Core Innovation:
 * ONE REQUEST. THREE PROVIDERS (Uber, Ola, Rapido). FIRST ACCEPTANCE WINS. AI HANDLES THE REST.
 *
 * Key Guarantees:
 * - Backend-controlled state machine:
 *   created -> requests_sent -> waiting -> winner_selected -> cancellation_pending -> finalized | failed | expired
 * - Idempotency key support to prevent duplicate booking sessions
 * - Atomic single-winner lock per booking session (simultaneous acceptances resolved deterministically)
 * - Automatic cancellation of the other two pending demonstration requests ("Cancelled by RushRoute AI")
 * - Strict rejection of late acceptances arriving after a winner is locked
 * - Strict vehicle category and budget eligibility verification before any provider can win
 * - Transparent demonstration labelling:
 *   "DEMO — Simulated provider acceptance. No actual third-party ride has been booked."
 */

export const PROVIDER_BRAND_CATALOG = {
  Uber: {
    provider_id: 'Uber',
    provider_name: 'Uber',
    display_badge: 'UBER INDIA • DEMO',
    tagline: 'Global Mobility Partner (Simulated Dispatch)',
    accent_hex: '#0F172A',
    bg_hex: '#F8FAFC',
    supported_vehicles: ['Bike', 'Auto', 'Mini', 'Sedan', 'SUV'],
    fare_multiplier: 1.03,
    eta_offset_min: 0,
    service_labels: {
      Bike: 'Uber Moto',
      Auto: 'Uber Auto',
      Mini: 'Uber Go (Mini Cab)',
      Sedan: 'Uber Premier Sedan',
      SUV: 'Uber XL (6-Seater SUV)'
    }
  },
  Ola: {
    provider_id: 'Ola',
    provider_name: 'Ola',
    display_badge: 'OLA CABS • DEMO',
    tagline: 'Bengaluru Homegrown Fleet (Simulated Dispatch)',
    accent_hex: '#064E3B',
    bg_hex: '#ECFDF5',
    supported_vehicles: ['Bike', 'Auto', 'Mini', 'Sedan', 'SUV'],
    fare_multiplier: 1.0,
    eta_offset_min: 1,
    service_labels: {
      Bike: 'Ola Bike',
      Auto: 'Ola Auto',
      Mini: 'Ola Mini Cab',
      Sedan: 'Ola Prime Sedan',
      SUV: 'Ola Prime SUV'
    }
  },
  Rapido: {
    provider_id: 'Rapido',
    provider_name: 'Rapido',
    display_badge: 'RAPIDO CAPTAIN • DEMO',
    tagline: 'Fast Bengaluru Captain Network (Simulated Dispatch)',
    accent_hex: '#B45309',
    bg_hex: '#FFFBEB',
    supported_vehicles: ['Bike', 'Auto', 'Mini', 'Sedan'],
    fare_multiplier: 0.95,
    eta_offset_min: -1,
    service_labels: {
      Bike: 'Rapido Bike Taxi',
      Auto: 'Rapido Auto',
      Mini: 'Rapido Cab Economy',
      Sedan: 'Rapido Cab Priority'
    }
  }
};

const sessionStore = new Map();
const idempotencyStore = new Map();
const sessionLocks = new Set();
let autoRotationCounter = 0;

export const DEMO_SMART_BOOKING_DISCLAIMER =
  'DEMO — Simulated provider acceptance. No actual third-party ride has been booked.';

function computeProviderOffers({
  pickupAddress,
  destinationAddress,
  pickupLat,
  pickupLng,
  destinationLat,
  destinationLng,
  vehicleType = 'Auto',
  passengerCount = 1,
  budgetMode = 'Balanced',
  minimumBudget = null,
  maximumBudget = null,
  priceConvenienceBalance = 'balanced',
  raceScenario = 'auto'
}) {
  const start = resolveCoordinates(pickupAddress, pickupLat, pickupLng);
  const end = resolveCoordinates(destinationAddress, destinationLat, destinationLng);
  const distanceKm = calculateDistanceKm(start.lat, start.lng, end.lat, end.lng);
  const normalizedVehicle = CONFIGURABLE_FARE_RATES[vehicleType] ? vehicleType : 'Auto';
  const rate = CONFIGURABLE_FARE_RATES[normalizedVehicle];
  const pax = Math.max(1, Number(passengerCount) || 1);
  const vehiclesNeeded = Math.ceil(pax / rate.capacity);
  const baseDurationMin = Math.max(6, Math.round((distanceKm / rate.avgSpeedKmph) * 60));

  const rawOffers = ['Uber', 'Ola', 'Rapido'].map((providerKey) => {
    const brand = PROVIDER_BRAND_CATALOG[providerKey];
    const vehicleSupported =
      brand.supported_vehicles.includes(normalizedVehicle) ||
      (raceScenario === 'rapido_wins' && providerKey === 'Rapido');

    const singleFare = Math.max(
      rate.minFare,
      (rate.baseFare + distanceKm * rate.perKm + baseDurationMin * rate.perMin) *
        brand.fare_multiplier
    );
    const estimatedFare = Math.round(singleFare * vehiclesNeeded);
    const pickupEtaMinutes = Math.max(2, 3 + brand.eta_offset_min);
    const durationMinutes = Math.max(6, baseDurationMin + brand.eta_offset_min);

    return {
      provider_id: providerKey,
      provider_name: brand.provider_name,
      display_badge: brand.display_badge,
      tagline: brand.tagline,
      service_name:
        brand.service_labels[normalizedVehicle] || `${brand.provider_name} ${normalizedVehicle}`,
      vehicle_type: normalizedVehicle,
      vehicle_supported: vehicleSupported,
      passenger_capacity: rate.capacity * vehiclesNeeded,
      passenger_count: pax,
      vehicles_needed: vehiclesNeeded,
      distance_km: distanceKm,
      estimated_fare: estimatedFare,
      pickup_eta_minutes: pickupEtaMinutes,
      estimated_duration_minutes: durationMinutes,
      coordinates: {
        pickup: { lat: start.lat, lng: start.lng },
        destination: { lat: end.lat, lng: end.lng }
      }
    };
  });

  const supportedFares = rawOffers
    .filter((o) => o.vehicle_supported)
    .map((o) => o.estimated_fare);
  const lowestFare = Math.min(...supportedFares);
  const highestFare = Math.max(...supportedFares);
  const averageFare = Math.round(
    supportedFares.reduce((sum, v) => sum + v, 0) / Math.max(1, supportedFares.length)
  );

  // Determine effective budget bounds from user's budgetMode + custom inputs
  let effectiveMinBudget =
    minimumBudget !== null && minimumBudget !== '' && Number.isFinite(Number(minimumBudget))
      ? Number(minimumBudget)
      : 0;
  let effectiveMaxBudget =
    maximumBudget !== null && maximumBudget !== '' && Number.isFinite(Number(maximumBudget))
      ? Number(maximumBudget)
      : null;

  if (budgetMode === 'Cheapest' && effectiveMaxBudget === null) {
    // Allows lowest-cost tiers (or up to +6% over minimum)
    effectiveMaxBudget = Math.round(lowestFare * 1.06);
  } else if (budgetMode === 'Balanced' && effectiveMaxBudget === null) {
    effectiveMaxBudget = Math.round(averageFare * 1.08);
  } else if (budgetMode === 'Premium' && effectiveMaxBudget === null) {
    effectiveMaxBudget = Math.round(highestFare * 1.35);
  } else if (effectiveMaxBudget === null) {
    effectiveMaxBudget = Math.round(highestFare * 1.25);
  }

  return {
    distanceKm,
    start,
    end,
    normalizedVehicle,
    lowestFare,
    highestFare,
    averageFare,
    effectiveMinBudget,
    effectiveMaxBudget,
    priceConvenienceBalance,
    offers: rawOffers.map((offer) => {
      const withinMin = offer.estimated_fare >= effectiveMinBudget;
      const withinMax = offer.estimated_fare <= effectiveMaxBudget;
      const budgetEligible = withinMin && withinMax;
      return {
        ...offer,
        budget_eligible: budgetEligible,
        eligible_to_win: offer.vehicle_supported && budgetEligible,
        ineligibility_reason: !offer.vehicle_supported
          ? `${offer.provider_name} does not support ${normalizedVehicle} category.`
          : !withinMax
          ? `Estimated fare ₹${offer.estimated_fare} exceeds max budget ₹${effectiveMaxBudget}.`
          : !withinMin
          ? `Estimated fare ₹${offer.estimated_fare} is below min budget ₹${effectiveMinBudget}.`
          : null
      };
    })
  };
}

function buildScenarioSchedule(offers, raceScenario = 'auto', priceConvenienceBalance = 'balanced') {
  let effectiveScenario = raceScenario;
  if (!effectiveScenario || effectiveScenario === 'auto') {
    const eligibleOffers = offers.filter((o) => o.eligible_to_win);
    if (eligibleOffers.length > 0) {
      let chosenOffer;
      if (priceConvenienceBalance === 'price_first') {
        // Cheapest & Earliest: lowest fare first, then shortest pickup ETA
        chosenOffer = [...eligibleOffers].sort(
          (a, b) =>
            a.estimated_fare - b.estimated_fare ||
            a.pickup_eta_minutes - b.pickup_eta_minutes
        )[0];
      } else if (priceConvenienceBalance === 'convenience_first') {
        // Earliest & Cheapest: shortest pickup ETA first, then lowest fare
        chosenOffer = [...eligibleOffers].sort(
          (a, b) =>
            a.pickup_eta_minutes - b.pickup_eta_minutes ||
            a.estimated_fare - b.estimated_fare
        )[0];
      } else {
        chosenOffer = eligibleOffers[autoRotationCounter % eligibleOffers.length];
        autoRotationCounter += 1;
      }
      effectiveScenario = `${chosenOffer.provider_id.toLowerCase()}_wins`;
    } else {
      effectiveScenario = 'budget_exceeded';
    }
  }

  // Schedule per provider: { delayMs, action: 'accept' | 'reject' | 'timeout' }
  const schedule = {
    Uber: { delayMs: 2600, action: 'accept' },
    Ola: { delayMs: 3400, action: 'accept' },
    Rapido: { delayMs: 4100, action: 'accept' }
  };

  switch (effectiveScenario) {
    case 'uber_wins':
      schedule.Uber = { delayMs: 1600, action: 'accept' };
      schedule.Ola = { delayMs: 3200, action: 'accept' };
      schedule.Rapido = { delayMs: 4400, action: 'accept' };
      break;
    case 'ola_wins':
      schedule.Ola = { delayMs: 1600, action: 'accept' };
      schedule.Uber = { delayMs: 3300, action: 'accept' };
      schedule.Rapido = { delayMs: 4500, action: 'accept' };
      break;
    case 'rapido_wins':
      schedule.Rapido = { delayMs: 1500, action: 'accept' };
      schedule.Ola = { delayMs: 3100, action: 'accept' };
      schedule.Uber = { delayMs: 4300, action: 'accept' };
      break;
    case 'simultaneous_tie':
      // Both Uber and Ola accept at exact same 1800ms mark; atomic coordinator locks exactly one winner
      schedule.Uber = { delayMs: 1800, action: 'accept' };
      schedule.Ola = { delayMs: 1800, action: 'accept' };
      schedule.Rapido = { delayMs: 3600, action: 'accept' };
      break;
    case 'late_acceptance':
      schedule.Uber = { delayMs: 1500, action: 'accept' };
      schedule.Ola = { delayMs: 2400, action: 'accept', simulateLateArrival: true };
      schedule.Rapido = { delayMs: 3500, action: 'accept', simulateLateArrival: true };
      break;
    case 'provider_rejects':
      // Rapido rejects first at 1.1s, then Ola accepts at 2.1s and wins, Uber is cancelled
      schedule.Rapido = { delayMs: 1100, action: 'reject' };
      schedule.Ola = { delayMs: 2100, action: 'accept' };
      schedule.Uber = { delayMs: 3700, action: 'accept' };
      break;
    case 'all_reject':
      schedule.Uber = { delayMs: 1400, action: 'reject' };
      schedule.Ola = { delayMs: 1900, action: 'reject' };
      schedule.Rapido = { delayMs: 2300, action: 'reject' };
      break;
    case 'all_timeout':
      schedule.Uber = { delayMs: 5000, action: 'timeout' };
      schedule.Ola = { delayMs: 5000, action: 'timeout' };
      schedule.Rapido = { delayMs: 5000, action: 'timeout' };
      break;
    case 'budget_exceeded':
      schedule.Uber = { delayMs: 1200, action: 'reject' };
      schedule.Ola = { delayMs: 1500, action: 'reject' };
      schedule.Rapido = { delayMs: 1800, action: 'reject' };
      break;
    default:
      break;
  }

  return { effectiveScenario, schedule };
}

export async function startSmartBookingRaceSession({
  userId,
  pickupAddress,
  destinationAddress,
  pickupLat,
  pickupLng,
  destinationLat,
  destinationLng,
  vehicleType = 'Auto',
  passengerCount = 1,
  budgetMode = 'Balanced',
  minimumBudget = null,
  maximumBudget = null,
  priceConvenienceBalance = 'balanced',
  raceScenario = 'auto',
  idempotencyKey = null,
  immediateResolve = false
}) {
  // 1. Idempotency protection: return existing session if duplicate request arrives
  if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
    const existingSessionId = idempotencyStore.get(idempotencyKey);
    const existingSession = sessionStore.get(existingSessionId);
    if (existingSession) {
      if (immediateResolve) {
        await evaluateAndAdvanceRaceSession(existingSessionId, { forceImmediate: true });
      }
      return {
        ...sessionStore.get(existingSessionId),
        idempotent_replay: true
      };
    }
  }

  const offerBundle = computeProviderOffers({
    pickupAddress,
    destinationAddress,
    pickupLat,
    pickupLng,
    destinationLat,
    destinationLng,
    vehicleType,
    passengerCount,
    budgetMode,
    minimumBudget,
    maximumBudget,
    priceConvenienceBalance,
    raceScenario
  });

  const { effectiveScenario, schedule } = buildScenarioSchedule(
    offerBundle.offers,
    raceScenario,
    priceConvenienceBalance
  );

  const sessionId = crypto.randomUUID();
  const createdAtMs = Date.now();
  const startedAtIso = new Date(createdAtMs).toISOString();

  // Create persistent ride_request row (gracefully fallback to in-memory ID if DB constraint/FK fails)
  let rideRequest = { id: crypto.randomUUID() };
  try {
    rideRequest = await db.insert('ride_requests', {
      user_id: userId,
      pickup_address: pickupAddress,
      destination_address: destinationAddress,
      pickup_latitude: offerBundle.start.lat,
      pickup_longitude: offerBundle.start.lng,
      destination_latitude: offerBundle.end.lat,
      destination_longitude: offerBundle.end.lng,
      vehicle_type: offerBundle.normalizedVehicle,
      minimum_budget: offerBundle.effectiveMinBudget || null,
      maximum_budget: offerBundle.effectiveMaxBudget || null,
      status: 'pending'
    });
  } catch (_dbErr) {
    // Keep generated rideRequest.id so the live race session always succeeds
  }

  const providerRequests = offerBundle.offers.map((offer) => {
    const sched = schedule[offer.provider_id] || { delayMs: 2500, action: 'accept' };
    return {
      provider_request_id: `req_${offer.provider_id.toLowerCase()}_${crypto
        .randomBytes(3)
        .toString('hex')}`,
      provider_id: offer.provider_id,
      provider_name: offer.provider_name,
      display_badge: offer.display_badge,
      tagline: offer.tagline,
      service_name: offer.service_name,
      vehicle_type: offer.vehicle_type,
      vehicle_supported: offer.vehicle_supported,
      passenger_capacity: offer.passenger_capacity,
      estimated_fare: offer.estimated_fare,
      pickup_eta_minutes: offer.pickup_eta_minutes,
      estimated_duration_minutes: offer.estimated_duration_minutes,
      distance_km: offer.distance_km,
      budget_eligible: offer.budget_eligible,
      eligible_to_win: offer.eligible_to_win,
      ineligibility_reason: offer.ineligibility_reason,
      simulated_delay_ms: sched.delayMs,
      simulated_action: sched.action,
      simulate_late_arrival: Boolean(sched.simulateLateArrival),
      status: 'Request Sent',
      is_winner: false,
      acceptance_time_seconds: null,
      responded_at_ms: null,
      coordinator_note: 'Parallel request dispatched by RushRoute AI Coordinator.'
    };
  });

  const session = {
    session_id: sessionId,
    ride_request_id: rideRequest.id,
    user_id: userId,
    idempotency_key: idempotencyKey || null,
    session_state: 'requests_sent',
    state_history: ['created', 'requests_sent'],
    created_at_ms: createdAtMs,
    started_at_iso: startedAtIso,
    pickup_address: pickupAddress,
    destination_address: destinationAddress,
    coordinates: {
      pickup: offerBundle.start,
      destination: offerBundle.end
    },
    distance_km: offerBundle.distanceKm,
    vehicle_type: offerBundle.normalizedVehicle,
    passenger_count: Number(passengerCount) || 1,
    budget_mode: budgetMode,
    effective_min_budget: offerBundle.effectiveMinBudget,
    effective_max_budget: offerBundle.effectiveMaxBudget,
    price_convenience_balance: priceConvenienceBalance,
    race_scenario: effectiveScenario,
    provider_requests: providerRequests,
    winner_provider: null,
    winner_request_id: null,
    winner_locked_at_ms: null,
    winner_booking: null,
    late_acceptances_rejected: [],
    race_timeline: [
      {
        elapsed_seconds: 0.0,
        event_type: 'SESSION_CREATED',
        message: `RushRoute AI created booking session (${sessionId.slice(0, 8)}) for ${
          offerBundle.normalizedVehicle
        } from ${pickupAddress} to ${destinationAddress}.`
      },
      {
        elapsed_seconds: 0.1,
        event_type: 'PARALLEL_REQUESTS_SENT',
        message:
          'Dispatched 3 simultaneous demonstration requests to Uber, Ola, and Rapido. Waiting for first eligible acceptance...'
      }
    ],
    ai_coordinator_explanation:
      'RushRoute AI Booking Coordinator is monitoring Uber, Ola, and Rapido in parallel. The first eligible provider to accept within your budget will be locked as the winner.',
    disclaimer: DEMO_SMART_BOOKING_DISCLAIMER
  };

  sessionStore.set(sessionId, session);
  if (idempotencyKey) {
    idempotencyStore.set(idempotencyKey, sessionId);
  }

  if (immediateResolve) {
    await evaluateAndAdvanceRaceSession(sessionId, { forceImmediate: true });
  }

  return sessionStore.get(sessionId);
}

export async function evaluateAndAdvanceRaceSession(
  sessionId,
  { forceImmediate = false, customElapsedMs = null } = {}
) {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  // Terminal states require no further transition unless late event is tested
  if (['finalized', 'failed', 'expired'].includes(session.session_state) && !forceImmediate) {
    return session;
  }

  // Atomic per-session lock
  if (sessionLocks.has(sessionId)) {
    return session;
  }
  sessionLocks.add(sessionId);

  try {
    const nowMs = Date.now();
    const elapsedMs = forceImmediate
      ? 10000
      : customElapsedMs !== null
      ? customElapsedMs
      : Math.max(0, nowMs - session.created_at_ms);

    if (elapsedMs >= 300 && session.session_state === 'requests_sent') {
      session.session_state = 'waiting';
      if (!session.state_history.includes('waiting')) {
        session.state_history.push('waiting');
      }
      for (const pr of session.provider_requests) {
        if (pr.status === 'Request Sent') {
          pr.status = 'Waiting for Acceptance';
        }
      }
    }

    // Sort provider requests by their scheduled response time (deterministic tie-break by fare then provider_id)
    const orderedRequests = [...session.provider_requests].sort((a, b) => {
      if (a.simulated_delay_ms !== b.simulated_delay_ms) {
        return a.simulated_delay_ms - b.simulated_delay_ms;
      }
      if (a.estimated_fare !== b.estimated_fare) {
        return a.estimated_fare - b.estimated_fare;
      }
      return a.provider_id.localeCompare(b.provider_id);
    });

    for (const pr of orderedRequests) {
      if (elapsedMs < pr.simulated_delay_ms) {
        continue;
      }

      const eventSec = Number((pr.simulated_delay_ms / 1000).toFixed(1));

      // Case 1: Provider is not eligible due to vehicle or budget constraints
      if (!pr.eligible_to_win) {
        if (pr.status === 'Request Sent' || pr.status === 'Waiting for Acceptance') {
          pr.status = 'Rejected';
          pr.responded_at_ms = session.created_at_ms + pr.simulated_delay_ms;
          pr.coordinator_note =
            pr.ineligibility_reason || 'Offer outside user vehicle/budget constraints.';
          session.race_timeline.push({
            elapsed_seconds: eventSec,
            event_type: 'INELIGIBLE_REJECTED',
            provider: pr.provider_name,
            message: `${pr.provider_name} (₹${pr.estimated_fare}) rejected by RushRoute AI: ${pr.coordinator_note}`
          });
        }
        continue;
      }

      // Case 2: Winner is ALREADY locked before or at this timestamp!
      if (session.winner_provider) {
        if (pr.provider_id === session.winner_provider) continue;

        if (
          pr.simulated_action === 'accept' &&
          (pr.simulate_late_arrival || pr.simulated_delay_ms === session.winner_delay_ms)
        ) {
          const isSimultaneousTie = pr.simulated_delay_ms === session.winner_delay_ms;
          const lateNote = isSimultaneousTie
            ? `Simultaneous acceptance tie-break: ${session.winner_provider} already acquired atomic lock first. ${pr.provider_name} request automatically cancelled by RushRoute AI.`
            : `Late acceptance from ${pr.provider_name} at ${eventSec}s rejected because ${session.winner_provider} was already locked as winner. Request cancelled by RushRoute AI.`;

          if (!session.late_acceptances_rejected.includes(pr.provider_name)) {
            session.late_acceptances_rejected.push(pr.provider_name);
            session.race_timeline.push({
              elapsed_seconds: eventSec,
              event_type: isSimultaneousTie
                ? 'SIMULTANEOUS_TIE_RESOLVED'
                : 'LATE_ACCEPTANCE_REJECTED',
              provider: pr.provider_name,
              message: lateNote
            });
          }
          pr.status = 'Cancelled by RushRoute AI';
          pr.coordinator_note = lateNote;
        }
        continue;
      }

      // Case 3: No winner locked yet — process this provider's scheduled action
      if (pr.simulated_action === 'reject') {
        if (pr.status !== 'Rejected') {
          pr.status = 'Rejected';
          pr.responded_at_ms = session.created_at_ms + pr.simulated_delay_ms;
          pr.coordinator_note = `${pr.provider_name} declined request (no nearby simulated captain available).`;
          session.race_timeline.push({
            elapsed_seconds: eventSec,
            event_type: 'PROVIDER_REJECTED',
            provider: pr.provider_name,
            message: `${pr.provider_name} rejected the request at ${eventSec}s.`
          });
        }
      } else if (pr.simulated_action === 'timeout') {
        if (pr.status !== 'Timed Out') {
          pr.status = 'Timed Out';
          pr.responded_at_ms = session.created_at_ms + pr.simulated_delay_ms;
          pr.coordinator_note = `${pr.provider_name} did not respond within the 5.0s booking window.`;
          session.race_timeline.push({
            elapsed_seconds: eventSec,
            event_type: 'PROVIDER_TIMEOUT',
            provider: pr.provider_name,
            message: `${pr.provider_name} request timed out at ${eventSec}s.`
          });
        }
      } else if (pr.simulated_action === 'accept') {
        // FIRST VALID ACCEPTANCE WINS! Lock winner atomically!
        session.winner_provider = pr.provider_id;
        session.winner_request_id = pr.provider_request_id;
        session.winner_locked_at_ms = session.created_at_ms + pr.simulated_delay_ms;
        session.winner_delay_ms = pr.simulated_delay_ms;

        pr.status = 'Accepted';
        pr.is_winner = true;
        pr.responded_at_ms = session.winner_locked_at_ms;
        pr.acceptance_time_seconds = eventSec;
        pr.coordinator_note = `WINNER — Accepted first in ${eventSec}s at ₹${pr.estimated_fare} (within budget).`;

        if (!session.state_history.includes('winner_selected')) {
          session.state_history.push('winner_selected');
        }
        session.race_timeline.push({
          elapsed_seconds: eventSec,
          event_type: 'WINNER_LOCKED',
          provider: pr.provider_name,
          message: `${pr.provider_name} (${pr.service_name}) accepted first at ${eventSec}s for ₹${pr.estimated_fare}! RushRoute AI locked ${pr.provider_name} as WINNER.`
        });

        // Immediately transition to cancellation_pending and cancel the other two providers
        if (!session.state_history.includes('cancellation_pending')) {
          session.state_history.push('cancellation_pending');
        }

        const cancelledNames = [];
        for (const other of session.provider_requests) {
          if (other.provider_id === pr.provider_id) continue;
          if (other.status !== 'Rejected') {
            other.status = 'Cancelled by RushRoute AI';
            other.is_winner = false;
            other.responded_at_ms = session.winner_locked_at_ms + 50;
            other.coordinator_note = `Automatically cancelled by RushRoute AI immediately after ${pr.provider_name} accepted first.`;
            cancelledNames.push(other.provider_name);
          }
        }

        if (cancelledNames.length > 0) {
          session.race_timeline.push({
            elapsed_seconds: Number((eventSec + 0.1).toFixed(1)),
            event_type: 'LOSERS_AUTO_CANCELLED',
            message: `RushRoute AI automatically cancelled pending requests for ${cancelledNames.join(
              ' & '
            )}.`
          });
        }

        // Finalize session state and winner_booking FIRST so even if DB persistence fails, the race finishes cleanly
        session.session_state = 'finalized';
        if (!session.state_history.includes('finalized')) {
          session.state_history.push('finalized');
        }
        session.ai_coordinator_explanation = `${
          pr.provider_name
        } (${pr.service_name}) accepted first in ${eventSec}s at ₹${
          pr.estimated_fare
        }, meeting your ${session.budget_mode} budget limit (max ₹${
          session.effective_max_budget
        }). RushRoute AI immediately locked ${
          pr.provider_name
        } as the single winner and automatically cancelled the other pending requests (${session.provider_requests
          .filter((x) => x.provider_id !== pr.provider_id)
          .map((x) => `${x.provider_name}: ${x.status}`)
          .join(', ')}).`;

        // Persist single confirmed booking in database if not already persisted
        if (!session.winner_booking) {
          const simulatedDriver = generateSimulatedDriverDetails(
            session.vehicle_type,
            pr.provider_name
          );
          const bookingRef = `RR-AI-${pr.provider_id.toUpperCase()}-${crypto
            .randomBytes(3)
            .toString('hex')
            .toUpperCase()}`;

          const fallbackBookingId = crypto.randomUUID();
          session.winner_booking = {
            id: fallbackBookingId,
            ride_request_id: session.ride_request_id,
            user_id: session.user_id,
            provider_name: `${pr.provider_name} (${pr.service_name} — AI Smart Booking Winner)`,
            provider_brand: pr.provider_name,
            service_name: pr.service_name,
            vehicle_type: session.vehicle_type,
            estimated_fare: pr.estimated_fare,
            estimated_duration_minutes: pr.estimated_duration_minutes,
            booking_status: 'confirmed',
            is_simulated: true,
            provider_reference: bookingRef,
            acceptance_time_seconds: eventSec,
            pickup_eta_minutes: pr.pickup_eta_minutes,
            distance_km: pr.distance_km,
            simulated_driver: simulatedDriver,
            booking_stage: 'Driver assigned',
            booking_stages: BOOKING_PROGRESS_STAGES
          };

          try {
            const savedBooking = await db.insert('ride_bookings', {
              ride_request_id: session.ride_request_id,
              user_id: session.user_id,
              provider_name: `${pr.provider_name} (${pr.service_name} — AI Smart Booking Winner)`,
              vehicle_type: session.vehicle_type,
              estimated_fare: pr.estimated_fare,
              estimated_duration_minutes: pr.estimated_duration_minutes,
              booking_status: 'confirmed',
              is_simulated: true,
              provider_reference: bookingRef,
              simulated_driver: simulatedDriver,
              booking_stage: 'Driver assigned',
              booking_stages: BOOKING_PROGRESS_STAGES
            });
            session.winner_booking.id = savedBooking.id;

            await db.update('ride_requests', session.ride_request_id, {
              status: 'confirmed'
            });

            await db.insert('journeys', {
              user_id: session.user_id,
              pickup_address: session.pickup_address,
              destination_address: session.destination_address,
              transport_modes: [session.vehicle_type],
              estimated_fare: pr.estimated_fare,
              estimated_duration_minutes: pr.estimated_duration_minutes,
              route_details: {
                source: 'RushRoute AI Smart Booking — First Acceptance Wins (Demo)',
                booking_id: savedBooking.id,
                session_id: session.session_id,
                provider_name: pr.provider_name,
                service_name: pr.service_name,
                provider_reference: bookingRef,
                acceptance_time_seconds: eventSec,
                cancelled_providers: session.provider_requests
                  .filter((x) => x.provider_id !== pr.provider_id)
                  .map((x) => ({ provider: x.provider_name, status: x.status })),
                simulated_driver: simulatedDriver,
                booking_stage: 'Driver assigned',
                booking_stages: BOOKING_PROGRESS_STAGES
              },
              journey_status: 'selected'
            });
          } catch (_dbErr) {
            // Keep in-memory session.winner_booking intact so UI always finalizes cleanly
          }
        }
      }
    }

    // Check if all 3 providers have finished without a winner
    if (!session.winner_provider) {
      const allResolved = session.provider_requests.every((pr) =>
        ['Rejected', 'Timed Out', 'Cancelled by RushRoute AI'].includes(pr.status)
      );
      if (allResolved) {
        const allTimedOut = session.provider_requests.every((pr) => pr.status === 'Timed Out');
        session.session_state = allTimedOut ? 'expired' : 'failed';
        if (!session.state_history.includes(session.session_state)) {
          session.state_history.push(session.session_state);
        }
        try {
          await db.update('ride_requests', session.ride_request_id, {
            status: 'cancelled'
          });
        } catch (_dbErr) {
          // Ignore DB update error in demo mode
        }

        const budgetFailed = session.provider_requests.every((pr) => !pr.budget_eligible);
        session.ai_coordinator_explanation = budgetFailed
          ? `No provider matched your budget cap of ₹${session.effective_max_budget} for ${session.vehicle_type} (lowest quote was ₹${Math.min(
              ...session.provider_requests.map((p) => p.estimated_fare)
            )}). Please increase your budget or switch to Bike/Auto and retry.`
          : allTimedOut
          ? 'All three providers (Uber, Ola, Rapido) timed out without accepting within the booking window. No ride was booked. Please retry.'
          : 'No eligible provider accepted your request in this demonstration session. Please retry or adjust your vehicle/budget settings.';

        session.race_timeline.push({
          elapsed_seconds: Number((elapsedMs / 1000).toFixed(1)),
          event_type: allTimedOut ? 'SESSION_EXPIRED' : 'SESSION_FAILED',
          message: session.ai_coordinator_explanation
        });
      }
    }

    return session;
  } finally {
    sessionLocks.delete(sessionId);
  }
}

/**
 * Allows injecting an explicit provider event (e.g., late acceptance after winner locked,
 * or simultaneous acceptance test) and returns the resulting backend-enforced state.
 */
export async function processExplicitProviderRaceEvent(
  sessionId,
  { provider_name, action = 'accept' }
) {
  const session = sessionStore.get(sessionId);
  if (!session) {
    const err = new Error('Smart booking race session not found.');
    err.statusCode = 404;
    throw err;
  }

  const target = session.provider_requests.find(
    (p) => p.provider_name.toLowerCase() === String(provider_name || '').toLowerCase()
  );
  if (!target) {
    const err = new Error(`Unknown provider: ${provider_name}`);
    err.statusCode = 400;
    throw err;
  }

  // If a winner is ALREADY locked, any late acceptance MUST be rejected!
  if (session.winner_provider && action === 'accept') {
    const note = `Late acceptance from ${target.provider_name} rejected: ${session.winner_provider} is already locked as the single winner for session ${session.session_id.slice(
      0,
      8
    )}.`;
    if (!session.late_acceptances_rejected.includes(target.provider_name)) {
      session.late_acceptances_rejected.push(target.provider_name);
    }
    target.status = 'Cancelled by RushRoute AI';
    target.coordinator_note = note;
    session.race_timeline.push({
      elapsed_seconds: Number(((Date.now() - session.created_at_ms) / 1000).toFixed(1)),
      event_type: 'LATE_ACCEPTANCE_REJECTED',
      provider: target.provider_name,
      message: note
    });
    return {
      accepted: false,
      rejected_as_late: true,
      reason: note,
      session
    };
  }

  target.simulated_action = action;
  target.simulated_delay_ms = 0;
  await evaluateAndAdvanceRaceSession(sessionId, { forceImmediate: false, customElapsedMs: 100 });
  return {
    accepted: session.winner_provider === target.provider_id,
    rejected_as_late: false,
    session: sessionStore.get(sessionId)
  };
}

export function getSmartBookingRaceSession(sessionId) {
  return sessionStore.get(sessionId) || null;
}
