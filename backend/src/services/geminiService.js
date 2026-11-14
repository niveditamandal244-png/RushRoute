import { GoogleGenAI, Type } from '@google/genai';
import { env } from '../config/env.js';
import { db } from '../config/database.js';
import {
  budgetExplanationOutputSchema,
  carpoolExplanationOutputSchema,
  complaintDraftOutputSchema,
  incidentAnalysisSchema,
  journeyRecommendationOutputSchema,
  naturalLanguageIntentOutputSchema
} from '../validators/schemas.js';

// Section 14: Mandatory RushRoute AI System Prompt
export const RUSHROUTE_SYSTEM_PROMPT = `You are RushRoute Mobility Intelligence, an AI assistant integrated into a multimodal transportation platform.

Your purpose is to help commuters make informed, affordable and practical transportation decisions.

You must use only the structured transportation information supplied by the backend.

You can:
- Explain available routes.
- Compare journey alternatives.
- Explain budget trade-offs.
- Suggest suitable transport combinations.
- Explain carpool compatibility.
- Summarize transportation incidents.
- Identify relevant user preferences.

You must never invent:
- Bus routes.
- Bus numbers.
- Metro schedules.
- Live vehicle positions.
- Provider availability.
- Actual booking confirmations.
- Fare values.
- Travel duration values.

If information is missing, clearly say that it is unavailable.

Distinguish verified data, estimated data and demonstration data.

Never claim a simulated ride is a real provider booking.

Do not make discriminatory or unsafe transportation recommendations.

Keep responses short, clear, practical and user-friendly.

Return structured JSON matching the requested schema.

Your goal is to help users complete their journeys safely, affordably and conveniently.`;

// Initialize official @google/genai client when API key is present
const ai = env.isGeminiConfigured ? new GoogleGenAI({ apiKey: env.GEMINI_API_KEY }) : null;

async function callGeminiStructured({
  userId = null,
  interactionType,
  prompt,
  responseJsonSchema,
  zodSchema,
  fallbackGenerator,
  inputSummary
}) {
  let finalResult = null;
  let usedModel = env.GEMINI_MODEL || 'gemini-3.8-flash';

  if (ai) {
    const candidateModels = [...new Set([usedModel, 'gemini-3.8-flash', 'gemini-3-flash-preview'])];
    let succeeded = false;

    for (const candidateModel of candidateModels) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini request timeout exceeded (12s)')), 12000)
        );

        const genPromise = ai.models.generateContent({
          model: candidateModel,
          contents: String(prompt).slice(0, 6000),
          config: {
            systemInstruction: RUSHROUTE_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseJsonSchema
          }
        });

        const response = await Promise.race([genPromise, timeoutPromise]);
        const parsed = JSON.parse(response.text || '{}');
        finalResult = zodSchema.parse(parsed);
        usedModel = candidateModel;
        succeeded = true;
        break;
      } catch (err) {
        const msg = String(err?.message || '');
        // If model is deprecated/unavailable to new users (404), try the next candidate model
        if (msg.includes('404') || msg.includes('no longer available') || msg.includes('not found')) {
          continue;
        }
        break;
      }
    }

    if (!succeeded) {
      usedModel = `${usedModel} (safe-structured-fallback)`;
      finalResult = zodSchema.parse(fallbackGenerator());
    }
  } else {
    usedModel = 'deterministic-structured-advisory (GEMINI_API_KEY not set)';
    finalResult = zodSchema.parse(fallbackGenerator());
  }

  // Persist sanitized AI interaction log (never storing tokens, passwords, or sensitive PII)
  try {
    await db.insert('ai_interactions', {
      user_id: userId || null,
      interaction_type: interactionType,
      input_summary: String(inputSummary || '').slice(0, 300),
      output_summary: JSON.stringify(finalResult).slice(0, 500),
      model_name: usedModel
    });
  } catch (_logErr) {
    // Do not fail request if audit log fails
  }

  return {
    data: finalResult,
    model_used: usedModel
  };
}

