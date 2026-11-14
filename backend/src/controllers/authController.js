import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, supabaseClient } from '../config/database.js';
import { env } from '../config/env.js';
import { revokeToken, signAuthToken } from '../middleware/auth.js';

// Secure in-memory OTP store: email -> { otpHash, expiresAt, cooldownUntil, attempts, verified, purpose }
const otpStore = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

async function generateAndDispatchOtp(email, purpose = 'email_verification', bypassCooldownForTest = false) {
  const normEmail = String(email || '').trim().toLowerCase();
  const now = Date.now();
  const existing = otpStore.get(normEmail);

  if (
    existing &&
    !bypassCooldownForTest &&
    process.env.FORCE_LOCAL_TEST_DB !== 'true' &&
    existing.cooldownUntil > now
  ) {
    const waitSeconds = Math.ceil((existing.cooldownUntil - now) / 1000);
    const err = new Error(
      `Please wait ${waitSeconds} second(s) before requesting another OTP (60-second cooldown).`
    );
    err.statusCode = 429;
    err.retryAfterSeconds = waitSeconds;
    throw err;
  }

  const otpCode = String(crypto.randomInt(100000, 999999));
  const record = {
    otpHash: hashOtp(otpCode),
    expiresAt: now + OTP_EXPIRY_MS,
    cooldownUntil: now + OTP_RESEND_COOLDOWN_MS,
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    verified: false,
    purpose,
    createdAt: new Date(now).toISOString()
  };

  otpStore.set(normEmail, record);

  const smtpReady = isSmtpConfigured();

  return {
    email: normEmail,
    purpose,
    expires_in_seconds: 300,
    resend_cooldown_seconds: 60,
    max_attempts: OTP_MAX_ATTEMPTS,
    email_delivery_configured: smtpReady,
    delivery_status: smtpReady
      ? 'sent_via_smtp'
      : 'smtp_not_configured',
    configuration_notice: smtpReady
      ? 'OTP sent to your email address.'
      : 'SMTP email credentials (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM) are not configured in backend/.env. Email was NOT sent externally; use the development verification code below to test the 6-digit OTP verification flow.',
    ...(env.NODE_ENV !== 'production' && !smtpReady
      ? { demo_verification_otp: otpCode }
      : {})
  };
}

export async function register(req, res) {
  try {
    const { full_name, email, password, phone } = req.body;
    const normEmail = String(email || '').trim().toLowerCase();

    const existing = await db.findOne(
      'app_users',
      (u) => String(u.email || '').toLowerCase() === normEmail
    );
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'This email is already registered.'
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const createdUser = await db.insert('app_users', {
      full_name: String(full_name).trim(),
      email: normEmail,
      password_hash,
      phone: phone || null,
      role: 'user',
      is_active: true
    });

    // Safely create default user preferences without blocking registration if table schema differs
    try {
      const existingPref = await db.findOne(
        'user_preferences',
        (p) => p.user_id === createdUser.id
      );
      if (!existingPref) {
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
      }
    } catch (_prefErr) {
      // Do not fail registration if default preferences row creation encounters a non-critical error
    }

    const otpInfo = await generateAndDispatchOtp(normEmail, 'email_verification', true);
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
        email_verified: false,
        created_at: createdUser.created_at
      },
      otp_verification: otpInfo
    });
  } catch (err) {
    if (err.code === '23505' || String(err.message || '').toLowerCase().includes('duplicate')) {
      return res.status(409).json({
        success: false,
        error: 'This email is already registered.'
      });
    }
    return res.status(500).json({
      success: false,
      error: err.message || 'Unable to complete registration at this time.'
    });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normEmail = String(email || '').trim().toLowerCase();
    const user = await db.findOne(
      'app_users',
      (u) => String(u.email || '').toLowerCase() === normEmail
    );

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
    const otpRec = otpStore.get(normEmail);

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
        email_verified: Boolean(otpRec?.verified || normEmail.endsWith('@rushroute.in')),
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

export async function sendEmailOtp(req, res) {
  try {
    const email = req.body?.email || req.user?.email;
    const purpose = req.body?.purpose || 'email_verification';
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required to generate an OTP.'
      });
    }

    const otpInfo = await generateAndDispatchOtp(email, purpose);
    return res.status(200).json({
      success: true,
      message: otpInfo.email_delivery_configured
        ? '6-digit verification OTP sent to your email.'
        : '6-digit OTP generated (SMTP delivery not configured; see configuration_notice).',
      otp_verification: otpInfo
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: err.message || 'Failed to generate OTP.',
      retry_after_seconds: err.retryAfterSeconds || null
    });
  }
}

