import {
  BMTC_STOPS,
  findNearestBmtcStop,
  findNearestBmtcStopsWithWalking,
  getAllBmtcRoutes,
  getCurrentIstFormatted,
  importVerifiedBmtcTimetable,
  planBmtcBusJourney
} from '../services/bmtcService.js';
import {
  NAMMA_METRO_LINES,
  NAMMA_METRO_STATIONS,
  findNearestMetroStation,
  planNammaMetroJourney
} from '../services/metroService.js';
import { CONFIGURABLE_FARE_RATES } from '../services/providerAdapter.js';
import { resolveCoordinates } from '../utils/geo.js';

export async function listBmtcRoutes(_req, res) {
  const stopMap = new Map(BMTC_STOPS.map((s) => [s.stop_id, s]));
  const routes = getAllBmtcRoutes().map((r) => ({
    ...r,
    service_class: r.service_type,
    peak_frequency_mins: r.frequency_mins,
    stops: (r.stop_sequence || []).map((id) => stopMap.get(id)).filter(Boolean)
  }));

  return res.status(200).json({
    success: true,
    city: 'Bengaluru',
    timezone: 'Asia/Kolkata (IST)',
    routes
  });
}

export async function listBmtcStops(_req, res) {
  return res.status(200).json({
    success: true,
    city: 'Bengaluru',
    stops: BMTC_STOPS
  });
}

export async function findNearestBmtcStops(req, res) {
  try {
    const {
      latitude,
      longitude,
      lat,
      lng,
      pickup_address,
      limit = 6
    } = req.body || {};

    const rawLat = latitude ?? lat;
    const rawLng = longitude ?? lng;
    let userLat = rawLat != null ? Number(rawLat) : null;
    let userLng = rawLng != null ? Number(rawLng) : null;
    let originLabel = pickup_address || 'Current GPS Location';
    let originSource = 'gps';

    if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
      if (!pickup_address || !String(pickup_address).trim()) {
        return res.status(400).json({
          success: false,
          error: 'Please provide either GPS coordinates (latitude, longitude) or a manual pickup location.'
        });
      }
      const resolved = resolveCoordinates(pickup_address);
      userLat = resolved.lat;
      userLng = resolved.lng;
      originLabel = pickup_address.trim();
      originSource = 'manual_location';
    }

    const result = findNearestBmtcStopsWithWalking({
      userLat,
      userLng,
      originLabel,
      originSource,
      limit
    });

    return res.status(200).json({
      success: true,
      city: 'Bengaluru',
      ...result
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to calculate nearest BMTC bus stops.'
    });
  }
}

export async function planBmtcRoute(req, res) {
  try {
    const {
      pickup_address,
      destination_address,
      pickup_latitude,
      pickup_longitude,
      destination_latitude,
      destination_longitude,
      travel_date,
      departure_time,
      passenger_count = 1
    } = req.body;

    if (!pickup_address || !destination_address) {
      return res.status(400).json({
        success: false,
        error: 'Pickup and destination locations are required for BMTC route planning.'
      });
    }

    const start = resolveCoordinates(pickup_address, pickup_latitude, pickup_longitude);
    const end = resolveCoordinates(destination_address, destination_latitude, destination_longitude);

    const originStop =
      findNearestBmtcStop(pickup_address) ||
      findNearestBmtcStop({ lat: start.lat, lng: start.lng });
    const destinationStop =
      findNearestBmtcStop(destination_address) ||
      findNearestBmtcStop({ lat: end.lat, lng: end.lng });

    let departureIso = departure_time || null;
    if (travel_date && departure_time && !String(departure_time).includes('T')) {
      departureIso = `${travel_date}T${departure_time}:00+05:30`;
    }

    const rawMatches = planBmtcBusJourney({
      originStop,
      destinationStop,
      departureIso,
      passengerCount: passenger_count
    });

    const options = rawMatches.map((m) => ({
      ...m,
      bmtc_details: {
        route_number: m.route_number,
        service_class: m.service_type,
        frequency_minutes: m.frequency_mins,
        estimated_wait_minutes: m.estimated_wait_minutes,
        upcoming_departures: (m.upcoming_departures_ist || []).map((d, idx) => ({
          trip_id: `${m.route_id}_${idx + 1}`,
          departure_time_ist: d.departure_ist,
          arrival_time_ist: d.arrival_ist,
          wait_minutes: d.wait_minutes
        }))
      }
    }));

    return res.status(200).json({
      success: true,
      city: 'Bengaluru',
      reference_time_ist: getCurrentIstFormatted(),
      origin_stop: originStop,
      destination_stop: destinationStop,
      options
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to plan BMTC bus journey.'
    });
  }
}

export async function importBmtcTimetable(req, res) {
  try {
    const routesInput = Array.isArray(req.body) ? req.body : req.body?.routes || [];
    const result = importVerifiedBmtcTimetable(routesInput);
    return res.status(200).json({
      success: true,
      message: `Imported/updated ${result.imported_routes_count} BMTC route(s).`,
      ...result
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to import BMTC timetable dataset.'
    });
  }
}

export async function listMetroLines(_req, res) {
  const lines = NAMMA_METRO_LINES.map((line) => ({
    ...line,
    terminal_stations: line.terminals ? line.terminals.split(' ↔ ') : [],
    off_peak_frequency_mins: line.offpeak_frequency_mins,
    stations: NAMMA_METRO_STATIONS.filter(
      (s) => s.line_id === line.line_id || (s.lines_served && s.lines_served.includes(line.line_id))
    )
  }));

  return res.status(200).json({
    success: true,
    city: 'Bengaluru',
    lines
  });
}

export async function listMetroStations(_req, res) {
  return res.status(200).json({
    success: true,
    city: 'Bengaluru',
    stations: NAMMA_METRO_STATIONS
  });
}

export async function planMetroRoute(req, res) {
  try {
    const {
      pickup_address,
      destination_address,
      pickup_latitude,
      pickup_longitude,
      destination_latitude,
      destination_longitude,
      passenger_count = 1
    } = req.body;

    const start = resolveCoordinates(
      pickup_address || 'Majestic',
      pickup_latitude,
      pickup_longitude
    );
    const end = resolveCoordinates(
      destination_address || 'Indiranagar',
      destination_latitude,
      destination_longitude
    );

    const originStation =
      findNearestMetroStation(pickup_address) ||
      findNearestMetroStation({ lat: start.lat, lng: start.lng });
    const destinationStation =
      findNearestMetroStation(destination_address) ||
      findNearestMetroStation({ lat: end.lat, lng: end.lng });

    const metroPlan = planNammaMetroJourney({
      originStation,
      destinationStation,
      passengerCount: passenger_count
    });

    const options = metroPlan
      ? [
          {
            ...metroPlan,
            metro_details: {
              lines_used: metroPlan.lines_used,
              interchange_required: metroPlan.requires_interchange,
              interchange_station: metroPlan.interchange_station,
              stops_count: metroPlan.station_hops,
              estimated_wait_minutes: metroPlan.estimated_wait_minutes
            }
          }
        ]
      : [];

    return res.status(200).json({
      success: true,
      city: 'Bengaluru',
      reference_time_ist: getCurrentIstFormatted(),
      origin_station: originStation,
      destination_station: destinationStation,
      options
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to plan Namma Metro journey.'
    });
  }
}

export async function getFareRateCards(_req, res) {
  return res.status(200).json({
    success: true,
    city: 'Bengaluru',
    currency: 'INR',
    rate_cards: CONFIGURABLE_FARE_RATES
  });
}