// 15.1 Journey Recommendation
export async function generateJourneyRecommendation({ userId, journeyPlan, userBudget }) {
  const options = journeyPlan.options || [];
  const recommended = journeyPlan.recommended_option || options[0];

  const prompt = `Compare the supplied journey options and identify the most practical option based on cost, travel duration, transfers and user preferences. Do not invent missing information.
Context JSON:
${JSON.stringify({
  pickup: journeyPlan.pickup_address,
  destination: journeyPlan.destination_address,
  user_budget: userBudget ?? null,
  options: options.map((o) => ({
    option_id: o.option_id,
    title: o.title,
    transport_modes: o.transport_modes,
    estimated_fare: o.estimated_fare,
    estimated_duration_minutes: o.estimated_duration_minutes,
    transfers_count: o.transfers_count,
    within_budget: o.within_budget,
    data_source_label: o.data_source_label
  }))
})}`;

  const responseJsonSchema = {
    type: Type.OBJECT,
    properties: {
      recommended_option_id: { type: Type.STRING },
      reason: { type: Type.STRING },
      alternatives: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            option_id: { type: Type.STRING },
            advantage: { type: Type.STRING },
            disadvantage: { type: Type.STRING }
          },
          required: ['option_id', 'advantage', 'disadvantage']
        }
      },
      budget_assessment: { type: Type.STRING },
      warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
      data_limitations: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: [
      'recommended_option_id',
      'reason',
      'alternatives',
      'budget_assessment',
      'warnings',
      'data_limitations'
    ]
  };

  return callGeminiStructured({
    userId,
    interactionType: 'journey_recommendation',
    inputSummary: `Journey ${journeyPlan.pickup_address} -> ${journeyPlan.destination_address} (budget: ${userBudget ?? 'unspecified'})`,
    prompt,
    responseJsonSchema,
    zodSchema: journeyRecommendationOutputSchema,
    fallbackGenerator: () => {
      const budgetStatus =
        userBudget == null
          ? 'unknown'
          : recommended && recommended.estimated_fare <= Number(userBudget)
          ? 'within_budget'
          : 'above_budget';

      return {
        recommended_option_id: recommended ? recommended.option_id : 'route_metro_multimodal',
        reason: recommended
          ? `${recommended.title} offers the best balance of cost (₹${recommended.estimated_fare}), travel time (${recommended.estimated_duration_minutes} mins), and convenience (${recommended.transfers_count} transfer(s)) based on backend calculations.`
          : 'Selected based on deterministic cost and duration balance.',
        alternatives: options.slice(1, 4).map((alt) => ({
          option_id: alt.option_id,
          advantage:
            alt.estimated_fare < (recommended?.estimated_fare || 999)
              ? `Lower estimated cost at ₹${alt.estimated_fare}`
              : `Direct ${alt.primary_mode} travel in ${alt.estimated_duration_minutes} mins`,
          disadvantage:
            alt.estimated_fare > (recommended?.estimated_fare || 0)
              ? `Higher estimated fare (₹${alt.estimated_fare})`
              : `Requires ${alt.walking_distance_km || 0} km walking (${alt.estimated_duration_minutes} mins total)`
        })),
        budget_assessment: budgetStatus,
        warnings:
          budgetStatus === 'above_budget'
            ? [`Some or all transport options exceed your target budget of ₹${userBudget}.`]
            : ['Peak-hour traffic at major interchanges may slightly increase road travel durations.'],
        data_limitations: [
          'Public transport timings are schedule-based demonstration estimates, not live BMTC/Metro GPS feeds.',
          'Private ride quotes are generated by DemoRideProvider (simulated demonstration data).'
        ]
      };
    }
  });
}

// 15.2 Budget Explanation
export async function generateBudgetExplanation({ userId, journeyPlan, userBudget }) {
  const bi = journeyPlan.budget_intelligence;
  const options = journeyPlan.options || [];
  const cheapest = options.find((o) => o.option_id === bi.cheapest_option_id) || options[0];

  const prompt = `Explain why one journey is more affordable than another using only the supplied numerical information.
Context JSON:
${JSON.stringify({
  user_budget: userBudget ?? bi.user_budget,
  cheapest_option_id: bi.cheapest_option_id,
  cheapest_fare: bi.cheapest_fare,
  max_potential_savings: bi.max_potential_savings,
  budget_status: bi.budget_status,
  options: options.map((o) => ({
    option_id: o.option_id,
    title: o.title,
    estimated_fare: o.estimated_fare,
    estimated_duration_minutes: o.estimated_duration_minutes,
    cost_breakdown: o.cost_breakdown
  }))
})}`;

  const responseJsonSchema = {
    type: Type.OBJECT,
    properties: {
      cheapest_option_id: { type: Type.STRING },
      estimated_savings: { type: Type.NUMBER },
      explanation: { type: Type.STRING },
      budget_status: { type: Type.STRING }
    },
    required: ['cheapest_option_id', 'estimated_savings', 'explanation', 'budget_status']
  };

  return callGeminiStructured({
    userId,
    interactionType: 'budget_explanation',
    inputSummary: `Budget comparison for ${journeyPlan.pickup_address} -> ${journeyPlan.destination_address}`,
    prompt,
    responseJsonSchema,
    zodSchema: budgetExplanationOutputSchema,
    fallbackGenerator: () => ({
      cheapest_option_id: bi.cheapest_option_id,
      estimated_savings: Number(bi.max_potential_savings || 0),
      explanation: `${cheapest?.title || 'Public Bus + Walking'} is the most affordable option at ₹${bi.cheapest_fare}, saving up to ₹${bi.max_potential_savings} compared to the highest-priced private ride option by replacing door-to-door cab pricing with schedule-based public transit and short walking connections.`,
      budget_status: bi.budget_status || 'unknown'
    })
  });
}

