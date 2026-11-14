import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  Car,
  CheckCircle2,
  Compass,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet
} from 'lucide-react';
import { LocationInput } from '../components/JourneyComponents';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [pickup, setPickup] = useState('Indiranagar (100 Feet Road / Metro)');
  const [destination, setDestination] = useState('Whitefield (Kadugodi / ITPL)');
  const [budget, setBudget] = useState('180');

  const handlePlanJourney = (e) => {
    e.preventDefault();
    const params = new URLSearchParams({
      pickup,
      destination,
      ...(budget ? { budget } : {})
    });
    navigate(`/journey-results?${params.toString()}`);
  };

  const quickModes = [
    {
      title: 'Smart Ride Booking',
      desc: 'Compare Bike, Auto, Mini & Sedan quotes via DemoRideProvider and auto-book the cheapest suitable option.',
      icon: Car,
      to: '/book-ride'
    },
    {
      title: 'Public Transit Planner',
      desc: 'Step-by-step Bus, Metro, Walking & Multimodal combinations with transfer counts and fare breakdowns.',
      icon: Bus,
      to: '/public-transport'
    },
    {
      title: 'AI Carpool Matching',
      desc: 'Find compatible commuters with deterministic route overlap scoring and mutual-consent location privacy.',
      icon: Users,
      to: '/carpool'
    },
    {
      title: 'Passenger Incident Desk',
      desc: 'Report delays, overcrowding, or road blockages with Gemini AI summarization and complaint drafts.',
      icon: AlertTriangle,
      to: '/report-issue'
    }
  ];

  return (
    <div className="space-y-10 py-4">
      {/* Hero Section */}
      <section className="grid items-center gap-8 rounded-3xl bg-slate-900 p-6 text-white shadow-lg sm:p-10 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Multimodal Mobility Platform
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            One Platform. Every Journey.{' '}
            <span className="text-emerald-400">Smarter Decisions.</span>
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            RushRoute unifies public transit planning, budget-aware ride comparisons, shared carpool matching, and Gemini mobility intelligence into one clean, fast interface.
          </p>

          <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Deterministic Fare & Budget Math
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Privacy-Protected Carpool Consent
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5">
              <Compass className="h-4 w-4 text-emerald-400" />
              Transparent Demo & Schedule Labels
            </span>
          </div>
        </div>

        {/* Instant Journey Search Card */}
        <div className="rounded-2xl bg-white p-6 text-slate-900 shadow-xl lg:col-span-5">
          <h2 className="text-lg font-bold text-slate-900">Plan Your Journey Now</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Compare Bus, Metro, Auto, Private Rides & Carpool options side-by-side.
          </p>

          <form onSubmit={handlePlanJourney} className="mt-4 space-y-3.5">
            <LocationInput
              id="home-pickup"
              label="Pickup Location"
              value={pickup}
              onChange={setPickup}
            />
            <LocationInput
              id="home-destination"
              label="Destination"
              value={destination}
              onChange={setDestination}
            />
            <div>
              <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
                Target Travel Budget (₹)
              </label>
              <div className="relative mt-1.5">
                <Wallet className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="15"
                  max="10000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g., 180"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-emerald-700"
            >
              <span>Compare All Transport Options</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {!isAuthenticated && (
            <p className="mt-3 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-slate-900 underline">
                Sign in
              </Link>{' '}
              or{' '}
              <Link to="/register" className="font-semibold text-emerald-700 underline">
                create a free account
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      {/* Quick Transport Options Grid */}
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Everything You Need for Daily Commuting</h2>
            <p className="text-sm text-slate-600">
              Designed for students, office commuters, and budget-conscious city travellers.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {quickModes.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                to={isAuthenticated ? item.to : '/login'}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-900 hover:shadow-md"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-emerald-400 transition group-hover:bg-emerald-600 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.desc}</p>
                </div>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                  <span>Open Feature</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
