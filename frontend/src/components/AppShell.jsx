import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, ChevronDown, Database, Globe2, History, LayoutDashboard,
  LogOut, Menu, Settings2, Share2, ShieldCheck, Sprout, X, BrainCircuit,
  MapPinned, SlidersHorizontal, FlaskConical, Droplets, Check, Loader2, LocateFixed,
  MessageCircle
} from 'lucide-react';
import { detectBrowserLocation, getUserLocation, subscribeToLocationChanges } from '../services/locationService';
import { useI18n } from '../i18n';
import { getFarms, isMockMode, setMockMode } from '../services/api';
import { getActiveFarmId, setActiveFarmId } from '../services/farmSelection';
import BrandLogo from './BrandLogo';
import useAuth from '../auth/useAuth';
import ChatWidget from './ChatWidget';

const extendedToolsGroups = [
  {
    category: 'Crop Intelligence',
    items: [
      { to: '/app/intelligence/crop-planner', label: 'Zonal Field Planner', icon: MapPinned },
      { to: '/app/intelligence/crop-suitability', label: 'Crop Suitability AI', icon: BrainCircuit },
      { to: '/app/assistant', label: 'AI Farm Assistant', icon: MessageCircle },
    ],
  },
  {
    category: 'Water Intelligence',
    items: [
      { to: '/app/intelligence/adaptive-irrigation', label: 'Dynamic Stress Regulator', icon: SlidersHorizontal },
      { to: '/app/intelligence/water-resilience', label: 'Water Resilience Matrix', icon: ShieldCheck },
    ],
  },
  {
    category: 'Records & Monitoring',
    items: [
      { to: '/app/history', label: 'Water Audit & History', icon: History },
      { to: '/app/farms', label: 'Farm Registry & Records', icon: Sprout },
    ],
  },
];

