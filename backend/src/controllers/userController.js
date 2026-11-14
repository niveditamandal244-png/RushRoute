import { db } from '../config/database.js';
import { resolveCoordinates } from '../utils/geo.js';

export async function getProfile(req, res) {
  try {
    const user = await db.findOne('app_users', (u) => u.id === req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    const savedLocations = await db.findMany('saved_locations', (s) => s.user_id === req.user.id);
    const preferences = await db.findOne('user_preferences', (p) => p.user_id === req.user.id);

    return res.status(200).json({
      success: true,
      profile: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      saved_locations: savedLocations,
      preferences: preferences || {
        preferred_transport_modes: ['Metro', 'Bus', 'Auto'],
        default_budget: 250,
        accessibility_preferences: {
          wheelchairAccessible: false,
          avoidLongWalks: false,
          preferDirectRoutes: false
        }
      }
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve user profile.' });
  }
}

export async function updateProfile(req, res) {
  try {
    const { full_name, phone, saved_locations } = req.body;
    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (phone !== undefined) updates.phone = phone;

    const updatedUser = await db.update('app_users', req.user.id, updates);

    if (Array.isArray(saved_locations)) {
      await db.deleteWhere('saved_locations', (s) => s.user_id === req.user.id);
      for (const loc of saved_locations) {
        const coords = resolveCoordinates(loc.address, loc.latitude, loc.longitude);
        await db.insert('saved_locations', {
          user_id: req.user.id,
          label: loc.label,
          address: loc.address,
          latitude: coords.lat,
          longitude: coords.lng
        });
      }
    }

    const updatedSavedLocations = await db.findMany('saved_locations', (s) => s.user_id === req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      profile: {
        id: updatedUser.id,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        updated_at: updatedUser.updated_at
      },
      saved_locations: updatedSavedLocations
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
}

export async function getPreferences(req, res) {
  try {
    let prefs = await db.findOne('user_preferences', (p) => p.user_id === req.user.id);
    if (!prefs) {
      prefs = await db.insert('user_preferences', {
        user_id: req.user.id,
        preferred_transport_modes: ['Metro', 'Bus', 'Auto'],
        default_budget: 250,
        accessibility_preferences: {
          wheelchairAccessible: false,
          avoidLongWalks: false,
          preferDirectRoutes: false
        }
      });
    }
    return res.status(200).json({
      success: true,
      preferences: prefs
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'Failed to load preferences.' });
  }
}

export async function updatePreferences(req, res) {
  try {
    let prefs = await db.findOne('user_preferences', (p) => p.user_id === req.user.id);
    const updates = {};
    if (req.body.preferred_transport_modes !== undefined) {
      updates.preferred_transport_modes = req.body.preferred_transport_modes;
    }
    if (req.body.default_budget !== undefined) {
      updates.default_budget = req.body.default_budget;
    }
    if (req.body.accessibility_preferences !== undefined) {
      updates.accessibility_preferences = {
        ...(prefs?.accessibility_preferences || {}),
        ...req.body.accessibility_preferences
      };
    }

    if (!prefs) {
      prefs = await db.insert('user_preferences', {
        user_id: req.user.id,
        preferred_transport_modes: updates.preferred_transport_modes || ['Metro', 'Bus', 'Auto'],
        default_budget: updates.default_budget ?? 250,
        accessibility_preferences: updates.accessibility_preferences || {
          wheelchairAccessible: false,
          avoidLongWalks: false,
          preferDirectRoutes: false
        }
      });
    } else {
      prefs = await db.update('user_preferences', prefs.id, updates);
    }

    return res.status(200).json({
      success: true,
      message: 'Preferences updated successfully.',
      preferences: prefs
    });
  } catch (_err) {
    return res.status(500).json({ success: false, error: 'Failed to update preferences.' });
  }
}
