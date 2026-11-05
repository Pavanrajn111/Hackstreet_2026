import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  CalendarDays,
  Database,
  Globe2,
  History,
  LayoutDashboard,
  Menu,
  Sprout,
  X,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { isMockMode, setMockMode } from '../services/api';

export default function AppShell() {
  const { lang, setLang, t } = useI18n();
  const [mockActive, setMockActive] = useState(isMockMode());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleModeChange = (event) => setMockActive(event.detail.useMockData);
    window.addEventListener('agr002_mock_mode_changed', handleModeChange);
    return () => window.removeEventListener('agr002_mock_mode_changed', handleModeChange);
  }, []);

  const navItems = [
    { to: '/', label: t('nav_dashboard'), icon: LayoutDashboard },
    { to: '/setup', label: t('nav_farm_setup'), icon: Sprout },
    { to: '/schedule', label: t('nav_schedule'), icon: CalendarDays },
    { to: '/history', label: t('nav_history'), icon: History },
  ];

  const toggleMockMode = () => {
    const nextState = !mockActive;
    setMockMode(nextState);
    setMockActive(nextState);
  };

  return (
    <div className="app-shell min-h-screen flex flex-col">
      <header className="app-header">
        <div className="app-header-inner">
          <NavLink to="/" className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark" aria-hidden="true">
              <Sprout size={20} strokeWidth={1.8} />
            </span>
            <span>
              <span className="brand-name">{t('app_name')}</span>
              <span className="brand-meta">FIELD INTELLIGENCE / AGR002</span>
            </span>
          </NavLink>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <button type="button" className={`mode-toggle ${mockActive ? 'is-demo' : ''}`} onClick={toggleMockMode}>
              <Database size={14} />
              <span>{mockActive ? t('mock_mode') : t('backend_mode')}</span>
            </button>
            <label className="language-control">
              <Globe2 size={15} />
              <select value={lang} aria-label="Language Selector" onChange={(event) => setLang(event.target.value)}>
                <option value="en">EN</option>
                <option value="kn">ಕನ್ನಡ</option>
                <option value="hi">हिन्दी</option>
              </select>
            </label>
            <button
              type="button"
              className="menu-toggle"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `mobile-nav-link ${isActive ? 'is-active' : ''}`}
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="app-main">
        <div className="page-kicker"><span /> LIVE FIELD CONSOLE <span /></div>
        <Outlet />
      </main>

      <footer className="app-footer">
        <span>AQUAGROW AI / SMART WATER MANAGEMENT</span>
        <span>FAO-56 PENMAN-MONTEITH ENGINE</span>
      </footer>
    </div>
  );
}
