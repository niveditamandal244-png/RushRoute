import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { db } from '../config/database.js';

// In-memory token revocation set for logged-out JWTs
const revokedTokens = new Set();

export function revokeToken(token) {
  if (token) {
    revokedTokens.add(token);
  }
}

export function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid Bearer token.'
      });
    }

    const token = authHeader.slice(7).trim();
    if (!token || revokedTokens.has(token)) {
      return res.status(401).json({
        success: false,
        error: 'Session token has expired or been logged out.'
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await db.findOne('app_users', (u) => u.id === decoded.sub);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Authenticated user account is no longer active.'
      });
    }

    req.user = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at
    };
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token.'
    });
  }
}

export async function optionalAuthenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token && !revokedTokens.has(token)) {
        const decoded = jwt.verify(token, env.JWT_SECRET);
        const user = await db.findOne('app_users', (u) => u.id === decoded.sub);
        if (user && user.is_active) {
          req.user = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            role: user.role
          };
        }
      }
    }
  } catch (_err) {
    // Ignore optional auth failures
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden. Administrator privileges are required for this action.'
    });
  }
  next();
}