// 15.3 Carpool Explanation
export async function generateCarpoolExplanation({ userId, compatibilityResult, sourceRequest, candidateRequest }) {
  const prompt = `Explain the compatibility of two travel requests based on supplied route overlap, pickup proximity, timing and capacity.
Context JSON:
${JSON.stringify({
  compatibility_score: compatibilityResult.compatibility_score,
  estimated_shared_cost: compatibilityResult.estimated_shared_cost,
  estimated_savings: compatibilityResult.estimated_savings,
  metrics: compatibilityResult.metrics,
  source_corridor: `${sourceRequest.pickup_address} -> ${sourceRequest.destination_address}`,
  candidate_corridor: `${candidateRequest.pickup_address} -> ${candidateRequest.destination_address}`
})}`;

  const responseJsonSchema = {
    type: Type.OBJECT,
    properties: {
      compatibility_summary: { type: Type.STRING },
      advantages: { type: Type.ARRAY, items: { type: Type.STRING } },
      limitations: { type: Type.ARRAY, items: { type: Type.STRING } },
      consent_required: { type: Type.BOOLEAN }
    },
    required: ['compatibility_summary', 'advantages', 'limitations', 'consent_required']
  };

  return callGeminiStructured({
    userId,
    interactionType: 'carpool_explanation',
    inputSummary: `Carpool match score ${compatibilityResult.compatibility_score}%`,
    prompt,
    responseJsonSchema,
    zodSchema: carpoolExplanationOutputSchema,
    fallbackGenerator: () => ({
      compatibility_summary: `Deterministic compatibility score is ${compatibilityResult.compatibility_score}% based on a ${compatibilityResult.metrics.pickup_proximity_km} km pickup separation, ${compatibilityResult.metrics.route_overlap_percent}% corridor alignment, and ${compatibilityResult.metrics.departure_time_diff_minutes} minute departure difference.`,
      advantages: [
        `Reduces estimated individual commute cost to ₹${compatibilityResult.estimated_shared_cost} (saving ~₹${compatibilityResult.estimated_savings} vs solo ride).`,
        `${compatibilityResult.metrics.available_seats} seat(s) available on matching commuter request.`,
        `${compatibilityResult.metrics.route_overlap_percent}% directional corridor overlap.`
      ],
      limitations: [
        'Precise pickup coordinates remain hidden until both commuters explicitly accept the match.',
        `Pickup points are ${compatibilityResult.metrics.pickup_proximity_km} km apart (short meeting coordination needed).`
      ],
      consent_required: true
    })
  });
}

// 15.4 Incident Analysis
export async function analyzePassengerIncident({ userId, incident, similarCount = 0 }) {
  const prompt = `Summarize the passenger incident report. Identify its category and important details. Do not claim that the incident has been independently verified.
Context JSON:
${JSON.stringify({
  category: incident.category,
  description: incident.description,
  location: incident.location,
  route_name: incident.route_name || 'Unspecified',
  similar_reports_count: similarCount
})}`;

  const responseJsonSchema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING },
      suggested_category: { type: Type.STRING },
      severity: { type: Type.STRING },
      key_details: { type: Type.ARRAY, items: { type: Type.STRING } },
      requires_human_review: { type: Type.BOOLEAN }
    },
    required: ['summary', 'suggested_category', 'severity', 'key_details', 'requires_human_review']
  };

  return callGeminiStructured({
    userId,
    interactionType: 'incident_analysis',
    inputSummary: `Incident [${incident.category}] at ${incident.location}`,
    prompt,
    responseJsonSchema,
    zodSchema: incidentAnalysisSchema,
    fallbackGenerator: () => {
      const descLower = (incident.description || '').toLowerCase();
      const severity =
        descLower.includes('blocked') || descLower.includes('accident') || incident.category === 'Service disruption'
          ? 'high'
          : incident.category === 'Delay' || incident.category === 'Overcrowding'
          ? 'medium'
          : 'low';

      return {
        summary: `Passenger reported ${incident.category.toLowerCase()} at ${incident.location}${
          incident.route_name ? ` on route ${incident.route_name}` : ''
        }. This report is passenger-submitted and has not been independently verified.`,
        suggested_category: incident.category,
        severity,
        key_details: [
          `Location: ${incident.location}`,
          `Reported Category: ${incident.category}`,
          incident.route_name ? `Affected Route/Service: ${incident.route_name}` : 'Route/Service: General corridor',
          similarCount > 0
            ? `${similarCount} potentially related report(s) found in the same category/corridor.`
            : 'No duplicate reports detected in this corridor yet.'
        ],
        requires_human_review: true
      };
    }
  });
}

