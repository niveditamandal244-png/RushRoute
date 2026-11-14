import React from 'react';
import {
  Bike,
  Car,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sparkles,
  Wallet,
  XCircle
} from 'lucide-react';
import { LocationInput } from './JourneyComponents';

export function VehicleSelector({ value, onChange }) {
  const categories = [
    { id: 'Bike', label: 'Bike', desc: 'Fastest solo commute • 1 seat', icon: Bike },
    { id: 'Auto', label: 'Auto', desc: 'Affordable city three-wheeler • 3 seats', icon: Car },
    { id: 'Mini', label: 'Mini', desc: 'Compact AC hatchback • 4 seats', icon: Car },
    { id: 'Sedan', label: 'Sedan', desc: 'Spacious comfort sedan • 4 seats', icon: Car }
  ];

  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
        Select Vehicle Category
      </label>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const active = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-emerald-400' : 'text-slate-600'}`} />
              <span className="mt-2 text-sm font-bold">{cat.label}</span>
              <span className={`mt-0.5 text-[11px] ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                {cat.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BudgetSelector({ minBudget, maxBudget, onChangeMin, onChangeMax }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
          Minimum Budget (₹ Optional)
        </label>
        <div className="relative mt-1.5">
          <Wallet className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="number"
            min="1"
            max="10000"
            value={minBudget || ''}
            onChange={(e) => onChangeMin(e.target.value ? Number(e.target.value) : '')}
            placeholder="e.g., 40"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
          Maximum Budget (₹ Optional)
        </label>
        <div className="relative mt-1.5">
          <Wallet className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="number"
            min="1"
            max="10000"
            value={maxBudget || ''}
            onChange={(e) => onChangeMax(e.target.value ? Number(e.target.value) : '')}
            placeholder="e.g., 300"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

export function RideBookingForm({
  values,
  onChange,
  onEstimate,
  onBookCheapest,
  loadingEstimate,
  loadingBook
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onEstimate();
      }}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <LocationInput
          id="ride-pickup"
          label="Pickup Location"
          value={values.pickup_address}
          onChange={(v) => onChange({ ...values, pickup_address: v })}
          placeholder="e.g., Indiranagar (100 Feet Road / Metro)"
        />
        <LocationInput
          id="ride-destination"
          label="Destination"
          value={values.destination_address}
          onChange={(v) => onChange({ ...values, destination_address: v })}
          placeholder="e.g., Whitefield (Kadugodi / ITPL)"
        />
      </div>

      <VehicleSelector
        value={values.vehicle_type}
        onChange={(vt) => onChange({ ...values, vehicle_type: vt })}
      />

      <BudgetSelector
        minBudget={values.minimum_budget}
        maxBudget={values.maximum_budget}
        onChangeMin={(min) => onChange({ ...values, minimum_budget: min })}
        onChangeMax={(max) => onChange({ ...values, maximum_budget: max })}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          Quotes & bookings use <strong>DemoRideProvider</strong> (Clearly labelled demonstration adapter).
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="submit"
            disabled={loadingEstimate || loadingBook}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {loadingEstimate ? 'Estimating...' : 'Compare Simulated Fares'}
          </button>
          <button
            type="button"
            disabled={loadingBook || loadingEstimate}
            onClick={onBookCheapest}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-emerald-400" />
            {loadingBook ? 'Booking Cheapest Option...' : 'Auto-Book Cheapest Suitable Ride'}
          </button>
        </div>
      </div>
    </form>
  );
}

export function BookingStatus({ status }) {
  const styles = {
    confirmed: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-slate-100 text-slate-600',
    failed: 'bg-red-100 text-red-700',
    completed: 'bg-blue-100 text-blue-800'
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
        styles[status] || styles.pending
      }`}
    >
      {status}
    </span>
  );
}

export function RideOptionCard({ option, isPrioritized = false, onSelectOption, loading }) {
  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        isPrioritized
          ? 'border-emerald-500 bg-emerald-50/30 shadow-xs'
          : option.within_budget
          ? 'border-slate-200 bg-white'
          : 'border-slate-200 bg-slate-50 opacity-75'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {isPrioritized && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                <Sparkles className="h-3 w-3" />
                Cheapest Suitable Priority
              </span>
            )}
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              {option.data_source_label || 'DEMO DATA'}
            </span>
          </div>
          <h4 className="mt-1.5 text-base font-bold text-slate-900">
            {option.vehicle_type} — {option.provider_name}
          </h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Distance: {option.distance_km} km • Est. Travel: {option.estimated_duration_minutes} min • Pickup ETA: {option.pickup_eta_minutes} min
          </p>
          <p
            className={`mt-1 text-xs font-medium ${
              option.within_budget ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {option.budget_note}
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-extrabold text-slate-900">₹{option.estimated_fare}</div>
          {option.within_budget && onSelectOption && (
            <button
              type="button"
              disabled={loading}
              onClick={() => onSelectOption(option)}
              className="mt-2 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Book This Option
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function BookingConfirmation({
  confirmedBooking,
  candidateBookings = [],
  workflowLog = [],
  onCancelBooking
}) {
  if (!confirmedBooking) return null;

  return (
    <div className="rounded-2xl border-2 border-emerald-500 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <BookingStatus status={confirmedBooking.booking_status} />
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                SIMULATED DEMONSTRATION BOOKING
              </span>
            </div>
            <h3 className="mt-1 text-lg font-bold text-slate-900">
              {confirmedBooking.vehicle_type} Confirmed via {confirmedBooking.provider_name}
            </h3>
            <p className="text-xs text-slate-600">
              Reference ID: <strong>{confirmedBooking.provider_reference}</strong> • Estimated Duration:{' '}
              <strong>{confirmedBooking.estimated_duration_minutes} mins</strong>
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-extrabold text-emerald-700">
            ₹{confirmedBooking.estimated_fare}
          </div>
          {confirmedBooking.booking_status === 'confirmed' && onCancelBooking && (
            <button
              type="button"
              onClick={() => onCancelBooking(confirmedBooking.id)}
              className="mt-2 inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel Simulated Ride
            </button>
          )}
        </div>
      </div>

      {workflowLog.length > 0 && (
        <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-700">
          <p className="font-bold text-slate-900">
            Concurrency-Safe Smart Booking Execution Log:
          </p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-4">
            {workflowLog.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {candidateBookings.length > 1 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-semibold text-slate-500 uppercase">
            All Candidate Requests for This Journey (Single-Confirmation Enforced)
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {candidateBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-800">{b.provider_name}</p>
                  <p className="text-slate-500">₹{b.estimated_fare}</p>
                </div>
                <BookingStatus status={b.booking_status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
