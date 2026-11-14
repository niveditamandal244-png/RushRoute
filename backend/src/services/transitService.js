import { calculateDistanceKm, resolveCoordinates } from '../utils/geo.js';
import { demoRideProvider } from './providerAdapter.js';

/**
 * Public Transport Journey Planner & Smart Budget Intelligence (Sections 4.2 & 4.3)
 * - Generates verified-structure multimodal routes (Bus, Metro, Auto, Walking, Combinations)
 * - Clearly labels schedule-based demonstration routes and never claims live BMTC GPS tracking
 * - Computes deterministic cost & time comparisons across Private, Public, Multimodal, and Shared Carpool
 */

export function planMultimodalJourneys({
  pickup_address,
  destination_address,
  pickup_latitude,
  pickup_longitude,
  destination_latitude,
  destination_longitude,
  departure_time,
  maximum_budget,
  preferred_mode
}) {
  const start = resolveCoordinates(pickup_address, pickup_latitude, pickup_longitude);
  const end = resolveCoordinates(destination_address, destination_latitude, destination_longitude);
  const distanceKm = calculateDistanceKm(start.lat, start.lng, end.lat, end.lng);

  const budgetLimit = maximum_budget != null ? Number(maximum_budget) : null;
  const startHub = start.matchedHub;
  const endHub = end.matchedHub;

  // 1. Public Bus + Walking Option (Schedule-Based Demonstration Route)
  const walkToBusKm = Math.min(0.6, Math.max(0.2, Number((startHub.distanceToHubKm * 0.25 + 0.25).toFixed(2))));
  const walkFromBusKm = Math.min(0.5, Math.max(0.15, Number((endHub.distanceToHubKm * 0.2 + 0.2).toFixed(2))));
  const busDistanceKm = Math.max(0.5, Number((distanceKm - walkToBusKm - walkFromBusKm).toFixed(2)));
  const busFare = Math.min(60, Math.max(15, Math.round(12 + busDistanceKm * 2.2)));
  const busDurationMin = Math.round(walkToBusKm * 12 + (busDistanceKm / 19) * 60 + 6 + walkFromBusKm * 12);

  const busOption = {
    option_id: 'route_public_bus_walk',
    title: 'City Bus + Walking Connection',
    category: 'public_transport',
    transport_modes: ['Walking', 'Bus', 'Walking'],
    primary_mode: 'Bus',
    estimated_fare: busFare,
    estimated_duration_minutes: busDurationMin,
    total_distance_km: distanceKm,
    walking_distance_km: Number((walkToBusKm + walkFromBusKm).toFixed(2)),
    transfers_count: 0,
    within_budget: budgetLimit != null ? busFare <= budgetLimit : true,
    budget_difference: budgetLimit != null ? Number((budgetLimit - busFare).toFixed(2)) : null,
    is_schedule_based_demo: true,
    data_source_label: 'Schedule-Based Demonstration Route (Not Live GPS Tracking)',
    cost_breakdown: {
      bus_ticket: busFare,
      metro_ticket: 0,
      first_last_mile_auto: 0,
      walking_cost: 0,
      total: busFare
    },
    steps: [
      {
        step_number: 1,
        mode: 'Walking',
        instruction: `Walk ${Math.round(walkToBusKm * 1000)}m from ${pickup_address} to ${startHub.busHub}`,
        duration_minutes: Math.max(3, Math.round(walkToBusKm * 12)),
        distance_km: walkToBusKm,
        fare: 0
      },
      {
        step_number: 2,
        mode: 'Bus',
        instruction: `Board Demonstration City Bus Corridor (${startHub.zone} → ${endHub.zone}) from ${startHub.busHub} to ${endHub.busHub}`,
        duration_minutes: Math.max(8, Math.round((busDistanceKm / 19) * 60)),
        distance_km: busDistanceKm,
        fare: busFare,
        schedule_note: 'Schedule-based estimate (Every 12–15 mins; live BMTC GPS feed not claimed)'
      },
      {
        step_number: 3,
        mode: 'Walking',
        instruction: `Walk ${Math.round(walkFromBusKm * 1000)}m from ${endHub.busHub} to ${destination_address}`,
        duration_minutes: Math.max(2, Math.round(walkFromBusKm * 12)),
        distance_km: walkFromBusKm,
        fare: 0
      }
    ],
    waypoints: [
      { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
      { label: startHub.busHub, lat: startHub.lat, lng: startHub.lng, type: 'transfer' },
      { label: endHub.busHub, lat: endHub.lat, lng: endHub.lng, type: 'transfer' },
      { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
    ]
  };

  // 2. Metro + Feeder Walk / Bus Combination
  const metroBaseFare = Math.min(60, Math.max(20, Math.round(15 + distanceKm * 2.8)));
  const feederBusFare = startHub.hasMetro ? 0 : 15;
  const metroWalkKm = startHub.hasMetro ? 0.45 : 0.35;
  const metroTotalFare = metroBaseFare + feederBusFare;
  const metroDurationMin = Math.max(14, Math.round((distanceKm / 31) * 60 + (startHub.hasMetro ? 8 : 15)));

  const metroOption = {
    option_id: 'route_metro_multimodal',
    title: startHub.hasMetro ? 'Metro + Walking Connection' : 'Feeder Bus + Metro + Walking',
    category: 'multimodal',
    transport_modes: startHub.hasMetro ? ['Walking', 'Metro', 'Walking'] : ['Bus', 'Metro', 'Walking'],
    primary_mode: 'Metro',
    estimated_fare: metroTotalFare,
    estimated_duration_minutes: metroDurationMin,
    total_distance_km: distanceKm,
    walking_distance_km: metroWalkKm,
    transfers_count: startHub.hasMetro ? 1 : 2,
    within_budget: budgetLimit != null ? metroTotalFare <= budgetLimit : true,
    budget_difference: budgetLimit != null ? Number((budgetLimit - metroTotalFare).toFixed(2)) : null,
    is_schedule_based_demo: true,
    data_source_label: 'Schedule-Based Demonstration Route (Estimated Headway 6–8 mins)',
    cost_breakdown: {
      bus_ticket: feederBusFare,
      metro_ticket: metroBaseFare,
      first_last_mile_auto: 0,
      walking_cost: 0,
      total: metroTotalFare
    },
    steps: [
      startHub.hasMetro
        ? {
            step_number: 1,
            mode: 'Walking',
            instruction: `Walk 300m from ${pickup_address} to ${startHub.name} (${startHub.metroLine})`,
            duration_minutes: 4,
            distance_km: 0.3,
            fare: 0
          }
        : {
            step_number: 1,
            mode: 'Bus',
            instruction: `Take Demo Feeder Bus from ${startHub.busHub} to nearest Metro Interchange`,
            duration_minutes: 9,
            distance_km: Number((distanceKm * 0.2).toFixed(2)),
            fare: feederBusFare,
            schedule_note: 'Schedule-based feeder estimate'
          },
      {
        step_number: 2,
        mode: 'Metro',
        instruction: `Board Metro Rail (${startHub.metroLine || 'Main Corridor Demo Schedule'}) toward ${endHub.name}`,
        duration_minutes: Math.max(8, Math.round((distanceKm * 0.75 / 34) * 60)),
        distance_km: Number((distanceKm * 0.75).toFixed(2)),
        fare: metroBaseFare,
        schedule_note: 'Schedule-based estimate (Not live train telemetry)'
      },
      {
        step_number: 3,
        mode: 'Walking',
        instruction: `Exit station and walk 250m to ${destination_address}`,
        duration_minutes: 4,
        distance_km: 0.25,
        fare: 0
      }
    ],
    waypoints: [
      { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
      { label: startHub.name, lat: startHub.lat, lng: startHub.lng, type: 'transfer' },
      { label: endHub.name, lat: endHub.lat, lng: endHub.lng, type: 'transfer' },
      { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
    ]
  };

  // 3. Auto + Metro Fast Multimodal Combo
  const firstMileKm = Math.max(1.2, Number((distanceKm * 0.25).toFixed(2)));
  const metroLegKm = Math.max(1.5, Number((distanceKm * 0.7).toFixed(2)));
  const firstMileAutoFare = Math.max(35, Math.round(30 + firstMileKm * 13));
  const comboMetroFare = Math.min(55, Math.max(20, Math.round(14 + metroLegKm * 2.5)));
  const autoMetroTotalFare = firstMileAutoFare + comboMetroFare;
  const autoMetroDurationMin = Math.max(12, Math.round((firstMileKm / 24) * 60 + (metroLegKm / 35) * 60 + 5));

  const autoMetroOption = {
    option_id: 'route_auto_metro_combo',
    title: 'First-Mile Auto + Metro Rapid Combo',
    category: 'multimodal',
    transport_modes: ['Auto', 'Metro', 'Walking'],
    primary_mode: 'Auto + Metro',
    estimated_fare: autoMetroTotalFare,
    estimated_duration_minutes: autoMetroDurationMin,
    total_distance_km: distanceKm,
    walking_distance_km: 0.2,
    transfers_count: 1,
    within_budget: budgetLimit != null ? autoMetroTotalFare <= budgetLimit : true,
    budget_difference: budgetLimit != null ? Number((budgetLimit - autoMetroTotalFare).toFixed(2)) : null,
    is_schedule_based_demo: true,
    data_source_label: 'Simulated Auto Quote + Schedule-Based Metro Demo Route',
    cost_breakdown: {
      bus_ticket: 0,
      metro_ticket: comboMetroFare,
      first_last_mile_auto: firstMileAutoFare,
      walking_cost: 0,
      total: autoMetroTotalFare
    },
    steps: [
      {
        step_number: 1,
        mode: 'Auto',
        instruction: `Take Demo First-Mile Auto from ${pickup_address} to ${startHub.name} Metro Entrance`,
        duration_minutes: Math.max(5, Math.round((firstMileKm / 24) * 60)),
        distance_km: firstMileKm,
        fare: firstMileAutoFare,
        schedule_note: 'Simulated DemoRideProvider first-mile fare'
      },
      {
        step_number: 2,
        mode: 'Metro',
        instruction: `Ride Rapid Metro Corridor from ${startHub.name} to ${endHub.name}`,
        duration_minutes: Math.max(6, Math.round((metroLegKm / 35) * 60)),
        distance_km: metroLegKm,
        fare: comboMetroFare,
        schedule_note: 'Schedule-based metro estimate'
      },
      {
        step_number: 3,
        mode: 'Walking',
        instruction: `Walk 200m from station exit to ${destination_address}`,
        duration_minutes: 3,
        distance_km: 0.2,
        fare: 0
      }
    ],
    waypoints: [
      { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
      { label: `${startHub.name} Metro`, lat: startHub.lat, lng: startHub.lng, type: 'transfer' },
      { label: `${endHub.name} Station`, lat: endHub.lat, lng: endHub.lng, type: 'transfer' },
      { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
    ]
  };

  // 4. Shared Carpool Estimate (for Smart Budget Comparison)
  const carpoolEstimatedCost = Math.max(45, Math.round(25 + distanceKm * 6.5));
  const carpoolDurationMin = Math.max(15, Math.round((distanceKm / 25) * 60 + 6));
  const carpoolOption = {
    option_id: 'route_shared_carpool',
    title: 'Shared Carpool Match (Estimated Split Cost)',
    category: 'shared_carpool',
    transport_modes: ['Carpool'],
    primary_mode: 'Carpool',
    estimated_fare: carpoolEstimatedCost,
    estimated_duration_minutes: carpoolDurationMin,
    total_distance_km: distanceKm,
    walking_distance_km: 0.1,
    transfers_count: 0,
    within_budget: budgetLimit != null ? carpoolEstimatedCost <= budgetLimit : true,
    budget_difference: budgetLimit != null ? Number((budgetLimit - carpoolEstimatedCost).toFixed(2)) : null,
    is_schedule_based_demo: true,
    data_source_label: 'Deterministic Shared Cost Estimate (Requires Mutual Carpool Consent)',
    cost_breakdown: {
      shared_fuel_and_toll_split: carpoolEstimatedCost,
      platform_fee: 0,
      total: carpoolEstimatedCost
    },
    steps: [
      {
        step_number: 1,
        mode: 'Carpool',
        instruction: `Meet verified carpool partner near ${pickup_address} pickup zone (exact point shared after mutual acceptance)`,
        duration_minutes: carpoolDurationMin,
        distance_km: distanceKm,
        fare: carpoolEstimatedCost,
        schedule_note: 'Subject to compatible commuter match & mutual consent'
      }
    ],
    waypoints: [
      { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
      { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
    ]
  };

  // 5. Direct Private Ride Options (Bike, Auto, Mini, Sedan from DemoRideProvider)
  const privateQuotes = demoRideProvider.getQuotes({
    pickupAddress: pickup_address,
    destinationAddress: destination_address,
    pickupLat: start.lat,
    pickupLng: start.lng,
    destinationLat: end.lat,
    destinationLng: end.lng
  });

  // Pick cheapest quote per vehicle type for the multimodal comparison matrix
  const seenVehicles = new Set();
  const privateOptions = [];
  for (const q of privateQuotes) {
    if (seenVehicles.has(q.vehicle_type)) continue;
    seenVehicles.add(q.vehicle_type);
    privateOptions.push({
      option_id: `route_private_${q.vehicle_type.toLowerCase()}`,
      title: `Direct Private ${q.vehicle_type} (${q.provider_name})`,
      category: 'private_ride',
      transport_modes: [q.vehicle_type],
      primary_mode: q.vehicle_type,
      vehicle_type: q.vehicle_type,
      estimated_fare: q.estimated_fare,
      estimated_duration_minutes: q.estimated_duration_minutes,
      total_distance_km: distanceKm,
      walking_distance_km: 0,
      transfers_count: 0,
      within_budget: budgetLimit != null ? q.estimated_fare <= budgetLimit : true,
      budget_difference: budgetLimit != null ? Number((budgetLimit - q.estimated_fare).toFixed(2)) : null,
      is_schedule_based_demo: true,
      data_source_label: q.data_source_label,
      cost_breakdown: {
        ...q.fare_breakdown,
        total: q.estimated_fare
      },
      steps: [
        {
          step_number: 1,
          mode: q.vehicle_type,
          instruction: `Door-to-door simulated ${q.vehicle_type} ride from ${pickup_address} to ${destination_address}`,
          duration_minutes: q.estimated_duration_minutes,
          distance_km: distanceKm,
          fare: q.estimated_fare,
          schedule_note: 'Demonstration quote via DemoRideProvider'
        }
      ],
      waypoints: [
        { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
        { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
      ]
    });
  }

  let allOptions = [busOption, metroOption, autoMetroOption, carpoolOption, ...privateOptions];

  // Filter or prioritize by preferred_mode if provided
  if (preferred_mode && preferred_mode !== 'Any') {
    allOptions.sort((a, b) => {
      const aHas = a.transport_modes.includes(preferred_mode) ? 0 : 1;
      const bHas = b.transport_modes.includes(preferred_mode) ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;
      return a.estimated_fare - b.estimated_fare;
    });
  }

  // Deterministic Smart Budget Recommendation Scoring (Section 4.3)
  const scoredOptions = allOptions.map((opt) => {
    const budgetPenalty = budgetLimit != null && opt.estimated_fare > budgetLimit ? 45 : 0;
    const costScore = Math.max(0, 100 - opt.estimated_fare * 0.25);
    const timeScore = Math.max(0, 100 - opt.estimated_duration_minutes * 1.1);
    const transferPenalty = opt.transfers_count * 7;
    const modeBonus =
      preferred_mode && preferred_mode !== 'Any' && opt.transport_modes.includes(preferred_mode)
        ? 18
        : 0;
    const suitabilityScore = Number(
      Math.max(5, Math.min(99, costScore * 0.45 + timeScore * 0.4 - transferPenalty - budgetPenalty + modeBonus)).toFixed(1)
    );
    return {
      ...opt,
      suitability_score: suitabilityScore
    };
  });

  scoredOptions.sort((a, b) => b.suitability_score - a.suitability_score);

  const cheapestOption = [...scoredOptions].sort((a, b) => a.estimated_fare - b.estimated_fare)[0];
  const fastestOption = [...scoredOptions].sort(
    (a, b) => a.estimated_duration_minutes - b.estimated_duration_minutes
  )[0];
  const highestExpensiveOption = [...scoredOptions].sort((a, b) => b.estimated_fare - a.estimated_fare)[0];
  const recommendedOption = scoredOptions[0];

  const budgetSummary = {
    user_budget: budgetLimit,
    cheapest_option_id: cheapestOption.option_id,
    cheapest_fare: cheapestOption.estimated_fare,
    fastest_option_id: fastestOption.option_id,
    fastest_duration_minutes: fastestOption.estimated_duration_minutes,
    recommended_option_id: recommendedOption.option_id,
    max_potential_savings: Math.max(0, highestExpensiveOption.estimated_fare - cheapestOption.estimated_fare),
    options_within_budget_count:
      budgetLimit != null
        ? scoredOptions.filter((o) => o.estimated_fare <= budgetLimit).length
        : scoredOptions.length,
    total_options_count: scoredOptions.length,
    budget_status:
      budgetLimit == null
        ? 'unknown'
        : cheapestOption.estimated_fare <= budgetLimit
        ? 'within_budget'
        : 'above_budget'
  };

  return {
    pickup_address,
    destination_address,
    distance_km: distanceKm,
    departure_time: departure_time || new Date().toISOString(),
    coordinates: {
      pickup: { lat: start.lat, lng: start.lng },
      destination: { lat: end.lat, lng: end.lng }
    },
    budget_intelligence: budgetSummary,
    recommended_option: recommendedOption,
    options: scoredOptions
  };
}
