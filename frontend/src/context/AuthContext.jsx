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

  useEffect(() => {
    async function verifySession() {
      const storedToken = localStorage.getItem('rushroute_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiClient.get('/auth/me');
        if (res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('rushroute_user', JSON.stringify(res.data.user));
        }
      } catch {
        localStorage.removeItem('rushroute_token');
        localStorage.removeItem('rushroute_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    verifySession();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { token: newToken, user: loggedInUser } = res.data;
    localStorage.setItem('rushroute_token', newToken);
    localStorage.setItem('rushroute_user', JSON.stringify(loggedInUser));
    setToken(newToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (payload) => {
    const res = await apiClient.post('/auth/register', payload);
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('rushroute_token', newToken);
    localStorage.setItem('rushroute_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
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
