import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Bus,
  Clock,
  Footprints,
  Info,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  TrainFront
} from 'lucide-react';
import { apiClient } from '../services/api';
import {
  DeviceLocationPermissionModal,
  getCurrentIstTimeString,
  getTodayIstDateString,
  JourneyRecommendation,
  JourneyResultCard,
  JourneySearchForm,
  LocationInput
} from '../components/JourneyComponents';
import { RouteMap } from '../components/RouteMap';
import { AIRecommendationPanel } from '../components/AIComponents';
import { ErrorState, LoadingState } from '../components/GeneralComponents';

export function PublicTransportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Nearest BMTC Bus Stop Finder state (Section 4)
  const [nearestLocationInput, setNearestLocationInput] = useState(
    'Majestic (Kempegowda Bus Station / Metro Hub)'
  );
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | requesting | granted | denied
  const [gpsNote, setGpsNote] = useState(
    'Grant browser GPS permission to calculate walking distances from your exact position, or enter any Bengaluru location manually.'
  );
  const [nearestData, setNearestData] = useState(null);
  const [selectedStopForWalk, setSelectedStopForWalk] = useState(null);
  const [loadingNearest, setLoadingNearest] = useState(false);
  const [nearestError, setNearestError] = useState('');
  const [nearestGpsModalOpen, setNearestGpsModalOpen] = useState(false);

  // Multimodal Public Transit Planner state
  const [formValues, setFormValues] = useState({
    pickup_address: 'Indiranagar (100 Feet Road / Metro)',
    destination_address: 'Majestic (Kempegowda Bus Station / Metro Hub)',
    travel_date: getTodayIstDateString(),
    departure_time: getCurrentIstTimeString(),
    passenger_count: 1,
    maximum_budget: 150,
    preferred_mode: 'Any',
    is_scheduled: false
  });

  const [result, setResult] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [bmtcRoutes, setBmtcRoutes] = useState([]);
  const [metroLines, setMetroLines] = useState([]);
  const [activeDirectoryTab, setActiveDirectoryTab] = useState('bmtc');
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchNearestStops = async ({ latitude, longitude, pickup_address }) => {
    setLoadingNearest(true);
    setNearestError('');
    try {
      const res = await apiClient.post('/transit/bmtc/nearest', {
        latitude,
        longitude,
        pickup_address,
        limit: 6
      });
      setNearestData(res.data);
      if (res.data.nearest_stops?.length > 0) {
        setSelectedStopForWalk(res.data.nearest_stops[0]);
      }
    } catch (err) {
      setNearestError(err.friendlyMessage || 'Unable to calculate nearest BMTC bus stops.');
    } finally {
      setLoadingNearest(false);
    }
  };

  const handleDetectGpsForNearest = () => {
    setNearestGpsModalOpen(true);
  };

  useEffect(() => {
    apiClient
      .get('/transit/bmtc/routes')
      .then((res) => setBmtcRoutes(res.data.routes || []))
      .catch(() => {});
    apiClient
      .get('/transit/metro/lines')
      .then((res) => setMetroLines(res.data.lines || []))
      .catch(() => {});

    // Load Nearest BMTC Stops on mount using manual location fallback (and auto-trigger GPS if tab=nearest)
    if (searchParams.get('tab') === 'nearest') {
      handleDetectGpsForNearest();
    } else {
      fetchNearestStops({ pickup_address: nearestLocationInput });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (overridePickup = null) => {
    setLoading(true);
    setError('');
    const pickupToUse = overridePickup || formValues.pickup_address;
    try {
      const res = await apiClient.post('/journeys/recommend', {
        pickup_address: pickupToUse,
        destination_address: formValues.destination_address,
        travel_date: formValues.travel_date || undefined,
        departure_time: formValues.departure_time || undefined,
        passenger_count: formValues.passenger_count || 1,
        maximum_budget: formValues.maximum_budget || undefined,
        preferred_mode: formValues.preferred_mode || 'Any'
      });
      setResult(res.data);
      const transitOpts = (res.data.plan?.options || []).filter(
        (o) => o.category === 'public_transport' || o.category === 'multimodal'
      );
      setSelectedOption(transitOpts[0] || res.data.plan?.recommended_option || null);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to plan public transport route.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinueJourneyFromStop = (stop) => {
    setFormValues((prev) => ({
      ...prev,
      pickup_address: stop.stop_name
    }));
    handleSearch(stop.stop_name);
    const plannerEl = document.getElementById('multimodal-transit-planner');
    if (plannerEl) {
      plannerEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const publicAndMultimodalOptions =
    result?.plan?.options?.filter(
      (o) => o.category === 'public_transport' || o.category === 'multimodal'
    ) || [];

  const filteredBmtcRoutes = bmtcRoutes.filter((r) => {
    if (!routeSearchQuery.trim()) return true;
    const q = routeSearchQuery.toLowerCase();
    return (
      r.route_number.toLowerCase().includes(q) ||
      r.route_name.toLowerCase().includes(q) ||
      (r.stops || []).some((s) => s.stop_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-900">
            Bengaluru Public Transit • BMTC & Namma Metro
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900">
            Nearest BMTC Stops & Public Transit Planner
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Discover nearby BMTC bus stops with pedestrian walking routes, explore Namma Metro Purple & Green lines, and plan IST multimodal journeys.
          </p>
        </div>
      </div>

      {/* SECTION 4: NEAREST BMTC BUS STOPS — ESSENTIAL FEATURE */}
      <section
        id="nearest-bmtc-stops"
        className="rounded-2xl border-2 border-emerald-900/20 bg-white p-5 shadow-xs sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-900 px-3 py-0.5 text-[11px] font-bold text-white uppercase">
              <Footprints className="h-3.5 w-3.5 text-emerald-300" />
              Pedestrian Walking Route Finder
            </div>
            <h2 className="mt-1.5 text-xl font-extrabold text-slate-900">
              Nearest BMTC Bus Stops
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">{gpsNote}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDetectGpsForNearest}
              disabled={loadingNearest || gpsStatus === 'requesting'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-800 disabled:opacity-50"
            >
              <LocateFixed className="h-4 w-4 text-emerald-300" />
              {gpsStatus === 'requesting' ? 'Detecting GPS...' : 'Use My Current GPS Location'}
            </button>
            <button
              type="button"
              onClick={() => fetchNearestStops({ pickup_address: nearestLocationInput })}
              disabled={loadingNearest}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recalculate
            </button>
          </div>
        </div>

        {/* Manual Pickup Location Search Fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchNearestStops({ pickup_address: nearestLocationInput });
          }}
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <LocationInput
              id="nearest-bmtc-manual"
              label="Or Enter Starting Location Manually (Bengaluru)"
              enableGpsButton={true}
              value={nearestLocationInput}
              onChange={setNearestLocationInput}
              onCoordinatesDetected={({ lat, lng, label }) => {
                setNearestLocationInput(label);
                setGpsStatus('granted');
                setGpsNote(
                  `Device GPS active at ${label} (${lat.toFixed(4)}°N, ${lng.toFixed(
                    4
                  )}°E). Showing nearest BMTC stops sorted by walking distance.`
                );
                fetchNearestStops({
                  latitude: lat,
                  longitude: lng,
                  pickup_address: label
                });
              }}
              placeholder="e.g., Majestic, Indiranagar, Koramangala, Silk Board, Whitefield"
            />
          </div>
          <button
            type="submit"
            disabled={loadingNearest}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-900 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-100 disabled:opacity-50"
          >
            <Search className="h-4 w-4" />
            <span>Find Nearby Stops</span>
          </button>
        </form>

        <DeviceLocationPermissionModal
          isOpen={nearestGpsModalOpen}
          onClose={() => setNearestGpsModalOpen(false)}
          defaultHintAddress={nearestLocationInput}
          onLocationGranted={({ address, lat, lng }) => {
            setNearestLocationInput(address);
            setGpsStatus('granted');
            setGpsNote(
              `Device GPS active at ${address} (${lat.toFixed(4)}°N, ${lng.toFixed(
                4
              )}°E). Showing nearest BMTC stops sorted by walking distance.`
            );
            fetchNearestStops({
              latitude: lat,
              longitude: lng,
              pickup_address: address
            });
          }}
        />

        <ErrorState
          message={nearestError}
          onRetry={() => fetchNearestStops({ pickup_address: nearestLocationInput })}
        />

        {loadingNearest ? (
          <div className="mt-4">
            <LoadingState message="Calculating street-network walking distances to nearby BMTC stops..." />
          </div>
        ) : nearestData?.nearest_stops?.length > 0 ? (
          <div className="mt-5 grid gap-6 lg:grid-cols-12">
            {/* Sorted Nearest Stops List */}
            <div className="space-y-3 lg:col-span-7">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Sorted by pedestrian walking distance from{' '}
                  <strong className="text-slate-800">{nearestData.origin?.label}</strong>
                </span>
                <span className="font-semibold text-emerald-900">
                  IST Reference: {nearestData.reference_time_ist}
                </span>
              </div>

              {nearestData.nearest_stops.map((stop, index) => {
                const isSelected = selectedStopForWalk?.stop_id === stop.stop_id;
                return (
                  <div
                    key={stop.stop_id}
                    className={`rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'border-emerald-900 bg-emerald-50/40 ring-2 ring-emerald-900/15'
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
                            #{index + 1} Nearest
                          </span>
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-900 ring-1 ring-blue-200">
                            Stop Code: {stop.stop_code}
                          </span>
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                            TIMETABLE-BASED IST
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-base font-extrabold text-slate-900">
                          {stop.stop_name}
                        </h3>
                        <p className="mt-0.5 text-xs font-semibold text-emerald-900">
                          {stop.stop_name} — {stop.walking_distance_text} —{' '}
                          {stop.walking_duration_minutes} min walk
                          <span className="ml-1.5 font-normal text-slate-500">
                            (Straight-line: {stop.straight_line_distance_m} m)
                          </span>
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-extrabold text-emerald-950">
                          {stop.walking_distance_text}
                        </div>
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-blue-800">
                          <Footprints className="h-3.5 w-3.5" />
                          {stop.walking_duration_minutes} min walk
                        </div>
                      </div>
                    </div>

                    {/* Available BMTC Route Numbers & Destinations */}
                    <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-700">BMTC Routes:</span>
                        {stop.route_numbers?.map((rn) => (
                          <span
                            key={rn}
                            className="rounded-md bg-emerald-900 px-2 py-0.5 text-[11px] font-bold text-white"
                          >
                            {rn}
                          </span>
                        ))}
                      </div>

                      {stop.destinations_summary?.length > 0 && (
                        <p className="text-[11px] text-slate-600">
                          <strong>Serves Destinations:</strong>{' '}
                          {stop.destinations_summary.join(' • ')}
                        </p>
                      )}

                      {stop.upcoming_departures_ist?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-slate-600">
                            Upcoming Scheduled Departures:
                          </span>
                          {stop.upcoming_departures_ist.slice(0, 3).map((dep, i) => (
                            <span
                              key={`${dep.route_number}-${i}`}
                              className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800 ring-1 ring-slate-200"
                            >
                              <strong>{dep.route_number}</strong>: {dep.departure_ist} (~
                              {dep.wait_minutes}m wait)
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions: Walk to Bus Stop & Continue Journey */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedStopForWalk(stop)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                          isSelected
                            ? 'bg-blue-700 text-white shadow-2xs'
                            : 'border border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100'
                        }`}
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        <span>{isSelected ? 'Showing Walking Route' : 'Walk to Bus Stop'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleContinueJourneyFromStop(stop)}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                      >
                        <span>Plan Onward Journey</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Bus Stop Walking Map & Details Panel */}
            <div className="space-y-4 lg:col-span-5">
              {selectedStopForWalk && (
                <div className="rounded-2xl border border-emerald-900/15 bg-emerald-50/40 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold tracking-wide text-emerald-950 uppercase">
                      Walking Route to Selected Stop
                    </span>
                    <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-900">
                      {selectedStopForWalk.walking_distance_text} •{' '}
                      {selectedStopForWalk.walking_duration_minutes} min walk
                    </span>
                  </div>

                  <h3 className="mt-1.5 text-base font-extrabold text-slate-900">
                    {selectedStopForWalk.stop_name}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Exact Stop Coordinates: {selectedStopForWalk.lat.toFixed(4)}° N,{' '}
                    {selectedStopForWalk.lng.toFixed(4)}° E
                  </p>

                  <div className="mt-3">
                    <RouteMap
                      waypoints={selectedStopForWalk.walking_route_waypoints || []}
                      heightClass="h-72"
                      routeMode="walk"
                      routeMetrics={{
                        distanceText: selectedStopForWalk.walking_distance_text,
                        durationMin: selectedStopForWalk.walking_duration_minutes
                      }}
                    />
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                      <p className="font-bold text-slate-900">
                        Pedestrian Navigation Summary
                      </p>
                      <p className="mt-1 text-slate-600">
                        Start at <strong>{nearestData.origin?.label}</strong> and walk{' '}
                        <strong>{selectedStopForWalk.walking_distance_text}</strong> (~
                        {selectedStopForWalk.walking_duration_minutes} mins) along the marked
                        footpath to reach <strong>{selectedStopForWalk.stop_name}</strong>.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleContinueJourneyFromStop(selectedStopForWalk)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
                    >
                      <span>
                        Continue Onward Journey from {selectedStopForWalk.stop_name}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {/* MULTIMODAL BMTC & NAMMA METRO JOURNEY PLANNER */}
      <section id="multimodal-transit-planner" className="space-y-6">
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-900/15 bg-emerald-50/70 p-4 text-xs text-emerald-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-800" />
          <div>
            <strong>Data Provenance & Transparency Notice (Sections 5 & 6):</strong> BMTC bus route numbers (`335-E`, `500-D`, `V-500CA`, `356-CW`, `201-R`, `MF-100`, `KIA-9`, `KIA-4`) and Namma Metro Purple/Green Line stations use verified Bengaluru stop coordinates combined with timetable-based IST schedules. RushRoute never claims static timetables are live GPS tracking.
          </div>
        </div>

        <JourneySearchForm
          values={formValues}
          onChange={setFormValues}
          onSubmit={() => handleSearch()}
          loading={loading}
          submitLabel="Plan BMTC & Namma Metro Route"
        />

        <ErrorState message={error} onRetry={() => handleSearch()} />

        {loading && (
          <LoadingState message="Computing BMTC Bus, Namma Metro & Feeder connections in IST..." />
        )}

        {!loading && result?.plan && (
          <div className="space-y-6">
            <JourneyRecommendation
              recommendedOption={selectedOption || result.plan.recommended_option}
            />

            <div className="grid gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-7">
                <h2 className="text-base font-bold text-slate-900">
                  BMTC Bus, Namma Metro & Multimodal Routes ({publicAndMultimodalOptions.length})
                </h2>
                {publicAndMultimodalOptions.map((opt) => (
                  <JourneyResultCard
                    key={opt.option_id}
                    option={opt}
                    isRecommended={
                      result.plan.recommended_option?.option_id === opt.option_id
                    }
                    isSelected={selectedOption?.option_id === opt.option_id}
                    onSelect={setSelectedOption}
                    onBookPrivateRide={(o) =>
                      navigate(
                        `/book-ride?pickup=${encodeURIComponent(
                          formValues.pickup_address
                        )}&destination=${encodeURIComponent(
                          formValues.destination_address
                        )}&vehicle=${o.vehicle_type || 'Auto'}&passengers=${
                          formValues.passenger_count || 1
                        }`
                      )
                    }
                  />
                ))}
              </div>

              <div className="space-y-4 lg:col-span-5">
                <h3 className="text-base font-bold text-slate-900">
                  Route Map & Nearby BMTC / Metro Stations
                </h3>
                <RouteMap
                  waypoints={selectedOption?.waypoints || []}
                  transitNodes={result.plan.nearby_transit_nodes || []}
                  heightClass="h-80"
                  routeMetrics={
                    selectedOption
                      ? {
                          distanceKm: selectedOption.total_distance_km,
                          durationMin: selectedOption.estimated_duration_minutes
                        }
                      : null
                  }
                />
                <AIRecommendationPanel
                  recommendation={result.ai_recommendation}
                  budgetExplanation={result.budget_explanation}
                  modelUsed={result.ai_model}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Bengaluru BMTC & Namma Metro Searchable Network Directory */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Bengaluru BMTC Routes & Namma Metro Station Directory
            </h2>
            <p className="text-xs text-slate-500">
              Search BMTC route numbers, stop sequences, timetable frequencies, and Namma Metro lines.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeDirectoryTab === 'bmtc' && (
              <div className="relative">
                <Search className="pointer-events-none absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={routeSearchQuery}
                  onChange={(e) => setRouteSearchQuery(e.target.value)}
                  placeholder="Search route (335-E) or stop..."
                  className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs text-slate-900 focus:border-emerald-800 focus:bg-white focus:outline-none"
                />
              </div>
            )}
            <button
              type="button"
              onClick={() => setActiveDirectoryTab('bmtc')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeDirectoryTab === 'bmtc'
                  ? 'bg-emerald-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Bus className="h-3.5 w-3.5" />
              BMTC Bus Routes ({filteredBmtcRoutes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveDirectoryTab('metro')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeDirectoryTab === 'metro'
                  ? 'bg-emerald-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <TrainFront className="h-3.5 w-3.5" />
              Namma Metro Lines ({metroLines.length})
            </button>
          </div>
        </div>

        {activeDirectoryTab === 'bmtc' ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {filteredBmtcRoutes.map((route) => (
              <div
                key={route.route_id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-emerald-900 px-2.5 py-1 font-extrabold text-white">
                    {route.route_number}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-900/10">
                      {route.service_class}
                    </span>
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                      TIMETABLE-BASED
                    </span>
                  </div>
                </div>
                <p className="mt-2 font-bold text-slate-900">{route.route_name}</p>
                <p className="mt-0.5 text-[11px] text-slate-600">{route.direction}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                  <span className="rounded-md bg-white px-2 py-0.5 ring-1 ring-slate-200">
                    Hours: {route.first_bus_ist}–{route.last_bus_ist} IST
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 ring-1 ring-slate-200">
                    Peak Every {route.peak_frequency_mins} min
                  </span>
                  <span className="rounded-md bg-white px-2 py-0.5 ring-1 ring-slate-200">
                    Est. Fare ₹{route.base_fare_inr}–₹{route.max_fare_inr}
                  </span>
                </div>
                {route.stops?.length > 0 && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    <strong>Stop Sequence:</strong>{' '}
                    {route.stops.map((s) => s.stop_name).join(' → ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {metroLines.map((line) => (
              <div
                key={line.line_id}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900">{line.line_name}</span>
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-900">
                    {line.operating_hours_ist}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{line.terminal_stations?.join(' ↔ ')}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Peak Headway: {line.peak_frequency_mins} mins • Off-Peak:{' '}
                  {line.off_peak_frequency_mins} mins • Interchange at Majestic (Estimated Fares ₹10–₹60)
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {line.stations?.map((st) => (
                    <span
                      key={st.station_id}
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium ${
                        st.is_interchange
                          ? 'bg-emerald-900 font-bold text-white'
                          : 'bg-white text-slate-700 ring-1 ring-slate-200'
                      }`}
                    >
                      <MapPin className="h-3 w-3" />
                      {st.station_name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
