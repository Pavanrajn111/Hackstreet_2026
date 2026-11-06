import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, ChevronDown, Globe2, History, LayoutDashboard,
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

// Primary Direct Navigation Links
const coreNavLinks = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/schedule', label: 'Irrigation', icon: Droplets, end: false },
];

// Intelligence Dropdown Items
const intelligenceNavItems = [
  {
    to: '/app/intelligence/hybrid',
    label: 'Hybrid Farming',
    desc: 'Intercrop compatibility & 3D farm twin',
    icon: FlaskConical,
  },
  {
    to: '/app/intelligence/market',
    label: 'Yield & Market AI',
    desc: 'Price forecasting & sales timing',
    icon: BarChart3,
  },
  {
    to: '/app/intelligence/adaptive-irrigation',
    label: 'Dynamic Stress Regulator',
    desc: 'Real-time ET & crop stress balancing',
    icon: SlidersHorizontal,
  },
  {
    to: '/app/intelligence/crop-suitability',
    label: 'Crop Suitability AI',
    desc: 'Soil, rainfall & climate crop matching',
    icon: BrainCircuit,
  },
  {
    to: '/app/intelligence/crop-planner',
    label: 'Zonal Field Planner',
    desc: 'Multi-zone plot & seasonal planner',
    icon: MapPinned,
  },
  {
    to: '/app/intelligence',
    label: 'Field Signals Overview',
    desc: 'Moisture, sensor & weather telemetry',
    icon: Sprout,
    end: true,
  },
];

// Community Dropdown Items
const communityNavItems = [
  {
    to: '/app/community-water',
    label: 'Water Sharing Network',
    desc: 'Opt-in borewell & surplus pond sharing',
    icon: Share2,
  },
  {
    to: '/app/intelligence/water-resilience',
    label: 'Water Resilience Matrix',
    desc: 'Drought mitigation & resource pooling',
    icon: ShieldCheck,
  },
];

// Tools Dropdown Items
const toolsNavItems = [
  {
    to: '/app/assistant',
    label: 'AI Farm Assistant',
    desc: 'Autonomous agronomic chat advisor',
    icon: MessageCircle,
  },
  {
    to: '/app/farms',
    label: 'Farm Registry & Records',
    desc: 'Manage holdings, parcels & soil specs',
    icon: Sprout,
  },
  {
    to: '/app/history',
    label: 'Water Audit & History',
    desc: 'Historical logs & water consumption',
    icon: History,
  },
  {
    to: '/app/setup',
    label: 'Add New Farm Field',
    desc: 'Register a new parcel or telemetry anchor',
    icon: MapPinned,
  },
];

const isRouteActive = (pathname, to, end = false) => {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
};

const isGroupActive = (pathname, items) => {
  return items.some((item) => isRouteActive(pathname, item.to, item.end));
};

