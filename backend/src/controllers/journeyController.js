import { db } from '../config/database.js';
import { planMultimodalJourneys } from '../services/transitService.js';
import {
  generateBudgetExplanation,
  generateJourneyRecommendation
} from '../services/geminiService.js';

export async function searchJourneys(req, res) {
  try {
    const plan = planMultimodalJourneys(req.body);

    let savedJourney = null;
    if (req.user) {
      const rec = plan.recommended_option;
      savedJourney = await db.insert('journeys', {
        user_id: req.user.id,
        pickup_address: plan.pickup_address,
        destination_address: plan.destination_address,
        transport_modes: rec ? rec.transport_modes : ['Bus', 'Metro'],
        estimated_fare: rec ? rec.estimated_fare : 0,
        estimated_duration_minutes: rec ? rec.estimated_duration_minutes : 0,
        route_details: {
          recommended_option: rec,
          budget_intelligence: plan.budget_intelligence,
          options_count: plan.options.length,
          all_options: plan.options
        },
        journey_status: 'planned'
      });
    }

    return res.status(200).json({
      success: true,
      journey_id: savedJourney ? savedJourney.id : null,
      plan
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to plan multimodal journeys.'
    });
  }
}

export async function getJourneyHistory(req, res) {
  try {
    const journeys = await db.findMany('journeys', (j) => j.user_id === req.user.id);
    const bookings = await db.findMany('ride_bookings', (b) => b.user_id === req.user.id);

    return res.status(200).json({
      success: true,
      journeys,
      ride_bookings: bookings
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve journey history.'
    });
  }
}

export async function getJourneyById(req, res) {
  try {
    const journey = await db.findOne(
      'journeys',
      (j) => j.id === req.params.id && j.user_id === req.user.id
    );
    if (!journey) {
      return res.status(404).json({
        success: false,
        error: 'Journey record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      journey
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve journey details.'
    });
  }
}

export async function recommendJourney(req, res) {
  try {
    const plan = planMultimodalJourneys(req.body);
    const [aiRecommendation, budgetExplanation] = await Promise.all([
      generateJourneyRecommendation({
        userId: req.user?.id,
        journeyPlan: plan,
        userBudget: req.body.maximum_budget
      }),
      generateBudgetExplanation({
        userId: req.user?.id,
        journeyPlan: plan,
        userBudget: req.body.maximum_budget
      })
    ]);

    return res.status(200).json({
      success: true,
      plan,
      ai_recommendation: aiRecommendation.data,
      budget_explanation: budgetExplanation.data,
      ai_model: aiRecommendation.model_used
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to generate journey recommendation.'
    });
  }
}
