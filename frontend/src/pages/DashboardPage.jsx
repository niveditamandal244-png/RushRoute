import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  Car,
  Compass,
  History,
  Sparkles,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { JourneySearchForm } from '../components/JourneyComponents';
import { AIRecommendationPanel } from '../components/AIComponents';
import { BookingStatus } from '../components/RideComponents';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchForm, setSearchForm] = useState({
    pickup_address: 'Indiranagar (100 Feet Road / Metro)',
    destination_address: 'Whitefield (Kadugodi / ITPL)',
    maximum_budget: 200,
    preferred_mode: 'Any',
    departure_time: ''
  });

  const [nlQuery, setNlQuery] = useState(
    'Find the most practical commute from Indiranagar to Whitefield under ₹180 using Metro'
  );
  const [aiAdvice, setAiAdvice] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [recentHistory, setRecentHistory] = useState({ journeys: [], ride_bookings: [] });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const res = await apiClient.get('/journeys/history');
        setRecentHistory({
          journeys: res.data.journeys?.slice(0, 4) || [],
          ride_bookings: res.data.ride_bookings?.slice(0, 4) || []
        });
      } catch {
        // Ignore initial load error
      }
    }
    loadDashboardData();
  }, []);

  const handleJourneySearch = () => {
    const params = new URLSearchParams({
      pickup: searchForm.pickup_address,
      destination: searchForm.destination_address,
      ...(searchForm.maximum_budget ? { budget: String(searchForm.maximum_budget) } : {}),
      ...(searchForm.preferred_mode ? { mode: searchForm.preferred_mode } : {})
    });
    navigate(`/journey-results?${params.toString()}`);
  };

  const handleAskNaturalLanguageAI = async (e) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;
    setLoadingAi(true);
    try {
      const res = await apiClient.post('/ai/journey-advice', {
        natural_language_query: nlQuery,
        pickup_address: searchForm.pickup_address,
        destination_address: searchForm.destination_address,
        maximum_budget: searchForm.maximum_budget || undefined
      });
      setAiAdvice(res.data);
    } catch {
      // Handled gracefully
    } finally {
      setLoadingAi(false);
    }
  };

  const quickActions = [
    {
      title: 'Book Private Ride',
      subtitle: 'Bike, Auto, Mini & Sedan',
      to: '/book-ride',
      icon: Car,
      color: 'bg-slate-900 text-emerald-400'
    },
    {
      title: 'Public Transit Planner',
      subtitle: 'Bus, Metro & Walk Combos',
      to: '/public-transport',
      icon: Bus,
      color: 'bg-emerald-600 text-white'
    },
    {
      title: 'Carpool Discovery',
      subtitle: 'Split costs with commuters',
      to: '/carpool',
      icon: Users,
      color: 'bg-indigo-600 text-white'
    },
    {
      title: 'Report Transit Issue',
      subtitle: 'Delays, crowding & drafts',
      to: '/report-issue',
      icon: AlertTriangle,
      color: 'bg-amber-500 text-slate-950'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Greeting Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <div>
          <p className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
            RushRoute Mobility Command Center
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">
            Hello, {user?.full_name?.split(' ')[0] || 'Commuter'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-300">
            Where are you heading today? Compare multimodal routes or book a budget-filtered ride in seconds.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/book-ride"
            className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            Quick Ride Booking
          </Link>
          <Link
            to="/my-journeys"
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            View My Journeys
          </Link>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.to}
              to={act.to}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-900"
            >
              <div className="flex items-center gap-3.5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${act.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{act.title}</h3>
                  <p className="text-xs text-slate-500">{act.subtitle}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          );
        })}
      </div>

      {/* Journey Search Form */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Plan & Compare Multimodal Journey</h2>
          <span className="text-xs text-slate-500">
            Compares Bus, Metro, Auto, Private Rides & Shared Carpool
          </span>
        </div>
        <JourneySearchForm
          values={searchForm}
          onChange={setSearchForm}
          onSubmit={handleJourneySearch}
          submitLabel="Compare All Alternatives"
        />
      </div>

      {/* Natural Language Gemini Mobility Assistant */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">
            Natural-Language AI Mobility Assistant (Powered by Google Gemini)
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Describe your trip in plain English — Gemini parses your preferences and explains the most practical backend-calculated route.
        </p>

        <form onSubmit={handleAskNaturalLanguageAI} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <input
            type="text"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            placeholder="e.g., Find the cheapest way from Indiranagar to Whitefield under ₹150"
            className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={loadingAi}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {loadingAi ? 'Analyzing...' : 'Ask Mobility AI'}
          </button>
        </form>

        {aiAdvice?.recommendation && (
          <div className="mt-4">
            <AIRecommendationPanel
              recommendation={aiAdvice.recommendation}
              budgetExplanation={aiAdvice.budget_explanation}
              modelUsed={aiAdvice.model_used}
            />
          </div>
        )}
      </div>

      {/* Recent Journeys & Simulated Bookings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Recent Planned Journeys</h3>
            </div>
            <Link to="/my-journeys" className="text-xs font-semibold text-emerald-700 hover:underline">
              View All
            </Link>
          </div>
          {recentHistory.journeys.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              No planned journeys yet. Use the planner above to compare multimodal routes.
            </p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {recentHistory.journeys.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {j.pickup_address} → {j.destination_address}
                    </p>
                    <p className="text-slate-500">
                      Modes: {(j.transport_modes || []).join(' + ')} • {j.estimated_duration_minutes} mins
                    </p>
                  </div>
                  <div className="text-right font-bold text-slate-900">₹{j.estimated_fare}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Recent Simulated Ride Bookings</h3>
            </div>
            <Link to="/my-journeys" className="text-xs font-semibold text-emerald-700 hover:underline">
              View All
            </Link>
          </div>
          {recentHistory.ride_bookings.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              No simulated ride bookings yet. Visit Book a Ride to test budget-prioritized dispatch.
            </p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {recentHistory.ride_bookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {b.vehicle_type} — {b.provider_name}
                    </p>
                    <p className="text-slate-500">
                      Ref: {b.provider_reference || 'N/A'} • {b.estimated_duration_minutes} mins
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">₹{b.estimated_fare}</span>
                    <BookingStatus status={b.booking_status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