export default function AppShell() {
  const { lang, setLang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const headerRef = useRef(null);
  const farmDropdownRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const [mockActive, setMockActive] = useState(isMockMode());
  const [openMenu, setOpenMenu] = useState(null); // 'intelligence' | 'community' | 'tools' | 'more' | null
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

  const closeAllMenus = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpenMenu(null);
    setFarmDropdownOpen(false);
    setMobileOpen(false);
  };

  useEffect(() => {
    closeAllMenus();
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

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
        closeAllMenus();
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const handleMenuEnter = (menuKey) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpenMenu(menuKey);
  };

  const handleMenuLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenMenu(null);
    }, 160);
  };

  const handleMenuToggle = (menuKey) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setOpenMenu((prev) => (prev === menuKey ? null : menuKey));
  };

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
    <div className="product-shell nature-shell min-h-screen">
      {/* Nature Glass Ambient Environment Layer */}
      <div className="fixed inset-0 pointer-events-none nature-ambient-gradient z-0 opacity-70" aria-hidden="true" />
      <header className="product-header glass-navbar" ref={headerRef}>
        <div className="product-header-inner">
          
          {/* ========================================================= */}
          {/* LEFT SECTION: AquaGrow AI logo & compact farm selector   */}
          {/* ========================================================= */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <Link to="/app" className="product-brand" onClick={closeAllMenus}>
              <BrandLogo theme="dark" size="small" />
            </Link>

            {/* Desktop & Tablet Farm Selector */}
            <div className="relative hidden md:inline-flex items-center" ref={farmDropdownRef}>
              <div className="inline-flex items-center rounded-xl bg-white/75 border border-[#173F2A]/15 shadow-2xs hover:border-[#173F2A]/30 transition-all p-0.5">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#173F2A] hover:bg-[#173F2A]/6 transition-colors cursor-pointer"
                  onClick={() => setFarmDropdownOpen(!farmDropdownOpen)}
                  aria-expanded={farmDropdownOpen}
                  aria-haspopup="true"
                  title="Active Field: Click to switch farm parcel"
                >
                  <Sprout size={14} className="text-[#2D7A4F] shrink-0" />
                  <span className="max-w-[105px] sm:max-w-[125px] truncate font-medium">
                    {activeFarm?.farm_name || 'Select Field'}
                  </span>
                  {activeFarm?.farm_area_hectares && (
                    <span className="text-[10px] text-[#173F2A]/50 font-mono hidden 2xl:inline">
                      · {activeFarm.farm_area_hectares} ha
                    </span>
                  )}
                  <ChevronDown
                    size={11}
                    className={`text-[#173F2A]/50 transition-transform duration-200 ${farmDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <div className="w-px h-3.5 bg-[#173F2A]/15 mx-0.5" />

                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={locating}
                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-[#173F2A]/70 hover:text-[#173F2A] hover:bg-[#173F2A]/6 transition-colors cursor-pointer"
                  title="Device GPS: Click to update field telemetry anchor"
                >
                  {locating ? (
                    <Loader2 size={12} className="text-sky-600 animate-spin" />
                  ) : (
                    <LocateFixed size={12} className={userLoc?.isGps ? 'text-sky-600' : 'text-[#173F2A]/50'} />
                  )}
                  <span className="max-w-[95px] truncate text-[11px] hidden lg:inline">
                    {userLoc?.placeName || (activeFarm?.district ? `${activeFarm.district}` : 'Detect GPS')}
                  </span>
                </button>
              </div>

              {locError && (
                <div className="absolute top-full mt-2 left-0 z-50 bg-rose-50 border border-rose-300 text-rose-800 text-[11px] px-3 py-1.5 rounded-xl shadow-lg max-w-[220px]">
                  {locError}
                </div>
              )}

              {/* Farm Selector Dropdown Menu */}
              {farmDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-[#FAF8F2] border border-[#173F2A]/15 rounded-2xl shadow-[0_16px_36px_-8px_rgba(23,63,42,0.15)] p-2 z-50 animate-dropdown-fade">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#173F2A]/60 border-b border-[#173F2A]/10 flex items-center justify-between">
                    <span>Active Field Records</span>
                    <span className="text-[#2D7A4F] text-[9px] font-mono font-semibold bg-[#2D7A4F]/10 px-1.5 py-0.5 rounded">
                      FIELD & GPS
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-[#173F2A]/5 py-1">
                    {farms.map((f) => {
                      const isSelected = activeFarm && (f.id === activeFarm.id || f.farm_name === activeFarm.farm_name);
                      return (
                        <button
                          key={f.id ?? f.farm_name}
                          type="button"
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#EAE7DC] text-[#173F2A] font-semibold' : 'text-[#173F2A]/80 hover:bg-[#F2EFE6]'
                          }`}
                          onClick={() => handleSelectFarm(f)}
                        >
                          <div>
                            <div className="font-semibold">{f.farm_name || 'Unnamed Farm'}</div>
                            <div className="text-[11px] text-[#173F2A]/60">
                              {f.crop || 'Crop'} · {f.farm_area_hectares || 1.5} ha {f.district ? `· ${f.district}` : ''}
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-[#2D7A4F] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <Link
                    to="/app/setup"
                    className="block text-center text-xs font-semibold text-[#2D7A4F] hover:text-[#173F2A] hover:bg-[#173F2A]/5 py-2 rounded-lg border-t border-[#173F2A]/10 mt-1 transition-colors"
                    onClick={() => setFarmDropdownOpen(false)}
                  >
                    + Add New Farm Field
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Header Farm Selector Pill */}
            <button
              type="button"
              onClick={() => setFarmDropdownOpen(!farmDropdownOpen)}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/75 border border-[#173F2A]/15 text-xs font-semibold text-[#173F2A] max-w-[130px] truncate shadow-2xs cursor-pointer"
              title="Switch active farm field"
            >
              <Sprout size={13} className="text-[#2D7A4F] shrink-0" />
              <span className="truncate">{activeFarm?.farm_name || 'Field'}</span>
              <ChevronDown size={10} className="text-[#173F2A]/50 shrink-0" />
            </button>
          </div>

          {/* ========================================================= */}
          {/* CENTER SECTION: Clean, balanced navigation system        */}
          {/* ========================================================= */}

          {/* Desktop Full Navbar (xl and wider: >= 1140px) */}
          <nav className="product-nav hidden xl:flex items-center gap-1" aria-label="Primary desktop navigation">
            {/* Direct Links: Overview, Irrigation, Farm Twin */}
            {coreNavLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `product-nav-item ${isActive ? 'is-active' : ''}`}
              >
                <link.icon size={14} />
                <span>{link.label}</span>
              </NavLink>
            ))}

            {/* Intelligence Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMenuEnter('intelligence')}
              onMouseLeave={handleMenuLeave}
            >
              <button
                type="button"
                className={`product-nav-item product-nav-trigger ${
                  openMenu === 'intelligence' || isGroupActive(location.pathname, intelligenceNavItems)
                    ? 'is-active'
                    : ''
                }`}
                onClick={() => handleMenuToggle('intelligence')}
                aria-expanded={openMenu === 'intelligence'}
                aria-haspopup="true"
              >
                <BrainCircuit size={14} />
                <span>Intelligence</span>
                <ChevronDown size={11} className={`nav-chevron ${openMenu === 'intelligence' ? 'is-open' : ''}`} />
              </button>
              {openMenu === 'intelligence' && (
                <div
                  className="nav-dropdown-menu w-76 sm:w-80"
                  role="menu"
                  onMouseEnter={() => handleMenuEnter('intelligence')}
                  onMouseLeave={handleMenuLeave}
                >
                  <div className="nav-dropdown-header">Field Intelligence Engine</div>
                  <div className="space-y-0.5">
                    {intelligenceNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        role="menuitem"
                        onClick={closeAllMenus}
                        className={({ isActive }) =>
                          `nav-dropdown-item group ${isActive ? 'is-active' : ''}`
                        }
                      >
                        <div className="nav-dropdown-icon">
                          <item.icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="nav-dropdown-label">{item.label}</div>
                          <div className="nav-dropdown-desc">{item.desc}</div>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Community Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMenuEnter('community')}
              onMouseLeave={handleMenuLeave}
            >
              <button
                type="button"
                className={`product-nav-item product-nav-trigger ${
                  openMenu === 'community' || isGroupActive(location.pathname, communityNavItems)
                    ? 'is-active'
                    : ''
                }`}
                onClick={() => handleMenuToggle('community')}
                aria-expanded={openMenu === 'community'}
                aria-haspopup="true"
              >
                <Share2 size={14} />
                <span>Community</span>
                <ChevronDown size={11} className={`nav-chevron ${openMenu === 'community' ? 'is-open' : ''}`} />
              </button>
              {openMenu === 'community' && (
                <div
                  className="nav-dropdown-menu w-76 sm:w-80"
                  role="menu"
                  onMouseEnter={() => handleMenuEnter('community')}
                  onMouseLeave={handleMenuLeave}
                >
                  <div className="nav-dropdown-header">Collaborative Water Networks</div>
                  <div className="space-y-0.5">
                    {communityNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        onClick={closeAllMenus}
                        className={({ isActive }) =>
                          `nav-dropdown-item group ${isActive ? 'is-active' : ''}`
                        }
                      >
                        <div className="nav-dropdown-icon">
                          <item.icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="nav-dropdown-label">{item.label}</div>
                          <div className="nav-dropdown-desc">{item.desc}</div>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tools Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => handleMenuEnter('tools')}
              onMouseLeave={handleMenuLeave}
            >
              <button
                type="button"
                className={`product-nav-item product-nav-trigger ${
                  openMenu === 'tools' || isGroupActive(location.pathname, toolsNavItems)
                    ? 'is-active'
                    : ''
                }`}
                onClick={() => handleMenuToggle('tools')}
                aria-expanded={openMenu === 'tools'}
                aria-haspopup="true"
              >
                <SlidersHorizontal size={14} />
                <span>Tools</span>
                <ChevronDown size={11} className={`nav-chevron ${openMenu === 'tools' ? 'is-open' : ''}`} />
              </button>
              {openMenu === 'tools' && (
                <div
                  className="nav-dropdown-menu w-76 sm:w-80"
                  role="menu"
                  onMouseEnter={() => handleMenuEnter('tools')}
                  onMouseLeave={handleMenuLeave}
                >
                  <div className="nav-dropdown-header">Agronomic Tools & Records</div>
                  <div className="space-y-0.5">
                    {toolsNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        onClick={closeAllMenus}
                        className={({ isActive }) =>
                          `nav-dropdown-item group ${isActive ? 'is-active' : ''}`
                        }
                      >
                        <div className="nav-dropdown-icon">
                          <item.icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="nav-dropdown-label">{item.label}</div>
                          <div className="nav-dropdown-desc">{item.desc}</div>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Tablet Navbar: Overview, Irrigation & unified More dropdown (768px - 1139px) */}
          <nav className="product-nav hidden md:flex xl:hidden items-center gap-1" aria-label="Tablet navigation">
            {coreNavLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `product-nav-item ${isActive ? 'is-active' : ''}`}
              >
                <link.icon size={14} />
                <span>{link.label}</span>
              </NavLink>
            ))}

            <div
              className="relative"
              onMouseEnter={() => handleMenuEnter('more')}
              onMouseLeave={handleMenuLeave}
            >
              <button
                type="button"
                className={`product-nav-item product-nav-trigger ${
                  openMenu === 'more' ||
                  isGroupActive(location.pathname, [...intelligenceNavItems, ...communityNavItems, ...toolsNavItems])
                    ? 'is-active'
                    : ''
                }`}
                onClick={() => handleMenuToggle('more')}
                aria-expanded={openMenu === 'more'}
                aria-haspopup="true"
              >
                <SlidersHorizontal size={14} />
                <span>More</span>
                <ChevronDown size={11} className={`nav-chevron ${openMenu === 'more' ? 'is-open' : ''}`} />
              </button>
              {openMenu === 'more' && (
                <div
                  className="nav-dropdown-menu w-80 sm:w-96 max-h-[75vh] overflow-y-auto"
                  role="menu"
                  onMouseEnter={() => handleMenuEnter('more')}
                  onMouseLeave={handleMenuLeave}
                >
                  <div className="nav-dropdown-header">Intelligence</div>
                  <div className="space-y-0.5 mb-2">
                    {intelligenceNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        role="menuitem"
                        onClick={closeAllMenus}
                        className={({ isActive }) => `nav-dropdown-item group ${isActive ? 'is-active' : ''}`}
                      >
                        <div className="nav-dropdown-icon"><item.icon size={14} /></div>
                        <div className="min-w-0 flex-1">
                          <div className="nav-dropdown-label">{item.label}</div>
                          <div className="nav-dropdown-desc">{item.desc}</div>
                        </div>
                      </NavLink>
                    ))}
                  </div>

                  <div className="nav-dropdown-header border-t border-[#173F2A]/10 pt-2">Community</div>
                  <div className="space-y-0.5 mb-2">
                    {communityNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        onClick={closeAllMenus}
                        className={({ isActive }) => `nav-dropdown-item group ${isActive ? 'is-active' : ''}`}
                      >
                        <div className="nav-dropdown-icon"><item.icon size={14} /></div>
                        <div className="min-w-0 flex-1">
                          <div className="nav-dropdown-label">{item.label}</div>
                          <div className="nav-dropdown-desc">{item.desc}</div>
                        </div>
                      </NavLink>
                    ))}
                  </div>

                  <div className="nav-dropdown-header border-t border-[#173F2A]/10 pt-2">Tools & Records</div>
                  <div className="space-y-0.5">
                    {toolsNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        role="menuitem"
                        onClick={closeAllMenus}
                        className={({ isActive }) => `nav-dropdown-item group ${isActive ? 'is-active' : ''}`}
                      >
                        <div className="nav-dropdown-icon"><item.icon size={14} /></div>
                        <div className="min-w-0 flex-1">
                          <div className="nav-dropdown-label">{item.label}</div>
                          <div className="nav-dropdown-desc">{item.desc}</div>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* ========================================================= */}
          {/* RIGHT SECTION: API Status, Language, Profile & Mobile Btn */}
          {/* ========================================================= */}
          <div className="product-actions flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* API Mode Toggle */}
            <button
              type="button"
              onClick={toggleMockMode}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold tracking-wider transition-all cursor-pointer shadow-2xs border ${
                mockActive
                  ? 'bg-amber-500/10 text-amber-900 border-amber-500/30 hover:bg-amber-500/15'
                  : 'bg-emerald-600/10 text-emerald-900 border-emerald-600/30 hover:bg-emerald-600/15'
              }`}
              title={`Click to switch to ${mockActive ? 'Live API' : 'Demo Mode'}`}
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    mockActive ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    mockActive ? 'bg-amber-500' : 'bg-emerald-600'
                  }`}
                />
              </span>
              <span className="hidden sm:inline font-mono font-bold">
                {mockActive ? 'DEMO MODE' : 'LIVE API'}
              </span>
            </button>

            {/* Language Selector */}
            <label className="relative inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#173F2A]/15 bg-white/70 hover:bg-white text-[#173F2A] transition-colors cursor-pointer shadow-2xs">
              <Globe2 size={13} className="text-[#173F2A]/60 shrink-0" />
              <select
                value={lang}
                aria-label="Language Selector"
                onChange={(event) => setLang(event.target.value)}
                className="bg-transparent border-0 outline-none text-xs font-semibold text-[#173F2A] cursor-pointer appearance-none pr-3"
              >
                <option value="en">EN</option>
                <option value="kn">ಕನ್ನಡ</option>
                <option value="hi">हिन्दी</option>
              </select>
              <ChevronDown size={10} className="text-[#173F2A]/50 pointer-events-none -ml-2 shrink-0" />
            </label>

            {/* Profile & Settings Link */}
            <NavLink
              to="/app/profile"
              className={({ isActive }) =>
                `p-2 rounded-lg transition-colors border cursor-pointer ${
                  isActive
                    ? 'bg-[#173F2A]/10 text-[#173F2A] border-[#173F2A]/20'
                    : 'text-[#173F2A]/70 hover:text-[#173F2A] hover:bg-[#173F2A]/6 border-transparent hover:border-[#173F2A]/10'
                }`
              }
              title="Settings & Profile"
            >
              <Settings2 size={16} />
            </NavLink>

            {/* Mobile Menu Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-[#173F2A] hover:bg-[#173F2A]/8 border border-[#173F2A]/15 transition-colors cursor-pointer"
              aria-label="Toggle navigation drawer"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MOBILE SLIDE-OUT NAVIGATION DRAWER                       */}
        {/* ========================================================= */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex justify-end">
            {/* Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-backdrop-fade transition-opacity"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-out Drawer Panel */}
            <aside
              className="relative w-[85%] max-w-[340px] h-full bg-[#F5F3EA] border-l border-[#173F2A]/15 shadow-2xl flex flex-col z-10 animate-drawer-slide overflow-hidden"
              role="dialog"
              aria-label="Mobile Navigation Menu"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-[#173F2A]/10 flex items-center justify-between">
                <Link to="/app" onClick={closeAllMenus} className="product-brand">
                  <BrandLogo theme="dark" size="small" />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-[#173F2A]/70 hover:text-[#173F2A] hover:bg-[#173F2A]/8 border border-[#173F2A]/15 transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body - Scrollable */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {/* Active Farm & GPS Widget in Mobile Drawer */}
                <div className="p-3 rounded-xl bg-white/70 border border-[#173F2A]/12 shadow-2xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#173F2A]/60 mb-1 flex items-center justify-between">
                    <span>Active Field</span>
                    <span className="text-[#2D7A4F] font-mono text-[9px] font-semibold bg-[#2D7A4F]/10 px-1 py-0.5 rounded">
                      FIELD & GPS
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-[#173F2A] truncate">
                        {activeFarm?.farm_name || 'No Field Selected'}
                      </div>
                      <div className="text-[11px] text-[#173F2A]/60">
                        {activeFarm?.crop || 'Crop'} · {activeFarm?.farm_area_hectares || 1.5} ha
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleDetectGPS}
                      disabled={locating}
                      className="p-1.5 rounded-lg bg-[#173F2A]/5 hover:bg-[#173F2A]/10 text-[#173F2A] text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                      title="Refresh GPS"
                    >
                      {locating ? <Loader2 size={13} className="animate-spin text-sky-600" /> : <LocateFixed size={13} />}
                    </button>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#173F2A]/8 flex items-center justify-between text-[11px]">
                    <span className="text-[#173F2A]/60 truncate max-w-[170px]">
                      {userLoc?.placeName || activeFarm?.district || 'Location unavailable'}
                    </span>
                    <Link
                      to="/app/farms"
                      onClick={closeAllMenus}
                      className="text-[#2D7A4F] font-semibold hover:underline"
                    >
                      Switch Field
                    </Link>
                  </div>
                </div>

                {/* Section 1: Core Engine */}
                <div>
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-[#173F2A]/50 mb-1.5">
                    Core Decision Engine
                  </div>
                  <div className="space-y-1">
                    {coreNavLinks.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end}
                        onClick={closeAllMenus}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#173F2A] text-white font-semibold shadow-xs'
                              : 'text-[#173F2A]/80 hover:bg-[#173F2A]/6 hover:text-[#173F2A]'
                          }`
                        }
                      >
                        <link.icon size={16} />
                        <span>{link.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>

                {/* Section 2: Intelligence */}
                <div>
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-[#173F2A]/50 mb-1.5">
                    Intelligence
                  </div>
                  <div className="space-y-1">
                    {intelligenceNavItems.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.end}
                        onClick={closeAllMenus}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#173F2A] text-white font-semibold shadow-xs'
                              : 'text-[#173F2A]/80 hover:bg-[#173F2A]/6 hover:text-[#173F2A]'
                          }`
                        }
                      >
                        <link.icon size={15} />
                        <span className="truncate">{link.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>

                {/* Section 3: Community */}
                <div>
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-[#173F2A]/50 mb-1.5">
                    Community
                  </div>
                  <div className="space-y-1">
                    {communityNavItems.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={closeAllMenus}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#173F2A] text-white font-semibold shadow-xs'
                              : 'text-[#173F2A]/80 hover:bg-[#173F2A]/6 hover:text-[#173F2A]'
                          }`
                        }
                      >
                        <link.icon size={15} />
                        <span className="truncate">{link.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>

                {/* Section 4: Tools & Records */}
                <div>
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-[#173F2A]/50 mb-1.5">
                    Tools & Records
                  </div>
                  <div className="space-y-1">
                    {toolsNavItems.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={closeAllMenus}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-[#173F2A] text-white font-semibold shadow-xs'
                              : 'text-[#173F2A]/80 hover:bg-[#173F2A]/6 hover:text-[#173F2A]'
                          }`
                        }
                      >
                        <link.icon size={15} />
                        <span className="truncate">{link.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-[#173F2A]/10 bg-[#EFECE1]/60 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={toggleMockMode}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                      mockActive
                        ? 'bg-amber-500/10 text-amber-900 border-amber-500/30'
                        : 'bg-emerald-600/10 text-emerald-900 border-emerald-600/30'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${mockActive ? 'bg-amber-500' : 'bg-emerald-600'}`} />
                    <span>{mockActive ? 'DEMO MODE' : 'LIVE API'}</span>
                  </button>

                  <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#173F2A]/15 bg-white text-xs font-semibold text-[#173F2A] cursor-pointer">
                    <Globe2 size={13} className="text-[#173F2A]/60" />
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value)}
                      className="bg-transparent border-0 outline-none text-xs font-semibold cursor-pointer"
                    >
                      <option value="en">EN</option>
                      <option value="kn">ಕನ್ನಡ</option>
                      <option value="hi">हिन्दी</option>
                    </select>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <NavLink
                    to="/app/profile"
                    onClick={closeAllMenus}
                    className="flex items-center gap-2 text-xs font-semibold text-[#173F2A] hover:underline"
                  >
                    <Settings2 size={15} />
                    <span>Profile & Settings</span>
                  </NavLink>

                  <button
                    type="button"
                    onClick={logout}
                    className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </header>

      <main className="product-main relative z-10">
        <Outlet />
      </main>
      <ChatWidget />
      <footer className="product-footer relative z-10">
        <span>AQUAGROW AI / FIELD INTELLIGENCE</span>
        <span>© 2026 WATER-WISE FARMING</span>
        <button type="button" className="product-logout" onClick={logout}>
          <LogOut size={13} /> Sign out
        </button>
      </footer>
    </div>
  );
}
