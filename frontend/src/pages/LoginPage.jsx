import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navigation } from 'lucide-react';
import { LoginForm } from '../components/AuthComponents';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';

export function LoginPage() {
  const {
    login,
    refreshProfile,
    isAuthenticated,
    loading: authLoading,
    sessionExpiredMessage,
    clearSessionExpiredMessage
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from || '/dashboard';

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [authLoading, isAuthenticated, from, navigate]);

  // Handle OAuth redirect callback if access_token is present in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = params.get('access_token');
      if (accessToken) {
        setLoading(true);
        apiClient
          .post('/auth/oauth/callback', { access_token: accessToken })
          .then(async (res) => {
            if (res.data?.token && res.data?.user) {
              localStorage.setItem('rushroute_token', res.data.token);
              localStorage.setItem('rushroute_user', JSON.stringify(res.data.user));
              await refreshProfile();
              navigate('/dashboard', { replace: true });
            }
          })
          .catch((err) => {
            setError(err.friendlyMessage || 'Failed to complete OAuth sign-in.');
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [navigate, refreshProfile]);

  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    setError('');
    clearSessionExpiredMessage();
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
    <div className="mx-auto max-w-md py-8 sm:py-12">
      <div className="mb-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#022C22] text-[#10B981] shadow-xs">
          <Navigation className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#17211E]">
          Welcome Back
        </h1>
        <p className="mt-1 text-sm text-[#727C77]">
          Sign in to continue your journey with RushRoute.
        </p>
      </div>
      <LoginForm
        onSubmit={handleLogin}
        loading={loading}
        error={error || sessionExpiredMessage}
      />
    </div>
  );
}
