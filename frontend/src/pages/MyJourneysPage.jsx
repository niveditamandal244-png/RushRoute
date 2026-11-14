import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Car,
  Compass,
  Eye,
  MapPin,
  Phone,
  ShieldAlert,
  UserCheck,
  XCircle
} from 'lucide-react';
import { apiClient } from '../services/api';
import { BookingStatus, BOOKING_STAGES_LIST } from '../components/RideComponents';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  ToastNotification
} from '../components/GeneralComponents';

export function MyJourneysPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ journeys: [], ride_bookings: [] });
  const [selectedDetailId, setSelectedDetailId] = useState(null);
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
      setToast({ type: 'success', message: 'Demo booking cancelled.' });
      loadHistory();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to cancel booking.');
    }
  };

  const handleAdvanceStage = async (bookingId) => {
    try {
      const res = await apiClient.post(`/rides/bookings/${bookingId}/stage`, {});
      setToast({
        type: 'success',
        message: res.data.message || 'Demo booking stage advanced.'
      });
      loadHistory();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to advance demo booking stage.');
    }
  };

  const formatIstDate = (iso) => {
    if (!iso) return 'Instant IST';
    try {
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(iso));
    } catch {
      return new Date(iso).toLocaleString();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-900">
          Journey & Demo Booking History
        </span>
        <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900">
          My Journeys & Demonstration Bookings
        </h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Review your past and upcoming planned multimodal journeys and simulated private ride bookings.
        </p>
      </div>

      <ErrorState message={error} onRetry={loadHistory} />

      {loading ? (
        <LoadingState message="Loading your saved journeys & demo bookings..." />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Demo Bookings Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-emerald-900" />
                <h2 className="text-lg font-bold text-slate-900">
                  Demo Ride Bookings ({data.ride_bookings.length})
                </h2>
              </div>
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-900 uppercase">
                SIMULATED ONLY
              </span>
            </div>

            {data.ride_bookings.length === 0 ? (
              <EmptyState
                title="No demo ride bookings yet"
                description="Book a simulated Bike, Auto, Mini, Sedan, or SUV ride to test the 6-stage demo flow."
                actionLabel="Book a Demo Ride"
                onAction={() => navigate('/book-ride')}
              />
            ) : (
              data.ride_bookings.map((b) => {
                const isExpanded = selectedDetailId === b.id;
                const stages = b.booking_stages || BOOKING_STAGES_LIST;
                const activeStage = b.booking_stage || 'Driver assigned';
                const stageIdx = Math.max(0, stages.indexOf(activeStage));

                return (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-emerald-300"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <BookingStatus status={b.booking_status} />
                          <span className="rounded bg-emerald-900 px-2 py-0.5 text-[10px] font-bold text-white uppercase">
                            DEMO BOOKING
                          </span>
                          <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 uppercase">
                            ESTIMATED FARE
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-sm font-extrabold text-slate-900">
                          {b.vehicle_type} — {b.provider_name}
                        </h3>
                        {b.ride_request && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-700">
                            <MapPin className="h-3 w-3 text-emerald-800" />
                            {b.ride_request.pickup_address} → {b.ride_request.destination_address}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-slate-500">
                          Ref: <strong>{b.provider_reference || 'Pending/Cancelled'}</strong> • Est.{' '}
                          {b.estimated_duration_minutes} mins • Stage:{' '}
                          <strong className="text-emerald-900">{activeStage}</strong>
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {formatIstDate(b.created_at)} (IST)
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-lg font-extrabold text-emerald-950">
                          ₹{b.estimated_fare}
                        </p>
                        <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedDetailId(isExpanded ? null : b.id)
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <Eye className="h-3 w-3" />
                            {isExpanded ? 'Hide Details' : 'Details'}
                          </button>

                          {b.booking_status === 'confirmed' && (
                            <button
                              type="button"
                              onClick={() => handleCancelBooking(b.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 border-t border-slate-100 pt-3 text-xs">
                        {b.booking_status === 'confirmed' && stageIdx < stages.length - 1 && (
                          <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-2.5">
                            <span className="font-semibold text-emerald-950">
                              Current Stage: {activeStage}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdvanceStage(b.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-900 px-2.5 py-1 text-[11px] font-bold text-white"
                            >
                              <span>Next: {stages[stageIdx + 1]}</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {b.simulated_driver && (
                          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                                <UserCheck className="h-3.5 w-3.5 text-emerald-800" />
                                {b.simulated_driver.driver_name}
                              </span>
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                                SIMULATED DRIVER
                              </span>
                            </div>
                            <p className="mt-1 text-slate-600">
                              Vehicle: <strong>{b.simulated_driver.vehicle_model}</strong> • Plate:{' '}
                              <strong>{b.simulated_driver.registration_number}</strong>
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 text-slate-500">
                              <Phone className="h-3 w-3" />
                              {b.simulated_driver.demo_contact}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-800">
                              <ShieldAlert className="h-3 w-3" />
                              Fictional demonstration booking — never represented as a real third-party dispatch.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Planned Multimodal Journeys Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-emerald-800" />
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
              data.journeys.map((j) => {
                const isExpanded = selectedDetailId === j.id;
                const rec = j.route_details?.recommended_option;
                return (
                  <div
                    key={j.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-emerald-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900 uppercase">
                          {j.journey_status}
                        </span>
                        <h3 className="mt-1.5 text-sm font-extrabold text-slate-900">
                          {j.pickup_address} → {j.destination_address}
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-600">
                          Modes: <strong>{(j.transport_modes || []).join(' → ')}</strong>
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {formatIstDate(j.created_at)} (IST)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-emerald-900">
                          ₹{j.estimated_fare}
                        </p>
                        <p className="text-xs text-slate-500">
                          {j.estimated_duration_minutes} mins
                        </p>
                        <button
                          type="button"
                          onClick={() => setSelectedDetailId(isExpanded ? null : j.id)}
                          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Eye className="h-3 w-3" />
                          {isExpanded ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs">
                        {rec?.steps?.length > 0 ? (
                          rec.steps.map((s) => (
                            <div
                              key={s.step_number}
                              className="rounded-xl bg-emerald-50/50 p-2.5 text-slate-700"
                            >
                              <strong>
                                Step {s.step_number} ({s.mode}):
                              </strong>{' '}
                              {s.instruction} ({s.duration_minutes} min)
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-600">
                            Source:{' '}
                            {j.route_details?.source ||
                              'RushRoute Multimodal Planner (Schedule-Based IST Estimate)'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
