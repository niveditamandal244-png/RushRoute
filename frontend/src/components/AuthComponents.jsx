import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  User
} from 'lucide-react';
import { apiClient } from '../services/api';

function FacebookIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        d="M13.5 19.5v-6.75h2.25l.34-2.63H13.5V8.44c0-.76.21-1.28 1.3-1.28h1.39V4.81c-.24-.03-1.07-.1-2.03-.1-2.01 0-3.39 1.23-3.39 3.48v1.93H8.5v2.63h2.27v6.75h2.73z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.45c-.24 1.26-.96 2.32-2.04 3.04l3.3 2.56c1.92-1.77 3.03-4.38 3.03-7.48 0-.72-.06-1.41-.19-2.02H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.75 0 5.06-.91 6.74-2.46l-3.3-2.56c-.91.61-2.08.98-3.44.98-2.64 0-4.88-1.78-5.68-4.18H2.91v2.64C4.58 19.74 8.03 22 12 22z"
      />
      <path
        fill="#4A90E2"
        d="M6.32 13.78A5.98 5.98 0 0 1 6 12c0-.62.11-1.22.32-1.78V7.58H2.91A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.07 4.42l3.25-2.64z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.04c1.5 0 2.84.52 3.9 1.53l2.92-2.92C17.05 3.01 14.74 2 12 2 8.03 2 4.58 4.26 2.91 7.58l3.41 2.64C7.12 7.82 9.36 6.04 12 6.04z"
      />
    </svg>
  );
}

