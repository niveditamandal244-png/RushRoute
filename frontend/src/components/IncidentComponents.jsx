import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MapPin,
  Sparkles
} from 'lucide-react';
import { LocationInput } from './JourneyComponents';

export const INCIDENT_CATEGORIES = [
  'Delay',
  'Skipped stop',
  'Overcrowding',
  'Road obstruction',
  'Service disruption',
  'Other'
];

export function IncidentStatus({ status }) {
  const styles = {
    reported: 'bg-amber-100 text-amber-800',
    under_review: 'bg-blue-100 text-blue-800',
    verified: 'bg-indigo-100 text-indigo-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    dismissed: 'bg-slate-100 text-slate-600'
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
        styles[status] || styles.reported
      }`}
    >
      {String(status || 'reported').replace(/_/g, ' ')}
    </span>
  );
}

export function IncidentReportForm({ values, onChange, onSubmit, loading }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Incident Category
          </label>
          <select
            value={values.category}
            onChange={(e) => onChange({ ...values, category: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          >
            {INCIDENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <LocationInput
          id="incident-location"
          label="Approximate Location"
          value={values.location}
          onChange={(v) => onChange({ ...values, location: v })}
          placeholder="e.g., Silk Board Junction / Indiranagar Metro"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Route Number / Corridor (Optional)
          </label>
          <input
            type="text"
            value={values.route_name || ''}
            onChange={(e) => onChange({ ...values, route_name: e.target.value })}
            placeholder="e.g., Route 500-D or Purple Line"
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
            Transit Service Name (Optional)
          </label>
          <input
            type="text"
            value={values.service_name || ''}
            onChange={(e) => onChange({ ...values, service_name: e.target.value })}
            placeholder="e.g., City Bus / Metro Feeder"
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
          Incident Description (Min 10 characters)
        </label>
        <textarea
          rows={3}
          required
          minLength={10}
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
          placeholder="Describe what happened, approximate delay duration, or commuter impact..."
          className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-500">
          Gemini AI will summarize your report, check for duplicates, and prepare a complaint draft for your review.
        </p>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          {loading ? 'Submitting & Analyzing...' : 'Submit Incident Report'}
        </button>
      </div>
    </form>
  );
}

export function ComplaintPreview({ complaintDraft, analysis }) {
  const [approvedByUser, setApprovedByUser] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!complaintDraft) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(
      `Subject: ${complaintDraft.subject}\n\n${complaintDraft.complaint_body}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">
            AI-Prepared Passenger Complaint Draft (Review Required)
          </h3>
        </div>
        {analysis?.severity && (
          <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-700 uppercase">
            Advisory Severity: {analysis.severity}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-amber-800">
        Important: RushRoute never submits complaints automatically or claims external authority submission without an authorized integration. Review and approve below to copy for official transit grievance portals.
      </p>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800">
        <p className="font-bold text-slate-900">Subject: {complaintDraft.subject}</p>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">
          {complaintDraft.complaint_body}
        </pre>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={approvedByUser}
            onChange={(e) => setApprovedByUser(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
          />
          I have reviewed and approved the factual accuracy of this complaint draft.
        </label>

        <button
          type="button"
          disabled={!approvedByUser}
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          {copied ? (
            <>
              <ClipboardCheck className="h-4 w-4" />
              Approved Draft Copied!
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Approve & Copy Complaint Text
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function IncidentCard({ incident, onAnalyze, analyzingId }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
              {incident.category}
            </span>
            <IncidentStatus status={incident.status} />
            {incident.route_name && (
              <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {incident.route_name}
              </span>
            )}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {incident.location} • {new Date(incident.created_at).toLocaleString()}
          </p>
        </div>

        {onAnalyze && (
          <button
            type="button"
            disabled={analyzingId === incident.id}
            onClick={() => onAnalyze(incident.id)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            {analyzingId === incident.id ? 'Analyzing...' : 'Generate Draft & AI Summary'}
          </button>
        )}
      </div>

      <p className="mt-2.5 text-sm text-slate-800">{incident.description}</p>

      {incident.ai_summary && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-slate-700">
          <span className="font-bold text-emerald-900">Gemini AI Summary: </span>
          {incident.ai_summary}
        </div>
      )}
    </div>
  );
}
