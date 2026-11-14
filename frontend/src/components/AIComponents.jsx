import React from 'react';
import { AlertTriangle, CheckCircle2, Info, Sparkles, Wallet } from 'lucide-react';

export function AIInsightCard({ title, badge = 'Gemini Mobility AI', children }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-linear-to-br from-emerald-50/80 via-white to-slate-50 p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        </div>
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
          {badge}
        </span>
      </div>
      <div className="mt-3 text-sm text-slate-700">{children}</div>
    </div>
  );
}

export function AIExplanation({ budgetExplanation }) {
  if (!budgetExplanation) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-emerald-600" />
          <h4 className="text-sm font-bold text-slate-900">Smart Budget Trade-Off Analysis</h4>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            budgetExplanation.budget_status === 'within_budget'
              ? 'bg-emerald-100 text-emerald-800'
              : budgetExplanation.budget_status === 'above_budget'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {budgetExplanation.budget_status === 'within_budget'
            ? 'Within Target Budget'
            : budgetExplanation.budget_status === 'above_budget'
            ? 'Above Target Budget'
            : 'No Budget Cap Set'}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{budgetExplanation.explanation}</p>
      {budgetExplanation.estimated_savings > 0 && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Potential savings up to ₹{budgetExplanation.estimated_savings} compared to peak private cab option
        </div>
      )}
    </div>
  );
}

export function AIRecommendationPanel({ recommendation, budgetExplanation, modelUsed }) {
  if (!recommendation) return null;

  const isLiveGemini =
    modelUsed &&
    String(modelUsed).toLowerCase().includes('gemini') &&
    !String(modelUsed).toLowerCase().includes('fallback');

  return (
    <div className="space-y-4">
      <AIInsightCard
        title={isLiveGemini ? 'Gemini AI Recommendation' : 'Demo AI Recommendation'}
        badge={
          isLiveGemini
            ? `Gemini AI Recommendation (${modelUsed})`
            : 'Demo AI Recommendation (Deterministic Local Engine)'
        }
      >
        <p className="font-medium text-slate-900">{recommendation.reason}</p>

        {recommendation.alternatives?.length > 0 && (
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {recommendation.alternatives.map((alt) => (
              <div
                key={alt.option_id}
                className="rounded-xl border border-slate-200/80 bg-white/90 p-3 text-xs"
              >
                <p className="font-semibold text-slate-800 uppercase">{alt.option_id.replace(/_/g, ' ')}</p>
                <p className="mt-1 text-emerald-700">
                  <strong>Advantage:</strong> {alt.advantage}
                </p>
                <p className="mt-0.5 text-slate-500">
                  <strong>Trade-off:</strong> {alt.disadvantage}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {recommendation.warnings?.length > 0 && (
            <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Commute Advisory
              </div>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {recommendation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendation.data_limitations?.length > 0 && (
            <div className="rounded-xl bg-slate-100 p-3 text-xs text-slate-700">
              <div className="flex items-center gap-1.5 font-semibold">
                <Info className="h-3.5 w-3.5 text-slate-600" />
                Data Provenance & Transparency
              </div>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {recommendation.data_limitations.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AIInsightCard>

      <AIExplanation budgetExplanation={budgetExplanation} />
    </div>
  );
}
