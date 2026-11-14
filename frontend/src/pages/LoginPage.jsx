import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import { LoginForm } from '../components/AuthComponents';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from || '/dashboard';

  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      if (user.role === 'admin' && from === '/dashboard') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.friendlyMessage || 'Invalid email or password.');
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
        <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Welcome back to RushRoute</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sign in to compare routes, book simulated rides, and match carpools.
        </p>
      </div>

      <LoginForm onSubmit={handleLogin} loading={loading} error={error} />

      <p className="mt-4 text-center text-xs text-slate-600">
        New to RushRoute?{' '}
        <Link to="/register" className="font-bold text-slate-900 underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
