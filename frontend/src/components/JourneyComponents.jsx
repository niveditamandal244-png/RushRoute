import React from 'react';
import {
  ArrowRight,
  Bus,
  Car,
  CheckCircle2,
  Clock,
  Footprints,
  MapPin,
  Sparkles,
  TrainFront,
  Users,
  Wallet
} from 'lucide-react';
import { KNOWN_HUB_SUGGESTIONS } from '../services/api';

export function LocationInput({
  label,
  value,
  onChange,
  placeholder = 'Enter area, metro station, or landmark',
  id
}) {
  const listId = `${id || label}-hubs-datalist`;
  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
        {label}
      </label>
      <div className="relative mt-1.5">
        <MapPin className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          list={listId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none"
        />
        <datalist id={listId}>
          {KNOWN_HUB_SUGGESTIONS.map((hub) => (
            <option key={hub} value={hub} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

export function TransportModeSelector({ value, onChange }) {
  const modes = [
    { id: 'Any', label: 'All Modes' },
    { id: 'Metro', label: 'Metro' },
    { id: 'Bus', label: 'City Bus' },
    { id: 'Auto', label: 'Auto' },
    { id: 'Walking', label: 'Walk + Transit' }
  ];

  return (
    <div>
      <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
        Preferred Transport Mode
      </label>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
              value === m.id
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function JourneySearchForm({
  values,
  onChange,
  onSubmit,
  loading = false,
  submitLabel = 'Find Best Routes'
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <LocationInput
          id="journey-pickup"
          label="Starting Location"
          value={values.pickup_address}
          onChange={(v) => onChange({ ...values, pickup_address: v })}
          placeholder="e.g., Indiranagar (100 Feet Road / Metro)"
        />
        <LocationInput
          id="journey-destination"
          label="Destination"
          value={values.destination_address}
          onChange={(v) => onChange({ ...values, destination_address: v })}
          placeholder="e.g., Whitefield (Kadugodi / ITPL)"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Maximum Budget (₹ Optional)
          </label>
          <div className="relative mt-1.5">
            <Wallet className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="number"
              min="10"
              max="10000"
              value={values.maximum_budget || ''}
              onChange={(e) =>
                onChange({
                  ...values,
                  maximum_budget: e.target.value ? Number(e.target.value) : ''
                })
              }
              placeholder="e.g., 180"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Preferred Departure
          </label>
          <div className="relative mt-1.5">
            <Clock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="datetime-local"
              value={values.departure_time || ''}
              onChange={(e) => onChange({ ...values, departure_time: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-50"
          >
            <span>{loading ? 'Calculating Routes...' : submitLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <TransportModeSelector
          value={values.preferred_mode || 'Any'}
          onChange={(mode) => onChange({ ...values, preferred_mode: mode })}
        />
      </div>
    </form>
  );
}

export function RouteStepList({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
      <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
        Step-by-Step Journey Directions
      </p>
      <div className="space-y-2">
        {steps.map((s) => (
          <div
            key={s.step_number}
            className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3 text-xs"
          >
            <div className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                {s.step_number}
              </span>
              <div>
                <span className="font-semibold text-slate-900">{s.mode}: </span>
                <span className="text-slate-700">{s.instruction}</span>
                {s.schedule_note && (
                  <p className="mt-0.5 text-[11px] text-slate-500">{s.schedule_note}</p>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right font-medium text-slate-700">
              <div>{s.duration_minutes} min</div>
              <div className="text-[11px] text-slate-500">
                {s.fare > 0 ? `₹${s.fare}` : 'Free'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FareBreakdown({ breakdown }) {
  if (!breakdown) return null;
  const entries = Object.entries(breakdown).filter(([k, v]) => k !== 'total' && Number(v) > 0);

  return (
    <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs">
      <p className="font-semibold text-slate-700">Deterministic Cost Breakdown</p>
      <div className="mt-1.5 flex flex-wrap gap-3">
        {entries.map(([key, val]) => (
          <span key={key} className="rounded-lg bg-white px-2.5 py-1 text-slate-700 shadow-2xs">
            {key.replace(/_/g, ' ')}: <strong>₹{val}</strong>
          </span>
        ))}
        <span className="rounded-lg bg-emerald-100 px-2.5 py-1 font-bold text-emerald-900">
          Total: ₹{breakdown.total}
        </span>
      </div>
    </div>
  );
}

export function JourneyRecommendation({ recommendedOption }) {
  if (!recommendedOption) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
              Top Recommended Journey
            </span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
              Suitability {recommendedOption.suitability_score}/100
            </span>
          </div>
          <h3 className="text-base font-bold">{recommendedOption.title}</h3>
        </div>
      </div>
      <div className="flex items-center gap-5 text-sm">
        <div>
          <span className="text-xs text-slate-400">Est. Cost</span>
          <p className="text-lg font-extrabold text-emerald-400">₹{recommendedOption.estimated_fare}</p>
        </div>
        <div>
          <span className="text-xs text-slate-400">Duration</span>
          <p className="text-lg font-bold">{recommendedOption.estimated_duration_minutes} min</p>
        </div>
        <div>
          <span className="text-xs text-slate-400">Transfers</span>
          <p className="text-lg font-bold">{recommendedOption.transfers_count}</p>
        </div>
      </div>
    </div>
  );
}

export function JourneyResultCard({
  option,
  isRecommended = false,
  isSelected = false,
  onSelect,
  onBookPrivateRide
}) {
  const modeIcons = {
    Bus: Bus,
    Metro: TrainFront,
    Walking: Footprints,
    Carpool: Users,
    Auto: Car,
    Bike: Car,
    Mini: Car,
    Sedan: Car
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition-all ${
        isSelected
          ? 'border-slate-900 bg-white ring-2 ring-slate-900/10'
          : isRecommended
          ? 'border-emerald-500 bg-white shadow-sm'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {isRecommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Best Value Match
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                option.within_budget
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {option.within_budget ? 'Within Budget' : 'Above Budget'}
            </span>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              {option.data_source_label}
            </span>
          </div>

          <h3 className="mt-2 text-base font-bold text-slate-900">{option.title}</h3>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {option.transport_modes?.map((m, idx) => {
              const Icon = modeIcons[m] || Car;
              return (
                <React.Fragment key={`${m}-${idx}`}>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                    <Icon className="h-3.5 w-3.5 text-slate-600" />
                    {m}
                  </span>
                  {idx < option.transport_modes.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-extrabold text-slate-900">₹{option.estimated_fare}</div>
          <div className="text-xs font-semibold text-slate-600">
            {option.estimated_duration_minutes} mins • {option.total_distance_km} km
          </div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {option.transfers_count} transfer(s)
            {option.walking_distance_km > 0 ? ` • ${option.walking_distance_km} km walk` : ''}
          </div>
        </div>
      </div>

      <FareBreakdown breakdown={option.cost_breakdown} />
      <RouteStepList steps={option.steps} />

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(option)}
            className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {isSelected ? 'Viewing on Map' : 'Show Route on Map'}
          </button>
        )}
        {option.category === 'private_ride' && onBookPrivateRide && (
          <button
            type="button"
            onClick={() => onBookPrivateRide(option)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Book Simulated {option.vehicle_type}
          </button>
        )}
      </div>
    </div>
  );
}
