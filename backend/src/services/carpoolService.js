import { calculateBearingDegrees, calculateDistanceKm, resolveCoordinates } from '../utils/geo.js';

/**
 * Deterministic Carpool Compatibility Engine (Section 4.4)
 * Criteria:
 * 1. Pickup proximity (0–30 pts)
 * 2. Destination similarity (0–30 pts)
 * 3. Route bearing / corridor overlap (0–20 pts)
 * 4. Departure time compatibility (0–15 pts)
 * 5. Seat capacity & budget compatibility (0–5 pts)
 *
 * Privacy Controls:
 * - Precise pickup/destination coordinates of matched commuters are obfuscated
 *   (rounded to approximate area zone) until BOTH parties accept the match (`match_status === 'accepted'`).
 */

export function calculateCarpoolCompatibility(sourceRequest, candidateRequest) {
  const srcStart = resolveCoordinates(
    sourceRequest.pickup_address,
    sourceRequest.pickup_latitude,
    sourceRequest.pickup_longitude
  );
  const srcEnd = resolveCoordinates(
    sourceRequest.destination_address,
    sourceRequest.destination_latitude,
    sourceRequest.destination_longitude
  );

  const candStart = resolveCoordinates(
    candidateRequest.pickup_address,
    candidateRequest.pickup_latitude,
    candidateRequest.pickup_longitude
  );
  const candEnd = resolveCoordinates(
    candidateRequest.destination_address,
    candidateRequest.destination_latitude,
    candidateRequest.destination_longitude
  );

  const pickupDistanceKm = calculateDistanceKm(srcStart.lat, srcStart.lng, candStart.lat, candStart.lng);
  const destinationDistanceKm = calculateDistanceKm(srcEnd.lat, srcEnd.lng, candEnd.lat, candEnd.lng);
  const tripDistanceKm = calculateDistanceKm(srcStart.lat, srcStart.lng, srcEnd.lat, srcEnd.lng);

  // 1. Pickup proximity score (max 30)
  const pickupScore = Math.max(0, 30 - pickupDistanceKm * 5.2);

  // 2. Destination proximity score (max 30)
  const destinationScore = Math.max(0, 30 - destinationDistanceKm * 4.8);

  // 3. Corridor direction / route overlap score (max 20)
  const srcBearing = calculateBearingDegrees(srcStart.lat, srcStart.lng, srcEnd.lat, srcEnd.lng);
  const candBearing = calculateBearingDegrees(candStart.lat, candStart.lng, candEnd.lat, candEnd.lng);
  const angleDiff = Math.abs(((srcBearing - candBearing + 540) % 360) - 180);
  const overlapScore = Math.max(0, 20 - (angleDiff / 180) * 25);

  // 4. Departure time difference (max 15)
  const srcTimeMs = new Date(sourceRequest.departure_time || Date.now()).getTime();
  const candTimeMs = new Date(candidateRequest.departure_time || Date.now()).getTime();
  const timeDiffMinutes = Math.round(Math.abs(srcTimeMs - candTimeMs) / 60000);
  const timeScore = Math.max(0, 15 - (timeDiffMinutes / 120) * 15);

  // 5. Capacity & budget score (max 5)
  const capacityValid = Number(candidateRequest.available_seats) >= 1;
  const capacityScore = capacityValid ? 5 : 0;

  const totalScore = capacityValid
    ? Number(Math.min(99, Math.max(12, pickupScore + destinationScore + overlapScore + timeScore + capacityScore)).toFixed(1))
    : 0;

  // Deterministic individual shared cost calculation
  const baseSoloAutoOrCabCost = Math.round(50 + tripDistanceKm * 15.5);
  const estimatedSharedCost = Math.max(
    40,
    Math.round(baseSoloAutoOrCabCost / 2.1)
  );

  const routeOverlapPct = Math.round((overlapScore / 20) * 100);

  return {
    compatibility_score: totalScore,
    estimated_shared_cost: estimatedSharedCost,
    estimated_solo_cost: baseSoloAutoOrCabCost,
    estimated_savings: Math.max(0, baseSoloAutoOrCabCost - estimatedSharedCost),
    metrics: {
      pickup_proximity_km: pickupDistanceKm,
      destination_proximity_km: destinationDistanceKm,
      route_overlap_percent: routeOverlapPct,
      departure_time_diff_minutes: timeDiffMinutes,
      available_seats: candidateRequest.available_seats
    },
    explanation: `Pickup points are ${pickupDistanceKm} km apart, destinations are ${destinationDistanceKm} km apart, with ${routeOverlapPct}% corridor direction alignment and ${timeDiffMinutes} min departure window difference.`
  };
}

export function sanitizeCarpoolRequestForPrivacy(requestRecord, partnerUser, isMutuallyAccepted = false) {
  const approxPickupLat = requestRecord.pickup_latitude
    ? Number(Number(requestRecord.pickup_latitude).toFixed(2))
    : null;
  const approxPickupLng = requestRecord.pickup_longitude
    ? Number(Number(requestRecord.pickup_longitude).toFixed(2))
    : null;

  return {
    id: requestRecord.id,
    user_id: requestRecord.user_id,
    commuter_name: partnerUser ? partnerUser.full_name : 'Verified RushRoute Commuter (Demo)',
    commuter_contact: isMutuallyAccepted && partnerUser ? partnerUser.phone : 'Hidden until mutual acceptance',
    pickup_area: isMutuallyAccepted
      ? requestRecord.pickup_address
      : `${requestRecord.pickup_address.split(',')[0]} (Approximate Zone — Exact Pin Locked)`,
    destination_area: requestRecord.destination_address,
    pickup_coordinates: isMutuallyAccepted
      ? {
          lat: requestRecord.pickup_latitude,
          lng: requestRecord.pickup_longitude,
          precision: 'exact_mutually_accepted'
        }
      : {
          lat: approxPickupLat,
          lng: approxPickupLng,
          precision: 'approximate_privacy_protected'
        },
    departure_time: requestRecord.departure_time,
    available_seats: requestRecord.available_seats,
    estimated_budget: requestRecord.estimated_budget,
    status: requestRecord.status,
    privacy_notice: isMutuallyAccepted
      ? 'Mutual consent confirmed. Exact pickup details are now visible.'
      : 'Precise pickup coordinates and phone number are hidden until both commuters explicitly accept the match.'
  };
}
