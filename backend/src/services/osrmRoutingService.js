import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateDistanceKm } from '../utils/geo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OSRM_DISK_CACHE_PATH = path.resolve(__dirname, '../../data/osrm-cache.json');

const routeMemoryCache = new Map();
const MAX_ROUTE_CACHE = 400;

function loadDiskRouteCache() {
  try {
    if (fs.existsSync(OSRM_DISK_CACHE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(OSRM_DISK_CACHE_PATH, 'utf8'));
      for (const [k, v] of Object.entries(raw || {})) {
        routeMemoryCache.set(k, v);
      }
    }
  } catch (_err) {
    // Ignore corrupt cache
  }
}

loadDiskRouteCache();

function persistDiskRouteCache() {
  try {
    const dir = path.dirname(OSRM_DISK_CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj = Object.fromEntries(routeMemoryCache.entries());
    fs.promises.writeFile(OSRM_DISK_CACHE_PATH, JSON.stringify(obj), 'utf8').catch(() => {});
  } catch (_err) {
    // Ignore disk write error
  }
}

function cacheRoute(key, value) {
  if (routeMemoryCache.size >= MAX_ROUTE_CACHE) {
    const oldest = routeMemoryCache.keys().next().value;
    routeMemoryCache.delete(oldest);
  }
  routeMemoryCache.set(key, value);
  persistDiskRouteCache();
}

function buildFallbackCorridorRoute(origin, destination, mode = 'drive') {
  const distanceKm = calculateDistanceKm(origin.lat, origin.lng, destination.lat, destination.lng);
  const avgSpeedKmph = mode === 'walk' ? 4.8 : 22.0;
  const durationMin = Math.max(1, Math.round((distanceKm / avgSpeedKmph) * 60));

  // Generate smooth multi-point Bengaluru road-corridor interpolation
  const midLat = Number(((origin.lat + destination.lat) / 2 + 0.0022).toFixed(6));
  const midLng = Number(((origin.lng + destination.lng) / 2 - 0.0018).toFixed(6));
  const coordinates = [
    [origin.lat, origin.lng],
    [Number(((origin.lat + midLat) / 2).toFixed(6)), Number(((origin.lng + midLng) / 2).toFixed(6))],
    [midLat, midLng],
    [
      Number(((midLat + destination.lat) / 2).toFixed(6)),
      Number(((midLng + destination.lng) / 2).toFixed(6))
    ],
    [destination.lat, destination.lng]
  ];

  return {
    distance_km: distanceKm,
    distance_meters: Math.round(distanceKm * 1000),
    duration_minutes: durationMin,
    coordinates,
    steps: [
      {
        instruction: `Head from starting point toward destination (${distanceKm} km)`,
        distance_meters: Math.round(distanceKm * 1000),
        duration_seconds: durationMin * 60
      }
    ],
    routing_source: 'local_corridor_fallback',
    cached: false
  };
}

/**
 * Calculates road/pedestrian route via OSRM (self-hosted OSRM_BASE_URL or public OSRM),
 * with persistent caching and automatic local corridor fallback.
 */
export async function calculateOsrmRoute({
  originLat,
  originLng,
  destLat,
  destLng,
  mode = 'drive'
}) {
  const oLat = Number(originLat);
  const oLng = Number(originLng);
  const dLat = Number(destLat);
  const dLng = Number(destLng);

  if (
    !Number.isFinite(oLat) ||
    !Number.isFinite(oLng) ||
    !Number.isFinite(dLat) ||
    !Number.isFinite(dLng)
  ) {
    throw new Error('Valid origin and destination coordinates are required.');
  }

  const normalizedMode = mode === 'walk' ? 'walk' : 'drive';
  const osrmProfile = normalizedMode === 'walk' ? 'foot' : 'driving';
  const cacheKey = `${normalizedMode}:${oLat.toFixed(4)},${oLng.toFixed(4)}->${dLat.toFixed(
    4
  )},${dLng.toFixed(4)}`;

  if (routeMemoryCache.has(cacheKey)) {
    return {
      ...routeMemoryCache.get(cacheKey),
      cached: true
    };
  }

  const configuredBase = (process.env.OSRM_BASE_URL || '').trim().replace(/\/+$/, '');
  const candidates = configuredBase
    ? [
        { base: configuredBase, source: 'osrm_self_hosted' },
        { base: 'https://router.project-osrm.org', source: 'osrm_public' }
      ]
    : [{ base: 'https://router.project-osrm.org', source: 'osrm_public' }];

  for (const candidate of candidates) {
    const url = `${candidate.base}/route/v1/${osrmProfile}/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson&steps=true`;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'RushRoute-OSRM-Client/1.0'
        }
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const data = await res.json();
      const route = data?.routes?.[0];
      const rawCoords = route?.geometry?.coordinates;
      if (!Array.isArray(rawCoords) || rawCoords.length < 2) continue;

      const coordinates = rawCoords.map(([lon, lat]) => [lat, lon]);
      const distanceMeters = Math.round(Number(route.distance) || 0);
      const distanceKm = Number((distanceMeters / 1000).toFixed(2));
      const durationMin = Math.max(1, Math.round((Number(route.duration) || 60) / 60));

      const steps =
        route.legs?.[0]?.steps?.slice(0, 12).map((s) => ({
          instruction: [s.maneuver?.type, s.maneuver?.modifier, s.name]
            .filter(Boolean)
            .join(' '),
          distance_meters: Math.round(Number(s.distance) || 0),
          duration_seconds: Math.round(Number(s.duration) || 0)
        })) || [];

      const result = {
        distance_km: distanceKm,
        distance_meters: distanceMeters,
        duration_minutes: durationMin,
        coordinates,
        steps,
        routing_source: candidate.source,
        cached: false
      };

      cacheRoute(cacheKey, result);
      return result;
    } catch (_err) {
      // Try next candidate or local fallback
    }
  }

  const fallback = buildFallbackCorridorRoute(
    { lat: oLat, lng: oLng },
    { lat: dLat, lng: dLng },
    normalizedMode
  );
  cacheRoute(cacheKey, fallback);
  return fallback;
}
