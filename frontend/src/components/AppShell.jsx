import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Sprout, Calendar, History, Globe, Database, Droplets } from 'lucide-react';
import { useI18n } from '../i18n';
import { isMockMode, setMockMode } from '../services/api';

export default function AppShell() {
  const { lang, setLang, t } = useI18n();
  const [mockActive, setMockActive] = useState(isMockMode());

  useEffect(() => {
    const handleModeChange = (e) => {
      setMockActive(e.detail.useMockData);
    };
    window.addEventListener('agr002_mock_mode_changed', handleModeChange);
    return () => window.removeEventListener('agr002_mock_mode_changed', handleModeChange);
  }, []);

  const toggleMockMode = () => {
    const nextState = !mockActive;
    setMockMode(nextState);
    setMockActive(nextState);
  };

  const navItems = [
    { to: '/', label: t('nav_dashboard'), icon: LayoutDashboard },
    { to: '/setup', label: t('nav_farm_setup'), icon: Sprout },
    { to: '/schedule', label: t('nav_schedule'), icon: Calendar },
    { to: '/history', label: t('nav_history'), icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 pb-20 md:pb-0">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Logo & App Name */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                {t('app_name')}
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                AGR002 • {t('app_tagline')}
              </p>
            </div>
          </div>

          {/* Right Header Actions: Mock Switcher & Language Select */}
          <div className="flex items-center gap-2">
            {/* Mock / Live Backend Mode Pill */}
            <button
              onClick={toggleMockMode}
              title="Click to toggle between Mock Data and Live FastAPI Backend"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                mockActive
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{mockActive ? t('mock_mode') : t('backend_mode')}</span>
            </button>

            {/* Language Selector */}
            <div className="relative flex items-center">
              <Globe className="w-4 h-4 text-slate-500 absolute left-2 pointer-events-none" />
              <select
                value={lang}
                aria-label="Language Selector"
                onChange={(e) => setLang(e.target.value)}
                className="pl-7 pr-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none"
              >
                <option value="en">English</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex max-w-4xl mx-auto px-4 border-t border-slate-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
                    isActive
                      ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 md:py-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Phone-First, Large Touch Targets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 safe-area-bottom">
        <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                    isActive
                      ? 'text-emerald-700'
                      : 'text-slate-500 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer / Project Info */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 hidden md:block">
        <p>AGR002 Smart Irrigation System • Built with React, Tailwind, and FastAPI</p>
        <p className="mt-1 text-[11px] text-slate-400">
          FAO-56 Penman-Monteith heuristic engine • Educational Hackathon MVP
        </p>
      </footer>
    </div>
  );
}
