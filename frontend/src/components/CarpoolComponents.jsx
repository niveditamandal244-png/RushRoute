import React from 'react';
import {
  CheckCircle2,
  Clock,
  Lock,
  ShieldAlert,
  Sparkles,
  Unlock,
  Users,
  Wallet,
  XCircle
} from 'lucide-react';
import { LocationInput } from './JourneyComponents';

export function CompatibilityIndicator({ score }) {
  const num = Number(score || 0);
  const color =
    num >= 75
      ? 'bg-emerald-600 text-white'
      : num >= 50
      ? 'bg-amber-500 text-white'
      : 'bg-slate-600 text-white';

  return (
    <div className="flex items-center gap-2">
      <span className={`rounded-xl px-3 py-1 text-xs font-extrabold ${color}`}>
        {num}% Match
      </span>
    </div>
  );
}

export function MatchStatus({ status }) {
  const map = {
    pending: { label: 'Awaiting Consent', cls: 'bg-amber-100 text-amber-800' },
    requester_accepted: { label: 'You Accepted • Waiting Partner', cls: 'bg-blue-100 text-blue-800' },
    partner_accepted: { label: 'Partner Accepted • Confirm Now', cls: 'bg-blue-100 text-blue-800' },
    accepted: { label: 'Mutual Consent Confirmed', cls: 'bg-emerald-100 text-emerald-800' },
    declined: { label: 'Declined', cls: 'bg-slate-100 text-slate-600' },
    cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600' },
    reported: { label: 'Reported & Blocked', cls: 'bg-red-100 text-red-800' }
  };
  const current = map[status] || map.pending;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${current.cls}`}>
      {current.label}
    </span>
  );
}

export function CarpoolRequestForm({ values, onChange, onSubmit, loading }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <LocationInput
          id="carpool-pickup"
          label="Pickup Area"
          value={values.pickup_address}
          onChange={(v) => onChange({ ...values, pickup_address: v })}
          placeholder="e.g., Indiranagar (100 Feet Road / Metro)"
        />
        <LocationInput
          id="carpool-destination"
          label="Destination Area"
          value={values.destination_address}
          onChange={(v) => onChange({ ...values, destination_address: v })}
          placeholder="e.g., Whitefield (Kadugodi / ITPL)"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Departure Time
          </label>
          <div className="relative mt-1.5">
            <Clock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="datetime-local"
              required
              value={values.departure_time}
              onChange={(e) => onChange({ ...values, departure_time: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Available Seats (1–6)
          </label>
          <div className="relative mt-1.5">
            <Users className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="number"
              min="1"
              max="6"
              required
              value={values.available_seats}
              onChange={(e) => onChange({ ...values, available_seats: Number(e.target.value) })}
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Target Shared Budget (₹ Optional)
          </label>
          <div className="relative mt-1.5">
            <Wallet className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="number"
              min="20"
              max="5000"
              value={values.estimated_budget || ''}
              onChange={(e) =>
                onChange({
                  ...values,
                  estimated_budget: e.target.value ? Number(e.target.value) : ''
                })
              }
              placeholder="e.g., 140"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          Privacy Guarantee: Exact pickup coordinates are never revealed until both commuters accept.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <Users className="h-4 w-4 text-emerald-400" />
          {loading ? 'Matching Commuters...' : 'Find Compatible Carpool Partners'}
        </button>
      </div>
    </form>
  );
}

export function CarpoolMatchCard({ match, onRespond, onCancel, loading }) {
  const partner = match.partner_journey;
  const isAccepted = match.match_status === 'accepted';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CompatibilityIndicator score={match.compatibility_score} />
            <MatchStatus status={match.match_status} />
          </div>
          <h3 className="mt-2 text-base font-bold text-slate-900">
            {partner?.commuter_name || 'Verified Commuter (Demo)'}
          </h3>
          <p className="mt-0.5 text-xs text-slate-600">
            <strong>Route:</strong> {partner?.pickup_area} → {partner?.destination_area}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Departure: {new Date(partner?.departure_time || Date.now()).toLocaleString()} • Seats Available:{' '}
            <strong>{partner?.available_seats}</strong>
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500">Est. Individual Cost</span>
          <div className="text-2xl font-extrabold text-emerald-700">
            ₹{match.estimated_shared_cost}
          </div>
          {match.estimated_savings > 0 && (
            <span className="text-[11px] font-semibold text-emerald-600">
              Saves ~₹{match.estimated_savings} vs solo cab
            </span>
          )}
        </div>
      </div>

      {/* Privacy & Coordinate Lock Status */}
      <div
        className={`mt-3 flex items-center gap-2 rounded-xl p-3 text-xs ${
          isAccepted
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border border-slate-200 bg-slate-50 text-slate-700'
        }`}
      >
        {isAccepted ? (
          <Unlock className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <Lock className="h-4 w-4 shrink-0 text-slate-500" />
        )}
        <div>
          <p className="font-semibold">{partner?.privacy_notice}</p>
          <p className="mt-0.5 text-[11px]">
            Contact: <strong>{partner?.commuter_contact}</strong> • Coordinates:{' '}
            {partner?.pickup_coordinates?.lat}, {partner?.pickup_coordinates?.lng} (
            {partner?.pickup_coordinates?.precision})
          </p>
        </div>
      </div>

      {/* Deterministic & Gemini Compatibility Explanation */}
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
        <p className="font-semibold text-slate-900">Compatibility Breakdown:</p>
        <p className="mt-0.5">
          {match.ai_explanation?.compatibility_summary || match.deterministic_explanation}
        </p>
        {match.ai_explanation?.advantages?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {match.ai_explanation.advantages.map((adv, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-medium text-emerald-800 shadow-2xs"
              >
                <Sparkles className="h-3 w-3 text-emerald-600" />
                {adv}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
        {match.match_status === 'pending' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => onRespond(match.match_id, 'accept')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Accept Carpool Match
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => onRespond(match.match_id, 'decline')}
              className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Decline
            </button>
          </>
        )}

        {(match.match_status === 'accepted' || match.match_status === 'requester_accepted') && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onCancel(match.match_id)}
            className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel Match
          </button>
        )}

        {match.match_status !== 'reported' && (
          <button
            type="button"
            disabled={loading}
            onClick={() =>
              onRespond(match.match_id, 'report', 'Reported by commuter via Carpool Safety Control')
            }
            className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Report / Block
          </button>
        )}
      </div>
    </div>
  );
}
