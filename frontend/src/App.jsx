import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AdminRoute, AppLayout, ProtectedRoute } from './layouts/AppLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { BookRidePage } from './pages/BookRidePage';
import { PublicTransportPage } from './pages/PublicTransportPage';
import { JourneyResultsPage } from './pages/JourneyResultsPage';
import { CarpoolPage } from './pages/CarpoolPage';
import { MyJourneysPage } from './pages/MyJourneysPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import {
  AdminAnalyticsPage,
  AdminDashboardPage,
  AdminIncidentsPage
} from './pages/AdminPages';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Commuter Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/book-ride" element={<BookRidePage />} />
              <Route path="/public-transport" element={<PublicTransportPage />} />
              <Route path="/journey-results" element={<JourneyResultsPage />} />
              <Route path="/carpool" element={<CarpoolPage />} />
              <Route path="/my-journeys" element={<MyJourneysPage />} />
              <Route path="/report-issue" element={<ReportIssuePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Restricted Administrative Routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/incidents" element={<AdminIncidentsPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            </Route>

            {/* Catch-all Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
