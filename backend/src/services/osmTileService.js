import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const OSM_TILES_DIR = path.resolve(__dirname, '../../data/osm-tiles');
const MAX_MEMORY_TILES = 1200;
const memoryTileCache = new Map();

// Bengaluru Metropolitan Region bounds for pre-warming & validation
export const BENGALURU_REGION_BOUNDS = {
  name: 'Bengaluru Metropolitan Region, Karnataka, India',
  minLat: 12.80,
  maxLat: 13.15,
  minLng: 77.40,
  maxLng: 77.80,
  center: { lat: 12.9716, lng: 77.5946 }
};

function ensureTilesDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Pure-Node PNG generator for 256x256 fallback grid tile when upstream OSM is unreachable
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([lenBuf, combined, crcBuf]);
}

let cachedFallbackTileBuffer = null;
export function getFallbackGridTilePng() {
  if (cachedFallbackTileBuffer) return cachedFallbackTileBuffer;

  const width = 256;
  const height = 256;
  // RGB raw scanlines (1 filter byte + width * 3 bytes per row)
  const stride = 1 + width * 3;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // No filter
    const isMajorGridY = y % 64 === 0;
    const isMinorGridY = y % 32 === 0;

    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3;
      const isMajorGridX = x % 64 === 0;
      const isMinorGridX = x % 32 === 0;

      if (isMajorGridX || isMajorGridY) {
        // Subtle emerald-slate major grid line (#cbd5e1)
        raw[px] = 203;
        raw[px + 1] = 213;
        raw[px + 2] = 225;
      } else if (isMinorGridX || isMinorGridY) {
        // Subtle minor grid line (#e2e8f0)
        raw[px] = 226;
        raw[px + 1] = 232;
        raw[px + 2] = 240;
      } else {
        // Clean warm map background (#f1f5f9)
        raw[px] = 241;
        raw[px + 1] = 245;
        raw[px + 2] = 249;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB color type
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw, { level: 6 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  cachedFallbackTileBuffer = Buffer.concat([
    signature,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', idat),
    makePngChunk('IEND', Buffer.alloc(0))
  ]);

  return cachedFallbackTileBuffer;
}

function putInMemoryCache(key, buffer) {
  if (memoryTileCache.size >= MAX_MEMORY_TILES) {
    const oldestKey = memoryTileCache.keys().next().value;
    memoryTileCache.delete(oldestKey);
  }
  memoryTileCache.set(key, buffer);
}

export function getTileDiskPath(z, x, y) {
  return path.join(OSM_TILES_DIR, String(z), String(x), `${y}.png`);
}

export async function getOrFetchOsmTile(z, x, y) {
  const zoom = Number(z);
  const tileX = Number(x);
  const tileY = Number(y);

  if (
    !Number.isInteger(zoom) ||
    !Number.isInteger(tileX) ||
    !Number.isInteger(tileY) ||
    zoom < 0 ||
    zoom > 19 ||
    tileX < 0 ||
    tileY < 0
  ) {
    return {
      buffer: getFallbackGridTilePng(),
      source: 'fallback-invalid-coords',
      cached: false
    };
  }

  const maxCoord = Math.pow(2, zoom);
  if (tileX >= maxCoord || tileY >= maxCoord) {
    return {
      buffer: getFallbackGridTilePng(),
      source: 'fallback-out-of-bounds',
      cached: false
    };
  }

  const cacheKey = `${zoom}/${tileX}/${tileY}`;

  // 1. Check fast in-memory LRU cache
  if (memoryTileCache.has(cacheKey)) {
    return {
      buffer: memoryTileCache.get(cacheKey),
      source: 'local-memory-cache',
      cached: true
    };
  }

  // 2. Check locally hosted disk tile store
  const diskPath = getTileDiskPath(zoom, tileX, tileY);
  if (fs.existsSync(diskPath)) {
    try {
      const diskBuf = await fs.promises.readFile(diskPath);
      if (diskBuf && diskBuf.length > 64) {
        putInMemoryCache(cacheKey, diskBuf);
        return {
          buffer: diskBuf,
          source: 'local-disk-store',
          cached: true
        };
      }
    } catch (_err) {
      // Fall through to upstream fetch
    }
  }

  // 3. Fetch from OpenStreetMap upstream and persist locally for future users
  const upstreamUrl = `https://tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(upstreamUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RushRoute-Bengaluru-Mobility/1.0 (https://rushroute.local)'
      }
    });
    clearTimeout(timer);

    if (res.ok) {
      const arrBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrBuf);
      if (buf.length > 64) {
        putInMemoryCache(cacheKey, buf);
        ensureTilesDir(path.dirname(diskPath));
        fs.promises.writeFile(diskPath, buf).catch(() => {});
        return {
          buffer: buf,
          source: 'osm-fetched-and-cached',
          cached: false
        };
      }
    }
  } catch (_err) {
    // Upstream unreachable or timed out; serve clean fallback grid tile
  }

  return {
    buffer: getFallbackGridTilePng(),
    source: 'local-fallback-grid',
    cached: false
  };
}

export function getTileCacheStats() {
  let diskTilesCount = 0;
  let diskBytes = 0;

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.png')) {
        diskTilesCount += 1;
        try {
          diskBytes += fs.statSync(fullPath).size;
        } catch (_e) {
          // ignore
        }
      }
    }
  }

  walk(OSM_TILES_DIR);

  return {
    region: BENGALURU_REGION_BOUNDS.name,
    disk_tiles_count: diskTilesCount,
    disk_storage_mb: Number((diskBytes / (1024 * 1024)).toFixed(2)),
    memory_cached_tiles: memoryTileCache.size,
    tiles_directory: 'backend/data/osm-tiles'
  };
}
