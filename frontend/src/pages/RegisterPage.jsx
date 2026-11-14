import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import { RegisterForm } from '../components/AuthComponents';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (payload) => {
    setLoading(true);
    setError('');
    try {
      await register(payload);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.friendlyMessage || 'Unable to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-emerald-400 shadow-sm">
          <Navigation className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Create Your RushRoute Account</h1>
        <p className="mt-1 text-sm text-slate-600">
          One Platform. Every Journey. Smarter Decisions.
        </p>
      </div>

      <RegisterForm onSubmit={handleRegister} loading={loading} error={error} />

      <p className="mt-4 text-center text-xs text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-slate-900 underline">
          Sign in instead
        </Link>
      </p>
    </div>
  );
}
