import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { apiClient } from '../services/api';
import { CarpoolMatchCard, CarpoolRequestForm } from '../components/CarpoolComponents';
import { EmptyState, ErrorState, LoadingState, ToastNotification } from '../components/GeneralComponents';

export function CarpoolPage() {
  const defaultDeparture = new Date(Date.now() + 45 * 60000).toISOString().slice(0, 16);

  const [formValues, setFormValues] = useState({
    pickup_address: 'Indiranagar (100 Feet Road / Metro)',
    destination_address: 'Whitefield (Kadugodi / ITPL)',
    departure_time: defaultDeparture,
    available_seats: 2,
    estimated_budget: 140
  });

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const handleFindMatches = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/carpool/matches/search', {
        ...formValues,
        departure_time: new Date(formValues.departure_time).toISOString(),
        estimated_budget: formValues.estimated_budget || undefined
      });
      setMatches(res.data.matches || []);
      setToast({
        type: 'success',
        message: `Found ${res.data.matches?.length || 0} compatible commuter journey(s).`
      });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to search carpool matches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient
      .get('/carpool/requests')
      .then((res) => {
        if (res.data.matches?.length > 0) {
          setMatches(
            res.data.matches.map((m) => ({
              ...m,
              match_id: m.id
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleRespond = async (matchId, action, reason) => {
    setActionLoading(true);
    setError('');
    try {
      const res = await apiClient.post(`/carpool/matches/${matchId}/respond`, {
        action,
        reason
      });
      setMatches((prev) =>
        prev.map((m) =>
          m.match_id === matchId
            ? {
                ...m,
                match_status: res.data.match.match_status,
                partner_journey: res.data.match.partner_journey
              }
            : m
        )
      );
      setToast({ type: 'success', message: res.data.message });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to respond to carpool match.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (matchId) => {
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/carpool/matches/${matchId}/cancel`);
      setMatches((prev) =>
        prev.map((m) =>
          m.match_id === matchId ? { ...m, match_status: res.data.match.match_status } : m
        )
      );
      setToast({ type: 'success', message: res.data.message });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to cancel match.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">AI-Powered Carpool Discovery & Matching</h1>
        <p className="mt-1 text-sm text-slate-600">
          Match with commuters travelling along overlapping corridors. Deterministic scoring evaluates pickup proximity, destination similarity, route direction, and departure window.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        <div>
          <strong>Privacy & Mutual Consent Architecture (Section 4.4):</strong> Precise pickup coordinates and contact details remain hidden until both commuters explicitly accept a match. You can cancel, report, or block any match at any time.
        </div>
      </div>

      <CarpoolRequestForm
        values={formValues}
        onChange={setFormValues}
        onSubmit={handleFindMatches}
        loading={loading}
      />

      <ErrorState message={error} />

      {loading && <LoadingState message="Calculating deterministic corridor overlap & AI compatibility..." />}

      {!loading && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900">
            Compatible Commuter Matches ({matches.length})
          </h2>
          {matches.length === 0 ? (
            <EmptyState
              title="No carpool matches searched yet"
              description="Submit your pickup, destination, and departure time above to match with demonstration commuters."
              actionLabel="Search Demo Matches Now"
              onAction={handleFindMatches}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {matches.map((m) => (
                <CarpoolMatchCard
                  key={m.match_id || m.id}
                  match={m}
                  onRespond={handleRespond}
                  onCancel={handleCancel}
                  loading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
