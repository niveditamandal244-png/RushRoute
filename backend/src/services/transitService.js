import { calculateDistanceKm, resolveCoordinates } from '../utils/geo.js';
import { demoRideProvider } from './providerAdapter.js';
import {
  BMTC_STOPS,
  findNearestBmtcStop,
  getCurrentIstDate,
  getCurrentIstFormatted,
  planBmtcBusJourney
} from './bmtcService.js';
import {
  NAMMA_METRO_STATIONS,
  findNearestMetroStation,
  planNammaMetroJourney
} from './metroService.js';

/**
 * RushRoute Smart Multimodal Journey Planner (Sections 3, 4, 5 & 6)
 * Combines:
 * - BMTC Bus (GTFS-structured routes, intermediate stops, IST departures, waiting times)
 * - Namma Metro (Purple & Green Lines, Majestic Interchange, station sequences, BMRCL fare slabs)
 * - Bus + Metro & Auto + Metro Multimodal combinations
 * - Walking (for short urban connections)
 * - Shared Carpool & Private Rides (Bike, Auto, Mini, Sedan with min–max fare ranges)
 * - Highlights Cheapest, Fastest, and Best Balanced options
 */

export function planMultimodalJourneys({
  pickup_address,
  destination_address,
  pickup_latitude,
  pickup_longitude,
  destination_latitude,
  destination_longitude,
  departure_time,
  travel_date,
  passenger_count = 1,
  maximum_budget,
  preferred_mode
}) {
  const start = resolveCoordinates(pickup_address, pickup_latitude, pickup_longitude);
  const end = resolveCoordinates(destination_address, destination_latitude, destination_longitude);
  const distanceKm = calculateDistanceKm(start.lat, start.lng, end.lat, end.lng);
  const pax = Math.max(1, Math.min(6, Number(passenger_count) || 1));
  const budgetLimit = maximum_budget != null && maximum_budget !== '' ? Number(maximum_budget) : null;

  // Resolve IST departure timestamp and prevent past departure selection
  const nowIst = getCurrentIstDate();
  let effectiveDepartureIso = departure_time || null;
  if (travel_date && departure_time && !String(departure_time).includes('T')) {
    effectiveDepartureIso = `${travel_date}T${departure_time}:00+05:30`;
  }
  const reqIst = effectiveDepartureIso ? getCurrentIstDate(effectiveDepartureIso) : nowIst;
  const isPastAdjusted =
    reqIst.dateStr < nowIst.dateStr ||
    (reqIst.dateStr === nowIst.dateStr && reqIst.minutesOfDay < nowIst.minutesOfDay);

  const originBmtcStop = findNearestBmtcStop({ lat: start.lat, lng: start.lng });
  const destBmtcStop = findNearestBmtcStop({ lat: end.lat, lng: end.lng });
  const originMetroStation = findNearestMetroStation({ lat: start.lat, lng: start.lng });
  const destMetroStation = findNearestMetroStation({ lat: end.lat, lng: end.lng });

  const bmtcDirectMatches = planBmtcBusJourney({
    originStop: originBmtcStop,
    destinationStop: destBmtcStop,
    departureIso: isPastAdjusted ? null : effectiveDepartureIso,
    passengerCount: pax
  });

  const topBmtc = bmtcDirectMatches[0] || null;
  const metroPlan = planNammaMetroJourney({
    originStation: originMetroStation,
    destinationStation: destMetroStation,
    passengerCount: pax
  });

  // 1. BMTC Bus + Walking Option (with real BMTC route numbers & scheduled IST departures)
  const walkToBusKm = originBmtcStop.walk_distance_km || 0.3;
  const walkFromBusKm = destBmtcStop.walk_distance_km || 0.25;
  const busDistanceKm = Math.max(0.5, Number((distanceKm - walkToBusKm - walkFromBusKm).toFixed(2)));
  const busSingleFare = topBmtc
    ? topBmtc.single_passenger_fare_inr
    : Math.min(55, Math.max(15, Math.round(12 + busDistanceKm * 2.2)));
  const busTotalFare = busSingleFare * pax;
  const busWaitMins = topBmtc ? topBmtc.estimated_wait_minutes : 6;
  const busInVehicleMins = topBmtc
    ? topBmtc.in_vehicle_duration_minutes
    : Math.max(10, Math.round((busDistanceKm / 19) * 60));
  const busDurationMin =
    Math.round(walkToBusKm * 12) + busWaitMins + busInVehicleMins + Math.round(walkFromBusKm * 12);

  const bmtcRouteLabel = topBmtc
    ? `BMTC Route ${topBmtc.route_number} (${topBmtc.service_type})`
    : `BMTC Corridor Bus (${originBmtcStop.zone} → ${destBmtcStop.zone})`;

  const busWaypoints = topBmtc
    ? [
        { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
        ...topBmtc.intermediate_stops.map((st) => ({
          label: `BMTC Stop: ${st.stop_name}`,
          lat: st.lat,
          lng: st.lng,
          type: 'bus_stop'
        })),
        { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
      ]
    : [
        { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
        { label: originBmtcStop.stop_name, lat: originBmtcStop.lat, lng: originBmtcStop.lng, type: 'bus_stop' },
        { label: destBmtcStop.stop_name, lat: destBmtcStop.lat, lng: destBmtcStop.lng, type: 'bus_stop' },
        { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
      ];

  const busOption = {
    option_id: 'route_bmtc_bus',
    title: `${bmtcRouteLabel}`,
    category: 'public_transport',
    transport_modes: ['Walking', 'BMTC Bus', 'Walking'],
    primary_mode: 'Bus',
    passenger_count: pax,
    estimated_fare: busTotalFare,
    estimated_fare_min: busTotalFare,
    estimated_fare_max: Math.round(busTotalFare * 1.15),
    estimated_duration_minutes: busDurationMin,
    total_distance_km: distanceKm,
    walking_distance_km: Number((walkToBusKm + walkFromBusKm).toFixed(2)),
    transfers_count: 0,
    within_budget: budgetLimit != null ? busTotalFare <= budgetLimit : true,
    budget_difference: budgetLimit != null ? Number((budgetLimit - busTotalFare).toFixed(2)) : null,
    is_schedule_based_demo: true,
    data_source_label: 'BMTC Schedule-Based Timetable (IST) — Not Live GPS',
    fare_assumptions: `₹${busSingleFare}/passenger × ${pax} passenger(s) based on BMTC stage slab`,
    bmtc_details: topBmtc || {
      route_number: '335-E / 500-D Corridor',
      route_name: `${originBmtcStop.stop_name} ↔ ${destBmtcStop.stop_name}`,
      frequency_mins: 12,
      estimated_wait_minutes: busWaitMins,
      intermediate_stops: [originBmtcStop, destBmtcStop],
      upcoming_departures_ist: []
    },
    cost_breakdown: {
      bmtc_bus_fare: busTotalFare,
      namma_metro_fare: 0,
      first_last_mile_auto: 0,
      total: busTotalFare
    },
    steps: [
      {
        step_number: 1,
        mode: 'Walking',
        instruction: `Walk ${Math.round(walkToBusKm * 1000)}m from ${pickup_address} to ${originBmtcStop.stop_name}`,
        duration_minutes: Math.max(3, Math.round(walkToBusKm * 12)),
        distance_km: walkToBusKm,
        fare: 0
      },
      {
        step_number: 2,
        mode: 'BMTC Bus',
        instruction: `Board ${bmtcRouteLabel} at ${originBmtcStop.stop_name} → Alight at ${destBmtcStop.stop_name}`,
        duration_minutes: busInVehicleMins,
        distance_km: busDistanceKm,
        fare: busTotalFare,
        schedule_note: topBmtc?.upcoming_departures_ist?.[0]
          ? `Next scheduled bus: ${topBmtc.upcoming_departures_ist[0].departure_ist} (Est. wait ${busWaitMins} min, Every ${topBmtc.frequency_mins} mins)`
          : `Scheduled headway every 10–12 mins IST (Est. wait ${busWaitMins} min)`
      },
      {
        step_number: 3,
        mode: 'Walking',
        instruction: `Walk ${Math.round(walkFromBusKm * 1000)}m from ${destBmtcStop.stop_name} to ${destination_address}`,
        duration_minutes: Math.max(2, Math.round(walkFromBusKm * 12)),
        distance_km: walkFromBusKm,
        fare: 0
      }
    ],
    waypoints: busWaypoints
  };

  // 2. Namma Metro (or BMTC Feeder + Namma Metro) Option
  const needsFeederBus = originMetroStation.distance_to_station_km > 1.2;
  const feederBusFarePerPax = needsFeederBus ? 15 : 0;
  const metroSingleFare = metroPlan ? metroPlan.single_passenger_token_fare_inr : 35;
  const metroTotalFare = (metroSingleFare + feederBusFarePerPax) * pax;
  const metroInTrainMins = metroPlan ? metroPlan.estimated_duration_minutes : 18;
  const metroDurationMin =
    (needsFeederBus ? 10 : 5) + 4 + metroInTrainMins + 5;

  const metroWaypoints = metroPlan
    ? [
        { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
        ...metroPlan.station_sequence.map((st) => ({
          label: st.station_name,
          lat: st.lat,
          lng: st.lng,
          type: st.is_interchange ? 'interchange' : 'metro_station'
        })),
        { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
      ]
    : [
        { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
        { label: originMetroStation.station_name, lat: originMetroStation.lat, lng: originMetroStation.lng, type: 'metro_station' },
        { label: destMetroStation.station_name, lat: destMetroStation.lat, lng: destMetroStation.lng, type: 'metro_station' },
        { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
      ];

  const metroOption = {
    option_id: 'route_namma_metro',
    title: needsFeederBus
      ? `BMTC Feeder Bus + Namma Metro (${(metroPlan?.lines_used || ['Purple Line']).join(' → ')})`
      : `Namma Metro Direct (${(metroPlan?.lines_used || ['Purple Line']).join(' → ')})`,
    category: 'multimodal',
    transport_modes: needsFeederBus
      ? ['BMTC Feeder', 'Namma Metro', 'Walking']
      : ['Walking', 'Namma Metro', 'Walking'],
    primary_mode: 'Metro',
    passenger_count: pax,
    estimated_fare: metroTotalFare,
    estimated_fare_min: Math.round(metroTotalFare * 0.95), // SmartCard 5% discount
    estimated_fare_max: metroTotalFare,
    estimated_duration_minutes: metroDurationMin,
    total_distance_km: distanceKm,
    walking_distance_km: needsFeederBus ? 0.35 : 0.55,
    transfers_count: (needsFeederBus ? 1 : 0) + (metroPlan?.requires_interchange ? 1 : 0),
    within_budget: budgetLimit != null ? metroTotalFare <= budgetLimit : true,
    budget_difference: budgetLimit != null ? Number((budgetLimit - metroTotalFare).toFixed(2)) : null,
    is_schedule_based_demo: true,
    data_source_label: 'BMRCL Namma Metro Official Fare Slab & Schedule (IST)',
    fare_assumptions: `Metro Token ₹${metroSingleFare}/pax (SmartCard ₹${
      metroPlan?.single_passenger_smartcard_fare_inr || metroSingleFare
    })${needsFeederBus ? ` + ₹${feederBusFarePerPax} BMTC Feeder` : ''} × ${pax} pax`,
    metro_details: metroPlan,
    cost_breakdown: {
      bmtc_feeder_fare: feederBusFarePerPax * pax,
      namma_metro_fare: metroSingleFare * pax,
      first_last_mile_auto: 0,
      total: metroTotalFare
    },
    steps: [
      needsFeederBus
        ? {
            step_number: 1,
            mode: 'BMTC Feeder',
            instruction: `Take BMTC Metro Feeder Bus from ${originBmtcStop.stop_name} to ${originMetroStation.station_name}`,
            duration_minutes: 10,
            distance_km: originMetroStation.distance_to_station_km,
            fare: feederBusFarePerPax * pax,
            schedule_note: 'Feeder frequency every 10 mins IST'
          }
        : {
            step_number: 1,
            mode: 'Walking',
            instruction: `Walk 350m from ${pickup_address} to ${originMetroStation.station_name}`,
            duration_minutes: 5,
            distance_km: 0.35,
            fare: 0
          },
      {
        step_number: 2,
        mode: 'Namma Metro',
        instruction: `Board Namma Metro at ${originMetroStation.station_name} → ${
          metroPlan?.requires_interchange
            ? `Interchange at Nadaprabhu Kempegowda (Majestic) → `
            : ''
        }Alight at ${destMetroStation.station_name} (${metroPlan?.station_hops || 4} stops)`,
        duration_minutes: metroInTrainMins,
        distance_km: Number((distanceKm * 0.78).toFixed(2)),
        fare: metroSingleFare * pax,
        schedule_note: metroPlan?.requires_interchange
          ? 'Includes 6-min platform transfer at Majestic Interchange (Purple ↔ Green Line)'
          : 'Direct Namma Metro line • Scheduled headway 5–8 mins IST'
      },
      {
        step_number: 3,
        mode: 'Walking',
        instruction: `Exit ${destMetroStation.station_name} and walk 250m to ${destination_address}`,
        duration_minutes: 4,
        distance_km: 0.25,
        fare: 0
      }
    ],
    waypoints: metroWaypoints
  };

  // 3. First-Mile Auto + Namma Metro Rapid Combo
  const firstMileKm = Math.max(1.0, Number((originMetroStation.distance_to_station_km || 1.4).toFixed(2)));
  const autosNeeded = Math.ceil(pax / 3);
  const firstMileAutoFare = Math.max(40, Math.round(35 + firstMileKm * 15)) * autosNeeded;
  const comboMetroFare = metroSingleFare * pax;
  const autoMetroTotalFare = firstMileAutoFare + comboMetroFare;
  const autoMetroDurationMin = Math.max(12, Math.round((firstMileKm / 23) * 60) + metroInTrainMins + 6);

  const autoMetroOption = {
    option_id: 'route_auto_metro_combo',
    title: 'First-Mile Auto + Namma Metro Rapid Combo',
    category: 'multimodal',
    transport_modes: ['Auto', 'Namma Metro', 'Walking'],
    primary_mode: 'Auto + Metro',
    passenger_count: pax,
    estimated_fare: autoMetroTotalFare,
    estimated_fare_min: Math.round(autoMetroTotalFare * 0.92),
    estimated_fare_max: Math.round(autoMetroTotalFare * 1.1),
    estimated_duration_minutes: autoMetroDurationMin,
    total_distance_km: distanceKm,
    walking_distance_km: 0.2,
    transfers_count: 1 + (metroPlan?.requires_interchange ? 1 : 0),
    within_budget: budgetLimit != null ? autoMetroTotalFare <= budgetLimit : true,
    budget_difference: budgetLimit != null ? Number((budgetLimit - autoMetroTotalFare).toFixed(2)) : null,
    is_schedule_based_demo: true,
    data_source_label: 'Estimated Auto Meter Fare + BMRCL Metro Schedule (IST)',
    fare_assumptions: `${autosNeeded} Auto(s) to station (₹${firstMileAutoFare}) + Metro Token (₹${comboMetroFare})`,
    cost_breakdown: {
      bmtc_bus_fare: 0,
      namma_metro_fare: comboMetroFare,
      first_last_mile_auto: firstMileAutoFare,
      total: autoMetroTotalFare
    },
    steps: [
      {
        step_number: 1,
        mode: 'Auto',
        instruction: `Take First-Mile Auto (${firstMileKm} km) from ${pickup_address} to ${originMetroStation.station_name}`,
        duration_minutes: Math.max(5, Math.round((firstMileKm / 23) * 60)),
        distance_km: firstMileKm,
        fare: firstMileAutoFare,
        schedule_note: 'Estimated Bengaluru auto fare to nearest Metro gate'
      },
      {
        step_number: 2,
        mode: 'Namma Metro',
        instruction: `Board Namma Metro from ${originMetroStation.station_name} to ${destMetroStation.station_name}`,
        duration_minutes: metroInTrainMins,
        distance_km: Number((distanceKm * 0.78).toFixed(2)),
        fare: comboMetroFare,
        schedule_note: 'BMRCL scheduled frequency 5–8 mins IST'
      },
      {
        step_number: 3,
        mode: 'Walking',
        instruction: `Walk 200m from ${destMetroStation.station_name} exit to ${destination_address}`,
        duration_minutes: 3,
        distance_km: 0.2,
        fare: 0
      }
    ],
    waypoints: metroWaypoints
  };

  // 4. Shared Carpool Option
  const carpoolPerSeatCost = Math.max(45, Math.round(25 + distanceKm * 6.5));
  const carpoolTotalCost = carpoolPerSeatCost * pax;
  const carpoolDurationMin = Math.max(15, Math.round((distanceKm / 25) * 60 + 6));
  const carpoolOption = {
    option_id: 'route_shared_carpool',
    title: 'Shared Carpool Match (Split Fuel & Toll Estimate)',
    category: 'shared_carpool',
    transport_modes: ['Carpool'],
    primary_mode: 'Carpool',
    passenger_count: pax,
    estimated_fare: carpoolTotalCost,
    estimated_fare_min: Math.round(carpoolTotalCost * 0.9),
    estimated_fare_max: Math.round(carpoolTotalCost * 1.1),
    estimated_duration_minutes: carpoolDurationMin,
    total_distance_km: distanceKm,
    walking_distance_km: 0.1,
    transfers_count: 0,
    within_budget: budgetLimit != null ? carpoolTotalCost <= budgetLimit : true,
    budget_difference: budgetLimit != null ? Number((budgetLimit - carpoolTotalCost).toFixed(2)) : null,
    is_schedule_based_demo: true,
    data_source_label: 'Deterministic Carpool Split Estimate (Requires Mutual Consent)',
    fare_assumptions: `₹${carpoolPerSeatCost}/seat × ${pax} passenger(s)`,
    cost_breakdown: {
      shared_fuel_and_toll_split: carpoolTotalCost,
      platform_fee: 0,
      total: carpoolTotalCost
    },
    steps: [
      {
        step_number: 1,
        mode: 'Carpool',
        instruction: `Meet verified carpool partner near ${pickup_address} pickup zone (exact coordinates unlocked after mutual consent)`,
        duration_minutes: carpoolDurationMin,
        distance_km: distanceKm,
        fare: carpoolTotalCost,
        schedule_note: 'Requires compatible commuter match & mutual consent'
      }
    ],
    waypoints: [
      { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
      { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
    ]
  };

  // 5. Private Ride Options (Bike, Auto, Mini, Sedan)
  const privateQuotes = demoRideProvider.getQuotes({
    pickupAddress: pickup_address,
    destinationAddress: destination_address,
    pickupLat: start.lat,
    pickupLng: start.lng,
    destinationLat: end.lat,
    destinationLng: end.lng,
    passengerCount: pax
  });

  const seenVehicles = new Set();
  const privateOptions = [];
  for (const q of privateQuotes) {
    if (seenVehicles.has(q.vehicle_type)) continue;
    seenVehicles.add(q.vehicle_type);
    privateOptions.push({
      option_id: `route_private_${q.vehicle_type.toLowerCase()}`,
      title: `Direct ${q.vehicle_type} (${q.vehicles_needed > 1 ? `${q.vehicles_needed}x ${q.vehicle_type}s` : 'Door-to-Door'})`,
      category: 'private_ride',
      transport_modes: [q.vehicle_type],
      primary_mode: q.vehicle_type,
      vehicle_type: q.vehicle_type,
      passenger_count: pax,
      vehicles_needed: q.vehicles_needed,
      estimated_fare: q.estimated_fare,
      estimated_fare_min: q.estimated_fare_min,
      estimated_fare_max: q.estimated_fare_max,
      estimated_duration_minutes: q.estimated_duration_minutes,
      total_distance_km: distanceKm,
      walking_distance_km: 0,
      transfers_count: 0,
      within_budget: budgetLimit != null ? q.estimated_fare <= budgetLimit : true,
      budget_difference: budgetLimit != null ? Number((budgetLimit - q.estimated_fare).toFixed(2)) : null,
      is_schedule_based_demo: true,
      data_source_label: 'Estimated Fare Range (RushRoute Demo / Uber / Ola / Rapido)',
      fare_assumptions: q.fare_assumptions,
      cost_breakdown: {
        ...q.fare_breakdown,
        total: q.estimated_fare
      },
      steps: [
        {
          step_number: 1,
          mode: q.vehicle_type,
          instruction: `Direct ${q.vehicle_type} ride from ${pickup_address} to ${destination_address}`,
          duration_minutes: q.estimated_duration_minutes,
          distance_km: distanceKm,
          fare: q.estimated_fare,
          schedule_note: `Est. range ₹${q.estimated_fare_min}–₹${q.estimated_fare_max}`
        }
      ],
      waypoints: [
        { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
        { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
      ]
    });
  }

  let allOptions = [busOption, metroOption, autoMetroOption, carpoolOption, ...privateOptions];

  // Add Short-Hop Walk + BMTC Bus option if trip is short (<= 3.5 km) so fares are never 0/NaN
  if (distanceKm <= 3.5) {
    const walkMins = Math.max(8, Math.round(distanceKm * 12));
    const shortHopFare = 10 * pax;
    allOptions.unshift({
      option_id: 'route_short_walk_transit',
      title: 'Pedestrian Walk + Short-Hop BMTC Stage 1',
      category: 'public_transport',
      transport_modes: ['Walking', 'BMTC Bus'],
      primary_mode: 'Walking',
      passenger_count: pax,
      estimated_fare: shortHopFare,
      estimated_fare_min: shortHopFare,
      estimated_fare_max: 15 * pax,
      estimated_duration_minutes: walkMins,
      total_distance_km: distanceKm,
      walking_distance_km: Number((distanceKm * 0.45).toFixed(2)),
      transfers_count: 0,
      within_budget: budgetLimit != null ? shortHopFare <= budgetLimit : true,
      budget_difference: budgetLimit != null ? Number((budgetLimit - shortHopFare).toFixed(2)) : null,
      is_schedule_based_demo: true,
      data_source_label: 'BMTC Minimum Stage-1 Fare (₹10/pax) + Pedestrian Walk',
      fare_assumptions: `BMTC Stage-1 minimum ticket ₹10 × ${pax} passenger(s)`,
      cost_breakdown: { bmtc_stage_1_fare: shortHopFare, total: shortHopFare },
      steps: [
        {
          step_number: 1,
          mode: 'Walking',
          instruction: `Walk ${Number((distanceKm * 0.45).toFixed(2))} km along pedestrian footpath from ${pickup_address} to nearest BMTC stop`,
          duration_minutes: Math.max(4, Math.round(walkMins * 0.45)),
          distance_km: Number((distanceKm * 0.45).toFixed(2)),
          fare: 0
        },
        {
          step_number: 2,
          mode: 'BMTC Bus',
          instruction: `Take 1-stop BMTC Stage-1 hop to ${destination_address}`,
          duration_minutes: Math.max(4, Math.round(walkMins * 0.55)),
          distance_km: Number((distanceKm * 0.55).toFixed(2)),
          fare: shortHopFare,
          schedule_note: 'BMTC Stage-1 minimum fare ₹10/passenger'
        }
      ],
      waypoints: [
        { label: pickup_address, lat: start.lat, lng: start.lng, type: 'origin' },
        { label: destination_address, lat: end.lat, lng: end.lng, type: 'destination' }
      ]
    });
  }

  // Score options for Best Balanced
  const scoredOptions = allOptions.map((opt) => {
    const budgetPenalty = budgetLimit != null && opt.estimated_fare > budgetLimit ? 45 : 0;
    const costScore = Math.max(0, 100 - (opt.estimated_fare / pax) * 0.25);
    const timeScore = Math.max(0, 100 - opt.estimated_duration_minutes * 1.1);
    const transferPenalty = opt.transfers_count * 7;
    const modeBonus =
      preferred_mode &&
      preferred_mode !== 'Any' &&
      (opt.transport_modes.some((m) => m.toLowerCase().includes(preferred_mode.toLowerCase())) ||
        opt.primary_mode.toLowerCase().includes(preferred_mode.toLowerCase()))
        ? 18
        : 0;
    const suitabilityScore = Number(
      Math.max(
        5,
        Math.min(99, costScore * 0.45 + timeScore * 0.4 - transferPenalty - budgetPenalty + modeBonus)
      ).toFixed(1)
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
  const highestExpensiveOption = [...scoredOptions].sort(
    (a, b) => b.estimated_fare - a.estimated_fare
  )[0];
  const recommendedOption = scoredOptions[0];

  // Tag Cheapest, Fastest, and Best Balanced flags and explanations on each option
  const taggedOptions = scoredOptions.map((opt) => {
    const isCheapest = opt.option_id === cheapestOption.option_id;
    const isFastest = opt.option_id === fastestOption.option_id;
    const isBestBalanced = opt.option_id === recommendedOption.option_id;
    let recommendationReason = null;
    if (isBestBalanced) {
      recommendationReason = `Recommended as Best Balanced Option (Score ${opt.suitability_score}/100): optimal trade-off between fare (₹${opt.estimated_fare}), duration (${opt.estimated_duration_minutes} mins), and ${opt.transfers_count} transfer(s).`;
    } else if (isCheapest) {
      recommendationReason = `Recommended as Cheapest Option at ₹${opt.estimated_fare} total for ${pax} passenger(s), saving ₹${Math.max(0, highestExpensiveOption.estimated_fare - opt.estimated_fare)} vs peak cab.`;
    } else if (isFastest) {
      recommendationReason = `Recommended as Fastest Option (${opt.estimated_duration_minutes} mins) with direct corridor routing.`;
    }
    return {
      ...opt,
      is_cheapest: isCheapest,
      is_fastest: isFastest,
      is_best_balanced: isBestBalanced,
      recommendation_explanation: recommendationReason
    };
  });

  const budgetSummary = {
    user_budget: budgetLimit,
    passenger_count: pax,
    cheapest_option_id: cheapestOption.option_id,
    cheapest_fare: cheapestOption.estimated_fare,
    fastest_option_id: fastestOption.option_id,
    fastest_duration_minutes: fastestOption.estimated_duration_minutes,
    recommended_option_id: recommendedOption.option_id,
    max_potential_savings: Math.max(
      0,
      highestExpensiveOption.estimated_fare - cheapestOption.estimated_fare
    ),
    options_within_budget_count:
      budgetLimit != null
        ? taggedOptions.filter((o) => o.estimated_fare <= budgetLimit).length
        : taggedOptions.length,
    total_options_count: taggedOptions.length,
    budget_status:
      budgetLimit == null
        ? 'unknown'
        : cheapestOption.estimated_fare <= budgetLimit
        ? 'within_budget'
        : 'above_budget'
  };

  return {
    city: 'Bengaluru',
    timezone: 'Asia/Kolkata (IST)',
    departure_time_ist: getCurrentIstFormatted(isPastAdjusted ? null : effectiveDepartureIso),
    past_departure_adjusted: isPastAdjusted,
    passenger_count: pax,
    pickup_address,
    destination_address,
    distance_km: distanceKm,
    departure_time: effectiveDepartureIso || new Date().toISOString(),
    coordinates: {
      pickup: { lat: start.lat, lng: start.lng },
      destination: { lat: end.lat, lng: end.lng }
    },
    nearby_transit_nodes: [
      {
        id: originBmtcStop.stop_id,
        name: originBmtcStop.stop_name,
        stop_code: originBmtcStop.stop_code,
        lat: originBmtcStop.lat,
        lng: originBmtcStop.lng,
        type: 'bmtc_stop'
      },
      {
        id: destBmtcStop.stop_id,
        name: destBmtcStop.stop_name,
        stop_code: destBmtcStop.stop_code,
        lat: destBmtcStop.lat,
        lng: destBmtcStop.lng,
        type: 'bmtc_stop'
      },
      {
        id: originMetroStation.station_id,
        name: originMetroStation.station_name,
        line: originMetroStation.line_id,
        lat: originMetroStation.lat,
        lng: originMetroStation.lng,
        type: 'metro_station'
      },
      {
        id: destMetroStation.station_id,
        name: destMetroStation.station_name,
        line: destMetroStation.line_id,
        lat: destMetroStation.lat,
        lng: destMetroStation.lng,
        type: 'metro_station'
      }
    ],
    budget_intelligence: budgetSummary,
    cheapest_option: taggedOptions.find((o) => o.is_cheapest) || taggedOptions[0],
    fastest_option: taggedOptions.find((o) => o.is_fastest) || taggedOptions[0],
    best_balanced_option: taggedOptions[0],
    recommended_option: taggedOptions[0],
    options: taggedOptions
  };
}
