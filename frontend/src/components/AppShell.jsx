import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  BarChart3, CalendarDays, ChevronDown, Database, Globe2, History, LayoutDashboard,
  LogOut, Menu, Settings2, Share2, ShieldCheck, Sprout, X, Waves, BrainCircuit,
  MapPinned, SlidersHorizontal, FlaskConical,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { isMockMode, setMockMode } from '../services/api';
import BrandLogo from './BrandLogo';

const intelligenceItems = [
  { to: '/app/intelligence/crop-suitability', label: 'Crop Suitability', icon: BrainCircuit },
  { to: '/app/intelligence/crop-planner', label: 'Crop Planner', icon: MapPinned },
  { to: '/app/intelligence/market', label: 'Market Intelligence', icon: BarChart3 },
  { to: '/app/intelligence/adaptive-irrigation', label: 'Adaptive Irrigation', icon: SlidersHorizontal },
  { to: '/app/intelligence/water-resilience', label: 'Water Resilience', icon: ShieldCheck },
];

const communityItems = [
  { to: '/app/community-water', label: 'Community Water Network', icon: Share2 },
];

const operationsItems = [
  { to: '/app/intelligence/hybrid', label: 'Hybrid Crops', icon: FlaskConical },
  { to: '/app/schedule', label: 'Smart Irrigation', icon: CalendarDays },
  { to: '/app/history', label: 'Irrigation History', icon: History },
];

const menuIsActive = (pathname, items) => items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

