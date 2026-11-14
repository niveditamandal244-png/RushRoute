import { db, withDatabaseTransaction } from '../config/database.js';
import {
  calculateCarpoolCompatibility,
  sanitizeCarpoolRequestForPrivacy
} from '../services/carpoolService.js';
import { generateCarpoolExplanation } from '../services/geminiService.js';
import { resolveCoordinates } from '../utils/geo.js';

export async function createCarpoolRequest(req, res) {
  try {
    const {
      pickup_address,
      destination_address,
      pickup_latitude,
      pickup_longitude,
      destination_latitude,
      destination_longitude,
      departure_time,
      available_seats,
      estimated_budget
    } = req.body;

    const start = resolveCoordinates(pickup_address, pickup_latitude, pickup_longitude);
    const end = resolveCoordinates(destination_address, destination_latitude, destination_longitude);

    const created = await db.insert('carpool_requests', {
      user_id: req.user.id,
      pickup_address,
      destination_address,
      pickup_latitude: start.lat,
      pickup_longitude: start.lng,
      destination_latitude: end.lat,
      destination_longitude: end.lng,
      departure_time: new Date(departure_time).toISOString(),
      available_seats: Number(available_seats),
      estimated_budget: estimated_budget ?? null,
      status: 'open'
    });

    return res.status(201).json({
      success: true,
      message: 'Carpool request published. Searching compatible commuters...',
      carpool_request: created
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to create carpool request.'
    });
  }
}

export async function listCarpoolRequests(req, res) {
  try {
    const myRequests = await db.findMany('carpool_requests', (r) => r.user_id === req.user.id);
    const myRequestIds = new Set(myRequests.map((r) => r.id));

    const allMatches = await db.findMany(
      'carpool_matches',
      (m) => myRequestIds.has(m.request_id) || myRequestIds.has(m.matched_request_id)
    );

    const allUsers = await db.findMany('app_users', {});
    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const allRequests = await db.findMany('carpool_requests', {});
    const reqMap = new Map(allRequests.map((r) => [r.id, r]));

    const enrichedMatches = allMatches.map((m) => {
      const isMutuallyAccepted = m.match_status === 'accepted';
      const partnerRequestId = myRequestIds.has(m.request_id) ? m.matched_request_id : m.request_id;
      const partnerReq = reqMap.get(partnerRequestId);
      const partnerUser = partnerReq ? userMap.get(partnerReq.user_id) : null;

      return {
        ...m,
        partner_journey: partnerReq
          ? sanitizeCarpoolRequestForPrivacy(partnerReq, partnerUser, isMutuallyAccepted)
          : null
      };
    });

    return res.status(200).json({
      success: true,
      my_requests: myRequests,
      matches: enrichedMatches
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve carpool requests.'
    });
  }
}

export async function searchCarpoolMatches(req, res) {
  try {
    const {
      request_id,
      pickup_address,
      destination_address,
      pickup_latitude,
      pickup_longitude,
      destination_latitude,
      destination_longitude,
      departure_time,
      available_seats = 1,
      estimated_budget
    } = req.body;

    let sourceRequest = null;

    if (request_id) {
      sourceRequest = await db.findOne(
        'carpool_requests',
        (r) => r.id === request_id && r.user_id === req.user.id
      );
      if (!sourceRequest) {
        return res.status(404).json({
          success: false,
          error: 'Source carpool request not found.'
        });
      }
    } else {
      if (!pickup_address || !destination_address) {
        return res.status(400).json({
          success: false,
          error: 'Please provide either request_id or pickup_address and destination_address.'
        });
      }
      if (pickup_address.trim().toLowerCase() === destination_address.trim().toLowerCase()) {
        return res.status(400).json({
          success: false,
          error: 'Pickup and destination cannot be identical.'
        });
      }
      const start = resolveCoordinates(pickup_address, pickup_latitude, pickup_longitude);
      const end = resolveCoordinates(destination_address, destination_latitude, destination_longitude);

      sourceRequest = await db.insert('carpool_requests', {
        user_id: req.user.id,
        pickup_address,
        destination_address,
        pickup_latitude: start.lat,
        pickup_longitude: start.lng,
        destination_latitude: end.lat,
        destination_longitude: end.lng,
        departure_time: departure_time ? new Date(departure_time).toISOString() : new Date().toISOString(),
        available_seats: Number(available_seats) || 1,
        estimated_budget: estimated_budget ?? null,
        status: 'open'
      });
    }

    // Find open candidate requests from other users (including demonstration commuters)
    const candidates = await db.findMany(
      'carpool_requests',
      (r) => r.user_id !== req.user.id && r.status === 'open' && r.id !== sourceRequest.id
    );

    const allUsers = await db.findMany('app_users', {});
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const matchResults = [];

    for (const candidate of candidates) {
      const comp = calculateCarpoolCompatibility(sourceRequest, candidate);

      // Persist or retrieve match record safely without duplicating pairs
      const matchRecord = await withDatabaseTransaction(async () => {
        const pairKeyA = [sourceRequest.id, candidate.id].sort().join(':');
        const existing = await db.findOne('carpool_matches', (m) => {
          const pairKeyB = [m.request_id, m.matched_request_id].sort().join(':');
          return pairKeyA === pairKeyB;
        });

        if (existing) {
          return existing;
        }

        return db.insert('carpool_matches', {
          request_id: sourceRequest.id,
          matched_request_id: candidate.id,
          compatibility_score: comp.compatibility_score,
          estimated_shared_cost: comp.estimated_shared_cost,
          match_status: 'pending'
        });
      });

      const isMutuallyAccepted = matchRecord.match_status === 'accepted';
      const partnerUser = userMap.get(candidate.user_id);
      const aiExplain = await generateCarpoolExplanation({
        userId: req.user.id,
        compatibilityResult: comp,
        sourceRequest,
        candidateRequest: candidate
      });

      matchResults.push({
        match_id: matchRecord.id,
        request_id: sourceRequest.id,
        matched_request_id: candidate.id,
        compatibility_score: Number(matchRecord.compatibility_score),
        estimated_shared_cost: Number(matchRecord.estimated_shared_cost),
        estimated_solo_cost: comp.estimated_solo_cost,
        estimated_savings: comp.estimated_savings,
        match_status: matchRecord.match_status,
        metrics: comp.metrics,
        deterministic_explanation: comp.explanation,
        ai_explanation: aiExplain.data,
        partner_journey: sanitizeCarpoolRequestForPrivacy(
          candidate,
          partnerUser,
          isMutuallyAccepted
        )
      });
    }

    matchResults.sort((a, b) => b.compatibility_score - a.compatibility_score);

    return res.status(200).json({
      success: true,
      source_request: sourceRequest,
      matches_count: matchResults.length,
      matches: matchResults
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to search carpool matches.'
    });
  }
}