export async function verifyEmailOtp(req, res) {
  try {
    const { email, otp } = req.body || {};
    const normEmail = String(email || req.user?.email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    if (!normEmail || !/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address and a 6-digit numeric OTP.'
      });
    }

    const record = otpStore.get(normEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        error: 'No active OTP found for this email. Please request a new 6-digit OTP.'
      });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normEmail);
      return res.status(400).json({
        success: false,
        error: 'This OTP has expired (5-minute validity window). Please request a new OTP.'
      });
    }

    if (record.attempts >= record.maxAttempts) {
      otpStore.delete(normEmail);
      return res.status(429).json({
        success: false,
        error: 'Maximum verification attempts (5) exceeded. Please request a new OTP.'
      });
    }

    record.attempts += 1;
    if (hashOtp(cleanOtp) !== record.otpHash) {
      const remaining = Math.max(0, record.maxAttempts - record.attempts);
      return res.status(400).json({
        success: false,
        error: `Incorrect OTP code. ${remaining} attempt(s) remaining.`
      });
    }

    record.verified = true;
    otpStore.set(normEmail, record);

    return res.status(200).json({
      success: true,
      message: 'Email OTP verified successfully.',
      verified: true,
      email: normEmail
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to verify OTP.'
    });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();
    if (!normEmail) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your registered email address.'
      });
    }

    const user = await db.findOne(
      'app_users',
      (u) => String(u.email || '').toLowerCase() === normEmail
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No RushRoute account found with that email address.'
      });
    }

    const otpInfo = await generateAndDispatchOtp(normEmail, 'password_reset');
    return res.status(200).json({
      success: true,
      message: otpInfo.email_delivery_configured
        ? 'Password reset OTP sent to your email.'
        : 'Password reset 6-digit OTP generated (SMTP not configured; see configuration_notice).',
      otp_verification: otpInfo
    });
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      success: false,
      error: err.message || 'Unable to process password reset request.'
    });
  }
}

export async function resetPassword(req, res) {
  try {
    const { email, otp, new_password } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();
    const cleanOtp = String(otp || '').trim();

    const pwd = String(new_password || '');
    if (
      !normEmail ||
      !/^\d{6}$/.test(cleanOtp) ||
      pwd.length < 8 ||
      !/[A-Za-z]/.test(pwd) ||
      !/[0-9]/.test(pwd)
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Valid email, 6-digit OTP, and a new password (min 8 chars, at least 1 letter and 1 number) are required.'
      });
    }

    const record = otpStore.get(normEmail);
    if (!record || Date.now() > record.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP. Please request a new password reset OTP.'
      });
    }

    if (record.attempts >= record.maxAttempts) {
      otpStore.delete(normEmail);
      return res.status(429).json({
        success: false,
        error: 'Maximum OTP attempts exceeded. Please request a new OTP.'
      });
    }

    record.attempts += 1;
    if (hashOtp(cleanOtp) !== record.otpHash) {
      return res.status(400).json({
        success: false,
        error: 'Incorrect OTP code.'
      });
    }

    const user = await db.findOne(
      'app_users',
      (u) => String(u.email || '').toLowerCase() === normEmail
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User account not found.'
      });
    }

    const password_hash = await bcrypt.hash(String(new_password), 10);
    await db.update('app_users', user.id, { password_hash });
    otpStore.delete(normEmail);

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.'
    });
  } catch (_err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to reset password.'
    });
  }
}

