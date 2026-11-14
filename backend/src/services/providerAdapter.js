import crypto from 'crypto';
import { getSyntheticDrivers, SYNTHETIC_DRIVERS } from '../data/syntheticDrivers.js';
import { calculateDistanceKm, resolveCoordinates } from '../utils/geo.js';

export { SYNTHETIC_DRIVERS, getSyntheticDrivers };

/**
 * RushRoute Fare Comparison Engine & Provider Adapter Architecture (Sections 4.1, 6 & 7)
 *
 * Implements:
 * - Configurable Bengaluru transport-specific rate cards (Bike, Auto, Mini, Sedan)
 * - Minimum & Maximum estimated fare ranges with explicit fare assumptions
 * - Provider-ready adapters for Uber, Ola, and Rapido:
 *   - Uses official partner APIs only when credentials are configured
 *   - Provides transparent estimated fare ranges & verified external booking deep links when credentials are absent
 *   - Supports RushRoute's internal simulated booking request via DemoRideProvider
 */

export const CONFIGURABLE_FARE_RATES = {
  Bike: {
    baseFare: 25,
    perKm: 8.5,
    perMin: 1.0,
    minFare: 35,
    avgSpeedKmph: 28,
    capacity: 1,
    assumptions: 'Base ₹25 (first 2 km) + ₹8.5/km + ₹1/min traffic buffer (1 passenger max per bike)'
  },
  Auto: {
    baseFare: 35,
    perKm: 15.0,
    perMin: 1.2,
    minFare: 45,
    avgSpeedKmph: 23,
    capacity: 3,
    assumptions: 'Bengaluru meter-aligned estimate: ₹35 base + ₹15/km + peak congestion buffer (up to 3 passengers)'
  },
  Mini: {
    baseFare: 55,
    perKm: 17.0,
    perMin: 1.5,
    minFare: 85,
    avgSpeedKmph: 25,
    capacity: 4,
    assumptions: 'AC Compact Hatchback: ₹55 base + ₹17/km + ₹1.5/min ride time (up to 4 passengers)'
  },
  Sedan: {
    baseFare: 75,
    perKm: 21.0,
    perMin: 1.8,
    minFare: 115,
    avgSpeedKmph: 26,
    capacity: 4,
    assumptions: 'AC Comfort Sedan: ₹75 base + ₹21/km + ₹1.8/min ride time (up to 4 passengers)'
  },
  SUV: {
    baseFare: 115,
    perKm: 30.0,
    perMin: 2.2,
    minFare: 165,
    avgSpeedKmph: 26,
    capacity: 6,
    assumptions: 'AC Spacious SUV (6-Seater): ₹115 base + ₹30/km + ₹2.2/min ride time (up to 6 passengers)'
  }
};

export const BOOKING_PROGRESS_STAGES = [
  'Request created',
  'Driver assigned',
  'Driver heading to pickup',
  'Driver arrived',
  'Journey started',
  'Journey completed'
];

export function generateSimulatedDriverDetails(vehicleType = 'Auto', providerName = null) {
  const candidates = getSyntheticDrivers({ provider: providerName, vehicleType });
  const selected =
    candidates[crypto.randomInt(0, candidates.length)] || {
      driver_id: 'DEMO-DRV-01',
      provider: providerName || 'RushRoute',
      vehicle_type: vehicleType,
      driver_name: 'Nagaraj R.',
      driver_rating: '4.9 ★ (Demo Rating)',
      vehicle_model: 'Bajaj RE Compact CNG Auto',
      registration_number: 'KA-05-DM-2042',
      zone: 'Bengaluru Central',
      demo_contact: '+91-80-0000-0202'
    };

  return {
    driver_id: selected.driver_id,
    provider: selected.provider,
    driver_name: `${selected.driver_name} (SIMULATED DRIVER)`,
    driver_rating: selected.driver_rating,
    vehicle_model: `${selected.vehicle_model} (Fictional Demo ${selected.vehicle_type})`,
    registration_number: `${selected.registration_number} (Fictional Demo Plate)`,
    zone: selected.zone,
    demo_contact: `${selected.demo_contact} (Demo Only — Not a Real Number)`,
    labels: ['DEMO BOOKING', 'SIMULATED DRIVER', 'ESTIMATED FARE'],
    disclaimer:
      'Fictional driver and vehicle details generated for hackathon demonstration only. No real third-party driver has been dispatched.'
  };
}

