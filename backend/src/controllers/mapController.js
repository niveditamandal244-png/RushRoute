import {
  BENGALURU_REGION_BOUNDS,
  getOrFetchOsmTile,
  getTileCacheStats
} from '../services/osmTileService.js';
import { calculateOsrmRoute } from '../services/osrmRoutingService.js';

export async function serveOsmTile(req, res) {
  try {
    const { z, x, y } = req.params;
    const cleanY = String(y || '').replace(/\.png$/i, '');
    const result = await getOrFetchOsmTile(z, x, cleanY);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader(
      'Cache-Control',
      result.source.includes('fallback')
        ? 'public, max-age=60'
        : 'public, max-age=604800, stale-while-revalidate=86400'
    );
    res.setHeader('X-RushRoute-Tile-Source', result.source);
    return res.status(200).send(result.buffer);
  } catch (_err) {
    return res.status(500).end();
  }
}

export async function getOsrmRoute(req, res) {
  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng, mode = 'drive' } = req.query;
    const route = await calculateOsrmRoute({
      originLat: origin_lat,
      originLng: origin_lng,
      destLat: dest_lat,
      destLng: dest_lng,
      mode
    });

    return res.status(200).json({
      success: true,
      route
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to calculate OSRM route.'
    });
  }
}

export function getMapInfrastructureStatus(_req, res) {
  return res.status(200).json({
    success: true,
    tile_provider: 'RushRoute Local OpenStreetMap Tile Server',
    routing_engine: process.env.OSRM_BASE_URL
      ? `Self-Hosted OSRM (${process.env.OSRM_BASE_URL})`
      : 'OSRM + Local Bengaluru Corridor Fallback',
    bounds: BENGALURU_REGION_BOUNDS,
    cache_stats: getTileCacheStats()
  });
}