export default function AppShell() {
  const { lang, setLang } = useI18n();
  const location = useLocation();
  const headerRef = useRef(null);
  const hoverTimers = useRef({});
  const closeTimer = useRef(null);
  const [mockActive, setMockActive] = useState(isMockMode());
  const [openMenu, setOpenMenu] = useState(null);
  const [closingMenu, setClosingMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileGroup, setMobileGroup] = useState(null);

  useEffect(() => {
    const handleModeChange = (event) => setMockActive(event.detail.useMockData);
    window.addEventListener('agr002_mock_mode_changed', handleModeChange);
    return () => window.removeEventListener('agr002_mock_mode_changed', handleModeChange);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setClosingMenu(null);
    setMobileOpen(false);
    setMobileGroup(null);
  }, [location.pathname]);

  useEffect(() => {
    const finishClose = () => {
      setOpenMenu(null);
      setClosingMenu(null);
      closeTimer.current = null;
    };
    const closeMenu = () => {
      if (!openMenu) return;
      setClosingMenu(openMenu);
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(finishClose, 210);
    };
    const closeOnOutsideClick = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) closeMenu();
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
        setMobileGroup(null);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      clearTimeout(closeTimer.current);
    };
  }, [openMenu]);

  const toggleMockMode = () => {
    const nextState = !mockActive;
    setMockMode(nextState);
    setMockActive(nextState);
  };

  const cancelHoverClose = (key) => {
    clearTimeout(hoverTimers.current[key]);
    clearTimeout(closeTimer.current);
    setClosingMenu(null);
  };

  const openMenuOnHover = (key) => {
    cancelHoverClose(key);
    setOpenMenu(key);
  };

  const closeMenuOnLeave = (key) => {
    clearTimeout(hoverTimers.current[key]);
    hoverTimers.current[key] = setTimeout(() => {
      if (openMenu !== key) return;
      setClosingMenu(key);
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        setOpenMenu(null);
        setClosingMenu(null);
      }, 210);
    }, 75);
  };

  const toggleMenu = (key) => {
    cancelHoverClose(key);
    if (openMenu === key) {
      setClosingMenu(key);
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        setOpenMenu(null);
        setClosingMenu(null);
      }, 210);
    } else {
      setClosingMenu(null);
      setOpenMenu(key);
    }
  };

  const renderDropdown = (key, label, Icon, items) => (
    <div
      className="product-nav-group"
      onMouseEnter={() => openMenuOnHover(key)}
      onMouseLeave={() => closeMenuOnLeave(key)}
    >
      <button
        type="button"
        className={`product-nav-link product-nav-trigger ${openMenu === key || menuIsActive(location.pathname, items) ? 'is-active' : ''}`}
        aria-expanded={openMenu === key}
        aria-haspopup="menu"
        onClick={() => toggleMenu(key)}
      >
        <Icon size={15} />{label}<ChevronDown size={13} className={openMenu === key ? 'is-open' : ''} />
      </button>
      {(openMenu === key || closingMenu === key) && (
        <div className={`product-dropdown ${closingMenu === key ? 'is-closing' : ''}`} role="menu">
          {items.map(({ to, label: itemLabel, icon: ItemIcon }) => (
            <NavLink key={to} to={to} role="menuitem" onClick={() => { setOpenMenu(null); setClosingMenu(null); }} className={({ isActive }) => `product-dropdown-link ${isActive ? 'is-active' : ''}`}>
              <ItemIcon size={15} />{itemLabel}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );

  const renderMobileGroup = (key, label, Icon, items) => (
    <div className="product-mobile-group">
      <button type="button" className={`product-mobile-group-trigger ${menuIsActive(location.pathname, items) ? 'is-active' : ''}`} onClick={() => setMobileGroup((current) => current === key ? null : key)} aria-expanded={mobileGroup === key}>
        <span><Icon size={17} />{label}</span><ChevronDown size={15} className={mobileGroup === key ? 'is-open' : ''} />
      </button>
      {mobileGroup === key && <div className="product-mobile-subnav">{items.map(({ to, label: itemLabel, icon: ItemIcon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `product-mobile-link ${isActive ? 'is-active' : ''}`}><ItemIcon size={16} />{itemLabel}</NavLink>)}</div>}
    </div>
  );

  return (
    <div className="product-shell min-h-screen">
      <header className="product-header" ref={headerRef}>
        <div className="product-header-inner">
          <Link to="/app" className="product-brand" onClick={() => setMobileOpen(false)}>
            <BrandLogo theme="dark" size="small" />
          </Link>
          <nav className="product-nav" aria-label="Primary navigation">
            <NavLink to="/app" end className={({ isActive }) => `product-nav-link ${isActive ? 'is-active' : ''}`}><LayoutDashboard size={15} />Overview</NavLink>
            <NavLink to="/app/farms" className={({ isActive }) => `product-nav-link ${isActive ? 'is-active' : ''}`}><Sprout size={15} />My Farms</NavLink>
            {renderDropdown('intelligence', 'Intelligence', Waves, intelligenceItems)}
            {renderDropdown('community', 'Community', Share2, communityItems)}
            {renderDropdown('operations', 'Operations', CalendarDays, operationsItems)}
          </nav>
          <div className="product-actions">
            <button type="button" className={`product-mode ${mockActive ? 'is-demo' : ''}`} onClick={toggleMockMode} title="Toggle API mode">
              <Database size={14} /><span>{mockActive ? 'DEMO MODE' : 'LIVE API'}</span>
            </button>
            <label className="product-language"><Globe2 size={14} /><select value={lang} aria-label="Language Selector" onChange={(event) => setLang(event.target.value)}><option value="en">EN</option><option value="kn">ಕನ್ನಡ</option><option value="hi">हिन्दी</option></select></label>
            <NavLink to="/app/profile" className={({ isActive }) => `profile-link ${isActive ? 'is-active' : ''}`} title="Profile and settings"><Settings2 size={17} /></NavLink>
            <button type="button" className="product-menu" onClick={() => setMobileOpen((current) => !current)} aria-label="Toggle navigation" aria-expanded={mobileOpen}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="product-mobile-nav" aria-label="Mobile navigation">
            <NavLink to="/app" end onClick={() => setMobileOpen(false)} className={({ isActive }) => `product-mobile-link ${isActive ? 'is-active' : ''}`}><LayoutDashboard size={17} />Overview</NavLink>
            <NavLink to="/app/farms" onClick={() => setMobileOpen(false)} className={({ isActive }) => `product-mobile-link ${isActive ? 'is-active' : ''}`}><Sprout size={17} />My Farms</NavLink>
            {renderMobileGroup('intelligence', 'Intelligence', Waves, intelligenceItems)}
            {renderMobileGroup('community', 'Community', Share2, communityItems)}
            {renderMobileGroup('operations', 'Operations', CalendarDays, operationsItems)}
          </nav>
        )}
      </header>
      <main className="product-main"><Outlet /></main>
      <footer className="product-footer"><span>AQUAGROW AI / FIELD INTELLIGENCE</span><span>© 2026 WATER-WISE FARMING</span><Link to="/"><LogOut size={13} /> Exit workspace</Link></footer>
    </div>
  );
}