export function OAuthButtons({ onError }) {
  const [loadingProvider, setLoadingProvider] = useState('');
  const [oauthStatus, setOauthStatus] = useState(null);

  useEffect(() => {
    let active = true;
    apiClient
      .get('/auth/oauth/status')
      .then((res) => {
        if (active && res.data) {
          setOauthStatus(res.data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const googleConfigured = Boolean(oauthStatus?.providers?.google?.configured);
  const facebookConfigured = Boolean(oauthStatus?.providers?.facebook?.configured);

  const handleOAuthClick = async (provider) => {
    const isConfigured = provider === 'google' ? googleConfigured : facebookConfigured;
    if (oauthStatus && !isConfigured) {
      if (onError) {
        onError(
          `${provider === 'google' ? 'Google' : 'Facebook'} OAuth is not configured on this server. Please use email and password sign-in above.`
        );
      }
      return;
    }

    setLoadingProvider(provider);
    if (onError) onError('');
    try {
      const res = await apiClient.post(`/auth/oauth/${provider}`, {
        redirect_uri: `${window.location.origin}/login`
      });
      if (res.data?.auth_url) {
        window.location.href = res.data.auth_url;
      } else if (onError) {
        onError(
          `${provider === 'google' ? 'Google' : 'Facebook'} OAuth is not configured on this server. Please use email and password sign-in above.`
        );
      }
    } catch (err) {
      if (onError) {
        onError(
          err.friendlyMessage ||
            `${provider === 'google' ? 'Google' : 'Facebook'} OAuth is not configured. Email and password sign-in is active.`
        );
      }
    } finally {
      setLoadingProvider('');
    }
  };

  return (
    <div className="space-y-3 pt-1">
      <div className="relative flex items-center justify-center">
        <div className="w-full border-t border-[#E5EAE7]" />
        <span className="bg-white px-3 text-[11px] font-semibold tracking-wider text-[#727C77] uppercase">
          Or continue with
        </span>
        <div className="w-full border-t border-[#E5EAE7]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={Boolean(loadingProvider)}
          onClick={() => handleOAuthClick('google')}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5EAE7] bg-white px-3 text-xs font-bold text-[#17211E] transition hover:border-emerald-700/40 hover:bg-[#ECFDF5]/50 disabled:opacity-50"
        >
          <GoogleIcon />
          <span>{loadingProvider === 'google' ? 'Connecting...' : 'Google'}</span>
        </button>

        <button
          type="button"
          disabled={Boolean(loadingProvider)}
          onClick={() => handleOAuthClick('facebook')}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E5EAE7] bg-white px-3 text-xs font-bold text-[#17211E] transition hover:border-emerald-700/40 hover:bg-[#ECFDF5]/50 disabled:opacity-50"
        >
          <FacebookIcon />
          <span>{loadingProvider === 'facebook' ? 'Connecting...' : 'Facebook'}</span>
        </button>
      </div>

      {oauthStatus && !googleConfigured && !facebookConfigured && (
        <p className="text-center text-[11px] text-[#727C77]">
          OAuth providers require Supabase Auth setup; email &amp; password sign-in is active.
        </p>
      )}
    </div>
  );
}

export function EmailOtpVerificationCard({
  email,
  initialOtpMeta,
  onVerified,
  onSkipOrContinue
}) {
  const [otp, setOtp] = useState('');
  const [otpMeta, setOtpMeta] = useState(initialOtpMeta || null);
  const [cooldown, setCooldown] = useState(initialOtpMeta?.resend_cooldown_seconds || 60);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingResend, setLoadingResend] = useState(false);
  const [error, setError] = useState('');
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoadingVerify(true);
    setError('');
    try {
      await apiClient.post('/auth/otp/verify', { email, otp });
      setVerifiedSuccess(true);
      if (onVerified) onVerified();
    } catch (err) {
      setError(err.friendlyMessage || 'Invalid or expired OTP code.');
    } finally {
      setLoadingVerify(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoadingResend(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/otp/send', {
        email,
        purpose: 'email_verification'
      });
      setOtpMeta(res.data.otp_verification);
      setCooldown(60);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to resend OTP.');
    } finally {
      setLoadingResend(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-900/20 bg-white p-6 shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-900 text-white">
          <ShieldCheck className="h-5 w-5 text-emerald-300" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            6-Digit Email OTP Verification
          </h3>
          <p className="text-xs text-slate-600">
            Account: <strong>{email}</strong> (5-minute validity • Max 5 attempts)
          </p>
        </div>
      </div>

      {otpMeta && !otpMeta.email_delivery_configured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <p className="font-bold">SMTP Email Delivery Status:</p>
          <p className="mt-0.5">{otpMeta.configuration_notice}</p>
          {otpMeta.demo_verification_otp && (
            <p className="mt-2 inline-block rounded-lg bg-white px-3 py-1 font-mono text-sm font-extrabold text-emerald-950 ring-1 ring-amber-300">
              Development Verification OTP: {otpMeta.demo_verification_otp}
            </p>
          )}
        </div>
      )}

      {verifiedSuccess ? (
        <div className="space-y-3 rounded-xl bg-emerald-50 p-4 text-xs text-emerald-950">
          <div className="flex items-center gap-2 font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            <span>Email verified successfully!</span>
          </div>
          {onSkipOrContinue && (
            <button
              type="button"
              onClick={onSkipOrContinue}
              className="w-full rounded-xl bg-emerald-900 py-2.5 text-xs font-bold text-white hover:bg-emerald-800"
            >
              Continue to RushRoute Dashboard
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
              Enter 6-Digit OTP Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center font-mono text-lg font-extrabold tracking-widest text-slate-900 focus:border-emerald-800 focus:outline-none"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loadingVerify || otp.length !== 6}
            className="w-full rounded-xl bg-emerald-900 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {loadingVerify ? 'Verifying OTP...' : 'Verify 6-Digit OTP'}
          </button>

          <div className="flex items-center justify-between pt-2 text-xs">
            <button
              type="button"
              disabled={cooldown > 0 || loadingResend}
              onClick={handleResend}
              className="inline-flex items-center gap-1 font-semibold text-emerald-900 hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend 6-Digit OTP'}
            </button>

            {onSkipOrContinue && (
              <button
                type="button"
                onClick={onSkipOrContinue}
                className="font-medium text-slate-500 hover:text-slate-800 hover:underline"
              >
                Continue to Dashboard →
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

export function LoginForm({ onSubmit, loading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState('request'); // request | verify | done
  const [resetMeta, setResetMeta] = useState(null);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('RushRoute@2026');
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setResetError('');
    try {
      const res = await apiClient.post('/auth/forgot-password', { email: resetEmail });
      setResetMeta(res.data.otp_verification);
      setResetStep('verify');
      setResetMessage(res.data.message);
    } catch (err) {
      setResetError(err.friendlyMessage || 'Could not initiate password reset.');
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setResetError('');
    try {
      const res = await apiClient.post('/auth/reset-password', {
        email: resetEmail,
        otp: resetOtp,
        new_password: newPassword
      });
      setResetStep('done');
      setResetMessage(res.data.message);
    } catch (err) {
      setResetError(err.friendlyMessage || 'Failed to reset password.');
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ email, password });
        }}
        className="space-y-4 rounded-2xl border border-[#E5EAE7] bg-white p-6 shadow-xs sm:p-8"
      >
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold tracking-wide text-[#17211E] uppercase"
          >
            Email Address
          </label>
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-[#047857]" />
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-xl border border-[#E5EAE7] bg-[#F7F9F8] pr-3.5 pl-10 text-sm text-[#17211E] placeholder:text-[#727C77] focus:border-[#047857] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold tracking-wide text-[#17211E] uppercase"
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => {
                setResetEmail(email);
                setResetStep('request');
                setResetError('');
                setShowForgotModal((v) => !v);
              }}
              className="text-xs font-semibold text-[#047857] hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-[#047857]" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 w-full rounded-xl border border-[#E5EAE7] bg-[#F7F9F8] pr-11 pl-10 text-sm text-[#17211E] placeholder:text-[#727C77] focus:border-[#047857] focus:bg-white focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute top-3.5 right-3.5 text-[#727C77] hover:text-[#17211E]"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {(error || oauthError) && (
          <div
            role="alert"
            className="rounded-xl border border-[#DC2626]/30 bg-red-50 p-3 text-xs font-medium text-[#DC2626]"
          >
            {error || oauthError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-xl bg-[#022C22] text-sm font-bold text-white shadow-xs transition hover:bg-[#047857] focus:ring-2 focus:ring-[#10B981] focus:outline-none disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <OAuthButtons onError={setOauthError} />

        <p className="pt-1 text-center text-xs text-[#727C77]">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-bold text-[#047857] hover:underline">
            Create an account
          </Link>
        </p>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E5EAE7] bg-white px-4 py-2.5 text-xs text-[#727C77]">
        <span className="font-semibold">Demo Access:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              handleQuickFill('aarav.demo@rushroute.in');
              onSubmit({ email: 'aarav.demo@rushroute.in', password: 'RushRoute@2026' });
            }}
            className="rounded-lg border border-[#E5EAE7] bg-[#F7F9F8] px-2.5 py-1 font-semibold text-[#17211E] hover:border-[#047857] hover:bg-[#ECFDF5] disabled:opacity-50"
          >
            Continue with Demo Account
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickFill('admin@rushroute.in')}
            className="rounded-lg border border-[#047857]/25 bg-[#ECFDF5] px-2.5 py-1 font-semibold text-[#022C22] hover:bg-emerald-100 disabled:opacity-50"
          >
            Fill Admin Demo
          </button>
        </div>
      </div>

      {showForgotModal && (
        <div className="rounded-2xl border border-emerald-900/20 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <KeyRound className="h-4 w-4 text-emerald-800" />
              <span className="text-sm">Reset Your Password via 6-Digit OTP</span>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>

          {resetStep === 'request' && (
            <form onSubmit={handleRequestReset} className="mt-3 space-y-3">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs"
              />
              {resetError && <p className="text-xs text-red-600">{resetError}</p>}
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-900 py-2 text-xs font-bold text-white"
              >
                Send 6-Digit Reset OTP
              </button>
            </form>
          )}

          {resetStep === 'verify' && (
            <form onSubmit={handleConfirmReset} className="mt-3 space-y-3 text-xs">
              <p className="text-slate-600">{resetMessage}</p>
              {resetMeta?.demo_verification_otp && (
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-950 ring-1 ring-amber-200">
                  SMTP not configured — Dev Reset OTP:{' '}
                  <strong className="font-mono">{resetMeta.demo_verification_otp}</strong>
                </div>
              )}
              <input
                type="text"
                maxLength={6}
                required
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="6-Digit OTP"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-xs"
              />
              <input
                type="password"
                minLength={8}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars, 1 letter & 1 number)"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs"
              />
              {resetError && <p className="text-xs text-red-600">{resetError}</p>}
              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-900 py-2 text-xs font-bold text-white"
              >
                Verify OTP & Update Password
              </button>
            </form>
          )}

          {resetStep === 'done' && (
            <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
              {resetMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RegisterForm({ onSubmit, loading, error, fieldErrors: serverFieldErrors = {} }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [clientFieldErrors, setClientFieldErrors] = useState({});

  const mergedFieldErrors = { ...serverFieldErrors, ...clientFieldErrors };

  const validateRegisterFields = () => {
    const errs = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    if (trimmedName.length < 2) {
      errs.full_name = 'Full name must be at least 2 characters.';
    } else if (trimmedName.length > 100) {
      errs.full_name = 'Full name cannot exceed 100 characters.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errs.email = 'Email address is invalid.';
    }

    if (trimmedPhone) {
      const digits = trimmedPhone.replace(/\D/g, '');
      if (
        trimmedPhone.includes('@') ||
        /[A-Za-z]/.test(trimmedPhone) ||
        !/^\+?[\d\s\-().]+$/.test(trimmedPhone) ||
        digits.length < 7 ||
        digits.length > 15
      ) {
        errs.phone = 'Please enter a valid phone number.';
      }
    }

    if (password.length < 8) {
      errs.password = 'Password must contain at least 8 characters.';
    } else if (!/[A-Za-z]/.test(password)) {
      errs.password = 'Password must contain at least one letter.';
    } else if (!/[0-9]/.test(password)) {
      errs.password = 'Password must contain at least one number.';
    }

    if (confirmPassword !== password) {
      errs.confirm_password = 'Passwords do not match.';
    }

    return errs;
  };

  const clearFieldError = (field) => {
    if (clientFieldErrors[field]) {
      setClientFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (loading) return;
        setLocalError('');
        const errs = validateRegisterFields();
        setClientFieldErrors(errs);
        if (Object.keys(errs).length > 0) {
          return;
        }
        onSubmit({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() ? phone.trim() : null,
          password
        });
      }}
      className="space-y-4 rounded-2xl border border-[#E5EAE7] bg-white p-6 shadow-xs sm:p-8"
    >
      <div>
        <label
          htmlFor="register-full-name"
          className="block text-xs font-semibold tracking-wide text-[#17211E] uppercase"
        >
          Full Name
        </label>
        <div className="relative mt-1.5">
          <User className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-[#047857]" />
          <input
            id="register-full-name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              clearFieldError('full_name');
            }}
            placeholder="Aarav Sharma"
            className={`h-11 w-full rounded-xl border bg-[#F7F9F8] pr-3.5 pl-10 text-sm text-[#17211E] placeholder:text-[#727C77] focus:bg-white focus:outline-none ${
              mergedFieldErrors.full_name
                ? 'border-[#DC2626] focus:border-[#DC2626]'
                : 'border-[#E5EAE7] focus:border-[#047857]'
            }`}
          />
        </div>
        {mergedFieldErrors.full_name && (
          <p className="mt-1 text-xs font-medium text-[#DC2626]">{mergedFieldErrors.full_name}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="register-phone"
          className="block text-xs font-semibold tracking-wide text-[#17211E] uppercase"
        >
          Phone Number (Optional)
        </label>
        <div className="relative mt-1.5">
          <Phone className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-[#047857]" />
          <input
            id="register-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              clearFieldError('phone');
            }}
            placeholder="+91-9876543210"
            className={`h-11 w-full rounded-xl border bg-[#F7F9F8] pr-3.5 pl-10 text-sm text-[#17211E] placeholder:text-[#727C77] focus:bg-white focus:outline-none ${
              mergedFieldErrors.phone
                ? 'border-[#DC2626] focus:border-[#DC2626]'
                : 'border-[#E5EAE7] focus:border-[#047857]'
            }`}
          />
        </div>
        {mergedFieldErrors.phone && (
          <p className="mt-1 text-xs font-medium text-[#DC2626]">{mergedFieldErrors.phone}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="register-email"
          className="block text-xs font-semibold tracking-wide text-[#17211E] uppercase"
        >
          Email Address
        </label>
        <div className="relative mt-1.5">
          <Mail className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-[#047857]" />
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearFieldError('email');
            }}
            placeholder="you@example.com"
            className={`h-11 w-full rounded-xl border bg-[#F7F9F8] pr-3.5 pl-10 text-sm text-[#17211E] placeholder:text-[#727C77] focus:bg-white focus:outline-none ${
              mergedFieldErrors.email
                ? 'border-[#DC2626] focus:border-[#DC2626]'
                : 'border-[#E5EAE7] focus:border-[#047857]'
            }`}
          />
        </div>
        {mergedFieldErrors.email && (
          <p className="mt-1 text-xs font-medium text-[#DC2626]">{mergedFieldErrors.email}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="register-password"
          className="block text-xs font-semibold tracking-wide text-[#17211E] uppercase"
        >
          Password (Min 8 chars, 1 letter &amp; 1 number)
        </label>
        <div className="relative mt-1.5">
          <Lock className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-[#047857]" />
          <input
            id="register-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearFieldError('password');
            }}
            placeholder="••••••••"
            className={`h-11 w-full rounded-xl border bg-[#F7F9F8] pr-11 pl-10 text-sm text-[#17211E] placeholder:text-[#727C77] focus:bg-white focus:outline-none ${
              mergedFieldErrors.password
                ? 'border-[#DC2626] focus:border-[#DC2626]'
                : 'border-[#E5EAE7] focus:border-[#047857]'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute top-3.5 right-3.5 text-[#727C77] hover:text-[#17211E]"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {mergedFieldErrors.password && (
          <p className="mt-1 text-xs font-medium text-[#DC2626]">{mergedFieldErrors.password}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="register-confirm-password"
          className="block text-xs font-semibold tracking-wide text-[#17211E] uppercase"
        >
          Confirm Password
        </label>
        <div className="relative mt-1.5">
          <Lock className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-[#047857]" />
          <input
            id="register-confirm-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              clearFieldError('confirm_password');
            }}
            placeholder="••••••••"
            className={`h-11 w-full rounded-xl border bg-[#F7F9F8] pr-10 pl-10 text-sm text-[#17211E] placeholder:text-[#727C77] focus:bg-white focus:outline-none ${
              mergedFieldErrors.confirm_password
                ? 'border-[#DC2626] focus:border-[#DC2626]'
                : 'border-[#E5EAE7] focus:border-[#047857]'
            }`}
          />
        </div>
        {mergedFieldErrors.confirm_password && (
          <p className="mt-1 text-xs font-medium text-[#DC2626]">
            {mergedFieldErrors.confirm_password}
          </p>
        )}
      </div>

      {(localError || error) && (
        <div
          role="alert"
          className="rounded-xl border border-[#DC2626]/30 bg-red-50 p-3 text-xs font-medium text-[#DC2626]"
        >
          {localError || error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-xl bg-[#022C22] text-sm font-bold text-white shadow-xs transition hover:bg-[#047857] focus:ring-2 focus:ring-[#10B981] focus:outline-none disabled:opacity-50"
      >
        {loading ? 'Creating Account...' : 'Create RushRoute Account'}
      </button>

      <OAuthButtons onError={setLocalError} />
    </form>
  );
}
