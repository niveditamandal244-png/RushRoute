import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Sparkles, Users } from 'lucide-react';
import { apiClient } from '../services/api';
import {
  BookingConfirmation,
  RideBookingForm,
  RideOptionCard,
  SmartBookingRaceBoard
} from '../components/RideComponents';
import {
  CurrentLocationStatusBanner,
  useAutoBengaluruLocation
} from '../components/JourneyComponents';
import { RouteMap } from '../components/RouteMap';
import { ErrorState, ToastNotification } from '../components/GeneralComponents';

export function BookRidePage() {
  const [searchParams] = useSearchParams();
  const initialPickupParam = searchParams.get('pickup');
  const { locationState, refreshLocation } = useAutoBengaluruLocation(
    initialPickupParam || 'Majestic (Kempegowda Bus Station / Metro Hub)'
  );

  const [formValues, setFormValues] = useState({
    pickup_address:
      initialPickupParam || 'Majestic (Kempegowda Bus Station / Metro Hub)',
    destination_address:
      searchParams.get('destination') || 'Whitefield (Kadugodi / ITPL)',
    vehicle_type: searchParams.get('vehicle') || 'Auto',
    passenger_count: Number(searchParams.get('passengers')) || 1,
    budget_mode: 'Balanced',
    minimum_budget: '',
    maximum_budget: searchParams.get('budget') ? Number(searchParams.get('budget')) : '',
    price_convenience_balance: 'balanced',
    race_scenario: 'auto',
    is_scheduled: false
  });

  const [estimateData, setEstimateData] = useState(null);
  const [raceSession, setRaceSession] = useState(null);
  const [isRacing, setIsRacing] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [loadingBook, setLoadingBook] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const pollTimerRef = useRef(null);

  // Sync auto-detected GPS location into pickup_address if user hasn't explicitly passed a query pickup
  useEffect(() => {
    if (!initialPickupParam && locationState?.address) {
      setFormValues((prev) => ({
        ...prev,
        pickup_address: locationState.address
      }));
    }
  }, [initialPickupParam, locationState?.address]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleEstimate = async () => {
    setLoadingEstimate(true);
    setError('');
    try {
      const res = await apiClient.post('/rides/estimate', {
        pickup_address: formValues.pickup_address,
        destination_address: formValues.destination_address,
        vehicle_type: formValues.vehicle_type,
        passenger_count: formValues.passenger_count || 1,
        minimum_budget: formValues.minimum_budget || undefined,
        maximum_budget: formValues.maximum_budget || undefined
      });
      setEstimateData(res.data);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to estimate ride fares.');
    } finally {
      setLoadingEstimate(false);
    }
  };

  useEffect(() => {
    handleEstimate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const handleStartSmartRace = async (overrideVehicle = null) => {
    stopPolling();
    setLoadingBook(true);
    setIsRacing(true);
    setError('');

    try {
      const targetVehicle = overrideVehicle || formValues.vehicle_type;
      const startRes = await apiClient.post('/rides/smart-race/start', {
        pickup_address: formValues.pickup_address,
        destination_address: formValues.destination_address,
        vehicle_type: targetVehicle,
        passenger_count: formValues.passenger_count || 1,
        budget_mode: formValues.budget_mode || 'Balanced',
        minimum_budget: formValues.minimum_budget || null,
        maximum_budget: formValues.maximum_budget || null,
        price_convenience_balance: formValues.price_convenience_balance || 'balanced',
        race_scenario: formValues.race_scenario || 'auto',
        immediate_resolve: false
      });

      const initialSession = startRes.data.session;
      setRaceSession(initialSession);

      pollTimerRef.current = setInterval(async () => {
        try {
          const pollRes = await apiClient.get(
            `/rides/smart-race/${initialSession.session_id}`
          );
          const updated = pollRes.data.session;
          setRaceSession(updated);

          if (['finalized', 'failed', 'expired'].includes(updated.session_state)) {
            stopPolling();
            setIsRacing(false);
            setLoadingBook(false);

            if (updated.winner_booking) {
              setBookingResult({
                confirmed_booking: updated.winner_booking,
                ride_request: {
                  id: updated.ride_request_id,
                  pickup_address: updated.pickup_address,
                  destination_address: updated.destination_address
                }
              });
              setToast({
                type: 'success',
                message: `${updated.winner_provider} accepted first in ${updated.winner_booking.acceptance_time_seconds}s! Other providers automatically cancelled by RushRoute AI.`
              });
            } else {
              setToast({
                type: 'error',
                message: updated.ai_coordinator_explanation || 'No eligible provider accepted.'
              });
            }
          }
        } catch (_pollErr) {
          stopPolling();
          setIsRacing(false);
          setLoadingBook(false);
        }
      }, 450);
    } catch (err) {
      setIsRacing(false);
      setLoadingBook(false);
      setError(err.friendlyMessage || 'Failed to start AI Smart Booking race.');
    }
  };

  const handleInstantFinalize = async () => {
    if (!raceSession?.session_id) return;
    stopPolling();
    try {
      const res = await apiClient.post(
        `/rides/smart-race/${raceSession.session_id}/resolve`
      );
      const updated = res.data.session;
      setRaceSession(updated);
      setIsRacing(false);
      setLoadingBook(false);
      if (updated.winner_booking) {
        setBookingResult({
          confirmed_booking: updated.winner_booking,
          ride_request: {
            id: updated.ride_request_id,
            pickup_address: updated.pickup_address,
            destination_address: updated.destination_address
          }
        });
      }
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to finalize race session.');
    }
  };

  const handleForceProviderAccept = async (providerName) => {
    if (!raceSession?.session_id) return;
    stopPolling();
    try {
      const res = await apiClient.post(
        `/rides/smart-race/${raceSession.session_id}/event`,
        {
          provider_name: providerName,
          action: 'accept'
        }
      );
      const updated = res.data.session;
      setRaceSession(updated);
      setIsRacing(false);
      setLoadingBook(false);
      if (updated?.winner_booking) {
        setBookingResult({
          confirmed_booking: updated.winner_booking,
          ride_request: {
            id: updated.ride_request_id,
            pickup_address: updated.pickup_address,
            destination_address: updated.destination_address
          }
        });
        setToast({
          type: 'success',
          message: `${updated.winner_provider} rider accepted first and sustained! The other 2 rides were automatically canceled on their own.`
        });
      }
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to lock fastest rider acceptance.');
    }
  };

  const handleSimulateLateAcceptance = async (losingProviderName) => {
    if (!raceSession?.session_id) return;
    try {
      const res = await apiClient.post(
        `/rides/smart-race/${raceSession.session_id}/event`,
        {
          provider_name: losingProviderName,
          action: 'accept'
        }
      );
      setRaceSession(res.data.session);
      setToast({
        type: 'success',
        message:
          res.data.reason ||
          `Late acceptance from ${losingProviderName} was rejected because winner is already locked!`
      });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to test late acceptance.');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      const res = await apiClient.post(`/rides/bookings/${bookingId}/cancel`);
      setBookingResult((prev) =>
        prev
          ? {
              ...prev,
              confirmed_booking: res.data.booking
            }
          : null
      );
      setToast({ type: 'success', message: 'Demo booking cancelled.' });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to cancel booking.');
    }
  };

  const handleAdvanceStage = async (bookingId) => {
    try {
      const res = await apiClient.post(`/rides/bookings/${bookingId}/stage`, {});
      setBookingResult((prev) =>
        prev
          ? {
              ...prev,
              confirmed_booking: res.data.booking
            }
          : null
      );
      setToast({
        type: 'success',
        message: res.data.message || 'Booking stage updated.'
      });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to advance booking stage.');
    }
  };

  const firstOption = estimateData?.all_options?.[0] || null;
  const mapWaypoints = firstOption?.coordinates
    ? [
        {
          label: formValues.pickup_address,
          lat: firstOption.coordinates.pickup.lat,
          lng: firstOption.coordinates.pickup.lng
        },
        {
          label: formValues.destination_address,
          lat: firstOption.coordinates.destination.lat,
          lng: firstOption.coordinates.destination.lng
        }
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 px-3.5 py-1 text-xs font-extrabold text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" />
          RushRoute AI Smart Booking — First Acceptance Wins
        </span>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
          One Request. Three Providers. First Acceptance Wins.
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Send one smart booking request across <strong>Uber</strong>, <strong>Ola</strong>, and{' '}
          <strong>Rapido</strong> simultaneously. RushRoute AI locks the first eligible provider to accept and automatically cancels the other two pending demonstration requests.
        </p>
      </div>

      <CurrentLocationStatusBanner
        locationState={locationState}
        onRefresh={refreshLocation}
      />

      <RideBookingForm
        values={formValues}
        onChange={setFormValues}
        onEstimate={handleEstimate}
        onStartSmartRace={() => handleStartSmartRace(null)}
        loadingEstimate={loadingEstimate}
        loadingBook={loadingBook}
      />

      <ErrorState message={error} />

      {raceSession && (
        <SmartBookingRaceBoard
          session={raceSession}
          isRacing={isRacing}
          onRetryRace={() => handleStartSmartRace(null)}
          onInstantFinalize={handleInstantFinalize}
          onForceProviderAccept={handleForceProviderAccept}
          onSimulateLateAcceptance={handleSimulateLateAcceptance}
        />
      )}

      {bookingResult?.confirmed_booking && (
        <BookingConfirmation
          confirmedBooking={bookingResult.confirmed_booking}
          rideRequest={bookingResult.ride_request}
          onCancelBooking={handleCancelBooking}
          onAdvanceStage={handleAdvanceStage}
        />
      )}

      {estimateData && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-900/15 bg-emerald-50/60 px-5 py-3.5 text-xs">
            <div className="flex flex-wrap items-center gap-2 font-bold text-emerald-950">
              <MapPin className="h-4 w-4 text-emerald-800" />
              <span>{formValues.pickup_address}</span>
              <ArrowRight className="h-3.5 w-3.5 text-emerald-700" />
              <span>{formValues.destination_address}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-700">
              {firstOption && (
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Clock className="h-3.5 w-3.5 text-emerald-800" />
                  {firstOption.distance_km} km • ~{firstOption.estimated_duration_minutes} mins
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-semibold">
                <Users className="h-3.5 w-3.5 text-emerald-800" />
                {formValues.passenger_count || 1}{' '}
                {(formValues.passenger_count || 1) === 1 ? 'Passenger' : 'Passengers'}
              </span>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="order-2 space-y-3 rounded-3xl border border-[#E5EAE7] bg-white p-4 shadow-sm sm:p-5 lg:order-1 lg:col-span-7">
              <div className="mx-auto h-1 w-10 rounded-full bg-[#E5EAE7] lg:hidden" />
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5EAE7] pb-3">
                <h2 className="text-base font-extrabold text-[#17211E]">
                  Ride Compare ({estimateData.suitable_options_count} Within Budget)
                </h2>
                <span className="rounded-full bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold text-[#047857]">
                  Sorted by fare
                </span>
              </div>

              {estimateData.all_options?.map((opt) => (
                <RideOptionCard
                  key={opt.option_id}
                  option={opt}
                  isPrioritized={
                    estimateData.prioritized_cheapest_option?.option_id === opt.option_id
                  }
                  onSelectOption={(selected) => handleStartSmartRace(selected.vehicle_type)}
                  loading={loadingBook}
                />
              ))}
            </div>

            <div className="order-1 rounded-3xl border border-[#E5EAE7] bg-white p-4 shadow-sm lg:order-2 lg:col-span-5">
              <h3 className="mb-3 text-sm font-extrabold text-[#17211E]">Interactive Route Map</h3>
              <RouteMap
                waypoints={mapWaypoints}
                heightClass="h-72 sm:h-80 lg:h-[380px]"
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
          </div>
        </div>
      )}

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
