import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import {
  ComplaintPreview,
  IncidentCard,
  IncidentReportForm
} from '../components/IncidentComponents';
import { EmptyState, ErrorState, LoadingState, ToastNotification } from '../components/GeneralComponents';

export function ReportIssuePage() {
  const [formValues, setFormValues] = useState({
    category: 'Delay',
    location: 'Silk Board Junction',
    route_name: 'Corridor 500-D (Demo)',
    service_name: 'City Bus',
    description: ''
  });

  const [incidents, setIncidents] = useState([]);
  const [activeDraft, setActiveDraft] = useState(null);
  const [activeAnalysis, setActiveAnalysis] = useState(null);
  const [similarReports, setSimilarReports] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const loadIncidents = async () => {
    setLoadingList(true);
    try {
      const res = await apiClient.get('/incidents');
      setIncidents(res.data.incidents || []);
    } catch {
      // Ignore
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await apiClient.post('/incidents', formValues);
      setActiveAnalysis(res.data.ai_analysis);
      setActiveDraft(res.data.complaint_draft);
      setSimilarReports(res.data.similar_reports || []);
      setFormValues((prev) => ({ ...prev, description: '' }));
      setToast({
        type: 'success',
        message: 'Incident recorded and summarized by Gemini AI!'
      });
      loadIncidents();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to submit incident report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnalyzeExisting = async (incidentId) => {
    setAnalyzingId(incidentId);
    setError('');
    try {
      const res = await apiClient.post(`/incidents/${incidentId}/analyze`);
      setActiveAnalysis(res.data.ai_analysis);
      setActiveDraft(res.data.complaint_draft);
      setSimilarReports(res.data.similar_reports || []);
      loadIncidents();
      setToast({
        type: 'success',
        message: 'AI summary & complaint draft generated below!'
      });
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to analyze incident.');
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Passenger Incident Reporting & AI Grievance Drafts
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Report bus delays, skipped stops, overcrowding, or road obstructions. Gemini summarizes reports, identifies similar complaints, and prepares factual drafts for your approval.
        </p>
      </div>

      <IncidentReportForm
        values={formValues}
        onChange={setFormValues}
        onSubmit={handleSubmit}
        loading={submitting}
      />

      <ErrorState message={error} />

      {activeDraft && (
        <ComplaintPreview complaintDraft={activeDraft} analysis={activeAnalysis} />
      )}

      {similarReports.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-bold">
            Potential Duplicate / Related Corridor Reports Detected ({similarReports.length}):
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            {similarReports.map((sim) => (
              <li key={sim.id}>
                <strong>{sim.category}</strong> at {sim.location}: "{sim.description}"
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          Recent Community Transit Incident Reports ({incidents.length})
        </h2>
        {loadingList ? (
          <LoadingState message="Loading reported commuting incidents..." />
        ) : incidents.length === 0 ? (
          <EmptyState
            title="No incidents reported yet"
            description="Submit a report above to help commuters stay informed."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {incidents.map((inc) => (
              <IncidentCard
                key={inc.id}
                incident={inc}
                onAnalyze={handleAnalyzeExisting}
                analyzingId={analyzingId}
              />
            ))}
          </div>
        )}
      </div>

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
