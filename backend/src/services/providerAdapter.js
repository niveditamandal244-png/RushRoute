import crypto from 'crypto';
import { calculateDistanceKm, resolveCoordinates } from '../utils/geo.js';

/**
 * Provider Adapter Architecture (Section 4.1)
 * Implements:
 * - DemoRideProvider (Functional demonstration adapter with transparent simulation tiers)
 * - FutureUberProvider (Partner API stub — requires official Uber Partner credentials)
 * - FutureOlaProvider (Partner API stub — requires official Ola Partner credentials)
 * - FutureRapidoProvider (Partner API stub — requires official Rapido Partner credentials)
 */

const VEHICLE_PRICING = {
  Bike: { baseFare: 25, perKm: 8.5, perMin: 1.0, avgSpeedKmph: 28, capacity: 1 },
  Auto: { baseFare: 35, perKm: 13.5, perMin: 1.2, avgSpeedKmph: 23, capacity: 3 },
  Mini: { baseFare: 55, perKm: 16.5, perMin: 1.5, avgSpeedKmph: 25, capacity: 4 },
  Sedan: { baseFare: 75, perKm: 20.5, perMin: 1.8, avgSpeedKmph: 26, capacity: 4 }
};

export class DemoRideProvider {
  constructor() {
    this.providerId = 'DemoRideProvider';
    this.displayName = 'RushRoute Demo Mobility Network (Simulated)';
    this.isSimulated = true;
    this.isFunctional = true;
  }

  getQuotes({ pickupAddress, destinationAddress, pickupLat, pickupLng, destinationLat, destinationLng, vehicleType }) {
    const start = resolveCoordinates(pickupAddress, pickupLat, pickupLng);
    const end = resolveCoordinates(destinationAddress, destinationLat, destinationLng);
    const distanceKm = calculateDistanceKm(start.lat, start.lng, end.lat, end.lng);

    const categories = vehicleType ? [vehicleType] : Object.keys(VEHICLE_PRICING);
    const quotes = [];

    // Within DemoRideProvider, provide 3 simulated fleet tiers so budget filtering,
    // cheapest prioritization, and fallback acceptance can be demonstrated cleanly.
    const demoFleets = [
      {
        subProvider: 'DemoRideProvider — EcoSaver Fleet (Demo)',
        multiplier: 0.94,
        etaBonusMin: 2,
        reliabilityRate: 0.95
      },
      {
        subProvider: 'DemoRideProvider — CityStandard Fleet (Demo)',
        multiplier: 1.0,
        etaBonusMin: 0,
        reliabilityRate: 0.98
      },
      {
        subProvider: 'DemoRideProvider — PriorityExpress Fleet (Demo)',
        multiplier: 1.12,
        etaBonusMin: -2,
        reliabilityRate: 0.99
      }
    ];

    for (const cat of categories) {
      const rate = VEHICLE_PRICING[cat];
      if (!rate) continue;
      const baseDurationMin = Math.max(6, Math.round((distanceKm / rate.avgSpeedKmph) * 60));

      for (const fleet of demoFleets) {
        const rawFare = (rate.baseFare + distanceKm * rate.perKm + baseDurationMin * rate.perMin) * fleet.multiplier;
        const estimatedFare = Math.round(rawFare);
        const durationMin = Math.max(5, baseDurationMin + fleet.etaBonusMin);

        quotes.push({
          option_id: `demo_${cat.toLowerCase()}_${fleet.multiplier.toString().replace('.', '')}`,
          provider_id: this.providerId,
          provider_name: fleet.subProvider,
          vehicle_type: cat,
          capacity: rate.capacity,
          distance_km: distanceKm,
          estimated_fare: estimatedFare,
          estimated_duration_minutes: durationMin,
          pickup_eta_minutes: Math.max(2, Math.round(3 + fleet.etaBonusMin)),
          is_simulated: true,
          data_source_label: 'DEMONSTRATION DATA — Simulated Fare & Availability',
          fare_breakdown: {
            base_fare: rate.baseFare,
            distance_charge: Math.round(distanceKm * rate.perKm * fleet.multiplier),
            time_charge: Math.round(baseDurationMin * rate.perMin * fleet.multiplier),
            platform_fee: 0
          },
          coordinates: {
            pickup: { lat: start.lat, lng: start.lng },
            destination: { lat: end.lat, lng: end.lng }
          }
        });
      }
    }

    return quotes.sort((a, b) => a.estimated_fare - b.estimated_fare);
  }

