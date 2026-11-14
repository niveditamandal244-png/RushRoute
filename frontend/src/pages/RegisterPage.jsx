import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import {
  EmailOtpVerificationCard,
  RegisterForm
} from '../components/AuthComponents';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otpMeta, setOtpMeta] = useState(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !registeredEmail) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, isAuthenticated, registeredEmail, navigate]);

  const handleRegister = async (payload) => {
    setLoading(true);
    setError('');
    setFieldErrors({});
    try {
      const data = await register(payload);
      const { user, otp_verification } = data;
      if (otp_verification && user?.email) {
        setRegisteredEmail(user.email);
        setOtpMeta(otp_verification);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        setError(err.friendlyMessage || 'Unable to register account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-950 text-emerald-300 shadow-sm">
          <Navigation className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">
          {registeredEmail ? 'Verify Your Email Address' : 'Create Your RushRoute Account'}
        </h1>
        <p className="mt-1 text-sm text-[#727C77]">
          {registeredEmail
            ? 'Enter the 6-digit verification code sent for your account.'
            : 'Start making smarter travel decisions.'}
        </p>
      </div>

      {registeredEmail ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-[#16A34A]/30 bg-[#ECFDF5] px-4 py-2.5 text-center text-xs font-bold text-[#047857]">
            Account created successfully.
          </div>
          <EmailOtpVerificationCard
            email={registeredEmail}
            initialOtpMeta={otpMeta}
            onVerified={() => {}}
            onSkipOrContinue={() => navigate('/dashboard', { replace: true })}
          />
        </div>
      ) : (
        <>
          <RegisterForm
            onSubmit={handleRegister}
            loading={loading}
            error={error}
            fieldErrors={fieldErrors}
          />

          <p className="mt-4 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-emerald-900 underline">
              Sign in instead
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
