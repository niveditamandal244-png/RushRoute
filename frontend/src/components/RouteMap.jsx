import React, { useEffect } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default Leaflet marker icons in Vite bundlers
const defaultIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background:#0f172a;color:#34d399;width:28px;height:28px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #ffffff;box-shadow:0 4px 10px rgba(0,0,0,0.25);">●</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

function FitBoundsHelper({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length >= 2) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 14 });
    }
  }, [map, positions]);
  return null;
}

export function RouteMap({ waypoints = [], heightClass = 'h-72' }) {
  const tileUrl =
    import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const validPoints = waypoints.filter(
    (w) => typeof w.lat === 'number' && typeof w.lng === 'number'
  );

  const center =
    validPoints.length > 0
      ? [validPoints[0].lat, validPoints[0].lng]
      : [12.9716, 77.5946]; // Bengaluru default center

  const polylinePositions = validPoints.map((w) => [w.lat, w.lng]);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs ${heightClass}`}>
      <MapContainer center={center} zoom={12} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={tileUrl}
        />
        {validPoints.map((pt, idx) => (
          <Marker key={`${pt.label}-${idx}`} position={[pt.lat, pt.lng]} icon={defaultIcon}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-slate-900">
                  {idx === 0
                    ? 'Origin'
                    : idx === validPoints.length - 1
                    ? 'Destination'
                    : `Transfer Hub ${idx}`}
                </p>
                <p className="text-slate-600">{pt.label}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        {polylinePositions.length >= 2 && (
          <>
            <Polyline
              positions={polylinePositions}
              pathOptions={{ color: '#059669', weight: 4, dashArray: '8, 6' }}
            />
            <FitBoundsHelper positions={polylinePositions} />
          </>
        )}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-lg bg-slate-900/85 px-2.5 py-1 text-[11px] font-medium text-white">
        OpenStreetMap • Schedule-Based & Demo Route Visualization
      </div>
    </div>
  );
}