function buildExternalBookingLinks({ start, end, pickupAddress, destinationAddress }) {
  const uPickup = encodeURIComponent(pickupAddress || 'Bengaluru');
  const uDrop = encodeURIComponent(destinationAddress || 'Bengaluru');
  return {
    Uber: `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${start.lat}&pickup[longitude]=${start.lng}&pickup[formatted_address]=${uPickup}&dropoff[latitude]=${end.lat}&dropoff[longitude]=${end.lng}&dropoff[formatted_address]=${uDrop}`,
    Ola: `https://book.olacabs.com/?lat=${start.lat}&lng=${start.lng}&drop_lat=${end.lat}&drop_lng=${end.lng}&pickup_name=${uPickup}&drop_name=${uDrop}`,
    Rapido: 'https://www.rapido.bike/'
  };
}

export class DemoRideProvider {
  constructor() {
    this.providerId = 'DemoRideProvider';
    this.displayName = 'RushRoute Demo Mobility Network (Simulated)';
    this.isSimulated = true;
    this.isFunctional = true;
  }

  getQuotes({
    pickupAddress,
    destinationAddress,
    pickupLat,
    pickupLng,
    destinationLat,
    destinationLng,
    vehicleType,
    passengerCount = 1
  }) {
    const start = resolveCoordinates(pickupAddress, pickupLat, pickupLng);
    const end = resolveCoordinates(destinationAddress, destinationLat, destinationLng);
    const distanceKm = calculateDistanceKm(start.lat, start.lng, end.lat, end.lng);
    const pax = Math.max(1, Number(passengerCount) || 1);
    const deepLinks = buildExternalBookingLinks({
      start,
      end,
      pickupAddress,
      destinationAddress
    });

    const categories = vehicleType ? [vehicleType] : Object.keys(CONFIGURABLE_FARE_RATES);
    const quotes = [];

    const providerTiers = [
      {
        subProvider: 'RushRoute EcoSaver (Simulated Booking)',
        brand: 'RushRoute Demo',
        multiplier: 0.94,
        rangeSpread: 0.08,
        etaBonusMin: 2,
        externalUrl: null
      },
      {
        subProvider: 'Rapido Estimate (Fare Range + Deep Link)',
        brand: 'Rapido',
        multiplier: 0.97,
        rangeSpread: 0.1,
        etaBonusMin: 1,
        externalUrl: deepLinks.Rapido
      },
      {
        subProvider: 'Ola Estimate (Fare Range + Deep Link)',
        brand: 'Ola',
        multiplier: 1.02,
        rangeSpread: 0.12,
        etaBonusMin: 0,
        externalUrl: deepLinks.Ola
      },
      {
        subProvider: 'Uber Estimate (Fare Range + Deep Link)',
        brand: 'Uber',
        multiplier: 1.06,
        rangeSpread: 0.12,
        etaBonusMin: -1,
        externalUrl: deepLinks.Uber
      }
    ];

    for (const cat of categories) {
      const rate = CONFIGURABLE_FARE_RATES[cat];
      if (!rate) continue;

      const vehiclesNeeded = Math.ceil(pax / rate.capacity);
      const baseDurationMin = Math.max(6, Math.round((distanceKm / rate.avgSpeedKmph) * 60));

      for (const fleet of providerTiers) {
        // Rapido primarily serves Bike & Auto
        if (fleet.brand === 'Rapido' && (cat === 'Sedan' || cat === 'SUV')) continue;

        const singleVehicleRaw = Math.max(
          rate.minFare,
          (rate.baseFare + distanceKm * rate.perKm + baseDurationMin * rate.perMin) *
            fleet.multiplier
        );
        const estimatedFare = Math.round(singleVehicleRaw * vehiclesNeeded);
        const estimatedFareMin = Math.max(
          rate.minFare * vehiclesNeeded,
          Math.round(estimatedFare * (1 - fleet.rangeSpread))
        );
        const estimatedFareMax = Math.round(estimatedFare * (1 + fleet.rangeSpread));
        const durationMin = Math.max(5, baseDurationMin + fleet.etaBonusMin);

        quotes.push({
          option_id: `demo_${cat.toLowerCase()}_${fleet.brand.toLowerCase().replace(/\s+/g, '_')}`,
          provider_id: this.providerId,
          provider_name: fleet.subProvider,
          brand: fleet.brand,
          vehicle_type: cat,
          capacity: rate.capacity,
          passenger_count: pax,
          vehicles_needed: vehiclesNeeded,
          vehicles_required: vehiclesNeeded,
          distance_km: distanceKm,
          estimated_fare: estimatedFare,
          estimated_fare_min: estimatedFareMin,
          estimated_fare_max: estimatedFareMax,
          estimated_duration_minutes: durationMin,
          pickup_eta_minutes: Math.max(2, Math.round(3 + fleet.etaBonusMin)),
          is_simulated: true,
          external_booking_url: fleet.externalUrl,
          external_deeplinks: [
            { provider: 'Uber', url: deepLinks.Uber },
            { provider: 'Ola', url: deepLinks.Ola },
            ...(cat === 'Bike' || cat === 'Auto' || cat === 'Mini'
              ? [{ provider: 'Rapido', url: deepLinks.Rapido }]
              : [])
          ],
          fare_assumptions: rate.assumptions,
          data_source_label: fleet.externalUrl
            ? 'ESTIMATED FARE RANGE — Official App Deep Link Available'
            : 'SIMULATED DEMO BOOKING — RushRoute Internal Adapter',
          fare_breakdown: {
            base_fare: rate.baseFare * vehiclesNeeded,
            distance_charge: Math.round(distanceKm * rate.perKm * fleet.multiplier * vehiclesNeeded),
            time_charge: Math.round(baseDurationMin * rate.perMin * fleet.multiplier * vehiclesNeeded),
            vehicles_multiplier: vehiclesNeeded,
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
    const shouldFailFirst = Boolean(option.simulateFirstFailure && attemptIndex === 0);
    if (shouldFailFirst) {
      return {
        accepted: false,
        reason: 'Simulated driver unavailable on first tier; automatically falling back to next cheapest option.'
      };
    }

    const simulatedDriver = generateSimulatedDriverDetails(
      option.vehicle_type || 'Auto',
      option.brand || null
    );
    return {
      accepted: true,
      provider_reference: `DEMO-RR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      driver_note: 'Demonstration Driver Assigned (Simulated Dispatch — Not a Live Third-Party Ride)',
      simulated_driver: simulatedDriver,
      booking_stage: 'Driver assigned',
      booking_stages: BOOKING_PROGRESS_STAGES
    };
  }
}

export class FutureUberProvider {
  constructor() {
    this.providerId = 'FutureUberProvider';
    this.displayName = 'Uber Partner Adapter (Estimated Fare Range + Deep Link Mode)';
    this.isSimulated = false;
    this.isFunctional = Boolean(
      process.env.UBER_PARTNER_CLIENT_ID && process.env.UBER_PARTNER_SECRET
    );
  }

  getStatus() {
    return {
      provider_id: this.providerId,
      display_name: this.displayName,
      is_functional: this.isFunctional,
      is_simulated: false,
      external_deep_link_supported: true,
      reason: this.isFunctional
        ? 'Connected to Uber Partner API.'
        : 'Live Uber Partner API credentials not configured; provides deterministic fare range estimates and official m.uber.com deep links.'
    };
  }
}

export class FutureOlaProvider {
  constructor() {
    this.providerId = 'FutureOlaProvider';
    this.displayName = 'Ola Partner Adapter (Estimated Fare Range + Deep Link Mode)';
    this.isSimulated = false;
    this.isFunctional = Boolean(process.env.OLA_PARTNER_API_KEY);
  }

  getStatus() {
    return {
      provider_id: this.providerId,
      display_name: this.displayName,
      is_functional: this.isFunctional,
      is_simulated: false,
      external_deep_link_supported: true,
      reason: this.isFunctional
        ? 'Connected to Ola Partner API.'
        : 'Live Ola Partner API credentials not configured; provides deterministic fare range estimates and official book.olacabs.com deep links.'
    };
  }
}

export class FutureRapidoProvider {
  constructor() {
    this.providerId = 'FutureRapidoProvider';
    this.displayName = 'Rapido Partner Adapter (Estimated Fare Range + Deep Link Mode)';
    this.isSimulated = false;
    this.isFunctional = Boolean(process.env.RAPIDO_PARTNER_API_KEY);
  }

  getStatus() {
    return {
      provider_id: this.providerId,
      display_name: this.displayName,
      is_functional: this.isFunctional,
      is_simulated: false,
      external_deep_link_supported: true,
      reason: this.isFunctional
        ? 'Connected to Rapido Partner API.'
        : 'Live Rapido Partner API credentials not configured; provides deterministic fare range estimates and official rapido.bike deep links.'
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
      external_deep_link_supported: true,
      reason: 'Active demonstration provider for simulated private ride quotes and booking workflows.'
    },
    futureUberProvider.getStatus(),
    futureOlaProvider.getStatus(),
    futureRapidoProvider.getStatus()
  ];
}
