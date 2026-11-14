import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Filter,
  Sparkles,
  TrendingDown,
  Wallet,
  Zap
} from 'lucide-react';
import { apiClient } from '../services/api';
import {
  CurrentLocationStatusBanner,
  DetailedJourneyTimeline,
  getCurrentIstTimeString,
  getTodayIstDateString,
  JourneyRecommendation,
  JourneyResultCard,
  JourneySearchForm,
  useAutoBengaluruLocation
} from '../components/JourneyComponents';
import { RouteMap } from '../components/RouteMap';
import { AIRecommendationPanel } from '../components/AIComponents';
import { ErrorState, LoadingState } from '../components/GeneralComponents';

export function JourneyResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialPickupParam = searchParams.get('pickup');
  const { locationState, refreshLocation } = useAutoBengaluruLocation(
    initialPickupParam || 'Majestic (Kempegowda Bus Station / Metro Hub)'
  );

  const [formValues, setFormValues] = useState({
    pickup_address:
      initialPickupParam || 'Majestic (Kempegowda Bus Station / Metro Hub)',
    destination_address:
      searchParams.get('destination') || 'Whitefield (Kadugodi / ITPL)',
    travel_date: searchParams.get('date') || getTodayIstDateString(),
    departure_time: searchParams.get('time') || getCurrentIstTimeString(),
    passenger_count: Number(searchParams.get('passengers')) || 1,
    maximum_budget: searchParams.get('budget') ? Number(searchParams.get('budget')) : 250,
    preferred_mode: searchParams.get('mode') || 'Any'
  });

  const [data, setData] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [activeStepIndex, setActiveStepIndex] = useState(null);
  const [activeFilterTab, setActiveFilterTab] = useState('All');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'balanced');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!initialPickupParam && locationState?.address) {
      setFormValues((prev) => ({
        ...prev,
        pickup_address: locationState.address
      }));
    }
  }, [initialPickupParam, locationState?.address]);

  const executeComparison = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/journeys/recommend', {
        pickup_address: formValues.pickup_address,
        destination_address: formValues.destination_address,
        travel_date: formValues.travel_date || undefined,
        departure_time: formValues.departure_time || undefined,
        passenger_count: formValues.passenger_count || 1,
        maximum_budget: formValues.maximum_budget || undefined,
        preferred_mode: formValues.preferred_mode || 'Any'
      });
      setData(res.data);
      setSelectedOption(
        res.data.plan?.recommended_option || res.data.plan?.options?.[0] || null
      );
      setActiveStepIndex(null);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load journey comparison.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterTabs = [
    { id: 'All', label: 'All' },
    { id: 'Bus', label: 'BMTC Bus' },
    { id: 'Metro', label: 'Namma Metro' },
    { id: 'Airport Rail', label: 'Airport / Express' },
    { id: 'Direct Ride', label: 'Direct Ride (Uber/Ola/Rapido)' },
    { id: 'Walk', label: 'Walk + Transit' }
  ];

  const filteredAndSortedOptions = useMemo(() => {
    const raw = data?.plan?.options || [];
    const filtered = raw.filter((opt) => {
      const modes = (opt.transport_modes || []).map((m) => String(m).toLowerCase());
      const title = String(opt.title || '').toLowerCase();
      if (activeFilterTab === 'All') return true;
      if (activeFilterTab === 'Bus') {
        return modes.some((m) => m.includes('bus')) || Boolean(opt.bmtc_details);
      }
      if (activeFilterTab === 'Metro') {
        return modes.some((m) => m.includes('metro')) || Boolean(opt.metro_details);
      }
      if (activeFilterTab === 'Airport Rail') {
        return (
          title.includes('airport') ||
          title.includes('kia') ||
          title.includes('express') ||
          modes.some((m) => m.includes('metro') || m.includes('bus'))
        );
      }
      if (activeFilterTab === 'Direct Ride') {
        return opt.category === 'private_ride';
      }
      if (activeFilterTab === 'Walk') {
        return (opt.walking_distance_km || 0) > 0 || modes.some((m) => m.includes('walk'));
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'cheapest') {
        return (
          a.estimated_fare - b.estimated_fare ||
          a.estimated_duration_minutes - b.estimated_duration_minutes
        );
      }
      if (sortBy === 'fastest') {
        return (
          a.estimated_duration_minutes - b.estimated_duration_minutes ||
          a.estimated_fare - b.estimated_fare
        );
      }
      if (sortBy === 'least_walking')
        return (a.walking_distance_km || 0) - (b.walking_distance_km || 0);
      return (b.suitability_score || 0) - (a.suitability_score || 0);
    });
  }, [data?.plan?.options, activeFilterTab, sortBy]);

  const bi = data?.plan?.budget_intelligence;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-900">
            Multimodal Decision Engine • Bengaluru
          </span>
          <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900">
            Smart Multimodal Journey Planner
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Compare BMTC Bus, Namma Metro, Walking Combos, and Uber/Ola/Rapido AI Smart Booking side-by-side.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              `/book-ride?pickup=${encodeURIComponent(
                formValues.pickup_address
              )}&destination=${encodeURIComponent(
                formValues.destination_address
              )}&passengers=${formValues.passenger_count || 1}`
            )
          }
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-950 px-4 py-2.5 text-xs font-extrabold text-emerald-300 shadow-xs hover:bg-emerald-900"
        >
          <Sparkles className="h-4 w-4" />
          <span>Start 3-Provider AI Smart Booking Race (Uber • Ola • Rapido)</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <CurrentLocationStatusBanner
        locationState={locationState}
        onRefresh={refreshLocation}
      />

      <JourneySearchForm
        values={formValues}
        onChange={setFormValues}
        onSubmit={executeComparison}
        loading={loading}
        submitLabel="Compare All Modes"
      />

      <ErrorState message={error} onRetry={executeComparison} />

      {loading && (
        <LoadingState message="Calculating IST transit schedules, fare ranges & AI recommendation..." />
      )}

      {!loading && data?.plan && (
        <div className="space-y-6">
          {/* Cheapest / Fastest / Best Balanced Summary Strip (Interactive Selection) */}
          {bi && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div
                onClick={() =>
                  data.plan.cheapest_option && setSelectedOption(data.plan.cheapest_option)
                }
                className="cursor-pointer rounded-2xl border border-emerald-900/15 bg-white p-4 shadow-2xs transition hover:border-emerald-700"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase">
                  <TrendingDown className="h-4 w-4" />
                  Cheapest Option
                </div>
                <p className="mt-1 text-2xl font-extrabold text-emerald-950">₹{bi.cheapest_fare}</p>
                <p className="truncate text-xs text-slate-500">
                  {data.plan.cheapest_option?.title || bi.cheapest_option_id}
                </p>
              </div>

              <div
                onClick={() =>
                  data.plan.fastest_option && setSelectedOption(data.plan.fastest_option)
                }
                className="cursor-pointer rounded-2xl border border-emerald-900/15 bg-white p-4 shadow-2xs transition hover:border-emerald-700"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 uppercase">
                  <Zap className="h-4 w-4" />
                  Fastest Option
                </div>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                  {bi.fastest_duration_minutes} mins
                </p>
                <p className="truncate text-xs text-slate-500">
                  {data.plan.fastest_option?.title || bi.fastest_option_id}
                </p>
              </div>

              <div
                onClick={() =>
                  data.plan.best_balanced_option &&
                  setSelectedOption(data.plan.best_balanced_option)
                }
                className="cursor-pointer rounded-2xl border border-emerald-900/15 bg-emerald-50/60 p-4 shadow-2xs transition hover:border-emerald-700"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase">
                  <CheckCircle2 className="h-4 w-4" />
                  Best Balanced
                </div>
                <p className="mt-1 text-2xl font-extrabold text-emerald-950">
                  ₹{data.plan.best_balanced_option?.estimated_fare ?? bi.cheapest_fare}
                </p>
                <p className="truncate text-xs text-emerald-900">
                  {data.plan.best_balanced_option?.title || 'Recommended Multimodal'}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-900/15 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase">
                  <Wallet className="h-4 w-4 text-emerald-800" />
                  Max Savings
                </div>
                <p className="mt-1 text-2xl font-extrabold text-emerald-800">
                  ₹{bi.max_potential_savings}
                </p>
                <p className="text-xs text-slate-500">
                  {bi.options_within_budget_count}/{bi.total_options_count} options fit budget
                </p>
              </div>
            </div>
          )}

          <JourneyRecommendation recommendedOption={data.plan.recommended_option} />

          {/* Section 9: Filter Tabs & Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5EAE7] bg-white p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 inline-flex items-center gap-1 text-xs font-bold text-[#727C77]">
                <Filter className="h-3.5 w-3.5 text-[#047857]" />
                Filter:
              </span>
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilterTab(tab.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    activeFilterTab === tab.id
                      ? 'bg-[#022C22] text-white'
                      : 'bg-[#F7F9F8] text-[#17211E] hover:bg-[#ECFDF5]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#727C77]">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-[#E5EAE7] bg-[#F7F9F8] px-3 py-1.5 text-xs font-bold text-[#17211E] focus:border-[#047857] focus:outline-none"
              >
                <option value="balanced">Best Balanced (AI Score)</option>
                <option value="fastest">Earliest &amp; Cheapest (Fastest First)</option>
                <option value="cheapest">Cheapest &amp; Earliest (Lowest Fare First)</option>
                <option value="least_walking">Least Walking Distance</option>
              </select>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="order-2 space-y-4 rounded-3xl border border-[#E5EAE7] bg-white p-4 shadow-sm sm:p-5 lg:order-1 lg:col-span-7">
              <div className="mx-auto h-1 w-10 rounded-full bg-[#E5EAE7] lg:hidden" />
              <h2 className="text-base font-extrabold text-[#17211E]">
                Journey Alternatives ({filteredAndSortedOptions.length})
              </h2>
              {filteredAndSortedOptions.map((opt) => (
                <JourneyResultCard
                  key={opt.option_id}
                  option={opt}
                  isRecommended={
                    data.plan.recommended_option?.option_id === opt.option_id
                  }
                  isSelected={selectedOption?.option_id === opt.option_id}
                  onSelect={(chosen) => {
                    setSelectedOption(chosen);
                    setActiveStepIndex(null);
                  }}
                  onBookPrivateRide={(o) =>
                    navigate(
                      `/book-ride?pickup=${encodeURIComponent(
                        formValues.pickup_address
                      )}&destination=${encodeURIComponent(
                        formValues.destination_address
                      )}&vehicle=${o.vehicle_type || 'Auto'}&passengers=${
                        formValues.passenger_count || 1
                      }`
                    )
                  }
                />
              ))}
            </div>

            <div className="order-1 space-y-4 rounded-3xl border border-[#E5EAE7] bg-white p-4 shadow-sm lg:order-2 lg:col-span-5">
              <h3 className="text-sm font-extrabold text-[#17211E]">
                Interactive Route Map & Step-by-Step Itinerary
              </h3>
              <RouteMap
                waypoints={selectedOption?.waypoints || []}
                transitNodes={data.plan.nearby_transit_nodes || []}
                heightClass="h-80"
                routeMode={
                  selectedOption?.transport_modes?.includes('Walking') &&
                  selectedOption?.transport_modes?.length === 1
                    ? 'walk'
                    : 'drive'
                }
                routeMetrics={
                  selectedOption
                    ? {
                        distanceKm: selectedOption.total_distance_km,
                        durationMin: selectedOption.estimated_duration_minutes
                      }
                    : null
                }
              />

              {/* Section 14: Detailed Step-by-Step Vertical Journey Timeline */}
              {selectedOption && (
                <DetailedJourneyTimeline
                  option={selectedOption}
                  pickupAddress={formValues.pickup_address}
                  destinationAddress={formValues.destination_address}
                  activeStepIndex={activeStepIndex}
                  onSelectStep={(idx) => setActiveStepIndex(idx)}
                />
              )}

              <AIRecommendationPanel
                recommendation={data.ai_recommendation}
                budgetExplanation={data.budget_explanation}
                modelUsed={data.ai_model}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
