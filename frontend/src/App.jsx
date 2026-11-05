import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import FarmSetupPage from './pages/FarmSetupPage';
import SchedulePage from './pages/SchedulePage';
import HistoryPage from './pages/HistoryPage';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import IntelligencePage from './pages/IntelligencePage';
import ProfilePage from './pages/ProfilePage';
import MyFarmsPage from './pages/MyFarmsPage';
import HybridRecommendationsPage from './pages/HybridRecommendationsPage';
import CropSuitabilityPage from './pages/CropSuitabilityPage';
import CropPlannerPage from './pages/CropPlannerPage';
import MarketIntelligencePage from './pages/MarketIntelligencePage';

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/recover" element={<AuthPage mode="recover" />} />
          <Route path="/" element={<AppShell />}>
            <Route path="app" element={<DashboardPage />} />
            <Route path="app/farms" element={<MyFarmsPage />} />
            <Route path="app/setup" element={<FarmSetupPage />} />
            <Route path="app/schedule" element={<SchedulePage />} />
            <Route path="app/history" element={<HistoryPage />} />
            <Route path="app/intelligence" element={<IntelligencePage />} />
            <Route path="app/intelligence/crop-suitability" element={<CropSuitabilityPage />} />
            <Route path="app/intelligence/crop-planner" element={<CropPlannerPage />} />
            <Route path="app/intelligence/market" element={<MarketIntelligencePage />} />
            <Route path="app/intelligence/hybrid" element={<HybridRecommendationsPage />} />
            <Route path="app/profile" element={<ProfilePage />} />
          </Route>
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/setup" element={<Navigate to="/app/setup" replace />} />
          <Route path="/schedule" element={<Navigate to="/app/schedule" replace />} />
          <Route path="/history" element={<Navigate to="/app/history" replace />} />
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}
