import bcrypt from 'bcryptjs';
import { db } from '../config/database.js';
import { revokeToken, signAuthToken } from '../middleware/auth.js';

export async function register(req, res) {
  try {
    const { full_name, email, password, phone } = req.body;

    const existing = await db.findOne('app_users', (u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists.'
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const createdUser = await db.insert('app_users', {
      full_name,
      email: email.toLowerCase(),
      password_hash,
      phone: phone || null,
      role: 'user',
      is_active: true
    });

    // Create default user preferences
    await db.insert('user_preferences', {
      user_id: createdUser.id,
      preferred_transport_modes: ['Metro', 'Bus', 'Auto'],
      default_budget: 250,
      accessibility_preferences: {
        wheelchairAccessible: false,
        avoidLongWalks: false,
        preferDirectRoutes: false
      }
    });

    const token = signAuthToken(createdUser);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: {
        id: createdUser.id,
        full_name: createdUser.full_name,
        email: createdUser.email,
        phone: createdUser.phone,
        role: createdUser.role,
        created_at: createdUser.created_at
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Unable to complete registration at this time.'
    });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await db.findOne('app_users', (u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const token = signAuthToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at
      }
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Unable to complete login at this time.'
    });
  }
}

export async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: req.user
  });
}

export async function logout(req, res) {
  if (req.token) {
    revokeToken(req.token);
  }
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
}
