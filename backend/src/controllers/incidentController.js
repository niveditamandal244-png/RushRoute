import { db } from '../config/database.js';
import {
  analyzePassengerIncident,
  generateComplaintDraft
} from '../services/geminiService.js';
import { resolveCoordinates } from '../utils/geo.js';

function findSimilarIncidents(allIncidents, target) {
  const targetLoc = (target.location || '').toLowerCase();
  const targetRoute = (target.route_name || '').toLowerCase();

  return allIncidents.filter((inc) => {
    if (inc.id === target.id) return false;
    const sameCategory = inc.category === target.category;
    const locOverlap =
      targetLoc &&
      inc.location &&
      (inc.location.toLowerCase().includes(targetLoc.split(',')[0]) ||
        targetLoc.includes(inc.location.toLowerCase().split(',')[0]));
    const routeOverlap =
      targetRoute && inc.route_name && inc.route_name.toLowerCase() === targetRoute;
    return sameCategory && (locOverlap || routeOverlap);
  });
}

export async function createIncident(req, res) {
  try {
    const {
      category,
      description,
      location,
      route_name,
      service_name,
      latitude,
      longitude
    } = req.body;

    const coords = resolveCoordinates(location, latitude, longitude);
    const combinedRouteName = [route_name, service_name].filter(Boolean).join(' — ') || null;

    const allExisting = await db.findMany('incident_reports', {});
    const similar = findSimilarIncidents(allExisting, {
      category,
      location,
      route_name: combinedRouteName
    });

    const created = await db.insert('incident_reports', {
      user_id: req.user.id,
      category,
      description,
      location,
      route_name: combinedRouteName,
      latitude: coords.lat,
      longitude: coords.lng,
      ai_summary: null,
      status: 'reported'
    });

    const [aiAnalysis, complaintDraft] = await Promise.all([
      analyzePassengerIncident({
        userId: req.user.id,
        incident: created,
        similarCount: similar.length
      }),
      generateComplaintDraft({
        userId: req.user.id,
        incident: created
      })
    ]);

    const updated = await db.update('incident_reports', created.id, {
      ai_summary: aiAnalysis.data.summary
    });

    return res.status(201).json({
      success: true,
      message: 'Incident report recorded. Review the AI summary and optional complaint draft below.',
      incident: updated,
      ai_analysis: aiAnalysis.data,
      complaint_draft: complaintDraft.data,
      similar_reports: similar.slice(0, 5),
      submission_disclaimer:
        'Complaint drafts require your explicit review and approval. RushRoute does not claim automatic external submission to transit authorities.'
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to submit passenger incident report.'
    });
  }
}

export async function listIncidents(req, res) {
  try {
    const { category, mine_only } = req.query;
    const all = await db.findMany('incident_reports', (inc) => {
      if (category && inc.category !== category) return false;
      if (mine_only === 'true' && inc.user_id !== req.user.id) return false;
      return true;
    });

    return res.status(200).json({
      success: true,
      incidents: all
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve incident reports.'
    });
  }
}

export async function getIncidentById(req, res) {
  try {
    const incident = await db.findOne('incident_reports', (i) => i.id === req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident report not found.'
      });
    }

    const all = await db.findMany('incident_reports', {});
    const similar = findSimilarIncidents(all, incident);

    return res.status(200).json({
      success: true,
      incident,
      similar_reports: similar.slice(0, 5)
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve incident report.'
    });
  }
}

export async function updateIncident(req, res) {
  try {
    const incident = await db.findOne('incident_reports', (i) => i.id === req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident report not found.'
      });
    }

    // Only the creator or an admin may update an incident report
    if (incident.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to modify this incident report.'
      });
    }

    const updated = await db.update('incident_reports', incident.id, req.body);

    return res.status(200).json({
      success: true,
      message: 'Incident report updated.',
      incident: updated
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update incident report.'
    });
  }
}

export async function analyzeIncidentById(req, res) {
  try {
    const incident = await db.findOne('incident_reports', (i) => i.id === req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident report not found.'
      });
    }

    const all = await db.findMany('incident_reports', {});
    const similar = findSimilarIncidents(all, incident);

    const [aiAnalysis, complaintDraft] = await Promise.all([
      analyzePassengerIncident({
        userId: req.user.id,
        incident,
        similarCount: similar.length
      }),
      generateComplaintDraft({
        userId: req.user.id,
        incident
      })
    ]);

    const updated = await db.update('incident_reports', incident.id, {
      ai_summary: aiAnalysis.data.summary
    });

    return res.status(200).json({
      success: true,
      incident: updated,
      ai_analysis: aiAnalysis.data,
      complaint_draft: complaintDraft.data,
      similar_reports: similar.slice(0, 5)
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze incident report.'
    });
  }
}