export async function respondToCarpoolMatch(req, res) {
  try {
    const matchId = req.params.id;
    const { action, reason } = req.body;

    const match = await db.findOne('carpool_matches', (m) => m.id === matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Carpool match not found.'
      });
    }

    const reqA = await db.findOne('carpool_requests', (r) => r.id === match.request_id);
    const reqB = await db.findOne('carpool_requests', (r) => r.id === match.matched_request_id);

    const isParticipant =
      (reqA && reqA.user_id === req.user.id) || (reqB && reqB.user_id === req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this carpool match.'
      });
    }

    const partnerReq = reqA && reqA.user_id === req.user.id ? reqB : reqA;
    const partnerUser = partnerReq
      ? await db.findOne('app_users', (u) => u.id === partnerReq.user_id)
      : null;

    let nextStatus = match.match_status;
    let statusMessage = '';

    if (action === 'decline') {
      nextStatus = 'declined';
      statusMessage = 'Carpool match declined. No personal coordinates were shared.';
    } else if (action === 'report' || action === 'block') {
      nextStatus = 'reported';
      statusMessage = `Carpool match ${action}ed and closed for your safety.`;
      if (reason) {
        await db.insert('incident_reports', {
          user_id: req.user.id,
          category: 'Other',
          description: `Carpool safety report (${action}): ${reason}`,
          location: partnerReq?.pickup_address || 'Carpool Match',
          route_name: `Carpool Match ${match.id}`,
          status: 'under_review'
        });
      }
    } else if (action === 'accept') {
      // If partner is one of the seeded Demonstration Accounts (*.demo@rushroute.in),
      // simulate partner consent upon user acceptance so mutual consent flow can be verified end-to-end,
      // while for two real users require both users to accept separately.
      const isDemoPartner = partnerUser && partnerUser.email.endsWith('.demo@rushroute.in');
      if (
        isDemoPartner ||
        match.match_status === 'requester_accepted' ||
        match.match_status === 'partner_accepted'
      ) {
        nextStatus = 'accepted';
        statusMessage =
          'Mutual consent confirmed! Shared pickup coordinates and contact details are now unlocked.';
      } else {
        nextStatus = reqA.user_id === req.user.id ? 'requester_accepted' : 'partner_accepted';
        statusMessage =
          'Your acceptance is recorded. Waiting for the other commuter to accept before revealing exact coordinates.';
      }
    }

    const updatedMatch = await db.update('carpool_matches', match.id, {
      match_status: nextStatus
    });

    const isMutuallyAccepted = updatedMatch.match_status === 'accepted';

    return res.status(200).json({
      success: true,
      message: statusMessage,
      match: {
        ...updatedMatch,
        partner_journey: partnerReq
          ? sanitizeCarpoolRequestForPrivacy(partnerReq, partnerUser, isMutuallyAccepted)
          : null
      }
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update carpool match response.'
    });
  }
}

export async function cancelCarpoolMatch(req, res) {
  try {
    const matchId = req.params.id;
    const match = await db.findOne('carpool_matches', (m) => m.id === matchId);
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Carpool match not found.'
      });
    }

    const reqA = await db.findOne('carpool_requests', (r) => r.id === match.request_id);
    const reqB = await db.findOne('carpool_requests', (r) => r.id === match.matched_request_id);

    const isParticipant =
      (reqA && reqA.user_id === req.user.id) || (reqB && reqB.user_id === req.user.id);
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to cancel this match.'
      });
    }

    const cancelled = await db.update('carpool_matches', match.id, {
      match_status: 'cancelled'
    });

    return res.status(200).json({
      success: true,
      message: 'Carpool match cancelled. Private location sharing has been revoked.',
      match: cancelled
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to cancel carpool match.'
    });
  }
}
