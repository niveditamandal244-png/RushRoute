import React, { useState } from 'react';
import { Lock, Mail, Phone, User } from 'lucide-react';

export function LoginForm({ onSubmit, loading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('RushRoute@2026');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ email, password });
      }}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <div>
        <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
          Email Address
        </label>
        <div className="relative mt-1.5">
          <Mail className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
          Password
        </label>
        <div className="relative mt-1.5">
          <Lock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In to RushRoute'}
      </button>

      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-500">
          Quick Demo Account Fill (Password: RushRoute@2026):
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('aarav.demo@rushroute.in')}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Demo Commuter (Aarav)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('admin@rushroute.in')}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
          >
            Demo Admin (Operations)
          </button>
        </div>
      </div>
    </form>
  );
}

export function RegisterForm({ onSubmit, loading, error }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          full_name: fullName,
          email,
          phone: phone || undefined,
          password
        });
      }}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <div>
        <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
          Full Name
        </label>
        <div className="relative mt-1.5">
          <User className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Aarav Sharma"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
          Email Address
        </label>
        <div className="relative mt-1.5">
          <Mail className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
          Phone Number (Optional)
        </label>
        <div className="relative mt-1.5">
          <Phone className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91-9876543210"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">
          Password (Min 8 chars, at least 1 letter & 1 number)
        </label>
        <div className="relative mt-1.5">
          <Lock className="pointer-events-none absolute top-3 left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pr-3.5 pl-10 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {loading ? 'Creating Account...' : 'Create RushRoute Account'}
      </button>
    </form>
  );
}
