import fs from 'fs';
import {
  BENGALURU_REGION_BOUNDS,
  getOrFetchOsmTile,
  getTileCacheStats,
  getTileDiskPath
} from '../services/osmTileService.js';

function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

async function seedTiles() {
  const zooms = [11, 12, 13, 14];
  let totalPlanned = 0;
  let downloaded = 0;
  let alreadyCached = 0;
  let fallbackUsed = 0;

  const queue = [];
  for (const z of zooms) {
    const topLeft = latLngToTile(
      BENGALURU_REGION_BOUNDS.maxLat,
      BENGALURU_REGION_BOUNDS.minLng,
      z
    );
    const bottomRight = latLngToTile(
      BENGALURU_REGION_BOUNDS.minLat,
      BENGALURU_REGION_BOUNDS.maxLng,
      z
    );

    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        queue.push({ z, x, y });
      }
    }
  }

  totalPlanned = queue.length;
  console.log(
    `[OSM Seeder] Preparing ${totalPlanned} OpenStreetMap tiles for ${BENGALURU_REGION_BOUNDS.name} (zoom 11-14)...`
  );

  // Polite concurrency of 6 tiles at a time
  const CONCURRENCY = 6;
  for (let i = 0; i < queue.length; i += CONCURRENCY) {
    const batch = queue.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ z, x, y }) => {
        const diskPath = getTileDiskPath(z, x, y);
        if (fs.existsSync(diskPath)) {
          alreadyCached += 1;
          return;
        }
        const res = await getOrFetchOsmTile(z, x, y);
        if (res.source === 'osm-fetched-and-cached') {
          downloaded += 1;
        } else {
          fallbackUsed += 1;
        }
      })
    );
  }

  const stats = getTileCacheStats();
  console.log('[OSM Seeder] Complete:', {
    totalPlanned,
    alreadyCached,
    downloaded,
    fallbackUsed,
    ...stats
  });
}

seedTiles().catch((err) => {
  console.error('[OSM Seeder] Error:', err);
  process.exit(1);
});