const allExtendedItems = extendedToolsGroups.flatMap((g) => g.items);
const menuIsActive = (pathname, items) => items.some((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

export default function AppShell() {
  const { lang, setLang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const headerRef = useRef(null);
  const farmDropdownRef = useRef(null);
  const [mockActive, setMockActive] = useState(isMockMode());
  const [openMenu, setOpenMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Location and GPS state
  const [userLoc, setUserLoc] = useState(() => getUserLocation());
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);

  // Active farm state
  const [farms, setFarms] = useState([]);
  const [activeFarm, setActiveFarm] = useState(null);
  const [farmDropdownOpen, setFarmDropdownOpen] = useState(false);

  const loadFarms = async () => {
    try {
      const list = await getFarms();
      setFarms(list || []);
      const activeId = getActiveFarmId();
      const current = list?.find((f) => String(f.id ?? f.farm_name) === String(activeId)) || list?.[0] || null;
      setActiveFarm(current);
      if (current && !activeId) {
        setActiveFarmId(current.id ?? current.farm_name);
      }
    } catch (e) {
      console.warn('Could not load farms in header:', e);
    }
  };

  useEffect(() => {
    const unsubLoc = subscribeToLocationChanges((loc) => setUserLoc(loc));
    return () => unsubLoc();
  }, []);

  const handleDetectGPS = async (e) => {
    e?.stopPropagation();
    setLocating(true);
    setLocError(null);
    try {
      const loc = await detectBrowserLocation();
      setUserLoc(loc);
    } catch (err) {
      setLocError(err.message || 'GPS location unavailable');
      setTimeout(() => setLocError(null), 4500);
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    loadFarms();
    const handleFarmChange = () => loadFarms();
    window.addEventListener('agr002_farm_updated', handleFarmChange);
    window.addEventListener('agr002_active_farm_changed', handleFarmChange);
    return () => {
      window.removeEventListener('agr002_farm_updated', handleFarmChange);
      window.removeEventListener('agr002_active_farm_changed', handleFarmChange);
    };
  }, []);

  useEffect(() => {
    const handleModeChange = (event) => setMockActive(event.detail.useMockData);
    window.addEventListener('agr002_mock_mode_changed', handleModeChange);
    return () => window.removeEventListener('agr002_mock_mode_changed', handleModeChange);
  }, []);

  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
    setFarmDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
      if (farmDropdownRef.current && !farmDropdownRef.current.contains(event.target)) {
        setFarmDropdownOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setMobileOpen(false);
        setFarmDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openMenu, farmDropdownOpen]);

  const toggleMockMode = () => {
    const nextState = !mockActive;
    setMockMode(nextState);
    setMockActive(nextState);
  };

  const logout = async () => {
    try {
      await signOut();
      ['agr002_saved_farm', 'agr002_cached_recommendation', 'agr002_cached_time', 'agr002_local_history', 'agr002_active_farm_id'].forEach((key) => localStorage.removeItem(key));
      navigate('/login', { replace: true });
    } catch (logoutError) {
      console.error('Unable to sign out:', logoutError);
    }
  };

  const handleSelectFarm = (f) => {
    setActiveFarm(f);
    setActiveFarmId(f.id ?? f.farm_name);
    setFarmDropdownOpen(false);
  };

  return (
    <div className="product-shell min-h-screen">
      <header className="product-header" ref={headerRef}>
        <div className="product-header-inner">
          <div className="flex items-center gap-2.5">
            <Link to="/app" className="product-brand" onClick={() => setMobileOpen(false)}>
              <BrandLogo theme="dark" size="small" />
            </Link>

            {/* Unified Field Telemetry Control: Active Field & GPS */}
            <div className="relative hidden md:inline-flex items-center rounded-xl bg-slate-800/90 border border-slate-700/80 p-0.5 shadow-sm" ref={farmDropdownRef}>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:bg-slate-700/70 transition-colors cursor-pointer"
                onClick={() => setFarmDropdownOpen(!farmDropdownOpen)}
                aria-expanded={farmDropdownOpen}
                title="Active Field and GPS: Click to switch farm"
              >
                <Sprout size={13} className="text-emerald-400" />
                <span className="max-w-[110px] truncate">{activeFarm?.farm_name || 'Select Field'}</span>
                {activeFarm?.farm_area_hectares && (
                  <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">· {activeFarm.farm_area_hectares} ha</span>
                )}
                <ChevronDown size={11} className={`text-slate-400 transition-transform ${farmDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={locating}
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-700/70 transition-colors cursor-pointer"
                title="Click to detect device GPS field location"
              >
                {locating ? (
                  <Loader2 size={12} className="text-sky-400 animate-spin" />
                ) : (
                  <LocateFixed size={12} className={userLoc?.isGps ? 'text-sky-400' : 'text-slate-400'} />
                )}
                <span className="max-w-[105px] truncate text-[11px]">
                  {userLoc?.placeName || (activeFarm?.district ? `${activeFarm.district}` : 'Detect GPS')}
                </span>
              </button>

              {locError && (
                <div className="absolute top-full mt-2 left-0 z-50 bg-rose-950 border border-rose-800 text-rose-200 text-[11px] px-2.5 py-1.5 rounded-lg shadow-xl max-w-[220px]">
                  {locError}
                </div>
              )}

              {farmDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 animate-arrive">
                  <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                    <span>Active Field Records</span>
                    <span className="text-emerald-400 text-[9px] font-mono">FIELD & GPS</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/50 py-1">
                    {farms.map((f) => {
                      const isSelected = activeFarm && (f.id === activeFarm.id || f.farm_name === activeFarm.farm_name);
                      return (
                        <button
                          key={f.id ?? f.farm_name}
                          type="button"
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-emerald-950 text-emerald-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                          onClick={() => handleSelectFarm(f)}
                        >
                          <div>
                            <div className="font-semibold">{f.farm_name || 'Unnamed Farm'}</div>
                            <div className="text-[10px] text-slate-400">{f.crop || 'Crop'} · {f.farm_area_hectares || 1.5} ha</div>
                          </div>
                          {isSelected && <Check size={14} className="text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                  <Link
                    to="/app/setup"
                    className="block text-center text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 py-1.5 border-t border-slate-800 mt-1"
                    onClick={() => setFarmDropdownOpen(false)}
                  >
                    + Add New Farm Field
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Primary Pitch-Ready Navigation: 5 Pillars */}
          <nav className="product-nav" aria-label="Primary navigation">
            <NavLink to="/app" end className={({ isActive }) => `product-nav-link ${isActive ? 'is-active' : ''}`}><LayoutDashboard size={15} />Live Dashboard</NavLink>
            <NavLink to="/app/schedule" className={({ isActive }) => `product-nav-link ${isActive ? 'is-active' : ''}`}><Droplets size={15} />Irrigation Schedule</NavLink>
            <NavLink to="/app/intelligence/hybrid" className={({ isActive }) => `product-nav-link ${isActive ? 'is-active' : ''}`}><FlaskConical size={15} />3D Farm Twin</NavLink>
            <NavLink to="/app/intelligence/market" className={({ isActive }) => `product-nav-link ${isActive ? 'is-active' : ''}`}><BarChart3 size={15} />Yield & Market AI</NavLink>
            <NavLink to="/app/community-water" className={({ isActive }) => `product-nav-link ${isActive ? 'is-active' : ''}`}><Share2 size={15} />Community Water</NavLink>

            {/* Extended Tools Dropdown */}
            <div
              className="product-nav-group"
              onMouseEnter={() => setOpenMenu('extended')}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <button
                type="button"
                className={`product-nav-link product-nav-trigger ${openMenu === 'extended' || menuIsActive(location.pathname, allExtendedItems) ? 'is-active' : ''}`}
                aria-expanded={openMenu === 'extended'}
                onClick={() => setOpenMenu(openMenu === 'extended' ? null : 'extended')}
              >
                <SlidersHorizontal size={15} />Extended Tools<ChevronDown size={13} className={openMenu === 'extended' ? 'is-open' : ''} />
              </button>
              {openMenu === 'extended' && (
                <div className="product-dropdown min-w-[240px] p-2 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl" role="menu">
                  {extendedToolsGroups.map((group, gIdx) => (
                    <div key={group.category} className={gIdx > 0 ? 'mt-2 pt-2 border-t border-slate-800' : ''}>
                      <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {group.category}
                      </div>
                      {group.items.map(({ to, label, icon: ItemIcon }) => (
                        <NavLink
                          key={to}
                          to={to}
                          role="menuitem"
                          onClick={() => setOpenMenu(null)}
                          className={({ isActive }) => `product-dropdown-link flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${isActive ? 'is-active bg-emerald-950 text-emerald-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'}`}
                        >
                          <ItemIcon size={14} className="text-slate-400 shrink-0" />
                          <span>{label}</span>
                        </NavLink>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Actions & Utilities */}
          <div className="product-actions">
            <button type="button" className={`product-mode ${mockActive ? 'is-demo' : ''}`} onClick={toggleMockMode} title="Toggle API mode" aria-label={mockActive ? 'Switch to live API mode' : 'Switch to demo mode'}>
              <Database size={14} /><span>{mockActive ? 'DEMO MODE' : 'LIVE API'}</span>
            </button>
            <label className="product-language">
              <Globe2 size={14} />
              <select value={lang} aria-label="Language Selector" onChange={(event) => setLang(event.target.value)}>
                <option value="en">EN</option>
                <option value="kn">ಕನ್ನಡ</option>
                <option value="hi">हिन्दी</option>
              </select>
            </label>
            <NavLink to="/app/profile" className={({ isActive }) => `profile-link ${isActive ? 'is-active' : ''}`} title="Profile and settings"><Settings2 size={17} /></NavLink>
            <button type="button" className="product-menu" onClick={() => setMobileOpen((current) => !current)} aria-label="Toggle navigation" aria-expanded={mobileOpen}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <nav className="product-mobile-nav" aria-label="Mobile navigation">
            <div className="px-3 py-2 border-b border-slate-800 mb-1">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Core Decision Engine</div>
            </div>
            <NavLink to="/app" end onClick={() => setMobileOpen(false)} className={({ isActive }) => `product-mobile-link ${isActive ? 'is-active' : ''}`}><LayoutDashboard size={17} />Live Dashboard</NavLink>
            <NavLink to="/app/schedule" onClick={() => setMobileOpen(false)} className={({ isActive }) => `product-mobile-link ${isActive ? 'is-active' : ''}`}><Droplets size={17} />Irrigation Schedule</NavLink>
            <NavLink to="/app/intelligence/hybrid" onClick={() => setMobileOpen(false)} className={({ isActive }) => `product-mobile-link ${isActive ? 'is-active' : ''}`}><FlaskConical size={17} />3D Farm Twin</NavLink>
            <NavLink to="/app/intelligence/market" onClick={() => setMobileOpen(false)} className={({ isActive }) => `product-mobile-link ${isActive ? 'is-active' : ''}`}><BarChart3 size={17} />Yield & Market AI</NavLink>
            <NavLink to="/app/community-water" onClick={() => setMobileOpen(false)} className={({ isActive }) => `product-mobile-link ${isActive ? 'is-active' : ''}`}><Share2 size={17} />Community Water</NavLink>

            <div className="pt-2 border-t border-slate-800 mt-2">
              <div className="px-4 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Extended Tools</div>
              {extendedToolsGroups.map((group) => (
                <div key={group.category} className="mb-2">
                  <div className="px-4 py-0.5 text-[9px] font-semibold text-slate-400 uppercase">{group.category}</div>
                  {group.items.map(({ to, label, icon: ItemIcon }) => (
                    <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `product-mobile-link ${isActive ? 'is-active' : ''}`}><ItemIcon size={16} />{label}</NavLink>
                  ))}
                </div>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="product-main"><Outlet /></main>
      <ChatWidget />
      <footer className="product-footer">
        <span>AQUAGROW AI / FIELD INTELLIGENCE</span>
        <span>© 2026 WATER-WISE FARMING</span>
        <button type="button" className="product-logout" onClick={logout}><LogOut size={13} /> Sign out</button>
      </footer>
    </div>
  );
}
