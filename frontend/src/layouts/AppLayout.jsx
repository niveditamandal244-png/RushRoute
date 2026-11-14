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
    { to: '/', label: 'Home', icon: Compass },
    { to: '/book-ride', label: 'Book a Ride', icon: Car },
    { to: '/public-transport', label: 'Public Transport', icon: Bus },
    { to: '/journey-results', label: 'Compare', icon: Navigation },
    { to: '/carpool', label: 'Carpool', icon: Users },
    { to: '/my-journeys', label: 'My Trips', icon: History },
    { to: '/dashboard', label: 'AI Assistant', icon: LayoutDashboard }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5EAE7] bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#022C22] text-white shadow-xs">
              <Navigation className="h-5 w-5 text-[#10B981]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-[#17211E]">RushRoute</span>
              <span className="hidden rounded-full border border-[#10B981]/30 bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-bold text-[#047857] sm:inline-block">
                DEMO
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex lg:items-center lg:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                    active
                      ? 'bg-[#022C22] text-white shadow-2xs'
                      : 'text-[#727C77] hover:bg-[#ECFDF5] hover:text-[#022C22]'
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
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="hidden items-center gap-2 rounded-xl border border-emerald-900/15 bg-emerald-50/50 px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-100/60 sm:flex"
              >
                <User className="h-3.5 w-3.5 text-emerald-800" />
                <span className="max-w-[120px] truncate">{user?.full_name}</span>
              </Link>
              <Link
                to="/settings"
                title="Settings"
                className="rounded-xl p-2 text-slate-600 hover:bg-emerald-50 hover:text-emerald-950"
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
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-emerald-50"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
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
    { to: '/public-transport', label: 'BMTC & Namma Metro Planner', icon: Bus },
    { to: '/journey-results', label: 'Smart Multimodal Compare', icon: Compass },
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
                    ? 'bg-emerald-900 text-white'
                    : 'text-slate-700 hover:bg-emerald-50/70'
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

export function MobileBottomNav() {
  const location = useLocation();

  const tabs = [
    { to: '/', label: 'Home', icon: Compass },
    { to: '/book-ride', label: 'Uber/Ola', icon: Car },
    { to: '/journey-results', label: 'Compare', icon: Navigation },
    { to: '/public-transport', label: 'BMTC/Metro', icon: Bus },
    { to: '/my-journeys', label: 'Trips', icon: History }
  ];

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-1.5 backdrop-blur-xs lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = location.pathname === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center rounded-xl py-1.5 text-[11px] font-semibold transition ${
                active ? 'bg-emerald-900 text-white' : 'text-slate-600 hover:bg-emerald-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="mt-0.5 truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-[#E5EAE7] bg-white py-6 pb-20 lg:pb-6">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-4 text-xs text-[#727C77] sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#022C22]">RushRoute</span>
          <span>— One Platform. Every Journey. Smarter Decisions.</span>
        </div>
        <div className="text-center sm:text-right">
          <span>
            Bengaluru Mobility • OpenStreetMap &amp; OSRM • Sample BMTC/Metro Schedules • DemoRideProvider
          </span>
        </div>
      </div>
    </footer>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#F7F9F8]">
      <Navbar onToggleMobile={() => setMobileOpen(true)} />
      <MobileNavigation open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
