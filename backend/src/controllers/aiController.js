import { planMultimodalJourneys } from '../services/transitService.js';
import { calculateCarpoolCompatibility } from '../services/carpoolService.js';
import {
  analyzePassengerIncident,
  generateBudgetExplanation,
  generateCarpoolExplanation,
  generateComplaintDraft,
  generateJourneyRecommendation,
  parseNaturalLanguageJourneyIntent
} from '../services/geminiService.js';

export async function getJourneyAdvice(req, res) {
  try {
    const {
      natural_language_query,
      pickup_address,
      destination_address,
      maximum_budget,
      preferred_mode
    } = req.body;

    let parsedIntent = null;
    let resolvedPickup = pickup_address;
    let resolvedDestination = destination_address;
    let resolvedBudget = maximum_budget;
    let resolvedMode = preferred_mode;

    if (natural_language_query) {
      const intentRes = await parseNaturalLanguageJourneyIntent({
        userId: req.user?.id,
        queryText: natural_language_query
      });
      parsedIntent = intentRes.data;
      if (!resolvedPickup && parsedIntent.pickup) resolvedPickup = parsedIntent.pickup;
      if (!resolvedDestination && parsedIntent.destination) resolvedDestination = parsedIntent.destination;
      if (!resolvedBudget && parsedIntent.maximum_budget > 0) resolvedBudget = parsedIntent.maximum_budget;
      if (!resolvedMode && parsedIntent.preferred_modes?.length > 0) {
        resolvedMode = parsedIntent.preferred_modes[0];
      }
    }

    if (!resolvedPickup || !resolvedDestination) {
      return res.status(200).json({
        success: true,
        parsed_intent: parsedIntent,
        requires_locations: true,
        message: 'Parsed travel preferences. Please specify pickup and destination to compute verified route costs.'
      });
    }

    const plan = planMultimodalJourneys({
      pickup_address: resolvedPickup,
      destination_address: resolvedDestination,
      maximum_budget: resolvedBudget,
      preferred_mode: resolvedMode
    });

    const [recommendation, budgetExplanation] = await Promise.all([
      generateJourneyRecommendation({
        userId: req.user?.id,
        journeyPlan: plan,
        userBudget: resolvedBudget
      }),
      generateBudgetExplanation({
        userId: req.user?.id,
        journeyPlan: plan,
        userBudget: resolvedBudget
      })
    ]);

    return res.status(200).json({
      success: true,
      parsed_intent: parsedIntent,
      journey_plan: plan,
      recommendation: recommendation.data,
      budget_explanation: budgetExplanation.data,
      model_used: recommendation.model_used
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to generate AI journey advice.'
    });
  }
}

export async function getRouteExplanation(req, res) {
  try {
    const {
      pickup_address,
      destination_address,
      maximum_budget,
      preferred_mode
    } = req.body;

    if (!pickup_address || !destination_address) {
      return res.status(400).json({
        success: false,
        error: 'pickup_address and destination_address are required.'
      });
    }

    const plan = planMultimodalJourneys({
      pickup_address,
      destination_address,
      maximum_budget,
      preferred_mode
    });

    const [recommendation, budgetExplanation] = await Promise.all([
      generateJourneyRecommendation({
        userId: req.user?.id,
        journeyPlan: plan,
        userBudget: maximum_budget
      }),
      generateBudgetExplanation({
        userId: req.user?.id,
        journeyPlan: plan,
        userBudget: maximum_budget
      })
    ]);

    return res.status(200).json({
      success: true,
      recommendation: recommendation.data,
      budget_explanation: budgetExplanation.data,
      backend_source_metadata: {
        distance_km: plan.distance_km,
        cheapest_fare: plan.budget_intelligence.cheapest_fare,
        fastest_duration_minutes: plan.budget_intelligence.fastest_duration_minutes,
        data_origin: 'Deterministic Backend Calculation + Schedule-Based Demo Dataset'
      }
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to generate route explanation.'
    });
  }
}

export async function getIncidentSummary(req, res) {
  try {
    const { category = 'Delay', description, location, route_name } = req.body;
    if (!description || !location) {
      return res.status(400).json({
        success: false,
        error: 'description and location are required.'
      });
    }

    const incidentPayload = {
      category,
      description,
      location,
      route_name: route_name || null,
      created_at: new Date().toISOString()
    };

    const [analysis, complaintDraft] = await Promise.all([
      analyzePassengerIncident({
        userId: req.user?.id,
        incident: incidentPayload,
        similarCount: 0
      }),
      generateComplaintDraft({
        userId: req.user?.id,
        incident: incidentPayload
      })
    ]);

    return res.status(200).json({
      success: true,
      incident_analysis: analysis.data,
      complaint_draft: complaintDraft.data,
      model_used: analysis.model_used
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to summarize passenger incident.'
    });
  }
}

export async function getCarpoolExplanation(req, res) {
  try {
    const { source_request, candidate_request } = req.body;
    if (
      !source_request?.pickup_address ||
      !source_request?.destination_address ||
      !candidate_request?.pickup_address ||
      !candidate_request?.destination_address
    ) {
      return res.status(400).json({
        success: false,
        error: 'Both source_request and candidate_request with pickup_address and destination_address are required.'
      });
    }

    const comp = calculateCarpoolCompatibility(
      {
        ...source_request,
        departure_time: source_request.departure_time || new Date().toISOString(),
        available_seats: source_request.available_seats || 2
      },
      {
        ...candidate_request,
        departure_time: candidate_request.departure_time || new Date().toISOString(),
        available_seats: candidate_request.available_seats || 2
      }
    );

    const explanation = await generateCarpoolExplanation({
      userId: req.user?.id,
      compatibilityResult: comp,
      sourceRequest: source_request,
      candidateRequest: candidate_request
    });

    return res.status(200).json({
      success: true,
      deterministic_compatibility: comp,
      ai_explanation: explanation.data,
      model_used: explanation.model_used
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to generate carpool compatibility explanation.'
    });
  }
}
