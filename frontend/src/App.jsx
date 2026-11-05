import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nProvider } from './i18n';
import AppShell from './components/AppShell';
import DashboardPage from './pages/DashboardPage';
import FarmSetupPage from './pages/FarmSetupPage';
import SchedulePage from './pages/SchedulePage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="setup" element={<FarmSetupPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </I18nProvider>
  );
}