// 15.5 Complaint Draft
export async function generateComplaintDraft({ userId, incident }) {
  const prompt = `Prepare a clear, respectful and factual complaint draft based only on the passenger's supplied information.
Context JSON:
${JSON.stringify({
  category: incident.category,
  description: incident.description,
  location: incident.location,
  route_name: incident.route_name || 'Not specified',
  reported_at: incident.created_at
})}`;

  const responseJsonSchema = {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING },
      complaint_body: { type: Type.STRING },
      facts_used: { type: Type.ARRAY, items: { type: Type.STRING } },
      unverified_claims: { type: Type.ARRAY, items: { type: Type.STRING } },
      requires_user_approval: { type: Type.BOOLEAN }
    },
    required: ['subject', 'complaint_body', 'facts_used', 'unverified_claims', 'requires_user_approval']
  };

  return callGeminiStructured({
    userId,
    interactionType: 'complaint_draft',
    inputSummary: `Complaint draft for incident at ${incident.location}`,
    prompt,
    responseJsonSchema,
    zodSchema: complaintDraftOutputSchema,
    fallbackGenerator: () => ({
      subject: `Passenger Service Feedback: ${incident.category} near ${incident.location}${
        incident.route_name ? ` (${incident.route_name})` : ''
      }`,
      complaint_body: `To the Transit Operations Desk,\n\nI am writing to report a commuting issue experienced at ${incident.location}${
        incident.route_name ? ` involving route/service ${incident.route_name}` : ''
      } on ${new Date(incident.created_at || Date.now()).toLocaleString()}.\n\nIncident Category: ${incident.category}\nPassenger Observation: ${incident.description}\n\nI kindly request the operations team to review this corridor for scheduling or service improvements.\n\nSincerely,\nA RushRoute Commuter`,
      facts_used: [
        `Reported category: ${incident.category}`,
        `Reported location: ${incident.location}`,
        `Reported description: ${incident.description}`,
        `Timestamp: ${incident.created_at || new Date().toISOString()}`
      ],
      unverified_claims: [
        'Passenger observation has not been independently verified by transit authority telemetry.'
      ],
      requires_user_approval: true
    })
  });
}

// 15.6 Natural-Language Journey Intent
export async function parseNaturalLanguageJourneyIntent({ userId, queryText }) {
  const prompt = `Convert the user's natural-language travel request into structured journey preferences. Do not infer unavailable locations or exact transportation schedules.
User query: "${String(queryText).slice(0, 500)}"`;

  const responseJsonSchema = {
    type: Type.OBJECT,
    properties: {
      pickup: { type: Type.STRING, nullable: true },
      destination: { type: Type.STRING, nullable: true },
      maximum_budget: { type: Type.NUMBER },
      preferred_modes: { type: Type.ARRAY, items: { type: Type.STRING } },
      departure_preference: { type: Type.STRING, nullable: true },
      missing_information: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: [
      'pickup',
      'destination',
      'maximum_budget',
      'preferred_modes',
      'departure_preference',
      'missing_information'
    ]
  };

  return callGeminiStructured({
    userId,
    interactionType: 'natural_language_intent',
    inputSummary: String(queryText).slice(0, 200),
    prompt,
    responseJsonSchema,
    zodSchema: naturalLanguageIntentOutputSchema,
    fallbackGenerator: () => {
      const text = String(queryText || '');
      const fromToMatch = text.match(/from\s+([^,.]+?)\s+to\s+([^,.]+?)(?:\s+under|\s+within|\s+by|\s+using|$)/i);
      const budgetMatch = text.match(/(?:under|below|within|budget|rs\.?|₹)\s*(\d+)/i);
      const modes = [];
      if (/metro/i.test(text)) modes.push('Metro');
      if (/bus/i.test(text)) modes.push('Bus');
      if (/auto/i.test(text)) modes.push('Auto');
      if (/bike/i.test(text)) modes.push('Bike');
      if (/sedan|cab|mini/i.test(text)) modes.push('Mini');

      const pickup = fromToMatch ? fromToMatch[1].trim() : null;
      const destination = fromToMatch ? fromToMatch[2].trim() : null;
      const maxBudget = budgetMatch ? Number(budgetMatch[1]) : 0;
      const missing = [];
      if (!pickup) missing.push('pickup location');
      if (!destination) missing.push('destination location');
      if (!maxBudget) missing.push('maximum budget');

      return {
        pickup,
        destination,
        maximum_budget: maxBudget,
        preferred_modes: modes,
        departure_preference: /morning|now|urgent|evening/i.test(text)
          ? text.match(/morning|now|urgent|evening/i)[0]
          : null,
        missing_information: missing
      };
    }
  });
}
