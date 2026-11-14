import React, { useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bus,
  Car,
  Compass,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Navigation,
  Settings,
  ShieldCheck,
  User,
  Users,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from '../components/GeneralComponents';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <LoadingState message="Verifying your RushRoute session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children || <Outlet />;
}

export function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <LoadingState message="Checking administrator permissions..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children || <Outlet />;
}

export function Navbar({ onToggleMobile }) {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/book-ride', label: 'Book Ride', icon: Car },
    { to: '/public-transport', label: 'Public Transit', icon: Bus },
    { to: '/journey-results', label: 'Smart Compare', icon: Compass },
    { to: '/carpool', label: 'Carpool', icon: Users },
    { to: '/my-journeys', label: 'My Journeys', icon: History },
    { to: '/report-issue', label: 'Report Issue', icon: AlertTriangle }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
              <Navigation className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">RushRoute</span>
              <span className="ml-2 hidden rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 sm:inline-block">
                AI Mobility
              </span>
            </div>
          </Link>

          {isAuthenticated && (
            <nav className="hidden lg:flex lg:items-center lg:gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                    location.pathname.startsWith('/admin')
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin
                </Link>
              )}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 sm:flex"
              >
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span className="max-w-[120px] truncate">{user?.full_name}</span>
              </Link>
              <Link
                to="/settings"
                title="Settings"
                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="hidden items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 sm:flex"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
              <button
                type="button"
                onClick={onToggleMobile}
                className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileNavigation({ open, onClose }) {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!open || !isAuthenticated) return null;

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/book-ride', label: 'Book a Ride', icon: Car },
    { to: '/public-transport', label: 'Public Transport Planner', icon: Bus },
    { to: '/journey-results', label: 'Journey Alternatives & Budget', icon: Compass },
    { to: '/carpool', label: 'AI Carpool Matching', icon: Users },
    { to: '/my-journeys', label: 'My Journeys & Bookings', icon: History },
    { to: '/report-issue', label: 'Report Transit Issue', icon: AlertTriangle },
    { to: '/profile', label: 'Profile & Saved Places', icon: User },
    { to: '/settings', label: 'Account Settings', icon: Settings }
  ];

  if (isAdmin) {
    links.push(
      { to: '/admin', label: 'Admin Dashboard', icon: ShieldCheck },
      { to: '/admin/incidents', label: 'Admin Incidents', icon: AlertTriangle },
      { to: '/admin/analytics', label: 'Admin Analytics', icon: Compass }
    );
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex w-72 flex-col bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-sm font-bold text-slate-900">{user?.full_name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
          {links.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={async () => {
            onClose();
            await logout();
            navigate('/login');
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">RushRoute</span>
          <span>— One Platform. Every Journey. Smarter Decisions.</span>
        </div>
        <div className="text-center sm:text-right">
          <span>
            Transparency Notice: Private rides use <strong>DemoRideProvider</strong>; public routes use schedule-based demo datasets.
          </span>
        </div>
      </div>
    </footer>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar onToggleMobile={() => setMobileOpen(true)} />
      <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
