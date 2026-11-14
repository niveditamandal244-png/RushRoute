import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rushroute_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('rushroute_token') || null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState('');

  useEffect(() => {
    function handleSessionExpired(e) {
      localStorage.removeItem('rushroute_token');
      localStorage.removeItem('rushroute_user');
      setToken(null);
      setUser(null);
      setSessionExpiredMessage(
        e?.detail?.message || 'Your session has expired. Please sign in again.'
      );
    }

    window.addEventListener('rushroute:session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('rushroute:session-expired', handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    async function verifySession() {
      const storedToken = localStorage.getItem('rushroute_token');
      if (!storedToken) {
        localStorage.removeItem('rushroute_user');
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await apiClient.get('/auth/me');
        if (res.data?.user) {
          setUser(res.data.user);
          setToken(storedToken);
          localStorage.setItem('rushroute_user', JSON.stringify(res.data.user));
        } else {
          throw new Error('Invalid session');
        }
      } catch (err) {
        localStorage.removeItem('rushroute_token');
        localStorage.removeItem('rushroute_user');
        setToken(null);
        setUser(null);
        if (err.response?.status === 401) {
          setSessionExpiredMessage('Your session has expired. Please sign in again.');
        }
      } finally {
        setLoading(false);
      }
    }
    verifySession();
  }, []);

  const login = async (email, password) => {
    sessionStorage.removeItem('rushroute_logged_out');
    setSessionExpiredMessage('');
    const res = await apiClient.post('/auth/login', {
      email: String(email || '').trim().toLowerCase(),
      password
    });
    const { token: newToken, user: loggedInUser } = res.data;
    localStorage.setItem('rushroute_token', newToken);
    localStorage.setItem('rushroute_user', JSON.stringify(loggedInUser));
    setToken(newToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (payload) => {
    sessionStorage.removeItem('rushroute_logged_out');
    setSessionExpiredMessage('');
    const res = await apiClient.post('/auth/register', payload);
    const { token: newToken, user: newUser } = res.data;
    if (newToken && newUser) {
      localStorage.setItem('rushroute_token', newToken);
      localStorage.setItem('rushroute_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
    }
    return res.data;
  };

  const logout = async () => {
    sessionStorage.setItem('rushroute_logged_out', 'true');
    setSessionExpiredMessage('');
    try {
      if (localStorage.getItem('rushroute_token')) {
        await apiClient.post('/auth/logout');
      }
    } catch {
      // Ignore network error during logout
    }
    localStorage.removeItem('rushroute_token');
    localStorage.removeItem('rushroute_user');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const storedToken = localStorage.getItem('rushroute_token');
      if (storedToken) {
        setToken(storedToken);
      }
      const res = await apiClient.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
        localStorage.setItem('rushroute_user', JSON.stringify(res.data.user));
      }
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        isAdmin: user?.role === 'admin',
        sessionExpiredMessage,
        clearSessionExpiredMessage: () => setSessionExpiredMessage(''),
        login,
        register,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
}
