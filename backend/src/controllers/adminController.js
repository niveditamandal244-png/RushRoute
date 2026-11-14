import { db } from '../config/database.js';

export async function getAdminAnalytics(_req, res) {
  try {
    const [
      users,
      rideRequests,
      rideBookings,
      journeys,
      carpoolRequests,
      carpoolMatches,
      incidents,
      aiInteractions
    ] = await Promise.all([
      db.findMany('app_users', {}),
      db.findMany('ride_requests', {}),
      db.findMany('ride_bookings', {}),
      db.findMany('journeys', {}),
      db.findMany('carpool_requests', {}),
      db.findMany('carpool_matches', {}),
      db.findMany('incident_reports', {}),
      db.findMany('ai_interactions', {})
    ]);

    const confirmedBookings = rideBookings.filter((b) => b.booking_status === 'confirmed');
    const totalBookingValue = confirmedBookings.reduce(
      (sum, b) => sum + Number(b.estimated_fare || 0),
      0
    );

    const incidentsByCategory = {};
    const incidentsByStatus = {};
    for (const inc of incidents) {
      incidentsByCategory[inc.category] = (incidentsByCategory[inc.category] || 0) + 1;
      incidentsByStatus[inc.status] = (incidentsByStatus[inc.status] || 0) + 1;
    }

    const bookingsByVehicle = {};
    for (const b of confirmedBookings) {
      bookingsByVehicle[b.vehicle_type] = (bookingsByVehicle[b.vehicle_type] || 0) + 1;
    }

    return res.status(200).json({
      success: true,
      analytics: {
        overview: {
          total_users: users.length,
          total_ride_requests: rideRequests.length,
          confirmed_ride_bookings: confirmedBookings.length,
          total_simulated_booking_value_inr: Math.round(totalBookingValue),
          planned_multimodal_journeys: journeys.length,
          open_carpool_requests: carpoolRequests.filter((c) => c.status === 'open').length,
          total_carpool_matches: carpoolMatches.length,
          accepted_carpool_matches: carpoolMatches.filter((m) => m.match_status === 'accepted').length,
          total_incident_reports: incidents.length,
          total_ai_interactions: aiInteractions.length
        },
        incidents_by_category: incidentsByCategory,
        incidents_by_status: incidentsByStatus,
        bookings_by_vehicle: bookingsByVehicle,
        recent_ai_interactions: aiInteractions.slice(0, 10)
      }
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to compute admin mobility analytics.'
    });
  }
}

export async function getAdminIncidents(_req, res) {
  try {
    const incidents = await db.findMany('incident_reports', {});
    const users = await db.findMany('app_users', {});
    const userMap = new Map(users.map((u) => [u.id, { full_name: u.full_name, email: u.email }]));

    const enriched = incidents.map((inc) => ({
      ...inc,
      reporter: inc.user_id ? userMap.get(inc.user_id) || null : null
    }));

    return res.status(200).json({
      success: true,
      incidents: enriched
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve administrative incident list.'
    });
  }
}

export async function updateAdminIncidentStatus(req, res) {
  try {
    const incident = await db.findOne('incident_reports', (i) => i.id === req.params.id);
    if (!incident) {
      return res.status(404).json({
        success: false,
        error: 'Incident report not found.'
      });
    }

    const updated = await db.update('incident_reports', incident.id, {
      status: req.body.status,
      ...(req.body.ai_summary ? { ai_summary: req.body.ai_summary } : {})
    });

    return res.status(200).json({
      success: true,
      message: `Incident status updated to "${updated.status}".`,
      incident: updated
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update incident status.'
    });
  }
}
