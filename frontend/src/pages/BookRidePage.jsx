import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Info, ShieldCheck } from 'lucide-react';
import { apiClient } from '../services/api';
import {
  BookingConfirmation,
  RideBookingForm,
  RideOptionCard
} from '../components/RideComponents';
import { RouteMap } from '../components/RouteMap';
import { ErrorState, ToastNotification } from '../components/GeneralComponents';

export function BookRidePage() {
  const [searchParams] = useSearchParams();
  const [formValues, setFormValues] = useState({
    pickup_address:
      searchParams.get('pickup') || 'Indiranagar (100 Feet Road / Metro)',
    destination_address:
      searchParams.get('destination') || 'Whitefield (Kadugodi / ITPL)',
    vehicle_type: searchParams.get('vehicle') || 'Auto',
    minimum_budget: '',
    maximum_budget: searchParams.get('budget') ? Number(searchParams.get('budget')) : 350
  });

  const [providers, setProviders] = useState([]);
  const [estimateData, setEstimateData] = useState(null);
  const [bookingResult, setBookingResult] = useState(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [loadingBook, setLoadingBook] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    apiClient
      .get('/rides/providers')
      .then((res) => setProviders(res.data.providers || []))
      .catch(() => {});
  }, []);

  const handleEstimate = async () => {
    setLoadingEstimate(true);
    setError('');
    try {
      const res = await apiClient.post('/rides/estimate', {
        pickup_address: formValues.pickup_address,
        destination_address: formValues.destination_address,
        vehicle_type: formValues.vehicle_type,
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

  const handleBookCheapest = async () => {
    setLoadingBook(true);
    setError('');
    try {
      const res = await apiClient.post('/rides/requests', {
        pickup_address: formValues.pickup_address,
        destination_address: formValues.destination_address,
        vehicle_type: formValues.vehicle_type,
        minimum_budget: formValues.minimum_budget || undefined,
        maximum_budget: formValues.maximum_budget || undefined,
        auto_book_cheapest: true
      });
      setBookingResult(res.data);
      if (res.data.confirmed_booking) {
        setToast({
          type: 'success',
          message: `Confirmed ${res.data.confirmed_booking.vehicle_type} at ₹${res.data.confirmed_booking.estimated_fare}!`
        });
      } else {
        setError(res.data.message || 'No options matched your budget.');
      }
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to book ride.');
    } finally {
      setLoadingBook(false);
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
      setToast({ type: 'success', message: 'Simulated booking cancelled.' });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to cancel booking.');
    }
  };

  const mapWaypoints =
    estimateData?.all_options?.[0]?.coordinates
      ? [
          {
            label: formValues.pickup_address,
            lat: estimateData.all_options[0].coordinates.pickup.lat,
            lng: estimateData.all_options[0].coordinates.pickup.lng
          },
          {
            label: formValues.destination_address,
            lat: estimateData.all_options[0].coordinates.destination.lat,
            lng: estimateData.all_options[0].coordinates.destination.lng
          }
        ]
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Smart Private Ride Booking</h1>
        <p className="mt-1 text-sm text-slate-600">
          Set your vehicle category and budget range. RushRoute filters simulated options, prioritizes the cheapest suitable quote, and prevents duplicate confirmations.
        </p>
      </div>

      {/* Provider Adapter Architecture Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-700 uppercase">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Provider Adapter Registry (Section 4.1 Compliance)
        </div>
        <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {providers.map((p) => (
            <div
              key={p.provider_id}
              className={`rounded-xl border p-3 text-xs ${
                p.is_functional
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{p.provider_id}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    p.is_functional
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {p.is_functional ? 'ACTIVE DEMO' : 'STUB'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-600">{p.reason}</p>
            </div>
          ))}
        </div>
      </div>

      <RideBookingForm
        values={formValues}
        onChange={setFormValues}
        onEstimate={handleEstimate}
        onBookCheapest={handleBookCheapest}
        loadingEstimate={loadingEstimate}
        loadingBook={loadingBook}
      />

      <ErrorState message={error} />

      {bookingResult?.confirmed_booking && (
        <BookingConfirmation
          confirmedBooking={bookingResult.confirmed_booking}
          candidateBookings={bookingResult.candidate_bookings}
          workflowLog={bookingResult.workflow_log}
          onCancelBooking={handleCancelBooking}
        />
      )}

      {estimateData && (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Available Simulated Ride Options ({estimateData.suitable_options_count} Within Budget)
              </h2>
              <span className="inline-flex items-center gap-1 text-xs text-amber-800">
                <Info className="h-3.5 w-3.5" />
                Demonstration Fares Only
              </span>
            </div>

            {estimateData.all_options?.map((opt) => (
              <RideOptionCard
                key={opt.option_id}
                option={opt}
                isPrioritized={
                  estimateData.prioritized_cheapest_option?.option_id === opt.option_id
                }
                onSelectOption={handleBookCheapest}
                loading={loadingBook}
              />
            ))}
          </div>

          <div className="lg:col-span-5">
            <h3 className="mb-3 text-base font-bold text-slate-900">Journey Map Preview</h3>
            <RouteMap waypoints={mapWaypoints} heightClass="h-80" />
          </div>
        </div>
      )}

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
