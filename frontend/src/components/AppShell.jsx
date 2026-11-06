import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Database, Globe2, History, LayoutDashboard, LogOut, Menu, Settings2, Sprout, UsersRound, X, Waves } from 'lucide-react';
import { useI18n } from '../i18n';
import { isMockMode, setMockMode } from '../services/api';
import { getSupabaseClient, isSupabaseConfigured } from '../services/supabase';

export default function AppShell() {
  const { lang, setLang, t } = useI18n();
  const [mockActive, setMockActive] = useState(isMockMode());
  const [menuOpen, setMenuOpen] = useState(false);
  const [exitError, setExitError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleModeChange = (event) => setMockActive(event.detail.useMockData);
    window.addEventListener('agr002_mock_mode_changed', handleModeChange);
    return () => window.removeEventListener('agr002_mock_mode_changed', handleModeChange);
  }, []);

  const navItems = [
    { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/app/intelligence', label: 'Intelligence', icon: Waves },
    { to: '/app/community-water', label: 'Community Water', icon: UsersRound },
    { to: '/app/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/app/history', label: 'History', icon: History },
  ];

  const toggleMockMode = () => {
    const nextState = !mockActive;
    setMockMode(nextState);
    setMockActive(nextState);
  };

  const exitWorkspace = async (event) => {
    event.preventDefault();
    setExitError('');
    try {
      if (isSupabaseConfigured()) {
        const { error } = await getSupabaseClient().auth.signOut();
        if (error) throw error;
      }
      navigate('/');
    } catch (signOutError) {
      setExitError(
        signOutError instanceof Error ? signOutError.message : 'Unable to sign out. Please try again.',
      );
    }
  };

  return (
    <div className="product-shell min-h-screen">
      <header className="product-header">
        <div className="product-header-inner">
          <Link to="/app" className="product-brand" onClick={() => setMenuOpen(false)}>
            <span className="product-brand-mark"><Sprout size={19} /></span>
            <span><strong>AquaGrow</strong><small>FIELD OPERATING SYSTEM</small></span>
          </Link>
          <nav className="product-nav">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `product-nav-link ${isActive ? 'is-active' : ''}`}>
                <Icon size={15} />{label}
              </NavLink>
            ))}
          </nav>
          <div className="product-actions">
            <button type="button" className={`product-mode ${mockActive ? 'is-demo' : ''}`} onClick={toggleMockMode} aria-label={mockActive ? 'Switch to live API mode' : 'Switch to demo mode'}>
              <Database size={14} /><span>{mockActive ? 'DEMO MODE' : 'LIVE API'}</span>
            </button>
            <label className="product-language"><Globe2 size={14} /><select value={lang} aria-label="Language Selector" onChange={(event) => setLang(event.target.value)}><option value="en">EN</option><option value="kn">ಕನ್ನಡ</option><option value="hi">हिन्दी</option></select></label>
            <NavLink to="/app/profile" className="profile-link" title="Profile and settings"><Settings2 size={17} /></NavLink>
            <button type="button" className="product-menu" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {menuOpen && <nav className="product-mobile-nav">{navItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)} className={({ isActive }) => `product-mobile-link ${isActive ? 'is-active' : ''}`}><Icon size={17} />{label}</NavLink>)}</nav>}
      </header>
      <main className="product-main"><Outlet /></main>
      <footer className="product-footer">
        <span>AQUAGROW AI / FIELD INTELLIGENCE</span>
        <span>© 2026 WATER-WISE FARMING</span>
        {exitError && <span className="product-exit-error" role="alert">{exitError}</span>}
        <Link to="/" onClick={exitWorkspace}><LogOut size={13} /> Exit workspace</Link>
      </footer>
    </div>
  );
}
