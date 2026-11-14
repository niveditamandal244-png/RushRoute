import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { apiClient } from '../services/api';
import {
  JourneyRecommendation,
  JourneyResultCard,
  JourneySearchForm
} from '../components/JourneyComponents';
import { RouteMap } from '../components/RouteMap';
import { AIRecommendationPanel } from '../components/AIComponents';
import { ErrorState, LoadingState } from '../components/GeneralComponents';

export function JourneyResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formValues, setFormValues] = useState({
    pickup_address:
      searchParams.get('pickup') || 'Indiranagar (100 Feet Road / Metro)',
    destination_address:
      searchParams.get('destination') || 'Whitefield (Kadugodi / ITPL)',
    maximum_budget: searchParams.get('budget') ? Number(searchParams.get('budget')) : 200,
    preferred_mode: searchParams.get('mode') || 'Any',
    departure_time: ''
  });

  const [data, setData] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const executeComparison = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/journeys/recommend', {
        pickup_address: formValues.pickup_address,
        destination_address: formValues.destination_address,
        maximum_budget: formValues.maximum_budget || undefined,
        preferred_mode: formValues.preferred_mode || 'Any'
      });
      setData(res.data);
      setSelectedOption(res.data.plan?.recommended_option || res.data.plan?.options?.[0] || null);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load journey comparison.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeComparison();
  }, []);

  const bi = data?.plan?.budget_intelligence;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Multimodal Journey Comparison & Smart Budget Intelligence
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Compare Private Rides, Public Transit, Multimodal Combos, and Shared Carpool costs side-by-side.
        </p>
      </div>

      <JourneySearchForm
        values={formValues}
        onChange={setFormValues}
        onSubmit={executeComparison}
        loading={loading}
        submitLabel="Recalculate Alternatives"
      />

      <ErrorState message={error} onRetry={executeComparison} />

      {loading && <LoadingState message="Calculating deterministic fares & AI recommendation..." />}

      {!loading && data?.plan && (
        <div className="space-y-6">
          {/* Smart Budget Intelligence Summary Strip */}
          {bi && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  Cheapest Option
                </div>
                <p className="mt-1 text-2xl font-extrabold text-emerald-700">₹{bi.cheapest_fare}</p>
                <p className="text-xs text-slate-500">{bi.cheapest_option_id.replace(/_/g, ' ')}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 uppercase">Fastest Duration</span>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                  {bi.fastest_duration_minutes} mins
                </p>
                <p className="text-xs text-slate-500">{bi.fastest_option_id.replace(/_/g, ' ')}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 uppercase">Max Savings</span>
                <p className="mt-1 text-2xl font-extrabold text-emerald-600">
                  ₹{bi.max_potential_savings}
                </p>
                <p className="text-xs text-slate-500">Compared to solo sedan ride</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 uppercase">Budget Fit</span>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                  {bi.options_within_budget_count} / {bi.total_options_count}
                </p>
                <p className="text-xs text-slate-500">
                  Options within {bi.user_budget ? `₹${bi.user_budget}` : 'your budget'}
                </p>
              </div>
            </div>
          )}

          <JourneyRecommendation recommendedOption={data.plan.recommended_option} />

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <h2 className="text-base font-bold text-slate-900">
                All Journey Alternatives ({data.plan.options?.length || 0})
              </h2>
              {data.plan.options?.map((opt) => (
                <JourneyResultCard
                  key={opt.option_id}
                  option={opt}
                  isRecommended={
                    data.plan.recommended_option?.option_id === opt.option_id
                  }
                  isSelected={selectedOption?.option_id === opt.option_id}
                  onSelect={setSelectedOption}
                  onBookPrivateRide={(o) =>
                    navigate(
                      `/book-ride?pickup=${encodeURIComponent(
                        formValues.pickup_address
                      )}&destination=${encodeURIComponent(
                        formValues.destination_address
                      )}&vehicle=${o.vehicle_type || 'Auto'}`
                    )
                  }
                />
              ))}
            </div>

            <div className="space-y-4 lg:col-span-5">
              <h3 className="text-base font-bold text-slate-900">Selected Alternative Map</h3>
              <RouteMap waypoints={selectedOption?.waypoints || []} heightClass="h-80" />
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
