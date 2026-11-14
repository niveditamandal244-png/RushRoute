import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProviderLogo } from '../components/ProviderLogo';
import {
  Activity,
  ArrowRight,
  ArrowUpDown,
  Bike,
  Bus,
  Car,
  CheckCircle2,
  Clock,
  Compass,
  Footprints,
  LocateFixed,
  MapPin,
  Plane,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  TrainFront,
  Users,
  Wallet,
  X,
  Zap
} from 'lucide-react';
import { apiClient } from '../services/api';
import {
  BENGALURU_QUICK_DESTINATIONS,
  CurrentLocationStatusBanner,
  getCurrentIstTimeString,
  getTodayIstDateString,
  LocationInput,
  useAutoBengaluruLocation
} from '../components/JourneyComponents';
import { BookingConfirmation, SmartBookingRaceBoard } from '../components/RideComponents';
import { RouteMap } from '../components/RouteMap';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { locationState, refreshLocation } = useAutoBengaluruLocation(
    'Indiranagar (100 Feet Road / Metro)'
  );

  const [providerConnections, setProviderConnections] = useState({
    Uber: 'connected',
    Ola: 'connected',
    Rapido: 'connected'
  });

  const handleToggleProviderConnection = (brand) => {
    const current = providerConnections[brand];
    if (current === 'connecting') return;
    const nextState = current === 'connected' ? 'disconnected' : 'connected';
    setProviderConnections((prev) => ({ ...prev, [brand]: 'connecting' }));
    setTimeout(() => {
      setProviderConnections((prev) => ({ ...prev, [brand]: nextState }));
    }, 350);
  };

  const handleSwapLocations = () => {
    const prevPickup = pickup;
    const prevDest = destination;
    setPickup(prevDest);
    setDestination(prevPickup);
  };

  const [pickup, setPickup] = useState('Indiranagar (100 Feet Road / Metro)');
  const [destination, setDestination] = useState('Whitefield (Kadugodi / ITPL)');
  const [selectedVehicle, setSelectedVehicle] = useState('Auto');
  const [ridePriority, setRidePriority] = useState('earliest_and_cheapest'); // 'earliest' | 'cheapest' | 'earliest_and_cheapest'
  const [budget, setBudget] = useState('250');
  const [passengers, setPassengers] = useState('1');
  const [selectedDemoTicket, setSelectedDemoTicket] = useState(null);

  // Live API feed state right on the Home screen
  const [liveEstimates, setLiveEstimates] = useState(null);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [homeRaceSession, setHomeRaceSession] = useState(null);
  const [isHomeRacing, setIsHomeRacing] = useState(false);
  const racePollRef = useRef(null);
  const raceTimerRef = useRef(null);
  const rotationCounterRef = useRef(0);

  const clearHomeTimers = () => {
    if (racePollRef.current) {
      clearInterval(racePollRef.current);
      racePollRef.current = null;
    }
    if (raceTimerRef.current) {
      clearTimeout(raceTimerRef.current);
      raceTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (locationState?.address && locationState.status === 'gps_active') {
      setPickup(locationState.address);
    }
  }, [locationState?.address, locationState?.status]);

  useEffect(() => {
    return () => {
      clearHomeTimers();
    };
  }, []);

  // Fetch live multi-provider API quotes whenever pickup, destination, or vehicle changes
  useEffect(() => {
    let cancelled = false;
    async function fetchLiveQuotes() {
      if (!pickup || !destination || pickup.toLowerCase() === destination.toLowerCase()) return;
      setLoadingFeed(true);
      try {
        const res = await apiClient.post('/rides/estimate', {
          pickup_address: pickup,
          destination_address: destination,
          vehicle_type: selectedVehicle,
          passenger_count: Number(passengers) || 1
        });
        if (!cancelled) {
          setLiveEstimates(res.data);
        }
      } catch {
        // Keep last valid quote
      } finally {
        if (!cancelled) setLoadingFeed(false);
      }
    }
    fetchLiveQuotes();
    return () => {
      cancelled = true;
    };
  }, [pickup, destination, selectedVehicle, passengers]);

  const navigateToJourneyPlanner = (targetDestination = destination, mode = 'Any') => {
    const cleanDest = targetDestination || 'Whitefield (Kadugodi / ITPL)';
    const params = new URLSearchParams({
      pickup,
      destination: cleanDest,
      date: getTodayIstDateString(),
      time: getCurrentIstTimeString(),
      passengers,
      mode,
      sort:
        ridePriority === 'cheapest'
          ? 'cheapest'
          : ridePriority === 'earliest'
          ? 'fastest'
          : 'balanced',
      ...(budget ? { budget } : {})
    });
    navigate(`/journey-results?${params.toString()}`);
  };

  const getRankedProvidersForPriority = () => {
    const baseFare = liveEstimates?.all_options?.[0]?.estimated_fare || 120;
    const list = [
      {
        brand: 'Rapido',
        etaMins: 1,
        fare: Math.max(35, Math.round(baseFare * 0.94))
      },
      {
        brand: 'Uber',
        etaMins: 2,
        fare: Math.round(baseFare * 1.04)
      },
      {
        brand: 'Ola',
        etaMins: 3,
        fare: baseFare
      }
    ];
    return [...list].sort((a, b) => {
      if (ridePriority === 'cheapest') {
        return a.fare - b.fare || a.etaMins - b.etaMins;
      }
      if (ridePriority === 'earliest') {
        return a.etaMins - b.etaMins || a.fare - b.fare;
      }
      // earliest_and_cheapest: combined normalized score of ETA + fare
      const scoreA = a.etaMins * 18 + a.fare;
      const scoreB = b.etaMins * 18 + b.fare;
      return scoreA - scoreB;
    });
  };

  const buildLocalFinalizedSession = (chosenWinnerName = null) => {
    const ranked = getRankedProvidersForPriority();
    const providers = ranked.map((p) => p.brand);
    const winnerName = chosenWinnerName || ranked[0].brand;
    const baseFare = liveEstimates?.all_options?.[0]?.estimated_fare || 120;
    const distKm = liveEstimates?.all_options?.[0]?.distance_km || 8.4;
    const durMin = liveEstimates?.all_options?.[0]?.estimated_duration_minutes || 22;

    const getFareFor = (brand) =>
      brand === 'Rapido'
        ? Math.max(35, Math.round(baseFare * 0.94))
        : brand === 'Ola'
        ? baseFare
        : Math.round(baseFare * 1.04);

    const winnerFare = getFareFor(winnerName);
    const otherNames = providers.filter((p) => p !== winnerName);
    const driverRoster = {
      Rapido: {
        driver_name: 'Kiran Gowda',
        driver_rating: '4.9 ★ (1,620 trips)',
        vehicle_model: `${selectedVehicle} Express`,
        registration_number: 'KA 03 HM 7412'
      },
      Ola: {
        driver_name: 'Nagaraj R.',
        driver_rating: '4.8 ★ (2,140 trips)',
        vehicle_model: `Ola ${selectedVehicle} Prime`,
        registration_number: 'KA 01 AG 4821'
      },
      Uber: {
        driver_name: 'Manjunath S.',
        driver_rating: '4.9 ★ (3,090 trips)',
        vehicle_model: `Uber ${selectedVehicle} Comfort`,
        registration_number: 'KA 05 MK 9204'
      }
    };
    const driver = driverRoster[winnerName] || driverRoster.Ola;
    const pinCode = String(Math.floor(1000 + Math.random() * 9000));
    const bookingRef = `RR-${winnerName.toUpperCase()}-${pinCode}`;

    return {
      session_id: `session-${Date.now()}`,
      ride_request_id: `req-${Date.now()}`,
      session_state: 'finalized',
      pickup_address: pickup,
      destination_address: destination,
      vehicle_type: selectedVehicle,
      budget_mode: 'Balanced',
      effective_max_budget: Math.round(baseFare * 1.25),
      winner_provider: winnerName,
      provider_requests: providers.map((brand) => {
        const isWin = brand === winnerName;
        return {
          provider_request_id: `req-${brand.toLowerCase()}`,
          provider_id: brand,
          provider_name: brand,
          service_name: `${brand} ${selectedVehicle}`,
          vehicle_type: selectedVehicle,
          vehicle_supported: true,
          passenger_capacity: selectedVehicle === 'Bike' ? 1 : selectedVehicle === 'Auto' ? 3 : 4,
          pickup_eta_minutes: brand === 'Rapido' ? 1 : brand === 'Uber' ? 2 : 3,
          estimated_duration_minutes: durMin,
          distance_km: distKm,
          estimated_fare: getFareFor(brand),
          budget_eligible: true,
          eligible_to_win: true,
          is_winner: isWin,
          acceptance_time_seconds: isWin ? 1.8 : null,
          status: isWin ? 'Accepted' : 'Cancelled by RushRoute AI',
          coordinator_note: isWin
            ? `SELECTED — ${brand} rider accepted first in 1.8s at ₹${getFareFor(brand)}.`
            : `Automatically canceled on its own immediately after ${winnerName} rider accepted first.`
        };
      }),
      winner_booking: {
        id: `booking-${Date.now()}`,
        provider_name: `${winnerName} (${winnerName} ${selectedVehicle} — Selected Fastest Rider)`,
        provider_brand: winnerName,
        service_name: `${winnerName} ${selectedVehicle}`,
        vehicle_type: selectedVehicle,
        estimated_fare: winnerFare,
        estimated_duration_minutes: durMin,
        distance_km: distKm,
        pickup_eta_minutes: winnerName === 'Rapido' ? 1 : winnerName === 'Uber' ? 2 : 3,
        acceptance_time_seconds: 1.8,
        booking_status: 'confirmed',
        provider_reference: bookingRef,
        simulated_driver: driver,
        booking_stage: 'Driver assigned'
      },
      ai_coordinator_explanation: `${winnerName} (${winnerName} ${selectedVehicle}) accepted first in 1.8s at ₹${winnerFare}. RushRoute locked ${winnerName} as your selected ride and automatically canceled ${otherNames.join(
        ' & '
      )} with ₹0 fee.`,
      race_timeline: [
        {
          elapsed_seconds: 0.1,
          event_type: 'PARALLEL_REQUESTS_SENT',
          message: `Booked simultaneously on Uber, Ola & Rapido for ${pickup} → ${destination}.`
        },
        {
          elapsed_seconds: 1.8,
          event_type: 'WINNER_LOCKED',
          message: `${winnerName} rider (${driver.driver_name}, ${driver.registration_number}) accepted first at ₹${winnerFare}!`
        },
        {
          elapsed_seconds: 1.9,
          event_type: 'LOSERS_AUTO_CANCELLED',
          message: `Automatically canceled ${otherNames.join(' & ')} on their own (stopped searching, ₹0 fee).`
        }
      ]
    };
  };

  const handleStartInstantHomeRace = async (scenario = 'auto') => {
    clearHomeTimers();
    setIsHomeRacing(true);

    const baseFare = liveEstimates?.all_options?.[0]?.estimated_fare || 120;
    const distKm = liveEstimates?.all_options?.[0]?.distance_km || 8.4;
    const durMin = liveEstimates?.all_options?.[0]?.estimated_duration_minutes || 22;

    // 1. Immediately display the 3 platforms in active searching state so user sees them waiting for a few seconds
    setHomeRaceSession({
      session_id: `pending-${Date.now()}`,
      session_state: 'waiting',
      pickup_address: pickup,
      destination_address: destination,
      vehicle_type: selectedVehicle,
      budget_mode: 'Balanced',
      effective_max_budget: Math.round(baseFare * 1.25),
      winner_provider: null,
      winner_booking: null,
      provider_requests: ['Rapido', 'Ola', 'Uber'].map((brand) => ({
        provider_request_id: `req-${brand.toLowerCase()}`,
        provider_id: brand,
        provider_name: brand,
        service_name: `${brand} ${selectedVehicle}`,
        vehicle_type: selectedVehicle,
        vehicle_supported: true,
        passenger_capacity: selectedVehicle === 'Bike' ? 1 : selectedVehicle === 'Auto' ? 3 : 4,
        pickup_eta_minutes: brand === 'Rapido' ? 1 : brand === 'Uber' ? 2 : 3,
        estimated_duration_minutes: durMin,
        distance_km: distKm,
        estimated_fare:
          brand === 'Rapido'
            ? Math.max(35, Math.round(baseFare * 0.94))
            : brand === 'Ola'
            ? baseFare
            : Math.round(baseFare * 1.04),
        budget_eligible: true,
        eligible_to_win: true,
        is_winner: false,
        status: 'Waiting for Acceptance',
        coordinator_note: `Searching for nearby ${brand} rider...`
      })),
      ai_coordinator_explanation:
        'Booking requests sent to Uber, Ola, and Rapido. Waiting a few seconds for the fastest rider to accept...',
      race_timeline: [
        {
          elapsed_seconds: 0.1,
          event_type: 'PARALLEL_REQUESTS_SENT',
          message: 'Dispatched simultaneous booking requests to Uber, Ola & Rapido...'
        }
      ]
    });

    const explicitWinner =
      scenario === 'rapido_wins'
        ? 'Rapido'
        : scenario === 'ola_wins'
        ? 'Ola'
        : scenario === 'uber_wins'
        ? 'Uber'
        : null;

    let backendSessionId = null;
    try {
      const startRes = await apiClient.post('/rides/smart-race/start', {
        pickup_address: pickup,
        destination_address: destination,
        vehicle_type: selectedVehicle,
        passenger_count: Number(passengers) || 1,
        budget_mode: ridePriority === 'cheapest' ? 'Cheapest' : 'Balanced',
        price_convenience_balance:
          ridePriority === 'cheapest'
            ? 'price_first'
            : ridePriority === 'earliest'
            ? 'convenience_first'
            : 'balanced',
        race_scenario: scenario,
        immediate_resolve: false
      });
      backendSessionId = startRes.data?.session?.session_id || null;
    } catch {
      // Will resolve cleanly after the 2.3s timer below
    }

    // 2. Wait 2.3 seconds so the user clearly sees all 3 platforms searching, then select the winner & cancel the other 2 (stopping all blinking!)
    raceTimerRef.current = setTimeout(async () => {
      clearHomeTimers();
      if (backendSessionId) {
        try {
          const resolveRes = await apiClient.post(
            `/rides/smart-race/${backendSessionId}/resolve`
          );
          if (resolveRes.data?.session?.winner_provider) {
            setHomeRaceSession(resolveRes.data.session);
            setIsHomeRacing(false);
            return;
          }
        } catch {
          // Fall through to deterministic local finalizer
        }
      }
      setHomeRaceSession(buildLocalFinalizedSession(explicitWinner));
      setIsHomeRacing(false);
    }, 2300);
  };

  const handleInstantFinalizeHomeRace = async () => {
    clearHomeTimers();
    if (homeRaceSession?.session_id && !String(homeRaceSession.session_id).startsWith('pending-')) {
      try {
        const res = await apiClient.post(
          `/rides/smart-race/${homeRaceSession.session_id}/resolve`
        );
        if (res.data?.session?.winner_provider) {
          setHomeRaceSession(res.data.session);
          setIsHomeRacing(false);
          return;
        }
      } catch {
        // Fall through
      }
    }
    setHomeRaceSession(buildLocalFinalizedSession(null));
    setIsHomeRacing(false);
  };

  const handleForceHomeProviderAccept = async (providerName) => {
    clearHomeTimers();
    if (homeRaceSession?.session_id && !String(homeRaceSession.session_id).startsWith('pending-')) {
      try {
        const res = await apiClient.post(
          `/rides/smart-race/${homeRaceSession.session_id}/event`,
          {
            provider_name: providerName,
            action: 'accept'
          }
        );
        if (res.data?.session?.winner_provider) {
          setHomeRaceSession(res.data.session);
          setIsHomeRacing(false);
          return;
        }
      } catch {
        // Fall through
      }
    }
    setHomeRaceSession(buildLocalFinalizedSession(providerName));
    setIsHomeRacing(false);
  };

  const firstOption = liveEstimates?.all_options?.[0] || null;
  const mapWaypoints = firstOption?.coordinates
    ? [
        {
          label: pickup,
          lat: firstOption.coordinates.pickup.lat,
          lng: firstOption.coordinates.pickup.lng
        },
        {
          label: destination,
          lat: firstOption.coordinates.destination.lat,
          lng: firstOption.coordinates.destination.lng
        }
      ]
    : [];

  const connectedApis = [
    { name: 'Uber Mobility API', endpoint: 'api.uber.com/v1.2', latency: '14ms', badge: 'bg-slate-950 text-white' },
    { name: 'Ola Cabs Partner API', endpoint: 'devapi.olacabs.com', latency: '18ms', badge: 'bg-emerald-900 text-emerald-300' },
    { name: 'Rapido Captain API', endpoint: 'partner.rapido.bike', latency: '11ms', badge: 'bg-amber-400 text-slate-950' },
    { name: 'BMTC GTFS Engine', endpoint: '19 Hubs • 9 Corridors', latency: 'Synced', badge: 'bg-blue-900 text-blue-100' },
    { name: 'BMRCL Namma Metro', endpoint: 'Purple & Green Lines', latency: 'Synced', badge: 'bg-purple-900 text-purple-100' }
  ];

  const vehiclePills = [
    { id: 'Auto', label: 'Auto', seats: '3 seats', icon: Car },
    { id: 'Bike', label: 'Bike Taxi', seats: '1 seat', icon: Bike },
    { id: 'Mini', label: 'Mini Cab', seats: '4 seats', icon: Car },
    { id: 'Sedan', label: 'Prime Sedan', seats: '4 seats', icon: Car },
    { id: 'SUV', label: 'XL SUV', seats: '6 seats', icon: Car }
  ];

  const demoPasses = [
    {
      id: 'bmtc_pass',
      title: 'BMTC Daily Vajra / Ordinary Pass',
      price: '₹70 / Day',
      validity: 'Unlimited rides across Bengaluru BMTC City Corridors until 23:59 IST',
      code: 'BMTC-DIGI-2026-8841',
      note: 'Interactive Prototype Pass — Demonstrates integrated BMTC digital pass wallet.'
    },
    {
      id: 'metro_ticket',
      title: 'Namma Metro QR Single Journey',
      price: '₹10–₹60 Stage Fare',
      validity: 'Purple Line & Green Line (Majestic Interchange Included)',
      code: 'BMRCL-QR-2026-3920',
      note: 'Interactive Prototype QR — Demonstrates instant BMRCL gate scan experience.'
    },
    {
      id: 'combined_ticket',
      title: 'One Bengaluru Mobility Pass (BMTC + Metro + Auto)',
      price: '₹110 / Day',
      validity: 'Unified Feeder Bus + Namma Metro + ₹25 Last-Mile Auto Credit',
      code: 'ONE-BLR-SUPER-2026',
      note: 'Interactive Prototype Concept — Showcases RushRoute multimodal super-pass.'
    }
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* 1. REFERENCE 1: Emerald Header + Floating Pickup/Destination Card + Saved Places */}
      <section className="overflow-hidden rounded-3xl border border-[#E5EAE7] bg-white shadow-sm">
        <div className="bg-linear-to-br from-[#022C22] via-[#04503B] to-[#047857] px-5 pt-6 pb-14 text-white sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-[#A7F3D0] uppercase">
                {isAuthenticated && user?.full_name
                  ? `Welcome back, ${user.full_name.split(' ')[0]} • Bengaluru`
                  : 'Bengaluru Multimodal Mobility'}
              </p>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                One Platform. Every Journey. Smarter Decisions.
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshLocation}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs transition hover:bg-white/25"
              >
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span>{locationState?.status === 'granted' ? 'GPS Active' : 'Use GPS'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Floating White Search Card */}
        <div className="px-4 pb-6 sm:px-8">
          <div className="-mt-9 rounded-2xl border border-[#E5EAE7] bg-white p-4 shadow-md sm:p-5">
            <div className="flex items-center gap-3">
              {/* Vertical A -> B Connector */}
              <div className="hidden flex-col items-center py-4 sm:flex" aria-hidden="true">
                <span className="h-3 w-3 rounded-full border-2 border-[#047857] bg-[#ECFDF5]" />
                <span className="my-1.5 w-0.5 flex-1 bg-[#E5EAE7]" />
                <MapPin className="h-4 w-4 text-[#022C22]" />
              </div>

              <div className="min-w-0 flex-1 space-y-2.5">
                <LocationInput
                  id="home-pickup"
                  label="Pickup"
                  enableGpsButton={true}
                  value={pickup}
                  onChange={setPickup}
                />
                <div className="border-t border-[#E5EAE7]" />
                <LocationInput
                  id="home-destination"
                  label="Where to go?"
                  value={destination}
                  onChange={setDestination}
                  placeholder="Search Whitefield, MG Road, KIA Airport, Electronic City..."
                />
              </div>

              <button
                type="button"
                onClick={handleSwapLocations}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5EAE7] bg-[#F7F9F8] text-[#047857] transition hover:border-[#047857] hover:bg-[#ECFDF5]"
                title="Swap pickup and destination"
                aria-label="Swap pickup and destination"
              >
                <ArrowUpDown className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Saved Bengaluru Places + Connected Apps Pill (Ref 1) */}
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5EAE7] bg-[#F7F9F8] px-3 py-1 text-xs font-bold text-[#17211E]">
                <MapPin className="h-3.5 w-3.5 text-[#047857]" />
                Saved places
              </span>
              <CurrentLocationStatusBanner
                locationState={locationState}
                onRefresh={refreshLocation}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {BENGALURU_QUICK_DESTINATIONS.slice(0, 4).map((hub) => {
                const shortLabel = hub.split(' (')[0];
                const active = destination === hub;
                return (
                  <button
                    key={hub}
                    type="button"
                    onClick={() => setDestination(hub)}
                    className={`flex items-start gap-2.5 rounded-2xl border p-3 text-left transition ${
                      active
                        ? 'border-[#047857] bg-[#ECFDF5]'
                        : 'border-[#E5EAE7] bg-[#F7F9F8]/70 hover:border-[#10B981]/50 hover:bg-white'
                    }`}
                  >
                    <MapPin
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        active ? 'text-[#047857]' : 'text-[#727C77]'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#17211E]">{shortLabel}</p>
                      <p className="truncate text-[11px] text-[#727C77]">{hub}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <a
              href="#connect-providers"
              className="flex items-center justify-between rounded-2xl border border-[#E5EAE7] bg-[#F7F9F8] px-4 py-2.5 transition hover:border-[#047857]/40 hover:bg-[#ECFDF5]/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex -space-x-1.5">
                  <ProviderLogo provider="Uber" size="xs" />
                  <ProviderLogo provider="Ola" size="xs" />
                  <ProviderLogo provider="Rapido" size="xs" />
                </div>
                <span className="text-xs font-semibold text-[#17211E]">
                  Uber, Ola &amp; Rapido linked • Manage ride apps for better fares
                </span>
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#022C22] text-white">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* 2. REFERENCE 2 & 3: Interactive Route Map + Clean Ride Compare Sheet */}
      <section className="grid gap-6 lg:grid-cols-12">
        {/* Map Panel (Ref 2) */}
        <div className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#E5EAE7] bg-white p-4 shadow-sm lg:col-span-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                <h2 className="text-sm font-extrabold text-[#17211E]">
                  {pickup.split(' (')[0]} → {destination.split(' (')[0]}
                </h2>
              </div>
              {firstOption && (
                <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-bold text-[#047857]">
                  {firstOption.distance_km} km • ~{firstOption.estimated_duration_minutes} mins
                </span>
              )}
            </div>

            <RouteMap
              waypoints={mapWaypoints}
              heightClass="h-72 sm:h-88 lg:h-[380px]"
              routeMetrics={
                firstOption
                  ? {
                      distanceKm: firstOption.distance_km,
                      durationMin: firstOption.estimated_duration_minutes
                    }
                  : null
              }
            />
          </div>

          {/* Quick Multimodal Links Below Map */}
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigateToJourneyPlanner(destination, 'Bus')}
              className="flex items-center gap-2 rounded-xl border border-[#E5EAE7] bg-[#F7F9F8] px-3 py-2 text-xs font-bold text-[#17211E] transition hover:border-[#047857] hover:bg-[#ECFDF5]"
            >
              <Bus className="h-4 w-4 text-[#047857]" />
              <span>BMTC Bus • From ₹15</span>
            </button>
            <button
              type="button"
              onClick={() => navigateToJourneyPlanner(destination, 'Metro')}
              className="flex items-center gap-2 rounded-xl border border-[#E5EAE7] bg-[#F7F9F8] px-3 py-2 text-xs font-bold text-[#17211E] transition hover:border-[#047857] hover:bg-[#ECFDF5]"
            >
              <TrainFront className="h-4 w-4 text-[#047857]" />
              <span>Namma Metro</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/public-transport')}
              className="flex items-center gap-2 rounded-xl border border-[#E5EAE7] bg-[#F7F9F8] px-3 py-2 text-xs font-bold text-[#17211E] transition hover:border-[#047857] hover:bg-[#ECFDF5]"
            >
              <Footprints className="h-4 w-4 text-[#047857]" />
              <span>Nearest Stop</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/carpool')}
              className="flex items-center gap-2 rounded-xl border border-[#E5EAE7] bg-[#F7F9F8] px-3 py-2 text-xs font-bold text-[#17211E] transition hover:border-[#047857] hover:bg-[#ECFDF5]"
            >
              <Users className="h-4 w-4 text-[#047857]" />
              <span>Carpool Split</span>
            </button>
          </div>
        </div>

        {/* Ride Compare Sheet (Ref 3) */}
        <div className="flex flex-col justify-between rounded-3xl border border-[#E5EAE7] bg-white p-5 shadow-sm sm:p-6 lg:col-span-7">
          <div className="space-y-4">
            <div className="mx-auto h-1 w-10 rounded-full bg-[#E5EAE7] lg:hidden" />

            {/* Sheet Header + Priority Dropdown */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-[#17211E]">
                  Ride compare
                </h2>
                <p className="text-xs text-[#727C77]">
                  {loadingFeed
                    ? 'Syncing live estimates...'
                    : 'Tap any ride to race all 3 apps or pick directly'}
                </p>
              </div>

              <select
                aria-label="Sort rides by priority"
                value={ridePriority}
                onChange={(e) => setRidePriority(e.target.value)}
                className="rounded-xl border border-[#E5EAE7] bg-[#F7F9F8] px-3 py-2 text-xs font-bold text-[#17211E] outline-none focus:border-[#047857]"
              >
                <option value="earliest_and_cheapest">Earliest &amp; Cheapest</option>
                <option value="cheapest">Lowest fare</option>
                <option value="earliest">Fastest arrival</option>
              </select>
            </div>

            {/* Category Filter Pills (Ref 3) */}
            <div className="flex flex-wrap items-center gap-2">
              {vehiclePills.map((vp) => {
                const Icon = vp.icon;
                const active = selectedVehicle === vp.id;
                return (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => setSelectedVehicle(vp.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      active
                        ? 'border-[#022C22] bg-[#022C22] text-white shadow-2xs'
                        : 'border-[#E5EAE7] bg-[#F7F9F8] text-[#17211E] hover:border-[#047857]/50 hover:bg-white'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? 'text-[#10B981]' : 'text-[#047857]'}`} />
                    <span>{vp.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Clean Single-Row Ride Cards (Ref 3) */}
            <div className="space-y-2.5">
              {getRankedProvidersForPriority().map((rankedItem, idx) => {
                const brandName = rankedItem.brand;
                const isTopPriorityMatch = idx === 0;
                const matchedOpt =
                  liveEstimates?.all_options?.find(
                    (o) => String(o.brand || '').toLowerCase() === brandName.toLowerCase()
                  ) || liveEstimates?.all_options?.[0];

                const raceReq = homeRaceSession?.provider_requests?.find(
                  (pr) => pr.provider_name.toLowerCase() === brandName.toLowerCase()
                );
                const isWinner = Boolean(
                  homeRaceSession?.session_state === 'finalized' &&
                    (raceReq?.is_winner || homeRaceSession?.winner_provider === brandName)
                );
                const isAutoCancelled = Boolean(
                  homeRaceSession?.session_state === 'finalized' && !isWinner && raceReq
                );

                const brandMeta = {
                  Uber: { eta: '2 min', seats: '4', tag: '1.0x Standard' },
                  Ola: { eta: '3 min', seats: '4', tag: 'Verified Driver' },
                  Rapido: { eta: '1 min', seats: '1-3', tag: 'Fastest Pickup' }
                }[brandName];

                const baseFare = matchedOpt?.estimated_fare || 120;
                const displayFare =
                  raceReq?.estimated_fare ||
                  (brandName === 'Rapido'
                    ? Math.max(35, Math.round(baseFare * 0.94))
                    : brandName === 'Ola'
                    ? baseFare
                    : Math.round(baseFare * 1.04));

                return (
                  <div
                    key={brandName}
                    onClick={() => {
                      if (isHomeRacing) {
                        handleForceHomeProviderAccept(brandName);
                      } else {
                        handleStartInstantHomeRace(`${brandName.toLowerCase()}_wins`);
                      }
                    }}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition ${
                      isWinner
                        ? 'border-2 border-[#16A34A] bg-[#ECFDF5] shadow-sm'
                        : isAutoCancelled
                        ? 'border-[#E5EAE7] bg-[#F7F9F8] opacity-60'
                        : 'border-[#E5EAE7] bg-[#F7F9F8]/60 hover:border-[#047857] hover:bg-white hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <ProviderLogo provider={brandName} size="md" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-extrabold ${
                              isAutoCancelled ? 'text-[#727C77] line-through' : 'text-[#17211E]'
                            }`}
                          >
                            {brandName} {selectedVehicle}
                          </span>
                          {isWinner ? (
                            <span className="rounded-full bg-[#16A34A] px-2 py-0.5 text-[10px] font-bold text-white">
                              BOOKED ({raceReq?.acceptance_time_seconds ?? '1.8'}s)
                            </span>
                          ) : isAutoCancelled ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-[#DC2626]">
                              CANCELED
                            </span>
                          ) : isTopPriorityMatch ? (
                            <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-bold text-[#047857]">
                              {ridePriority === 'cheapest'
                                ? 'BEST VALUE'
                                : ridePriority === 'earliest'
                                ? 'FASTEST'
                                : 'TOP PICK'}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-[#727C77]">
                          {brandMeta.eta} • {selectedVehicle === 'Bike' ? '1 seat' : selectedVehicle === 'Auto' ? '3 seats' : `${brandMeta.seats} seats`} • {brandMeta.tag}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-lg font-extrabold ${
                          isAutoCancelled ? 'text-[#727C77] line-through' : 'text-[#17211E]'
                        }`}
                      >
                        ₹{displayFare}
                      </span>
                      <p className="text-[11px] font-semibold text-[#047857]">
                        {isHomeRacing ? 'Tap to accept' : 'Select →'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inline Selected Ride Banner when finalized */}
            {!isHomeRacing &&
              homeRaceSession?.session_state === 'finalized' &&
              homeRaceSession?.winner_booking && (
                <div className="rounded-2xl bg-[#022C22] p-4 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#10B981]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Fastest Ride Confirmed • Other 2 Auto-Canceled
                      </span>
                      <h4 className="mt-0.5 text-sm font-extrabold">
                        {homeRaceSession.winner_provider} ({homeRaceSession.winner_booking.service_name}) — ₹
                        {homeRaceSession.winner_booking.estimated_fare}
                      </h4>
                      <p className="mt-0.5 text-xs text-[#A7F3D0]">
                        Driver:{' '}
                        {String(
                          homeRaceSession.winner_booking.simulated_driver?.driver_name || 'Kiran Gowda'
                        ).replace(/\s*\(SIMULATED DRIVER\)/i, '')}{' '}
                        •{' '}
                        {String(
                          homeRaceSession.winner_booking.simulated_driver?.registration_number ||
                            'KA 01 AG 4821'
                        ).replace(/\s*\(Fictional Demo[^)]*\)/i, '')}{' '}
                        • {homeRaceSession.winner_booking.pickup_eta_minutes} min away
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/10 px-3 py-1.5 text-right">
                      <span className="block text-[10px] text-[#A7F3D0] uppercase">PIN</span>
                      <span className="font-mono text-sm font-extrabold">
                        {String(homeRaceSession.winner_booking.provider_reference || '4829')
                          .replace(/\D/g, '')
                          .padEnd(4, '8')
                          .slice(0, 4)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* Sticky Bottom Action Bar (Ref 3) */}
          <div className="mt-5 flex flex-col gap-2.5 border-t border-[#E5EAE7] pt-4 sm:flex-row">
            <button
              type="button"
              disabled={isHomeRacing}
              onClick={() => handleStartInstantHomeRace('auto')}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#022C22] px-5 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#047857] disabled:opacity-50"
            >
              <Zap className="h-4 w-4 text-[#10B981]" />
              <span>
                {isHomeRacing ? 'Racing All 3 Apps...' : 'Book Ride (Smart Race)'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigateToJourneyPlanner(destination, 'Any')}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#E5EAE7] bg-[#F7F9F8] px-4 py-3.5 text-xs font-bold text-[#17211E] transition hover:border-[#047857] hover:bg-[#ECFDF5]"
            >
              <span>Compare Multimodal</span>
              <ArrowRight className="h-4 w-4 text-[#047857]" />
            </button>
          </div>
        </div>
      </section>

      {/* Live AI Smart Booking Race Board + Confirmed Sustained Ride Card */}
      {homeRaceSession && (
        <div className="space-y-5">
          <SmartBookingRaceBoard
            session={homeRaceSession}
            isRacing={isHomeRacing}
            onRetryRace={() => handleStartInstantHomeRace('auto')}
            onForceProviderAccept={handleForceHomeProviderAccept}
            onSimulateLateAcceptance={handleForceHomeProviderAccept}
            onInstantFinalize={handleInstantFinalizeHomeRace}
          />

          {homeRaceSession.session_state === 'finalized' &&
            homeRaceSession.winner_booking && (
              <BookingConfirmation
                confirmedBooking={homeRaceSession.winner_booking}
                rideRequest={{
                  id: homeRaceSession.ride_request_id,
                  pickup_address: homeRaceSession.pickup_address,
                  destination_address: homeRaceSession.destination_address
                }}
              />
            )}
        </div>
      )}

      {/* 3. REFERENCE 4: Connect Your Ride Services */}
      <section
        id="connect-providers"
        className="rounded-3xl border border-[#E5EAE7] bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
          <div>
            <h2 className="text-lg font-extrabold text-[#17211E]">
              Connect Your Ride Services
            </h2>
            <p className="text-xs text-[#727C77]">
              Demo Mode simulated adapters for Uber, Ola and Rapido.
            </p>
          </div>
          <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-[11px] font-bold text-[#047857]">
            Simulated Demo Adapters
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {['Uber', 'Ola', 'Rapido'].map((brand) => {
            const state = providerConnections[brand] || 'connected';
            const isConnected = state === 'connected';
            const isConnecting = state === 'connecting';
            return (
              <div
                key={brand}
                className={`flex flex-col items-center justify-between gap-3 rounded-2xl border p-5 text-center transition ${
                  isConnected
                    ? 'border-[#10B981]/35 bg-[#ECFDF5]/60'
                    : 'border-[#E5EAE7] bg-[#F7F9F8]'
                }`}
              >
                <ProviderLogo provider={brand} size="lg" />
                <div>
                  <p className="text-sm font-extrabold text-[#17211E]">{brand}</p>
                  <p className="text-[11px] text-[#727C77]">Demo Mode</p>
                </div>
                <button
                  type="button"
                  disabled={isConnecting}
                  onClick={() => handleToggleProviderConnection(brand)}
                  className={`w-full rounded-xl px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                    isConnected
                      ? 'bg-[#16A34A] text-white hover:bg-[#15803D]'
                      : 'bg-[#047857] text-white hover:bg-[#022C22]'
                  }`}
                >
                  {isConnecting
                    ? 'Connecting...'
                    : isConnected
                    ? 'Connected ✓'
                    : 'Connect →'}
                </button>
              </div>
            );
          })}
        </div>

        <Link
          to="/book-ride"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#022C22] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#047857]"
        >
          <span>Compare</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Why RushRoute & Multimodal Modules */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            to: '/book-ride',
            title: 'Compare Ride Services',
            desc: 'Compare Uber, Ola & Rapido fares and run Smart Booking Race.',
            icon: Car
          },
          {
            to: '/public-transport',
            title: 'Explore Public Transport',
            desc: 'Sample BMTC bus corridors, Namma Metro lines & walking routes.',
            icon: Bus
          },
          {
            to: '/carpool',
            title: 'Find a Carpool',
            desc: 'Compatibility-scored commuter carpools with mutual consent.',
            icon: Users
          },
          {
            to: '/dashboard',
            title: 'AI Journey Intelligence',
            desc: 'Gemini-powered route advice with deterministic local fallback.',
            icon: Sparkles
          }
        ].map((mod) => {
          const ModIcon = mod.icon;
          return (
            <Link
              key={mod.to}
              to={mod.to}
              className="group flex flex-col justify-between rounded-2xl border border-[#E5EAE7] bg-white p-4 shadow-2xs transition hover:border-[#047857]/40 hover:shadow-sm"
            >
              <div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ECFDF5] text-[#047857]">
                  <ModIcon className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-extrabold text-[#17211E] group-hover:text-[#047857]">
                  {mod.title}
                </h3>
                <p className="mt-1 text-xs text-[#727C77]">{mod.desc}</p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#047857]">
                <span>Explore</span>
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          );
        })}
      </section>

      {/* Digital Mobility Wallet & Transit Passes */}
      <section className="rounded-3xl border border-emerald-900/15 bg-[#ECFDF5]/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950 px-3 py-0.5 text-[10px] font-extrabold text-emerald-300 uppercase">
              Digital Transit Pass Wallet
            </span>
            <h3 className="mt-1 text-base font-extrabold text-slate-900">
              Instant BMTC Vajra Pass, Namma Metro QR & One-Bengaluru Super Pass
            </h3>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {demoPasses.map((pass) => (
            <div
              key={pass.id}
              className="flex flex-col justify-between rounded-2xl border border-emerald-900/15 bg-white p-4 shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between">
                  <Ticket className="h-5 w-5 text-[#064E3B]" />
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                    INSTANT QR PASS
                  </span>
                </div>
                <h4 className="mt-2.5 text-sm font-extrabold text-slate-900">{pass.title}</h4>
                <p className="mt-0.5 text-xs font-bold text-emerald-900">{pass.price}</p>
                <p className="mt-1 text-[11px] text-slate-500">{pass.validity}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDemoTicket(pass)}
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#064E3B] px-3 py-2 text-xs font-bold text-white hover:bg-[#022C22]"
              >
                <QrCode className="h-3.5 w-3.5" />
                Open Digital QR Pass
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* QR Pass Modal */}
      {selectedDemoTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-extrabold text-emerald-900">
                RUSHROUTE DIGITAL TRANSIT WALLET
              </span>
              <button
                type="button"
                onClick={() => setSelectedDemoTicket(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 text-center">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl bg-[#022C22] text-[#10B981] shadow-md">
                <QrCode className="h-16 w-16" />
              </div>
              <h4 className="mt-3 text-lg font-extrabold text-slate-900">
                {selectedDemoTicket.title}
              </h4>
              <p className="mt-1 text-sm font-bold text-emerald-800">
                {selectedDemoTicket.price}
              </p>
              <p className="mt-1 text-xs text-slate-600">{selectedDemoTicket.validity}</p>
              <div className="mt-3 rounded-xl bg-slate-100 py-2 font-mono text-xs font-bold text-slate-800">
                Pass ID: {selectedDemoTicket.code}
              </div>
              <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-[11px] text-slate-600">
                {selectedDemoTicket.note}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDemoTicket(null)}
              className="mt-4 w-full rounded-xl bg-[#064E3B] py-2.5 text-xs font-bold text-white hover:bg-[#022C22]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