  attemptDispatch(option, attemptIndex = 0) {
    // Simulate realistic dispatch: if user specifically tests fallback with "simulate_fail_first",
    // first option declines and second option succeeds; otherwise first suitable option succeeds.
    const shouldFailFirst = Boolean(option.simulateFirstFailure && attemptIndex === 0);
    if (shouldFailFirst) {
      return {
        accepted: false,
        reason: 'Simulated driver unavailable on EcoSaver tier; automatically falling back to next cheapest option.'
      };
    }

    return {
      accepted: true,
      provider_reference: `DEMO-RR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      driver_note: 'Demonstration Driver Assigned (Simulated Dispatch — Not a Live Third-Party Ride)'
    };
  }
}

export class FutureUberProvider {
  constructor() {
    this.providerId = 'FutureUberProvider';
    this.displayName = 'Uber Partner Adapter (Inactive — Requires Official Partner Credentials)';
    this.isSimulated = false;
    this.isFunctional = Boolean(process.env.UBER_PARTNER_CLIENT_ID && process.env.UBER_PARTNER_SECRET);
  }

  getStatus() {
    return {
      provider_id: this.providerId,
      display_name: this.displayName,
      is_functional: false,
      is_simulated: false,
      reason: 'Official Uber Rides Partner API credentials are not configured. RushRoute never fabricates live Uber fares or bookings.'
    };
  }
}

export class FutureOlaProvider {
  constructor() {
    this.providerId = 'FutureOlaProvider';
    this.displayName = 'Ola Partner Adapter (Inactive — Requires Official Partner Credentials)';
    this.isSimulated = false;
    this.isFunctional = Boolean(process.env.OLA_PARTNER_API_KEY);
  }

  getStatus() {
    return {
      provider_id: this.providerId,
      display_name: this.displayName,
      is_functional: false,
      is_simulated: false,
      reason: 'Official Ola Partner API credentials are not configured. RushRoute never fabricates live Ola fares or bookings.'
    };
  }
}

export class FutureRapidoProvider {
  constructor() {
    this.providerId = 'FutureRapidoProvider';
    this.displayName = 'Rapido Partner Adapter (Inactive — Requires Official Partner Credentials)';
    this.isSimulated = false;
    this.isFunctional = Boolean(process.env.RAPIDO_PARTNER_API_KEY);
  }

  getStatus() {
    return {
      provider_id: this.providerId,
      display_name: this.displayName,
      is_functional: false,
      is_simulated: false,
      reason: 'Official Rapido Partner API credentials are not configured. RushRoute never fabricates live Rapido fares or bookings.'
    };
  }
}

export const demoRideProvider = new DemoRideProvider();
export const futureUberProvider = new FutureUberProvider();
export const futureOlaProvider = new FutureOlaProvider();
export const futureRapidoProvider = new FutureRapidoProvider();

export function getProviderRegistryStatus() {
  return [
    {
      provider_id: demoRideProvider.providerId,
      display_name: demoRideProvider.displayName,
      is_functional: true,
      is_simulated: true,
      reason: 'Active demonstration provider for simulated private ride quotes and booking workflows.'
    },
    futureUberProvider.getStatus(),
    futureOlaProvider.getStatus(),
    futureRapidoProvider.getStatus()
  ];
}
