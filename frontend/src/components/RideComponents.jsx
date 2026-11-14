import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ProviderLogo } from './ProviderLogo';
import {
  ArrowRight,
  Bike,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  Home,
  History,
  MapPin,
  Phone,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
  XCircle
} from 'lucide-react';
import {
  getCurrentIstTimeString,
  getTodayIstDateString,
  LocationInput
} from './JourneyComponents';

export const BOOKING_STAGES_LIST = [
  'Request created',
  'Driver assigned',
  'Driver heading to pickup',
  'Driver arrived',
  'Journey started',
  'Journey completed'
];

export function VehicleSelector({ value, onChange }) {
  const categories = [
    { id: 'Bike', label: 'Bike', capacity: '1 seat', desc: '₹25 base + ₹8.5/km', icon: Bike },
    { id: 'Auto', label: 'Auto', capacity: '3 seats', desc: '₹35 base + ₹15/km', icon: Car },
    { id: 'Mini', label: 'Mini Cab', capacity: '4 seats', desc: '₹55 base + ₹17/km', icon: Car },
    { id: 'Sedan', label: 'Sedan', capacity: '4 seats', desc: '₹75 base + ₹21/km', icon: Car },
    { id: 'SUV', label: 'SUV', capacity: '6 seats', desc: '₹115 base + ₹30/km', icon: Car }
  ];

  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
        Select Vehicle Category
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const active = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                active
                  ? 'border-emerald-900 bg-emerald-900 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/30'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <Icon className={`h-5 w-5 ${active ? 'text-emerald-300' : 'text-emerald-800'}`} />
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    active ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cat.capacity}
                </span>
              </div>
              <span className="mt-2 text-sm font-bold">{cat.label}</span>
              <span className={`mt-0.5 text-[11px] ${active ? 'text-emerald-100/90' : 'text-slate-500'}`}>
                {cat.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BudgetSelector({
  budgetMode = 'Balanced',
  minBudget,
  maxBudget,
  passengerCount = 1,
  priceConvenienceBalance = 'balanced',
  raceScenario = 'auto',
  onChangeBudgetMode,
  onChangeMin,
  onChangeMax,
  onChangePassengers,
  onChangeBalance,
  onChangeScenario
}) {
  const budgetModes = [
    { id: 'Cheapest', label: 'Cheapest', desc: 'Strict lowest-fare cap' },
    { id: 'Balanced', label: 'Balanced', desc: 'Best price & ETA mix' },
    { id: 'Premium', label: 'Premium', desc: 'Fastest acceptance priority' },
    { id: 'Custom Budget', label: 'Custom Budget', desc: 'Set min & max ₹ range' }
  ];

  const scenarioOptions = [
    { id: 'auto', label: 'Auto-Rotate Winner (Uber / Ola / Rapido take turns)' },
    { id: 'uber_wins', label: 'Demo Scenario: Uber Accepts First (1.6s)' },
    { id: 'ola_wins', label: 'Demo Scenario: Ola Accepts First (1.6s)' },
    { id: 'rapido_wins', label: 'Demo Scenario: Rapido Accepts First (1.5s)' },
    { id: 'simultaneous_tie', label: 'Demo Scenario: Simultaneous Tie-Break (Uber & Ola at 1.8s)' },
    { id: 'late_acceptance', label: 'Demo Scenario: Late Acceptance Rejected After Winner Lock' },
    { id: 'provider_rejects', label: 'Demo Scenario: 1 Provider Rejects, Next Eligible Wins' },
    { id: 'all_reject', label: 'Demo Scenario: All 3 Providers Reject (Failure & Retry)' },
    { id: 'all_timeout', label: 'Demo Scenario: All 3 Providers Time Out (Failure & Retry)' }
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
          Select Budget Preference
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {budgetModes.map((bm) => {
            const active = budgetMode === bm.id;
            return (
              <button
                key={bm.id}
                type="button"
                onClick={() => onChangeBudgetMode && onChangeBudgetMode(bm.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  active
                    ? 'border-emerald-900 bg-emerald-900 text-white shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40'
                }`}
              >
                <div className="text-xs font-extrabold">{bm.label}</div>
                <div
                  className={`mt-0.5 text-[11px] ${
                    active ? 'text-emerald-100/90' : 'text-slate-500'
                  }`}
                >
                  {bm.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Passengers
          </label>
          <div className="relative mt-1.5">
            <Users className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-emerald-800" />
            <select
              value={passengerCount || 1}
              onChange={(e) => onChangePassengers && onChangePassengers(Number(e.target.value) || 1)}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Passenger' : 'Passengers'}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Price vs Convenience
          </label>
          <select
            value={priceConvenienceBalance}
            onChange={(e) => onChangeBalance && onChangeBalance(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
          >
            <option value="price_first">Prioritize Lowest Price</option>
            <option value="balanced">Balanced (Price + Fast Arrival)</option>
            <option value="convenience_first">Prioritize Fastest Pickup</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Simulation Race Mode (Judge Control)
          </label>
          <select
            value={raceScenario}
            onChange={(e) => onChangeScenario && onChangeScenario(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-emerald-800/30 bg-emerald-50/50 px-3.5 py-2.5 text-xs font-bold text-emerald-950 focus:border-emerald-800 focus:outline-none"
          >
            {scenarioOptions.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {budgetMode === 'Custom Budget' && (
        <div className="grid gap-4 rounded-xl border border-emerald-900/15 bg-emerald-50/40 p-3.5 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
              Min Acceptable Fare (₹)
            </label>
            <div className="relative mt-1.5">
              <Wallet className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-emerald-800" />
              <input
                type="number"
                min="1"
                max="10000"
                value={minBudget || ''}
                onChange={(e) => onChangeMin(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g., 40"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
              Max Acceptable Fare (₹)
            </label>
            <div className="relative mt-1.5">
              <Wallet className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-emerald-800" />
              <input
                type="number"
                min="1"
                max="10000"
                value={maxBudget || ''}
                onChange={(e) => onChangeMax(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g., 450"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function RideBookingForm({
  values,
  onChange,
  onEstimate,
  onStartSmartRace,
  loadingEstimate,
  loadingBook
}) {
  const todayIst = getTodayIstDateString();
  const [scheduleForLater, setScheduleForLater] = useState(Boolean(values.is_scheduled));

  const handleToggleSchedule = (later) => {
    setScheduleForLater(later);
    if (!later) {
      onChange({
        ...values,
        is_scheduled: false,
        travel_date: todayIst,
        departure_time: getCurrentIstTimeString()
      });
    } else {
      onChange({
        ...values,
        is_scheduled: true,
        travel_date: values.travel_date || todayIst,
        departure_time: values.departure_time || getCurrentIstTimeString()
      });
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (onStartSmartRace) {
          onStartSmartRace();
        } else {
          onEstimate();
        }
      }}
      className="space-y-5 rounded-2xl border border-emerald-900/15 bg-white p-5 shadow-xs sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 px-3 py-1 text-[11px] font-extrabold text-emerald-300 uppercase">
            <Sparkles className="h-3.5 w-3.5" />
            RushRoute AI Smart Booking — First Acceptance Wins
          </span>
          <p className="mt-1 text-xs font-medium text-slate-600">
            One Request • Three Providers (Uber, Ola, Rapido) • First Eligible Acceptance Wins • AI Cancels the Rest Automatically
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LocationInput
          id="ride-pickup"
          label="Pickup Location (Auto-Detected or Select)"
          enableGpsButton={true}
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
        budgetMode={values.budget_mode || 'Balanced'}
        minBudget={values.minimum_budget}
        maxBudget={values.maximum_budget}
        passengerCount={values.passenger_count || 1}
        priceConvenienceBalance={values.price_convenience_balance || 'balanced'}
        raceScenario={values.race_scenario || 'auto'}
        onChangeBudgetMode={(bm) =>
          onChange({
            ...values,
            budget_mode: bm,
            ...(bm !== 'Custom Budget' ? { minimum_budget: '', maximum_budget: '' } : {})
          })
        }
        onChangeMin={(min) => onChange({ ...values, minimum_budget: min })}
        onChangeMax={(max) => onChange({ ...values, maximum_budget: max })}
        onChangePassengers={(cnt) => onChange({ ...values, passenger_count: cnt })}
        onChangeBalance={(bal) => onChange({ ...values, price_convenience_balance: bal })}
        onChangeScenario={(sc) => onChange({ ...values, race_scenario: sc })}
      />

      {/* Section 10: Book Now (Default) vs Optional Schedule for Later */}
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-900">Booking Time Preference (IST)</span>
            <p className="text-[11px] text-slate-500">
              Default is instant Depart Now. Choose Schedule for Later only if planning ahead.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleToggleSchedule(false)}
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                !scheduleForLater
                  ? 'border-emerald-900 bg-emerald-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-emerald-50'
              }`}
            >
              Depart Now (Default)
            </button>
            <button
              type="button"
              onClick={() => handleToggleSchedule(true)}
              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                scheduleForLater
                  ? 'border-emerald-900 bg-emerald-900 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-emerald-50'
              }`}
            >
              Schedule for Later
            </button>
          </div>
        </div>

        {scheduleForLater && (
          <div className="mt-3.5 grid gap-3 border-t border-slate-200/80 pt-3.5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Travel Date (Asia/Kolkata IST)
              </label>
              <div className="relative mt-1">
                <Calendar className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-emerald-800" />
                <input
                  type="date"
                  min={todayIst}
                  value={values.travel_date || todayIst}
                  onChange={(e) => onChange({ ...values, travel_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Pickup Time (IST)
              </label>
              <div className="relative mt-1">
                <Clock className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-emerald-800" />
                <input
                  type="time"
                  value={values.departure_time || getCurrentIstTimeString()}
                  onChange={(e) => onChange({ ...values, departure_time: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 pr-3 pl-9 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-600">
          Press <strong>Find My Ride</strong> to dispatch 3 simultaneous requests to Uber, Ola & Rapido. First valid acceptance wins!
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onEstimate}
            disabled={loadingEstimate || loadingBook}
            className="rounded-xl border border-emerald-800/30 bg-emerald-50/60 px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-100/70 disabled:opacity-50"
          >
            {loadingEstimate ? 'Calculating...' : 'Refresh Quotes'}
          </button>
          <button
            type="submit"
            disabled={loadingBook || loadingEstimate}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-900 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-emerald-300" />
            {loadingBook ? 'Coordinating 3-Provider Race...' : 'Find My Ride'}
          </button>
        </div>
      </div>
    </form>
  );
}

export function BookingStatus({ status }) {
  const styles = {
    confirmed: 'bg-emerald-100 text-emerald-900',
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
  const fareDisplay =
    option.estimated_fare_min &&
    option.estimated_fare_max &&
    option.estimated_fare_min !== option.estimated_fare_max
      ? `₹${option.estimated_fare_min}–₹${option.estimated_fare_max}`
      : `₹${option.estimated_fare}`;

  const brandName = option.brand || 'RushRoute';
  const brandBadgeStyle =
    brandName === 'Uber'
      ? 'bg-black text-white'
      : brandName === 'Ola'
      ? 'bg-emerald-900 text-emerald-300'
      : brandName === 'Rapido'
      ? 'bg-amber-400 text-slate-950'
      : 'bg-[#022C22] text-[#10B981]';

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        isPrioritized
          ? 'border-emerald-700 bg-emerald-50/40 shadow-2xs'
          : option.within_budget
          ? 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs'
          : 'border-slate-200 bg-slate-50/70 opacity-75'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <ProviderLogo provider={brandName} size="sm" />
            <span className="text-base font-extrabold text-slate-900">
              {brandName} {option.vehicle_type}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              {option.capacity || 4} seats
            </span>
            {isPrioritized && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-900 px-2.5 py-0.5 text-[11px] font-bold text-white">
                <Sparkles className="h-3 w-3 text-emerald-300" />
                Best Match
              </span>
            )}
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-900 ring-1 ring-emerald-900/15">
              1.0x Standard Rate
            </span>
            {!option.within_budget && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                Above Budget
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800">
              <Clock className="h-3.5 w-3.5" />
              Pickup in {option.pickup_eta_minutes} mins
            </span>
            <span>• Trip: {option.estimated_duration_minutes} mins ({option.distance_km} km)</span>
            {(option.vehicles_required > 1 || option.vehicles_needed > 1) && (
              <span className="font-semibold text-emerald-900">
                • {option.vehicles_required || option.vehicles_needed} vehicles ({option.passenger_count} passengers)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xl font-extrabold text-slate-950">₹{option.estimated_fare}</div>
            <div className="text-[11px] text-slate-500">Range {fareDisplay}</div>
          </div>

          {option.within_budget && onSelectOption && (
            <button
              type="button"
              disabled={loading}
              onClick={() => onSelectOption(option)}
              className="rounded-xl bg-[#022C22] px-4 py-2.5 text-xs font-extrabold text-white shadow-2xs hover:bg-[#064E3B] disabled:opacity-50"
            >
              Select {brandName}
            </button>
          )}
        </div>
      </div>

      {option.external_deeplinks?.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px]">
          <span className="text-slate-400">
            Connected Partner Deep Links:
          </span>
          <div className="flex flex-wrap gap-2">
            {option.external_deeplinks.map((dl) => (
              <a
                key={dl.provider}
                href={dl.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-900"
              >
                <span>Launch {dl.provider} App</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function BookingConfirmation({
  confirmedBooking,
  rideRequest,
  onCancelBooking,
  onAdvanceStage
}) {
  const [showFullDetails, setShowFullDetails] = useState(true);
  if (!confirmedBooking) return null;

  const stages = confirmedBooking.booking_stages || BOOKING_STAGES_LIST;
  const activeStage =
    confirmedBooking.booking_status === 'cancelled'
      ? 'Cancelled'
      : confirmedBooking.booking_stage || 'Driver assigned';
  const activeStageIdx = Math.max(0, stages.indexOf(activeStage));
  const rawDriver = confirmedBooking.simulated_driver || {
    driver_name: 'Nagaraj R.',
    driver_rating: '4.9 ★ (1,840 trips)',
    vehicle_model: `${confirmedBooking.vehicle_type} AC Comfort`,
    registration_number: 'KA 01 AG 4821',
    demo_contact: '+91 80 4092 8810'
  };

  const cleanDriverName = String(rawDriver.driver_name || 'Nagaraj R.').replace(
    /\s*\(SIMULATED DRIVER\)/i,
    ''
  );
  const cleanVehicleModel = String(rawDriver.vehicle_model || 'AC Comfort').replace(
    /\s*\(Fictional Demo[^)]*\)/i,
    ''
  );
  const cleanPlate = String(rawDriver.registration_number || 'KA 01 AG 4821').replace(
    /\s*\(Fictional Demo[^)]*\)/i,
    ''
  );
  const cleanRating = String(rawDriver.driver_rating || '4.9 ★').replace(
    /\s*\(Demo Rating\)/i,
    ' • 1,420 Rides'
  );
  const ridePin = String(confirmedBooking.provider_reference || '4829')
    .replace(/\D/g, '')
    .padEnd(4, '8')
    .slice(0, 4);

  return (
    <div className="space-y-4 rounded-3xl border-2 border-emerald-800 bg-white p-5 shadow-md sm:p-6">
      {/* Live Dispatch Status Header + 4-Digit Ride Start PIN */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#022C22] px-3 py-1 text-[11px] font-extrabold tracking-wide text-[#10B981] uppercase">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" />
            LIVE DISPATCH • {confirmedBooking.provider_brand || 'PARTNER'} API
          </span>
          <BookingStatus status={confirmedBooking.booking_status} />
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
            Booking ID: {confirmedBooking.provider_reference}
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-amber-400/20 px-3.5 py-1.5 ring-1 ring-amber-400">
          <span className="text-[11px] font-bold text-amber-950 uppercase">Start Ride PIN:</span>
          <span className="font-mono text-base font-extrabold tracking-widest text-slate-950">
            {ridePin}
          </span>
        </div>
      </div>

      {/* Main Booking Summary */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <ProviderLogo provider={confirmedBooking.provider_name} size="lg" />
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">
              {confirmedBooking.service_name ||
                `${confirmedBooking.vehicle_type} • ${confirmedBooking.provider_name}`}
            </h3>
            {rideRequest && (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-700">
                <MapPin className="h-3.5 w-3.5 text-emerald-800" />
                <span>{rideRequest.pickup_address}</span>
                <ArrowRight className="h-3 w-3 text-slate-400" />
                <span>{rideRequest.destination_address}</span>
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Est. Trip Time: <strong>{confirmedBooking.estimated_duration_minutes} mins</strong> • Live Status:{' '}
              <strong className="text-emerald-900">{activeStage}</strong>
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Fare</span>
          <div className="text-3xl font-extrabold text-slate-950">
            ₹{confirmedBooking.estimated_fare}
          </div>
          <span className="text-[10px] font-semibold text-emerald-800">UPI / Cash / Wallet</span>
        </div>
      </div>

      {/* 6 Booking Progress Stages */}
      {confirmedBooking.booking_status !== 'cancelled' && (
        <div className="rounded-2xl border border-emerald-900/15 bg-emerald-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-emerald-950 uppercase">
              Live Ride Tracking ({activeStageIdx + 1} of {stages.length})
            </span>
            {onAdvanceStage && activeStageIdx < stages.length - 1 && (
              <button
                type="button"
                onClick={() => onAdvanceStage(confirmedBooking.id)}
                className="inline-flex items-center gap-1 rounded-xl bg-[#022C22] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#064E3B]"
              >
                <span>Advance Trip: {stages[activeStageIdx + 1]}</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#10B981]" />
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
            {stages.map((st, idx) => {
              const completed = idx <= activeStageIdx;
              const isCurrent = idx === activeStageIdx;
              return (
                <div
                  key={st}
                  className={`rounded-xl border p-2.5 text-xs transition ${
                    isCurrent
                      ? 'border-[#022C22] bg-[#022C22] font-bold text-white shadow-2xs'
                      : completed
                      ? 'border-emerald-300 bg-emerald-100/80 font-semibold text-emerald-950'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <div className="text-[10px] opacity-80">Step {idx + 1}</div>
                  <div className="mt-0.5 leading-snug">{st}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assigned Captain / Driver Card */}
      {showFullDetails && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-extrabold text-slate-900">
              <UserCheck className="h-4 w-4 text-emerald-800" />
              <span>Assigned Partner Captain & Vehicle</span>
            </div>
            <span className="rounded-md bg-amber-300 px-2.5 py-0.5 font-mono text-xs font-extrabold tracking-wider text-slate-950 ring-1 ring-slate-900/20">
              {cleanPlate}
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Captain</span>
              <p className="mt-0.5 text-sm font-extrabold text-slate-900">{cleanDriverName}</p>
              <p className="text-[11px] font-semibold text-emerald-800">{cleanRating}</p>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Vehicle</span>
              <p className="mt-0.5 text-sm font-extrabold text-slate-900">{cleanVehicleModel}</p>
              <p className="text-[11px] text-slate-500">GPS Telemetry Verified</p>
            </div>
            <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Masked Contact</span>
              <p className="mt-0.5 flex items-center gap-1 text-sm font-bold text-slate-800">
                <Phone className="h-3.5 w-3.5 text-emerald-700" />
                +91 80 4092 8810
              </p>
              <p className="text-[11px] text-slate-400">Privacy Bridge Active (Prototype)</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFullDetails((v) => !v)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {showFullDetails ? 'Hide Captain Card' : 'Show Captain Card'}
          </button>

          {confirmedBooking.booking_status === 'confirmed' && onCancelBooking && (
            <button
              type="button"
              onClick={() => onCancelBooking(confirmedBooking.id)}
              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel Ride
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/my-journeys"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-900/20 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-100"
          >
            <History className="h-3.5 w-3.5" />
            My Trips
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#022C22] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#064E3B]"
          >
            <Home className="h-3.5 w-3.5" />
            Super-App Home
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Section 16: RushRoute AI Smart Booking — First Acceptance Wins
 * Displays the 3 parallel provider requests (Uber, Ola, Rapido), live race status,
 * winner banner, automatic cancellation of the other 2 providers, and race timeline.
 */
export function SmartBookingRaceBoard({
  session,
  isRacing = false,
  onRetryRace,
  onSimulateLateAcceptance,
  onForceProviderAccept,
  onInstantFinalize
}) {
  if (!session) return null;

  const isFinalized = session.session_state === 'finalized' && session.winner_provider;
  const isFailed = ['failed', 'expired'].includes(session.session_state);

  const brandStyles = {
    Uber: {
      badgeBg: 'bg-black text-white',
      endpoint: 'api.uber.com/v1.2/requests',
      borderWinner: 'border-2 border-emerald-600 bg-emerald-50/90 ring-4 ring-emerald-500/20 shadow-md'
    },
    Ola: {
      badgeBg: 'bg-emerald-900 text-emerald-300',
      endpoint: 'devapi.olacabs.com/v1/bookings',
      borderWinner: 'border-2 border-emerald-600 bg-emerald-50/90 ring-4 ring-emerald-500/20 shadow-md'
    },
    Rapido: {
      badgeBg: 'bg-amber-400 text-slate-950',
      endpoint: 'partner.rapido.bike/v2/dispatch',
      borderWinner: 'border-2 border-emerald-600 bg-emerald-50/90 ring-4 ring-emerald-500/20 shadow-md'
    }
  };

  const winnerDriver = session.winner_booking?.simulated_driver;
  const cleanWinnerDriverName = String(winnerDriver?.driver_name || 'Nagaraj R.').replace(
    /\s*\(SIMULATED DRIVER\)/i,
    ''
  );
  const cleanWinnerPlate = String(winnerDriver?.registration_number || 'KA 01 AG 4821').replace(
    /\s*\(Fictional Demo[^)]*\)/i,
    ''
  );
  const winnerPin = String(session.winner_booking?.provider_reference || '4829')
    .replace(/\D/g, '')
    .padEnd(4, '8')
    .slice(0, 4);

  const getStatusBadge = (pr) => {
    if (pr.is_winner || pr.status === 'Accepted') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#022C22] px-3 py-1 text-xs font-extrabold text-[#10B981] shadow-xs">
          <CheckCircle2 className="h-4 w-4" />
          SUSTAINED RIDE • ACCEPTED FIRST ({pr.acceptance_time_seconds ?? '1.6'}s)
        </span>
      );
    }
    if (pr.status === 'Cancelled by RushRoute AI') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-extrabold text-red-800 ring-1 ring-red-300">
          <XCircle className="h-4 w-4 text-red-600" />
          CANCELED ON ITS OWN (₹0 FEE)
        </span>
      );
    }
    if (pr.status === 'Rejected') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800">
          <XCircle className="h-3.5 w-3.5" />
          NO RIDER NEARBY
        </span>
      );
    }
    if (pr.status === 'Timed Out') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
          <Clock className="h-3.5 w-3.5" />
          TIMED OUT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-950">
        <span className="h-2.5 w-2.5 animate-ping rounded-full bg-emerald-600" />
        BOOKED • WAITING FOR FASTEST RIDER...
      </span>
    );
  };

  return (
    <div className="space-y-5 rounded-3xl border-2 border-emerald-900/25 bg-white p-5 shadow-md sm:p-6">
      {/* Header & Coordinator Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#022C22] px-3 py-1 text-[11px] font-extrabold text-[#10B981] uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              3-Platform Parallel Booking • Fastest Rider Sustains
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
              Status: {isFinalized ? '1 SUSTAINED • 2 AUTO-CANCELED' : String(session.session_state).toUpperCase()}
            </span>
          </div>
          <h2 className="mt-1.5 text-xl font-extrabold text-slate-900">
            {isFinalized
              ? `${session.winner_provider} Rider Accepted First & Sustained — Other 2 Rides Auto-Canceled!`
              : isFailed
              ? 'No Eligible Rider Accepted — Ready to Retry'
              : 'Rides Booked on Uber, Ola & Rapido — Waiting for Fastest Rider to Accept...'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {session.pickup_address} → {session.destination_address} •{' '}
            <strong>{session.vehicle_type}</strong> • Whichever rider accepts first sustains; the other 2 platforms cancel automatically on their own.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isRacing && onInstantFinalize && (
            <button
              type="button"
              onClick={onInstantFinalize}
              className="rounded-xl border border-emerald-800 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-100"
            >
              Fast-Forward Fastest Rider
            </button>
          )}
          {isFinalized && onSimulateLateAcceptance && (
            <button
              type="button"
              onClick={() => {
                const loser = session.provider_requests.find((p) => !p.is_winner);
                if (loser) onSimulateLateAcceptance(loser.provider_name);
              }}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
            >
              Test Late Rider Acceptance (Auto-Blocked)
            </button>
          )}
          {onRetryRace && (
            <button
              type="button"
              onClick={onRetryRace}
              className="rounded-xl bg-[#022C22] px-4 py-2 text-xs font-bold text-white hover:bg-[#064E3B]"
            >
              Book Across All 3 Again
            </button>
          )}
        </div>
      </div>

      {/* Three Simultaneous Provider Cards: Uber, Ola, Rapido */}
      <div className="grid gap-4 md:grid-cols-3">
        {session.provider_requests?.map((pr) => {
          const style = brandStyles[pr.provider_id] || brandStyles.Ola;
          const isWinner = pr.is_winner;
          const isCancelled = pr.status === 'Cancelled by RushRoute AI';

          return (
            <div
              key={pr.provider_request_id}
              className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                isWinner
                  ? style.borderWinner
                  : isCancelled
                  ? 'border-red-200/80 bg-slate-50/90 opacity-85'
                  : 'border-emerald-500/40 bg-white shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <ProviderLogo provider={pr.provider_name} size="md" />
                  <span className="font-mono text-[10px] font-semibold text-slate-400">
                    {isCancelled ? 'CANCELED AUTOMATICALLY' : isWinner ? 'ACTIVE SUSTAINED RIDE' : 'REQUEST LIVE'}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <h3
                      className={`text-base font-extrabold ${
                        isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {pr.service_name}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {pr.passenger_capacity} seats • ~{pr.pickup_eta_minutes} min away
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-2xl font-extrabold ${
                        isCancelled ? 'text-slate-400 line-through' : 'text-slate-950'
                      }`}
                    >
                      ₹{pr.estimated_fare}
                    </span>
                    <span className="block text-[10px] font-semibold text-emerald-800">
                      {isCancelled ? '₹0 Cancel Charge' : '1.0x No Surge'}
                    </span>
                  </div>
                </div>

                {/* Winner Captain & PIN Mini-Card right inside the winning platform */}
                {isWinner && (
                  <div className="mt-3 rounded-xl border border-emerald-600/30 bg-white p-3 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-slate-900">
                        Captain: {cleanWinnerDriverName}
                      </span>
                      <span className="rounded-md bg-amber-300 px-2 py-0.5 font-mono text-[11px] font-extrabold text-slate-950">
                        {cleanWinnerPlate}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600">
                      <span>Arriving in ~{pr.pickup_eta_minutes} mins</span>
                      <span className="font-extrabold text-emerald-900">
                        Start PIN: {winnerPin}
                      </span>
                    </div>
                  </div>
                )}

                {/* Cancelled Confirmation Box on the other 2 platforms */}
                {isCancelled && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50/70 p-2.5 text-[11px] font-semibold text-red-900">
                    ✕ Ride request on <strong>{pr.provider_name}</strong> was automatically canceled on its own the instant <strong>{session.winner_provider}</strong> accepted first.
                  </div>
                )}

                {!isWinner && !isCancelled && (
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                    <span
                      className={`rounded-md px-2 py-0.5 font-bold ${
                        pr.budget_eligible
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {pr.budget_eligible ? '✓ Within Budget' : '✕ Above Budget'}
                    </span>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                      Request Sent to {pr.provider_name} Riders
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-slate-200/80 pt-3">
                <div className="flex items-center justify-between gap-2">{getStatusBadge(pr)}</div>
                <p className="mt-2 text-[11px] leading-snug text-slate-600">
                  {pr.coordinator_note}
                </p>

                {/* Interactive button while racing to let user make ANY platform's rider accept first */}
                {isRacing && !isFinalized && pr.eligible_to_win && onForceProviderAccept && (
                  <button
                    type="button"
                    onClick={() => onForceProviderAccept(pr.provider_name)}
                    className="mt-2.5 w-full rounded-xl bg-[#022C22] px-3 py-2 text-[11px] font-extrabold text-white shadow-2xs transition hover:bg-[#064E3B]"
                  >
                    ⚡ Make {pr.provider_name} Rider Accept First!
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Winner Summary Banner */}
      {isFinalized && session.winner_booking && (
        <div className="rounded-2xl bg-[#022C22] p-5 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <ProviderLogo provider={session.winner_provider} size="lg" />
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-0.5 text-xs font-extrabold text-[#10B981]">
                  <CheckCircle2 className="h-4 w-4" />
                  FASTEST RIDER SUSTAINED • OTHER 2 PLATFORMS AUTO-CANCELED
                </div>
                <h3 className="text-xl font-extrabold">
                  {session.winner_provider} Rider Sustained ({session.winner_booking.service_name})
                </h3>
                <p className="text-xs text-emerald-100/90">
                  Accepted fastest in <strong>{session.winner_booking.acceptance_time_seconds}s</strong> • Captain:{' '}
                  <strong>{cleanWinnerDriverName}</strong> ({cleanWinnerPlate}) • Start PIN:{' '}
                  <strong>{winnerPin}</strong> • ETA:{' '}
                  <strong>~{session.winner_booking.pickup_eta_minutes} mins</strong>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-emerald-200 uppercase">Sustained Ride Fare</span>
              <div className="text-3xl font-extrabold text-[#10B981]">
                ₹{session.winner_booking.estimated_fare}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 border-t border-emerald-800/80 pt-3.5 sm:grid-cols-3">
            {session.provider_requests?.map((pr) => (
              <div
                key={pr.provider_id}
                className={`rounded-xl px-3 py-2 text-xs font-bold ${
                  pr.is_winner
                    ? 'bg-[#10B981] text-[#022C22]'
                    : 'bg-red-950/70 text-red-200 line-through'
                }`}
              >
                {pr.provider_name} —{' '}
                {pr.is_winner
                  ? `✓ SUSTAINED (Accepted in ${pr.acceptance_time_seconds ?? '1.6'}s)`
                  : '✕ CANCELED ON ITS OWN'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failure State & Retry Banner */}
      {isFailed && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-red-950">
                Booking Session Ended Without a Winner ({session.session_state.toUpperCase()})
              </h3>
              <p className="mt-1 text-red-800">{session.ai_coordinator_explanation}</p>
            </div>
            {onRetryRace && (
              <button
                type="button"
                onClick={onRetryRace}
                className="rounded-xl bg-red-800 px-4 py-2 text-xs font-extrabold text-white hover:bg-red-700"
              >
                Retry AI Smart Booking
              </button>
            )}
          </div>
        </div>
      )}

      {/* AI Coordinator Decision Explanation & Chronological Race Timeline */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-emerald-900/15 bg-emerald-50/50 p-4 text-xs lg:col-span-5">
          <span className="text-[11px] font-extrabold tracking-wider text-emerald-900 uppercase">
            RushRoute AI Coordinator Decision
          </span>
          <p className="mt-1.5 leading-relaxed font-medium text-slate-800">
            {session.ai_coordinator_explanation}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs lg:col-span-7">
          <span className="text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
            Live Server-Timestamped Race Log
          </span>
          <div className="mt-2 space-y-1.5">
            {session.race_timeline?.map((ev, idx) => (
              <div
                key={`${ev.event_type}-${idx}`}
                className="flex items-start gap-2.5 rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-200/80"
              >
                <span className="shrink-0 rounded-md bg-emerald-950 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                  +{ev.elapsed_seconds}s
                </span>
                <span className="text-slate-700">{ev.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
