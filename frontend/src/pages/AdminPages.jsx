import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';
import { apiClient } from '../services/api';
import { IncidentStatus } from '../components/IncidentComponents';
import { ErrorState, LoadingState, ToastNotification } from '../components/GeneralComponents';

function AdminTabs() {
  const location = useLocation();
  const tabs = [
    { to: '/admin', label: 'Overview', icon: ShieldCheck },
    { to: '/admin/incidents', label: 'Incident Management', icon: AlertTriangle },
    { to: '/admin/analytics', label: 'Mobility Analytics', icon: BarChart3 }
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = location.pathname === t.to;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              active
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/admin/analytics')
      .then((res) => setAnalytics(res.data.analytics))
      .catch((err) => setError(err.friendlyMessage || 'Failed to load admin overview.'))
      .finally(() => setLoading(false));
  }, []);

  const ov = analytics?.overview || {};

  return (
    <div className="space-y-6">
      <div>
        <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800 uppercase">
          Restricted Administrator Console
        </span>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">
          RushRoute Operations & Governance Dashboard
        </h1>
      </div>

      <AdminTabs />
      <ErrorState message={error} />

      {loading ? (
        <LoadingState message="Loading platform metrics..." />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">Total Users</span>
              <p className="mt-1 text-3xl font-extrabold text-slate-900">{ov.total_users || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Confirmed Demo Bookings
              </span>
              <p className="mt-1 text-3xl font-extrabold text-emerald-700">
                {ov.confirmed_ride_bookings || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Open Carpool Requests
              </span>
              <p className="mt-1 text-3xl font-extrabold text-indigo-700">
                {ov.open_carpool_requests || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Incident Reports
              </span>
              <p className="mt-1 text-3xl font-extrabold text-amber-600">
                {ov.total_incident_reports || 0}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Link
              to="/admin/incidents"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-slate-900"
            >
              <h2 className="text-base font-bold text-slate-900">Manage Passenger Incidents →</h2>
              <p className="mt-1 text-xs text-slate-600">
                Review AI-summarized passenger reports and update verification/resolution statuses.
              </p>
            </Link>

            <Link
              to="/admin/analytics"
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-slate-900"
            >
              <h2 className="text-base font-bold text-slate-900">
                Detailed Mobility & AI Audit Analytics →
              </h2>
              <p className="mt-1 text-xs text-slate-600">
                Inspect bookings by vehicle type, incident distribution, and sanitized AI interaction logs.
              </p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/incidents');
      setIncidents(res.data.incidents || []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load incidents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      const res = await apiClient.patch(`/admin/incidents/${id}/status`, { status });
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === id ? { ...inc, status: res.data.incident.status } : inc))
      );
      setToast({ type: 'success', message: res.data.message });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to update status.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Administrative Incident Management</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review passenger-reported disruptions and update their operational status.
        </p>
      </div>

      <AdminTabs />
      <ErrorState message={error} />

      {loading ? (
        <LoadingState message="Loading all passenger incident reports..." />
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-slate-900 px-2.5 py-0.5 text-xs font-bold text-white">
                      {inc.category}
                    </span>
                    <IncidentStatus status={inc.status} />
                    {inc.route_name && (
                      <span className="text-xs font-medium text-slate-500">{inc.route_name}</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-bold text-slate-900">{inc.location}</p>
                  <p className="mt-1 text-xs text-slate-700">{inc.description}</p>
                  {inc.ai_summary && (
                    <p className="mt-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-900">
                      <strong>AI Summary:</strong> {inc.ai_summary}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase">
                    Update Status
                  </label>
                  <select
                    value={inc.status}
                    onChange={(e) => handleStatusChange(inc.id, e.target.value)}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    {['reported', 'under_review', 'verified', 'resolved', 'dismissed'].map((st) => (
                      <option key={st} value={st}>
                        {st.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient
      .get('/admin/analytics')
      .then((res) => setAnalytics(res.data.analytics))
      .catch((err) => setError(err.friendlyMessage || 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Mobility Statistics & AI Interaction Audit
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Aggregated platform usage, category breakdowns, and sanitized Gemini interaction logs.
        </p>
      </div>

      <AdminTabs />
      <ErrorState message={error} />

      {loading ? (
        <LoadingState message="Calculating mobility statistics..." />
      ) : (
        analytics && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900">Incidents by Category</h2>
                <div className="mt-3 space-y-2">
                  {Object.entries(analytics.incidents_by_category || {}).map(([cat, count]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2 text-xs"
                    >
                      <span className="font-medium text-slate-700">{cat}</span>
                      <span className="font-bold text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="text-sm font-bold text-slate-900">
                  Confirmed Simulated Bookings by Vehicle
                </h2>
                <div className="mt-3 space-y-2">
                  {Object.entries(analytics.bookings_by_vehicle || {}).length === 0 ? (
                    <p className="text-xs text-slate-500">No confirmed vehicle bookings yet.</p>
                  ) : (
                    Object.entries(analytics.bookings_by_vehicle || {}).map(([veh, count]) => (
                      <div
                        key={veh}
                        className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2 text-xs"
                      >
                        <span className="font-medium text-slate-700">{veh}</span>
                        <span className="font-bold text-emerald-700">{count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Recent Sanitized AI Interactions ({analytics.recent_ai_interactions?.length || 0})
                </h2>
              </div>
              <div className="mt-3 space-y-2">
                {(analytics.recent_ai_interactions || []).map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 uppercase">
                        {log.interaction_type}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {log.model_name} • {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">Input: {log.input_summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