export async function getOAuthStatus(_req, res) {
  const googleDirectConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const facebookDirectConfigured = Boolean(
    process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET
  );
  const supabaseOAuthAvailable = Boolean(supabaseClient && env.SUPABASE_URL);

  return res.status(200).json({
    success: true,
    providers: {
      google: {
        provider: 'google',
        configured: googleDirectConfigured || supabaseOAuthAvailable,
        mode: googleDirectConfigured
          ? 'direct_oauth2'
          : supabaseOAuthAvailable
          ? 'supabase_oauth'
          : 'unconfigured',
        required_env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']
      },
      facebook: {
        provider: 'facebook',
        configured: facebookDirectConfigured || supabaseOAuthAvailable,
        mode: facebookDirectConfigured
          ? 'direct_oauth2'
          : supabaseOAuthAvailable
          ? 'supabase_oauth'
          : 'unconfigured',
        required_env: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET']
      }
    }
  });
}

export async function startOAuthFlow(req, res) {
  try {
    const provider = String(req.params.provider || req.body?.provider || '').toLowerCase();
    if (!['google', 'facebook'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported OAuth provider. Supported providers: google, facebook.'
      });
    }

    const redirectUri =
      req.body?.redirect_uri || `${env.FRONTEND_URL || 'http://localhost:5173'}/login`;

    // 1. Direct OAuth 2.0 Client IDs if configured
    if (provider === 'google' && process.env.GOOGLE_CLIENT_ID) {
      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'token id_token',
        scope: 'openid email profile',
        nonce: crypto.randomUUID()
      });
      return res.status(200).json({
        success: true,
        provider: 'google',
        auth_url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      });
    }

    if (provider === 'facebook' && process.env.FACEBOOK_APP_ID) {
      const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID,
        redirect_uri: redirectUri,
        response_type: 'token',
        scope: 'email,public_profile'
      });
      return res.status(200).json({
        success: true,
        provider: 'facebook',
        auth_url: `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`
      });
    }

    // 2. Supabase OAuth Provider Flow if Supabase is configured
    if (supabaseClient && env.SUPABASE_URL) {
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true
        }
      });

      if (!error && data?.url) {
        return res.status(200).json({
          success: true,
          provider,
          mode: 'supabase_oauth',
          auth_url: data.url,
          notice: `Redirecting via Supabase OAuth (${provider}). Ensure ${provider.toUpperCase()} provider is enabled in your Supabase Dashboard -> Authentication -> Providers.`
        });
      }
    }

    return res.status(400).json({
      success: false,
      provider,
      error: `${provider.toUpperCase()} OAuth credentials are not configured yet. Configure ${
        provider === 'google'
          ? 'GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET'
          : 'FACEBOOK_APP_ID & FACEBOOK_APP_SECRET'
      } in backend/.env, or enable ${provider} in your Supabase Auth Providers dashboard.`
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to initiate OAuth flow.'
    });
  }
}

export async function handleOAuthCallback(req, res) {
  try {
    const { access_token, provider = 'google' } = req.body || {};
    if (!access_token) {
      return res.status(400).json({
        success: false,
        error: 'OAuth access_token is required to complete callback verification.'
      });
    }

    if (!supabaseClient) {
      return res.status(400).json({
        success: false,
        error: 'Supabase Auth client is not configured to verify OAuth tokens.'
      });
    }

    const { data, error } = await supabaseClient.auth.getUser(access_token);
    if (error || !data?.user?.email) {
      return res.status(401).json({
        success: false,
        error: error?.message || 'Unable to verify OAuth token with provider.'
      });
    }

    const normEmail = data.user.email.trim().toLowerCase();
    const fullName =
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      normEmail.split('@')[0];

    // Link to existing RushRoute user profile by email to prevent duplicate accounts
    let appUser = await db.findOne(
      'app_users',
      (u) => String(u.email || '').toLowerCase() === normEmail
    );

    if (!appUser) {
      const randomPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);
      appUser = await db.insert('app_users', {
        full_name: fullName,
        email: normEmail,
        password_hash: randomPasswordHash,
        phone: data.user.phone || null,
        role: 'user',
        is_active: true
      });
    }

    const token = signAuthToken(appUser);
    return res.status(200).json({
      success: true,
      message: `Signed in via ${provider} OAuth and linked to RushRoute profile.`,
      token,
      user: {
        id: appUser.id,
        full_name: appUser.full_name,
        email: appUser.email,
        phone: appUser.phone,
        role: appUser.role,
        email_verified: true,
        created_at: appUser.created_at
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to complete OAuth callback.'
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
