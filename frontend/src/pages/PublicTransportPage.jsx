import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { apiClient } from '../services/api';
import {
  JourneyRecommendation,
  JourneyResultCard,
  JourneySearchForm
} from '../components/JourneyComponents';
import { RouteMap } from '../components/RouteMap';
import { AIRecommendationPanel } from '../components/AIComponents';
import { ErrorState, LoadingState } from '../components/GeneralComponents';

export function PublicTransportPage() {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    pickup_address: 'Indiranagar (100 Feet Road / Metro)',
    destination_address: 'Majestic (Kempegowda Bus Station / Metro Hub)',
    maximum_budget: 150,
    preferred_mode: 'Metro',
    departure_time: ''
  });

  const [result, setResult] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/journeys/recommend', {
        pickup_address: formValues.pickup_address,
        destination_address: formValues.destination_address,
        maximum_budget: formValues.maximum_budget || undefined,
        preferred_mode: formValues.preferred_mode || 'Any',
        departure_time: formValues.departure_time || undefined
      });
      setResult(res.data);
      const transitOpts = (res.data.plan?.options || []).filter(
        (o) => o.category === 'public_transport' || o.category === 'multimodal'
      );
      setSelectedOption(transitOpts[0] || res.data.plan?.recommended_option || null);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to plan public transport route.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const publicAndMultimodalOptions =
    result?.plan?.options?.filter(
      (o) => o.category === 'public_transport' || o.category === 'multimodal'
    ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Public Transport & Multimodal Planner</h1>
        <p className="mt-1 text-sm text-slate-600">
          Plan step-by-step Bus, Metro, Walking, and First-Mile Auto combinations with transfer points and walking distances.
        </p>
      </div>

      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div>
          <strong>Data Transparency Notice (Section 4.2 Compliance):</strong> Public transport routes, headways, and fares shown below are schedule-based demonstration estimates. RushRoute never claims unauthorized live BMTC GPS tracking or fabricated bus numbers.
        </div>
      </div>

      <JourneySearchForm
        values={formValues}
        onChange={setFormValues}
        onSubmit={handleSearch}
        loading={loading}
        submitLabel="Plan Public Transit Route"
      />

      <ErrorState message={error} onRetry={handleSearch} />

      {loading && <LoadingState message="Computing multimodal Bus, Metro & Walking connections..." />}

      {!loading && result?.plan && (
        <div className="space-y-6">
          <JourneyRecommendation recommendedOption={selectedOption || result.plan.recommended_option} />

          <div className="grid gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <h2 className="text-base font-bold text-slate-900">
                Suggested Public & Multimodal Routes ({publicAndMultimodalOptions.length})
              </h2>
              {publicAndMultimodalOptions.map((opt) => (
                <JourneyResultCard
                  key={opt.option_id}
                  option={opt}
                  isRecommended={
                    result.plan.recommended_option?.option_id === opt.option_id
                  }
                  isSelected={selectedOption?.option_id === opt.option_id}
                  onSelect={setSelectedOption}
                  onBookPrivateRide={(o) =>
                    navigate(
                      `/book-ride?pickup=${encodeURIComponent(
                        formValues.pickup_address
                      )}&destination=${encodeURIComponent(formValues.destination_address)}&vehicle=${
                        o.vehicle_type || 'Auto'
                      }`
                    )
                  }
                />
              ))}
            </div>

            <div className="space-y-4 lg:col-span-5">
              <h3 className="text-base font-bold text-slate-900">
                Interactive Route & Transfer Hub Map
              </h3>
              <RouteMap
                waypoints={selectedOption?.waypoints || []}
                heightClass="h-80"
              />
              <AIRecommendationPanel
                recommendation={result.ai_recommendation}
                budgetExplanation={result.budget_explanation}
                modelUsed={result.ai_model}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
