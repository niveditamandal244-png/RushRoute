import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Server, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    apiClient
      .get('/health')
      .then((res) => setHealth(res.data))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Account Settings & System Status</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review security controls, data privacy guarantees, and active session status.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Security & Privacy Guarantees
        </div>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-slate-600">
          <li>
            <strong>Custom JWT + bcrypt Authentication:</strong> Passwords are hashed using bcrypt (10 rounds) and never stored in plaintext or sent to AI services.
          </li>
          <li>
            <strong>Server-Side Gemini AI Isolation:</strong> All Google Gemini API requests are executed exclusively by the Express backend using <code>@google/genai</code>. No API keys are exposed in browser variables.
          </li>
          <li>
            <strong>Carpool Coordinate Privacy:</strong> Precise pickup coordinates are never exposed publicly; they unlock only after mutual acceptance.
          </li>
          <li>
            <strong>Simulation & Schedule Transparency:</strong> Private ride bookings use <code>DemoRideProvider</code>, and transit routes use schedule-based demonstration datasets.
          </li>
        </ul>
      </div>

      {health && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Server className="h-4 w-4 text-slate-700" />
            Backend Service Diagnostics
          </div>
          <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-slate-500">Database Mode</span>
              <p className="mt-0.5 font-bold text-slate-900">{health.database_mode}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-slate-500">AI Model</span>
              <p className="mt-0.5 font-bold text-slate-900">{health.gemini_model}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-slate-500">Signed-In Role</span>
              <p className="mt-0.5 font-bold text-emerald-700 uppercase">{user?.role}</p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-6">
        <h2 className="text-sm font-bold text-red-900">Active Session Control</h2>
        <p className="mt-1 text-xs text-red-700">
          Signing out revokes your active JWT session token on the server and clears local credentials.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-red-700"
        >
          <LogOut className="h-4 w-4" />
          Sign Out of RushRoute
        </button>
      </div>
    </div>
  );
}
