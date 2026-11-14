import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Save, Trash2, User } from 'lucide-react';
import { apiClient, KNOWN_HUB_SUGGESTIONS } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ErrorState, LoadingState, ToastNotification } from '../components/GeneralComponents';

export function ProfilePage() {
  const { refreshProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savedLocations, setSavedLocations] = useState([]);

  const [defaultBudget, setDefaultBudget] = useState(250);
  const [preferredModes, setPreferredModes] = useState(['Metro', 'Bus', 'Auto']);
  const [accessibility, setAccessibility] = useState({
    wheelchairAccessible: false,
    avoidLongWalks: false,
    preferDirectRoutes: false
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users/profile');
      const p = res.data.profile;
      setFullName(p.full_name || '');
      setEmail(p.email || '');
      setPhone(p.phone || '');
      setSavedLocations(res.data.saved_locations || []);

      if (res.data.preferences) {
        setDefaultBudget(res.data.preferences.default_budget ?? 250);
        setPreferredModes(res.data.preferences.preferred_transport_modes || ['Metro', 'Bus']);
        setAccessibility(
          res.data.preferences.accessibility_preferences || {
            wheelchairAccessible: false,
            avoidLongWalks: false,
            preferDirectRoutes: false
          }
        );
      }
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleMode = (mode) => {
    setPreferredModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };

  const addSavedLocation = () => {
    setSavedLocations((prev) => [
      ...prev,
      { label: 'Work / Campus', address: KNOWN_HUB_SUGGESTIONS[0] }
    ]);
  };

  const removeSavedLocation = (idx) => {
    setSavedLocations((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await Promise.all([
        apiClient.patch('/users/profile', {
          full_name: fullName,
          phone: phone || null,
          saved_locations: savedLocations.map((s) => ({
            label: s.label,
            address: s.address
          }))
        }),
        apiClient.patch('/users/preferences', {
          default_budget: Number(defaultBudget),
          preferred_transport_modes: preferredModes,
          accessibility_preferences: accessibility
        })
      ]);
      await refreshProfile();
      setToast({
        type: 'success',
        message: 'Profile, saved places, and mobility preferences updated!'
      });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your profile & preferences..." />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Commuter Profile & Mobility Preferences
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your personal details, saved hubs (Home, Office, College), and default journey preferences.
        </p>
      </div>

      <ErrorState message={error} />

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Account Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <User className="h-4 w-4 text-emerald-600" />
            Personal Information
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">
                Email (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91-9876543210"
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Mobility Preferences */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900">
            Default Budget & Preferred Transport Modes
          </h2>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">
                Default Journey Budget Cap (₹)
              </label>
              <input
                type="number"
                min="20"
                max="10000"
                value={defaultBudget}
                onChange={(e) => setDefaultBudget(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase">
                Preferred Modes
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {['Metro', 'Bus', 'Auto', 'Bike', 'Mini', 'Sedan', 'Walking'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMode(m)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                      preferredModes.includes(m)
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-5 border-t border-slate-100 pt-4 text-xs text-slate-700">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(accessibility.wheelchairAccessible)}
                onChange={(e) =>
                  setAccessibility({
                    ...accessibility,
                    wheelchairAccessible: e.target.checked
                  })
                }
              />
              Prefer step-free / wheelchair-accessible stations
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(accessibility.avoidLongWalks)}
                onChange={(e) =>
                  setAccessibility({
                    ...accessibility,
                    avoidLongWalks: e.target.checked
                  })
                }
              />
              Minimize walking segments (&lt; 400m)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(accessibility.preferDirectRoutes)}
                onChange={(e) =>
                  setAccessibility({
                    ...accessibility,
                    preferDirectRoutes: e.target.checked
                  })
                }
              />
              Prefer fewer transfers
            </label>
          </div>
        </div>

        {/* Saved Locations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Saved Commute Places ({savedLocations.length})
            </div>
            <button
              type="button"
              onClick={addSavedLocation}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Place
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {savedLocations.map((loc, idx) => (
              <div key={idx} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={loc.label}
                  onChange={(e) => {
                    const next = [...savedLocations];
                    next[idx] = { ...next[idx], label: e.target.value };
                    setSavedLocations(next);
                  }}
                  placeholder="Label (Home, Office)"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:w-40"
                />
                <input
                  type="text"
                  value={loc.address}
                  onChange={(e) => {
                    const next = [...savedLocations];
                    next[idx] = { ...next[idx], address: e.target.value };
                    setSavedLocations(next);
                  }}
                  placeholder="Address or Hub"
                  className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => removeSavedLocation(idx)}
                  className="inline-flex items-center justify-center rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            <Save className="h-4 w-4 text-emerald-400" />
            {saving ? 'Saving Profile...' : 'Save Profile & Preferences'}
          </button>
        </div>
      </form>

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
