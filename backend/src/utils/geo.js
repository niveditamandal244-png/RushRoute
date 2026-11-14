// Geospatial & Transit Network Dataset Utility
// Note: Public transit schedules and route segments below are clearly labelled
// as a Schedule-Based Demonstration Dataset (Bengaluru Metro & City Bus Corridors).
// No live GPS tracking or real-time telemetry is claimed.

export const KNOWN_LOCATIONS = [
  {
    name: 'Majestic (Kempegowda Bus Station / Metro Hub)',
    keywords: ['majestic', 'kempegowda', 'kbs', 'central station'],
    lat: 12.9767,
    lng: 77.5713,
    zone: 'Central',
    hasMetro: true,
    metroLine: 'Purple & Green Line Interchange',
    busHub: 'KBS Terminal'
  },
  {
    name: 'MG Road Metro Station',
    keywords: ['mg road', 'mahatma gandhi road', 'brigade road', 'church street'],
    lat: 12.9756,
    lng: 77.6066,
    zone: 'Central',
    hasMetro: true,
    metroLine: 'Purple Line',
    busHub: 'MG Road Mayo Hall Stop'
  },
  {
    name: 'Indiranagar (100 Feet Road / Metro)',
    keywords: ['indiranagar', '100 ft road', 'cmh road', 'domlur'],
    lat: 12.9784,
    lng: 77.6408,
    zone: 'East',
    hasMetro: true,
    metroLine: 'Purple Line',
    busHub: 'Indiranagar Police Station Stop'
  },
  {
    name: 'Whitefield (Kadugodi / ITPL)',
    keywords: ['whitefield', 'itpl', 'kadugodi', 'hoodi', 'vydehi'],
    lat: 12.9855,
    lng: 77.7364,
    zone: 'East',
    hasMetro: true,
    metroLine: 'Purple Line East Terminal',
    busHub: 'ITPL TTMC Bus Hub'
  },
  {
    name: 'Koramangala (Sony World / 5th Block)',
    keywords: ['koramangala', 'sony world', 'forum mall', 'jyoti nivas', 'st johns'],
    lat: 12.9352,
    lng: 77.6245,
    zone: 'South-East',
    hasMetro: false,
    metroLine: null,
    busHub: 'Koramangala Water Tank Stop'
  },
  {
    name: 'HSR Layout (BDA Complex)',
    keywords: ['hsr', 'hsr layout', 'agara', 'bda complex'],
    lat: 12.9121,
    lng: 77.6446,
    zone: 'South-East',
    hasMetro: false,
    metroLine: null,
    busHub: 'HSR BDA Complex Stop'
  },
  {
    name: 'Silk Board Junction',
    keywords: ['silk board', 'central silk board', 'btm', 'btm layout'],
    lat: 12.9177,
    lng: 77.6238,
    zone: 'South',
    hasMetro: true,
    metroLine: 'Yellow Line Corridor (Demo Schedule)',
    busHub: 'Silk Board Junction Bus Bay'
  },
  {
    name: 'Electronic City Phase 1 (Wipro Gate / Infosys)',
    keywords: ['electronic city', 'ecity', 'infosys', 'wipro gate', 'hosur road'],
    lat: 12.8452,
    lng: 77.6602,
    zone: 'South',
    hasMetro: false,
    metroLine: null,
    busHub: 'Electronic City Wipro Gate Terminal'
  },
  {
    name: 'Jayanagar 4th Block',
    keywords: ['jayanagar', 'jp nagar', 'banashankari', 'south end circle'],
    lat: 12.9299,
    lng: 77.5824,
    zone: 'South',
    hasMetro: true,
    metroLine: 'Green Line',
    busHub: 'Jayanagar 4th Block TTMC'
  },
  {
    name: 'Yeshwanthpur (Metro & Railway Junction)',
    keywords: ['yeshwanthpur', 'malleswaram', 'rajajinagar', 'orion mall'],
    lat: 13.0238,
    lng: 77.5509,
    zone: 'North-West',
    hasMetro: true,
    metroLine: 'Green Line',
    busHub: 'Yeshwanthpur TTMC'
  },
  {
    name: 'Hebbal / Manyata Tech Park',
    keywords: ['hebbal', 'manyata', 'manyata tech park', 'nagawara', 'esteen mall'],
    lat: 13.0475,
    lng: 77.6212,
    zone: 'North',
    hasMetro: false,
    metroLine: null,
    busHub: 'Manyata Tech Park Main Gate Stop'
  },
  {
    name: 'Kempegowda International Airport (BLR)',
    keywords: ['airport', 'kia', 'devanahalli', 'kempegowda airport', 'blr airport'],
    lat: 13.1986,
    lng: 77.7066,
    zone: 'North-Airport',
    hasMetro: false,
    metroLine: null,
    busHub: 'KIA Vayu Vajra Terminal'
  }
];

export function resolveCoordinates(address, providedLat = null, providedLng = null) {
  if (
    typeof providedLat === 'number' &&
    !Number.isNaN(providedLat) &&
    typeof providedLng === 'number' &&
    !Number.isNaN(providedLng)
  ) {
    const nearest = findNearestHub(providedLat, providedLng);
    return {
      lat: Number(providedLat.toFixed(6)),
      lng: Number(providedLng.toFixed(6)),
      matchedHub: nearest
    };
  }

  const normalized = (address || '').trim().toLowerCase();
  for (const loc of KNOWN_LOCATIONS) {
    if (
      loc.name.toLowerCase().includes(normalized) ||
      loc.keywords.some((kw) => normalized.includes(kw))
    ) {
      return {
        lat: loc.lat,
        lng: loc.lng,
        matchedHub: loc
      };
    }
  }

  // Deterministic coordinate fallback around central Bengaluru (12.90 to 13.05, 77.54 to 77.70)
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash);
  const lat = Number((12.91 + ((absHash % 1400) / 10000)).toFixed(6));
  const lng = Number((77.55 + (((absHash >> 4) % 1500) / 10000)).toFixed(6));
  const nearest = findNearestHub(lat, lng);
  return {
    lat,
    lng,
    matchedHub: nearest
  };
}

export function findNearestHub(lat, lng) {
  let best = KNOWN_LOCATIONS[0];
  let bestDist = Infinity;
  for (const loc of KNOWN_LOCATIONS) {
    const d = calculateDistanceKm(lat, lng, loc.lat, loc.lng);
    if (d < bestDist) {
      bestDist = d;
      best = loc;
    }
  }
  return { ...best, distanceToHubKm: Number(bestDist.toFixed(2)) };
}

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Multiply straight-line distance by 1.28 urban road tortuosity factor for realistic road distance
  const roadDistance = R * c * 1.28;
  return Math.max(0.8, Number(roadDistance.toFixed(2)));
}

export function calculateBearingDegrees(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
