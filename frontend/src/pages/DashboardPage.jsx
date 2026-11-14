import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bus,
  Car,
  Compass,
  Footprints,
  History,
  Sparkles,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import {
  CurrentLocationStatusBanner,
  JourneySearchForm,
  useAutoBengaluruLocation
} from '../components/JourneyComponents';
import { AIRecommendationPanel } from '../components/AIComponents';
import { BookingStatus } from '../components/RideComponents';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { locationState, refreshLocation } = useAutoBengaluruLocation(
    'Majestic (Kempegowda Bus Station / Metro Hub)'
  );

  const [searchForm, setSearchForm] = useState({
    pickup_address: 'Majestic (Kempegowda Bus Station / Metro Hub)',
    destination_address: 'Whitefield (Kadugodi / ITPL)',
    passenger_count: 1,
    maximum_budget: 200,
    preferred_mode: 'Any',
    departure_time: '',
    is_scheduled: false
  });

  useEffect(() => {
    if (locationState?.address) {
      setSearchForm((prev) => ({
        ...prev,
        pickup_address: locationState.address
      }));
    }
  }, [locationState?.address]);

  const [nlQuery, setNlQuery] = useState(
    'Find the cheapest way to reach my destination.'
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
      passengers: String(searchForm.passenger_count || 1),
      ...(searchForm.maximum_budget ? { budget: String(searchForm.maximum_budget) } : {}),
      ...(searchForm.preferred_mode ? { mode: searchForm.preferred_mode } : {})
    });
    navigate(`/journey-results?${params.toString()}`);
  };

  const executeNaturalLanguageAiQuery = async (customPrompt = null) => {
    const promptText = customPrompt || nlQuery;
    if (!promptText.trim()) return;
    if (customPrompt) setNlQuery(customPrompt);

    // If user asks to find a bus stop near them, also offer direct navigation
    if (promptText.toLowerCase().includes('bus stop near me')) {
      navigate('/public-transport?tab=nearest');
      return;
    }

    setLoadingAi(true);
    try {
      const res = await apiClient.post('/ai/journey-advice', {
        natural_language_query: promptText,
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

  const aiSamplePrompts = [
    'Find the cheapest route to Whitefield.',
    'I have a budget of ₹50.',
    'Find the fastest route to MG Road.',
    'Compare BMTC and Metro.',
    'Find the nearest bus stop.',
    'Suggest the route with the least walking.',
    'Which provider has the best eligible fare?'
  ];

  // Section 18: Main Dashboard Actions
  const quickActions = [
    {
      title: 'Plan Journey',
      subtitle: 'Multimodal fare & time compare',
      to: '/journey-results',
      icon: Compass,
      color: 'bg-emerald-950 text-emerald-300'
    },
    {
      title: 'AI Smart Booking',
      subtitle: 'Uber • Ola • Rapido First-Acceptance Race',
      to: '/book-ride',
      icon: Car,
      color: 'bg-emerald-900 text-white'
    },
    {
      title: 'Public Transport',
      subtitle: 'BMTC Bus & Namma Metro',
      to: '/public-transport',
      icon: Bus,
      color: 'bg-emerald-800 text-white'
    },
    {
      title: 'Nearest BMTC Stops',
      subtitle: 'GPS & walking route finder',
      to: '/public-transport?tab=nearest',
      icon: Footprints,
      color: 'bg-teal-800 text-white'
    },
    {
      title: 'Carpool',
      subtitle: 'Share rides with commuters',
      to: '/carpool',
      icon: Users,
      color: 'bg-emerald-700 text-white'
    },
    {
      title: 'My Journeys',
      subtitle: 'Past, scheduled & smart race winners',
      to: '/my-journeys',
      icon: History,
      color: 'bg-slate-800 text-white'
    }
  ];

  return (
    <div className="space-y-8">
      <CurrentLocationStatusBanner
        locationState={locationState}
        onRefresh={refreshLocation}
      />

      {/* Greeting Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-emerald-950 p-6 text-white shadow-sm">
        <div>
          <p className="text-xs font-semibold tracking-wider text-emerald-300 uppercase">
            RushRoute Bengaluru Mobility Command Center
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">
            Hello, {user?.full_name?.split(' ')[0] || 'Commuter'}
          </h1>
          <p className="mt-0.5 text-xs text-emerald-100/90">
            One Platform. Every Journey. Smarter Decisions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/public-transport?tab=nearest"
            className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-emerald-950 hover:bg-emerald-300"
          >
            Find Nearest BMTC Stop
          </Link>
          <Link
            to="/book-ride"
            className="rounded-xl border border-emerald-700 bg-emerald-900 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Book Now (Demo Ride)
          </Link>
        </div>
      </div>

      {/* Main Actions Grid (Section 18) */}
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((act) => {
          const Icon = act.icon;
          return (
            <Link
              key={act.title}
              to={act.to}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-emerald-800"
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Plan & Compare Multimodal Journey</h2>
          <span className="text-xs text-slate-500">
            Compares BMTC Bus, Namma Metro, Walking, Auto, Cab & Carpool
          </span>
        </div>
        <JourneySearchForm
          values={searchForm}
          onChange={setSearchForm}
          onSubmit={handleJourneySearch}
          submitLabel="Compare All Alternatives"
        />
      </div>

      {/* Section 13: Gemini AI Journey Assistant */}
      <div id="ai-journey-assistant" className="rounded-2xl border border-emerald-900/20 bg-white p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900 text-emerald-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                AI Journey Assistant (Powered by Google Gemini)
              </h2>
              <p className="text-xs text-slate-500">
                Uses verified application transport data & deterministic fares — never fabricates schedules or prices.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-900 ring-1 ring-emerald-900/15">
            AI Explanation Layer
          </span>
        </div>

        {/* One-Click Natural Language Prompt Chips */}
        <div className="mt-3.5 flex flex-wrap gap-2">
          {aiSamplePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => executeNaturalLanguageAiQuery(prompt)}
              className="rounded-xl border border-emerald-900/15 bg-emerald-50/60 px-3 py-1.5 text-xs font-semibold text-emerald-950 transition hover:bg-emerald-100"
            >
              “{prompt}”
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeNaturalLanguageAiQuery();
          }}
          className="mt-3.5 flex flex-col gap-2.5 sm:flex-row"
        >
          <input
            type="text"
            value={nlQuery}
            onChange={(e) => setNlQuery(e.target.value)}
            placeholder="Ask e.g. 'Find the cheapest way to reach my destination' or 'Compare bus and metro'"
            className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-emerald-800 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={loadingAi}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4 text-emerald-300" />
            {loadingAi ? 'Analyzing...' : 'Ask AI Assistant'}
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
              <Compass className="h-4 w-4 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-900">Recent Planned Journeys</h3>
            </div>
            <Link to="/my-journeys" className="text-xs font-semibold text-emerald-800 hover:underline">
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
                  <div className="text-right font-bold text-emerald-950">₹{j.estimated_fare}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-800" />
              <h3 className="text-sm font-bold text-slate-900">Recent Demo Ride Bookings</h3>
            </div>
            <Link to="/my-journeys" className="text-xs font-semibold text-emerald-800 hover:underline">
              View All
            </Link>
          </div>
          {recentHistory.ride_bookings.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              No demonstration ride bookings yet. Visit Book a Ride to test the 6-stage simulated dispatch.
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
                      Ref: {b.provider_reference || 'N/A'} • {b.estimated_duration_minutes} mins (DEMO BOOKING)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-950">₹{b.estimated_fare}</span>
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
