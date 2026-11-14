import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Compass, XCircle } from 'lucide-react';
import { apiClient } from '../services/api';
import { BookingStatus } from '../components/RideComponents';
import { EmptyState, ErrorState, LoadingState, ToastNotification } from '../components/GeneralComponents';

export function MyJourneysPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ journeys: [], ride_bookings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/journeys/history');
      setData({
        journeys: res.data.journeys || [],
        ride_bookings: res.data.ride_bookings || []
      });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load journey history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleCancelBooking = async (bookingId) => {
    try {
      await apiClient.post(`/rides/bookings/${bookingId}/cancel`);
      setToast({ type: 'success', message: 'Booking cancelled.' });
      loadHistory();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to cancel booking.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">My Journeys & Booking History</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review your confirmed simulated ride bookings and planned multimodal public transit journeys.
        </p>
      </div>

      <ErrorState message={error} onRetry={loadHistory} />

      {loading ? (
        <LoadingState message="Loading your saved bookings & planned journeys..." />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-slate-800" />
              <h2 className="text-lg font-bold text-slate-900">
                Simulated Ride Bookings ({data.ride_bookings.length})
              </h2>
            </div>

            {data.ride_bookings.length === 0 ? (
              <EmptyState
                title="No ride bookings yet"
                description="Book a simulated Bike, Auto, Mini, or Sedan ride to view it here."
                actionLabel="Book a Simulated Ride"
                onAction={() => navigate('/book-ride')}
              />
            ) : (
              data.ride_bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookingStatus status={b.booking_status} />
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                          DEMO RIDE
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                        {b.vehicle_type} — {b.provider_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ref: {b.provider_reference || 'Pending/Cancelled'} • Est.{' '}
                        {b.estimated_duration_minutes} mins
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(b.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-slate-900">₹{b.estimated_fare}</p>
                      {b.booking_status === 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(b.id)}
                          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-bold text-slate-900">
                Planned Multimodal Journeys ({data.journeys.length})
              </h2>
            </div>

            {data.journeys.length === 0 ? (
              <EmptyState
                title="No planned journeys yet"
                description="Use the Public Transport Planner or Smart Compare to plan routes."
                actionLabel="Plan a Journey"
                onAction={() => navigate('/public-transport')}
              />
            ) : (
              data.journeys.map((j) => (
                <div
                  key={j.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase">
                        {j.journey_status}
                      </span>
                      <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                        {j.pickup_address} → {j.destination_address}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-600">
                        Modes: <strong>{(j.transport_modes || []).join(' → ')}</strong>
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(j.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-extrabold text-emerald-700">
                        ₹{j.estimated_fare}
                      </p>
                      <p className="text-xs text-slate-500">
                        {j.estimated_duration_minutes} mins
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
