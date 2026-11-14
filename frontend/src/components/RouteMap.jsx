import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, Maximize2 } from 'lucide-react';
import { apiClient } from '../services/api';

const originIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background:#064e3b;color:#ecfdf5;width:30px;height:30px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;border:2.5px solid #ffffff;box-shadow:0 4px 12px rgba(6,78,59,0.35);">A</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const destinationIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background:#047857;color:#ffffff;width:30px;height:30px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;border:2.5px solid #ffffff;box-shadow:0 4px 12px rgba(4,120,87,0.35);">B</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const userGpsIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;"><span style="position:absolute;inset:-4px;border-radius:9999px;background:rgba(37,99,235,0.28);"></span><span style="width:14px;height:14px;border-radius:9999px;background:#2563eb;border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(37,99,235,0.5);"></span></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

const transferIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background:#0f766e;color:#ffffff;width:24px;height:24px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;border:2px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.2);">•</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const busStopIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background:#1d4ed8;color:#ffffff;width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;border:1.5px solid #ffffff;box-shadow:0 2px 6px rgba(29,78,216,0.3);">B</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const metroStationIcon = L.divIcon({
  className: 'custom-leaflet-pin',
  html: `<div style="background:#7e22ce;color:#ffffff;width:24px;height:24px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;border:1.5px solid #ffffff;box-shadow:0 2px 6px rgba(126,34,206,0.3);">M</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function FitBoundsHelper({ positions, fitSignal }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length >= 2) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [38, 38], maxZoom: 15 });
    } else if (positions && positions.length === 1) {
      map.setView(positions[0], 14);
    }
  }, [map, fitSignal, JSON.stringify(positions)]);
  return null;
}

function PanToUserHelper({ userLocation, panSignal }) {
  const map = useMap();
  useEffect(() => {
    if (panSignal > 0 && userLocation?.lat && userLocation?.lng) {
      map.setView([userLocation.lat, userLocation.lng], 15, { animate: true });
    }
  }, [map, panSignal, userLocation?.lat, userLocation?.lng]);
  return null;
}

export function RouteMap({
  waypoints = [],
  transitNodes = [],
  heightClass = 'h-72',
  routeMetrics = null,
  routeMode = 'drive'
}) {
  const apiBase = (
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1'
  ).replace(/\/+$/, '');
  const localTileUrl = `${apiBase}/map/tiles/{z}/{x}/{y}.png`;
  const configuredTileUrl = (import.meta.env.VITE_MAP_TILE_URL || '').trim();
  const primaryTileUrl = configuredTileUrl || localTileUrl;

  const [activeTileUrl, setActiveTileUrl] = useState(primaryTileUrl);
  const [tileIssue, setTileIssue] = useState(false);
  const tileErrorCountRef = useRef(0);

  const [osrmRouteCoords, setOsrmRouteCoords] = useState(null);
  const [osrmMetrics, setOsrmMetrics] = useState(null);
  const [routingSource, setRoutingSource] = useState('osrm');

  const [userGps, setUserGps] = useState(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState('');
  const [panSignal, setPanSignal] = useState(0);
  const [fitSignal, setFitSignal] = useState(0);

  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors • Local RushRoute Tile Cache';

  const validPoints = useMemo(
    () =>
      Array.isArray(waypoints)
        ? waypoints.filter((w) => typeof w.lat === 'number' && typeof w.lng === 'number')
        : [],
    [waypoints]
  );

  const normalizedTransitList = Array.isArray(transitNodes)
    ? transitNodes
    : transitNodes && typeof transitNodes === 'object'
    ? [
        ...(transitNodes.origin_bmtc_stop
          ? [
              {
                ...transitNodes.origin_bmtc_stop,
                name: transitNodes.origin_bmtc_stop.stop_name,
                type: 'bmtc_stop'
              }
            ]
          : []),
        ...(transitNodes.destination_bmtc_stop
          ? [
              {
                ...transitNodes.destination_bmtc_stop,
                name: transitNodes.destination_bmtc_stop.stop_name,
                type: 'bmtc_stop'
              }
            ]
          : []),
        ...(transitNodes.origin_metro_station
          ? [
              {
                ...transitNodes.origin_metro_station,
                name: transitNodes.origin_metro_station.station_name,
                type: 'metro_station'
              }
            ]
          : []),
        ...(transitNodes.destination_metro_station
          ? [
              {
                ...transitNodes.destination_metro_station,
                name: transitNodes.destination_metro_station.station_name,
                type: 'metro_station'
              }
            ]
          : [])
      ]
    : [];

  const validTransitNodes = normalizedTransitList.filter(
    (n) => typeof n.lat === 'number' && typeof n.lng === 'number'
  );

  // Sync with any GPS location granted via DeviceLocationPermissionModal anywhere in the app
  useEffect(() => {
    const handleGpsBroadcast = (e) => {
      if (e?.detail?.lat && e?.detail?.lng) {
        setUserGps({
          lat: e.detail.lat,
          lng: e.detail.lng,
          accuracy: e.detail.accuracyMeters || 12,
          label: e.detail.address || 'Your Current Location'
        });
        setGpsStatusMsg('');
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('rushroute:gps-updated', handleGpsBroadcast);
    }

    // Check if geolocation permission is already granted so we can show the user's marker automatically
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((perm) => {
          if (perm.state === 'granted' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                setUserGps({
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  accuracy: Math.round(pos.coords.accuracy || 15),
                  label: 'Your Live Device GPS'
                });
              },
              () => {},
              { enableHighAccuracy: true, timeout: 4000, maximumAge: 30000 }
            );
          }
        })
        .catch(() => {});
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('rushroute:gps-updated', handleGpsBroadcast);
      }
    };
  }, []);

  // Fetch road/walking route from our backend OSRM Routing Engine
  useEffect(() => {
    if (validPoints.length < 2) {
      setOsrmRouteCoords(null);
      setOsrmMetrics(null);
      return;
    }

    let cancelled = false;
    async function fetchOsrmRoute() {
      try {
        const origin = validPoints[0];
        const dest = validPoints[validPoints.length - 1];
        const res = await apiClient.get('/map/route', {
          params: {
            origin_lat: origin.lat,
            origin_lng: origin.lng,
            dest_lat: dest.lat,
            dest_lng: dest.lng,
            mode: routeMode === 'walk' ? 'walk' : 'drive'
          }
        });
        const route = res.data?.route;
        if (!cancelled && route && Array.isArray(route.coordinates) && route.coordinates.length >= 2) {
          setOsrmRouteCoords(route.coordinates);
          setOsrmMetrics({
            distanceText:
              route.distance_meters < 1000
                ? `${route.distance_meters} m`
                : `${route.distance_km} km`,
            durationMin: route.duration_minutes
          });
          setRoutingSource(route.routing_source || 'osrm');
        }
      } catch (_err) {
        if (!cancelled) {
          setOsrmRouteCoords(null);
          setRoutingSource('waypoint_fallback');
        }
      }
    }

    fetchOsrmRoute();
    return () => {
      cancelled = true;
    };
  }, [routeMode, JSON.stringify(validPoints)]);

  const handleLocateUserOnMap = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatusMsg('Browser GPS unavailable on this device.');
      return;
    }
    setLocatingGps(true);
    setGpsStatusMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextGps = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 12),
          label: 'Your Current Device Location'
        };
        setUserGps(nextGps);
        setPanSignal((n) => n + 1);
        setLocatingGps(false);
      },
      (err) => {
        setLocatingGps(false);
        setGpsStatusMsg(
          err?.code === 1
            ? 'Location permission denied. Allow location in browser settings.'
            : 'Device GPS signal unavailable.'
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  const center =
    validPoints.length > 0
      ? [validPoints[0].lat, validPoints[0].lng]
      : userGps
      ? [userGps.lat, userGps.lng]
      : [12.9716, 77.5946]; // Bengaluru default center

  const polylinePositions = osrmRouteCoords || validPoints.map((w) => [w.lat, w.lng]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-emerald-900/15 bg-slate-100 shadow-xs ${heightClass}`}
    >
      <MapContainer
        center={center}
        zoom={13}
        minZoom={10}
        maxZoom={18}
        dragging={true}
        scrollWheelZoom={true}
        doubleClickZoom={true}
        touchZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution={attribution}
          url={activeTileUrl}
          maxZoom={18}
          keepBuffer={4}
          eventHandlers={{
            tileerror: () => {
              tileErrorCountRef.current += 1;
              if (activeTileUrl !== localTileUrl) {
                setActiveTileUrl(localTileUrl);
              } else if (tileErrorCountRef.current >= 4) {
                setTileIssue(true);
              }
            },
            tileload: () => {
              tileErrorCountRef.current = 0;
              setTileIssue(false);
            }
          }}
        />

        {/* User Current Browser GPS Marker & Accuracy Ring */}
        {userGps && (
          <>
            <Circle
              center={[userGps.lat, userGps.lng]}
              radius={Math.min(Math.max(userGps.accuracy || 25, 15), 250)}
              pathOptions={{
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.14,
                weight: 1.5
              }}
            />
            <Marker position={[userGps.lat, userGps.lng]} icon={userGpsIcon}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-blue-900">Your Current Location</p>
                  <p className="text-slate-600">{userGps.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {userGps.lat.toFixed(5)}, {userGps.lng.toFixed(5)} (±{userGps.accuracy}m)
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {validPoints.map((pt, idx) => {
          const isOrigin = idx === 0;
          const isDest = idx === validPoints.length - 1;
          const icon = isOrigin
            ? originIcon
            : isDest
            ? pt.type === 'bmtc_stop'
              ? busStopIcon
              : destinationIcon
            : transferIcon;

          return (
            <Marker key={`${pt.label}-${idx}`} position={[pt.lat, pt.lng]} icon={icon}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">
                    {isOrigin
                      ? 'Starting Point (A)'
                      : isDest
                      ? pt.type === 'bmtc_stop'
                        ? 'Selected BMTC Bus Stop (B)'
                        : 'Destination (B)'
                      : `Route Waypoint ${idx}`}
                  </p>
                  <p className="text-slate-600">{pt.label}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {validTransitNodes.map((node, idx) => (
          <Marker
            key={`transit-${node.id || node.stop_id || node.station_id || idx}`}
            position={[node.lat, node.lng]}
            icon={node.type === 'metro_station' ? metroStationIcon : busStopIcon}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-slate-900">{node.name || node.stop_name}</p>
                <p className="text-slate-600">
                  {node.type === 'metro_station'
                    ? `Namma Metro (${node.line || 'Station'})`
                    : `BMTC Bus Stop (${node.stop_code || 'Stop'})`}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {polylinePositions.length >= 2 && (
          <>
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: routeMode === 'walk' ? '#1d4ed8' : '#064e3b',
                weight: 4,
                dashArray: routeMode === 'walk' ? '6, 8' : undefined
              }}
            />
            <FitBoundsHelper positions={polylinePositions} fitSignal={fitSignal} />
          </>
        )}

        <PanToUserHelper userLocation={userGps} panSignal={panSignal} />
      </MapContainer>

      {/* Top-Right Interactive Map Controls: Locate Me + Fit Route */}
      <div className="absolute top-2.5 right-2.5 z-400 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleLocateUserOnMap}
          disabled={locatingGps}
          title="Center map on your current browser GPS location"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white/95 px-2.5 py-1.5 text-[11px] font-extrabold text-slate-800 shadow-sm backdrop-blur-xs transition hover:border-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        >
          <Crosshair className={`h-3.5 w-3.5 text-blue-600 ${locatingGps ? 'animate-spin' : ''}`} />
          <span>{locatingGps ? 'Locating...' : 'My Location'}</span>
        </button>

        {polylinePositions.length >= 2 && (
          <button
            type="button"
            onClick={() => setFitSignal((n) => n + 1)}
            title="Fit full route in view"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm backdrop-blur-xs transition hover:border-emerald-700 hover:bg-emerald-50"
          >
            <Maximize2 className="h-3.5 w-3.5 text-emerald-800" />
            <span>Fit Route</span>
          </button>
        )}
      </div>

      {/* Graceful Tile / GPS Connection Status Banner */}
      {(tileIssue || gpsStatusMsg) && (
        <div className="pointer-events-none absolute top-2.5 left-12 right-32 z-400">
          <div className="inline-block rounded-xl border border-amber-300 bg-amber-50/95 px-3 py-1 text-[11px] font-bold text-amber-950 shadow-xs">
            {gpsStatusMsg ||
              'Local tile server connection interrupted — showing fallback grid while routes remain active.'}
          </div>
        </div>
      )}

      {/* Map Attribution & OSRM Route Metrics Overlay */}
      <div className="pointer-events-none absolute bottom-2.5 left-2.5 right-2.5 z-400 flex flex-wrap items-center justify-between gap-2">
        <div className="rounded-lg bg-emerald-950/90 px-2.5 py-1 text-[11px] font-medium text-emerald-50 shadow-xs">
          Leaflet + Local OpenStreetMap Tiles •{' '}
          {routingSource.includes('osrm') ? 'OSRM Routing' : 'Corridor Routing'}
        </div>

        {(osrmMetrics || routeMetrics) && (
          <div className="rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-950 shadow-xs ring-1 ring-emerald-900/10">
            {osrmMetrics
              ? `${osrmMetrics.distanceText} • ~${osrmMetrics.durationMin} min`
              : `${routeMetrics.distanceText || `${routeMetrics.distanceKm} km`} • ~${
                  routeMetrics.durationMin
                } min`}
          </div>
        )}
      </div>
    </div>
  );
}
