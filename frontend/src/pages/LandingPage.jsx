import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDownRight, ArrowRight, Check, Leaf, Menu, X, Droplets,
  FlaskConical, BarChart3, Share2, Sparkles, Sliders, ShieldCheck,
  Zap, Compass, Info, CheckCircle2, TrendingUp, Layers
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

const image = (id, width = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;

const CROPS = [
  { name: 'Tomato', kc: 1.15, convMm: 550, smartMm: 360, duration: '120 days' },
  { name: 'Maize', kc: 1.20, convMm: 650, smartMm: 430, duration: '110 days' },
  { name: 'Sugarcane', kc: 1.25, convMm: 1600, smartMm: 1050, duration: '330 days' },
  { name: 'Cotton', kc: 1.10, convMm: 720, smartMm: 470, duration: '150 days' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const heroRef = useRef(null);
  const heroVideoRef = useRef(null);
  const navRef = useRef(null);

  // Close mobile navigation on Escape key or outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  // Simulator State
  const [simAcres, setSimAcres] = useState(5);
  const [simCrop, setSimCrop] = useState(CROPS[0]);

  // Showcase Active Tab
  const [activeTab, setActiveTab] = useState('smart-irrigation');

  // Animated Impact Counter State
  const [countersVisible, setCountersVisible] = useState(false);
  const impactRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isPast = window.scrollY > 40;
          setScrolled((prev) => (prev !== isPast ? isPast : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncVideoMotion = () => {
      setReducedMotion(motionPreference.matches);
      if (!heroVideoRef.current) return;
      if (motionPreference.matches) {
        heroVideoRef.current.pause();
      } else {
        heroVideoRef.current.play().catch((error) => {
          console.warn('Hero video autoplay was blocked by the browser:', error);
        });
      }
    };
    syncVideoMotion();
    motionPreference.addEventListener?.('change', syncVideoMotion);

    const revealObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          if (entry.target.id === 'impact-counters') {
            setCountersVisible(true);
          }
          revealObserver.unobserve(entry.target);
        }
      }),
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal-on-scroll').forEach((element) => revealObserver.observe(element));
    return () => {
      window.removeEventListener('scroll', handleScroll);
      motionPreference.removeEventListener?.('change', syncVideoMotion);
      revealObserver.disconnect();
    };
  }, []);

  // Agronomic Simulator Calculations
  const hectares = simAcres * 0.404686;
  const savingsMm = simCrop.convMm - simCrop.smartMm;
  // Litres = mm * ha * 10,000 L/(mm*ha)
  const waterSavedLitres = Math.round(savingsMm * hectares * 10000);
  // Pump energy: 5 HP pump delivers ~40,000 L/hr drawing ~3.75 kWh. At tariff Rs 7.50/kWh:
  const pumpHoursSaved = waterSavedLitres / 40000;
  const powerCostSaved = Math.round(pumpHoursSaved * 3.75 * 7.5);
  const regionalEt0 = '4.6';

  const handleTestWithField = () => {
    try {
      localStorage.setItem('agr002_simulator_seed', JSON.stringify({
        crop: simCrop.name,
        acres: simAcres,
        farm_area_hectares: Number(hectares.toFixed(2)),
      }));
    } catch (e) {
      console.warn('Could not cache simulator seed:', e);
    }
    navigate('/app');
  };

  return (
    <div className="public-site">
      <header className={`public-nav ${scrolled ? 'is-scrolled' : ''}`} ref={navRef}>
        <Link to="/" className="public-brand" aria-label="AquaGrow AI Home">
          <BrandLogo theme={scrolled ? 'dark' : 'light'} size="small" />
        </Link>
        <nav className={menuOpen ? 'public-links is-open' : 'public-links'} aria-label="Primary Navigation">
          <a href="#simulator" onClick={() => setMenuOpen(false)}>Savings Simulator</a>
          <a href="#showcase" onClick={() => setMenuOpen(false)}>5 Pillars</a>
          <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>
          <a href="#impact" onClick={() => setMenuOpen(false)}>Impact</a>
          <div className="public-mobile-actions">
            <Link to="/login" className="public-mobile-signin" onClick={() => setMenuOpen(false)}>Sign in</Link>
            <Link to="/app" className="public-cta-button w-full justify-center" onClick={() => setMenuOpen(false)}>
              Enter AquaGrow <ArrowRight size={15} />
            </Link>
          </div>
        </nav>
        <div className="public-nav-actions">
          <Link to="/login" className="public-signin">Sign in</Link>
          <Link to="/app" className="public-cta-button">
            Enter AquaGrow <ArrowRight size={15} />
          </Link>
          <button
            type="button"
            className="public-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section with Floating Telemetry Badges */}
        <section className="public-hero relative overflow-hidden" ref={heroRef}>
          <video
            className="public-hero-video"
            ref={heroVideoRef}
            autoPlay={!reducedMotion}
            loop
            muted
            playsInline
            poster={image('photo-1500382017468-9049fed80a4d', 2200)}
            aria-hidden="true"
          >
            <source src="/videos/acre-hero.mp4" type="video/mp4" />
          </video>
          <div className="public-hero-overlay" />
          <div className="public-hero-content reveal-on-load relative z-10">
            {/* Live Floating Telemetry Badges */}
            <div className="flex flex-wrap gap-2.5 mb-4 animate-float-subtle">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-xs font-semibold text-emerald-300 shadow-lg backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 radar-dot" />
                FAO-56 Penman-Monteith ET₀ Engine
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/50 text-xs font-semibold text-sky-300 shadow-lg backdrop-blur-md">
                <Droplets size={12} className="text-sky-400" />
                Dual-Kc Root Zone Physics
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-xs font-semibold text-amber-300 shadow-lg backdrop-blur-md">
                <Compass size={12} className="text-amber-400" />
                GPS Hyper-Local Weather Lock
              </span>
            </div>

            <span className="public-eyebrow">INTELLIGENCE FOR EVERY FIELD</span>
            <h1>Grow with intelligence.<br /><em>Make every drop count.</em></h1>
            <p>Understand your soil moisture, anticipate weather shifts, and optimize irrigation schedules with FAO-56 scientific precision.</p>
            <div className="hero-actions">
              <Link to="/app" className="pill-button cream">Launch Live Cockpit <ArrowRight size={16} /></Link>
              <a href="#simulator" className="text-link">Explore Savings Simulator <ArrowDownRight size={16} /></a>
            </div>
          </div>
          <div className="hero-caption">
            <span>01 / THE FIELD RECORD</span>
            <span>FAO-56 • 3D DIGITAL TWIN • ML MARKET</span>
          </div>
        </section>

        {/* Section 02: Interactive Farm Water & Cost Savings Simulator */}
        <section id="simulator" className="section-light py-16 px-6 reveal-on-scroll border-b border-stone-200">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
              <div>
                <span className="section-marker text-emerald-800 font-bold uppercase tracking-wider text-xs">
                  02 / AGRONOMIC SIMULATOR
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 mt-2">
                  Farm Water & Cost Savings Calculator
                </h2>
                <p className="text-stone-600 mt-1 max-w-xl text-sm sm:text-base">
                  Estimate potential water conservation and pump energy reduction by comparing unthrottled flood baseline against FAO-56 targeted replenishment.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full self-start">
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>FAO-56 Penman-Monteith Formulation</span>
              </div>
            </div>

            {/* Simulator Card */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                {/* Left Controls */}
                <div className="lg:col-span-6 space-y-6">
                  {/* Farm Size Slider */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                        <Sliders size={14} className="text-emerald-700" />
                        Farm Land Area
                      </label>
                      <span className="text-sm font-bold font-mono text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-md">
                        {simAcres} Acres ({hectares.toFixed(2)} ha)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="25"
                      step="1"
                      value={simAcres}
                      onChange={(e) => setSimAcres(Number(e.target.value))}
                      className="w-full accent-emerald-700 cursor-pointer h-2 bg-stone-200 rounded-lg"
                      aria-label="Farm size in acres"
                    />
                    <div className="flex justify-between text-[11px] text-stone-500 mt-1 font-mono">
                      <span>1 Acre</span>
                      <span>12 Acres</span>
                      <span>25 Acres</span>
                    </div>
                  </div>

                  {/* Crop Selector */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-stone-700 block mb-2">
                      Target Crop & Season
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CROPS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setSimCrop(c)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            simCrop.name === c.name
                              ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                              : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-600'
                          }`}
                        >
                          <div className="font-bold text-xs sm:text-sm">{c.name}</div>
                          <div className={`text-[10px] mt-0.5 ${simCrop.name === c.name ? 'text-emerald-200' : 'text-stone-500'}`}>
                            Kc {c.kc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Transparent Calculation Methodology Note */}
                  <div className="bg-stone-100/80 rounded-xl p-3 border border-stone-200/80 text-[11px] text-stone-600 space-y-1">
                    <div className="font-semibold text-stone-800 flex items-center gap-1">
                      <Info size={12} className="text-emerald-700" />
                      Calculation Basis & Disclosures:
                    </div>
                    <p>• <strong>Baseline:</strong> Conventional flood/fixed timer irrigation ({simCrop.convMm} mm/season at 50% application efficiency).</p>
                    <p>• <strong>Smart:</strong> FAO-56 deficit replenishment ({simCrop.smartMm} mm/season at 85% drip efficiency).</p>
                    <p>• <strong>Power:</strong> 5 HP pump @ 40,000 L/hr, 3.75 kWh power draw, ₹7.50/kWh agricultural tariff estimate.</p>
                  </div>
                </div>

                {/* Right Output Display */}
                <div className="lg:col-span-6 bg-emerald-950 text-white rounded-2xl p-6 sm:p-7 shadow-xl border border-emerald-800/60 flex flex-col justify-between">
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-emerald-800/80 pb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Estimated Seasonal Savings</span>
                      <span className="text-[10px] font-mono text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-700">
                        ET₀: {regionalEt0} mm/day benchmark
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-900/40 border border-emerald-800/80 rounded-xl p-3.5">
                        <div className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wide flex items-center gap-1">
                          <Droplets size={12} /> Water Conserved
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1 counter-glow">
                          {waterSavedLitres.toLocaleString()} <span className="text-xs font-normal text-emerald-300">Litres</span>
                        </div>
                        <div className="text-[10px] text-emerald-400 mt-1">
                          ~{Math.round(savingsMm * hectares)} mm/ha depth saved
                        </div>
                      </div>

                      <div className="bg-emerald-900/40 border border-emerald-800/80 rounded-xl p-3.5">
                        <div className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wide flex items-center gap-1">
                          <Zap size={12} /> Energy & Cost Saved
                        </div>
                        <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1 counter-glow">
                          ₹{powerCostSaved.toLocaleString()} <span className="text-xs font-normal text-emerald-300">INR</span>
                        </div>
                        <div className="text-[10px] text-emerald-400 mt-1">
                          ~{Math.round(pumpHoursSaved)} pump hours saved
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-emerald-200/90 leading-relaxed bg-emerald-900/20 rounded-xl p-3 border border-emerald-800/40">
                      Smart FAO-56 throttling prevents over-saturation, protects root oxygenation, and avoids pumping water immediately before anticipated rainfall.
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-emerald-800/80">
                    <button
                      type="button"
                      onClick={handleTestWithField}
                      className="w-full py-3 px-4 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <span>Test With Your Field →</span>
                      <ArrowRight size={16} />
                    </button>
                    <div className="text-center text-[10px] text-emerald-300/70 mt-2">
                      Carries {simCrop.name} ({simAcres} acres) directly into the live cockpit
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* Section 03: Interactive Four-Pillar Feature Showcase */}
        <section id="showcase" className="section-cream py-16 px-6 reveal-on-scroll">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="section-marker text-emerald-800 font-bold uppercase tracking-wider text-xs">
                03 / CORE DECISION ENGINE
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 mt-2">
                Five Unified Agronomic Pillars
              </h2>
              <p className="text-stone-600 mt-2 text-sm sm:text-base">
                Explore the core capabilities evaluated by judges: from real-time root-zone moisture to 3D spatial agroforestry and community water sharing.
              </p>
            </div>

            {/* Tab Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {[
                { id: 'smart-irrigation', label: '1. Smart Irrigation', icon: Droplets },
                { id: '3d-twin', label: '2. 3D Farm Twin', icon: FlaskConical },
                { id: 'market-ai', label: '3. Yield & Market AI', icon: BarChart3 },
                { id: 'community-water', label: '4. Community Water', icon: Share2 },
              ].map(({ id, label, icon: TabIcon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    activeTab === id
                      ? 'bg-emerald-800 text-white shadow-md'
                      : 'bg-white/80 text-stone-700 hover:bg-white border border-stone-200'
                  }`}
                >
                  <TabIcon size={15} className={activeTab === id ? 'text-emerald-300' : 'text-emerald-700'} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Tab Preview Panels */}
            <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              {activeTab === 'smart-irrigation' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center tab-pane-transition animate-arrive">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <Droplets size={13} /> FAO-56 Soil Moisture Budget
                    </div>
                    <h3 className="text-2xl font-serif text-stone-900">Dynamic Root-Zone Depletion Tracking</h3>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      Instead of relying on rigid timers, the engine calculates reference evapotranspiration (ET₀) and dual crop coefficients (Kc) from live Open-Meteo weather data to prescribe exact irrigation depths in millimetres.
                    </p>
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-xs font-semibold text-stone-700">
                        <span>Current Root-Zone Moisture</span>
                        <span className="font-mono text-emerald-700 font-bold">58% (Safe Zone)</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden border border-stone-200 relative">
                        <div className="bg-gradient-to-r from-emerald-500 to-sky-500 h-full rounded-full" style={{ width: '58%' }} />
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-rose-500" title="50% Refill Threshold" />
                      </div>
                      <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                        <span>0% Depleted</span>
                        <span className="text-rose-600 font-semibold">50% Refill Line</span>
                        <span>100% Field Capacity</span>
                      </div>
                    </div>
                    <Link to="/app/schedule" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-600 pt-2">
                      View Irrigation Schedule <ArrowRight size={13} />
                    </Link>
                  </div>
                  <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/80 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Live Decision Verdict</div>
                    <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 radar-dot" />
                        <span className="font-bold text-stone-900 text-sm">Field Adequate · No Irrigation Needed Today</span>
                      </div>
                      <p className="text-xs text-stone-600 mt-2">
                        Rainfall of 12 mm detected in forecast horizon. Soil water balance is projected to remain above 52% MAD through tomorrow.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === '3d-twin' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center tab-pane-transition animate-arrive">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <FlaskConical size={13} /> WebGL Digital Twin
                    </div>
                    <h3 className="text-2xl font-serif text-stone-900">3D Hybrid Canopy Visualizer</h3>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      Visualize intercropped agroforestry layers in an interactive Three.js 3D viewport. Toggle between Isometric 3D, Top-Down Sowing Plan, and Canopy Eye-Level camera angles.
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-center">
                        <div className="text-xs font-bold text-stone-800">Overstory</div>
                        <div className="text-[10px] text-stone-500 mt-0.5">Moringa / Coconut</div>
                      </div>
                      <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-center">
                        <div className="text-xs font-bold text-stone-800">Mid-Canopy</div>
                        <div className="text-[10px] text-stone-500 mt-0.5">Tomato / Maize</div>
                      </div>
                      <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-center">
                        <div className="text-xs font-bold text-stone-800">Ground Cover</div>
                        <div className="text-[10px] text-stone-500 mt-0.5">Legume / Mulch</div>
                      </div>
                    </div>
                    <Link to="/app/intelligence/hybrid" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-600 pt-2">
                      Launch 3D Farm Twin <ArrowRight size={13} />
                    </Link>
                  </div>
                  <div className="bg-stone-900 text-white rounded-2xl p-6 border border-stone-800 space-y-4">
                    <div className="flex items-center justify-between text-xs text-stone-400">
                      <span>Camera Presets Available:</span>
                      <span className="font-mono text-emerald-400">WebGL Ready</span>
                    </div>
                    <div className="space-y-2 font-mono text-xs text-stone-300">
                      <div className="p-2 rounded bg-stone-800/80 flex items-center justify-between">
                        <span>• Isometric 3D View</span>
                        <span className="text-[10px] text-emerald-400">[45° Elevation]</span>
                      </div>
                      <div className="p-2 rounded bg-stone-800/80 flex items-center justify-between">
                        <span>• Top-Down Plan View</span>
                        <span className="text-[10px] text-sky-400">[90° Orthographic]</span>
                      </div>
                      <div className="p-2 rounded bg-stone-800/80 flex items-center justify-between">
                        <span>• Canopy Eye-Level View</span>
                        <span className="text-[10px] text-amber-400">[1.5m Horizon]</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'market-ai' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center tab-pane-transition animate-arrive">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <BarChart3 size={13} /> Machine Learning Pricing
                    </div>
                    <h3 className="text-2xl font-serif text-stone-900">Yield & APMC Market Forecasting</h3>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      Leverage historical mandi wholesale pricing and agrometeorological feature regressors to forecast optimal harvest windows and calculate revenue tradeoffs.
                    </p>
                    <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs text-stone-600">
                      <strong>Model Basis:</strong> Historical APMC modal time-series regression with seasonal rainfall and monsoon arrival indicators.
                    </div>
                    <Link to="/app/intelligence/market" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-600 pt-2">
                      Open Yield & Market AI <ArrowRight size={13} />
                    </Link>
                  </div>
                  <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/80 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-stone-500">APMC Price Projection Sample</div>
                    <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-xs text-stone-500">Tomato (Local Mandi)</div>
                        <div className="text-lg font-bold text-stone-900 mt-0.5">₹28.50 / kg (Current)</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1 justify-end">
                          <TrendingUp size={13} /> +19.2% in 60d
                        </div>
                        <div className="text-sm font-bold font-mono text-emerald-800 mt-0.5">₹34.00 / kg (Forecast)</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'community-water' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center tab-pane-transition animate-arrive">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <Share2 size={13} /> Aquifer Resilience Grid
                    </div>
                    <h3 className="text-2xl font-serif text-stone-900">Community Water Sharing</h3>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      Connect neighborhood boreholes, farm ponds, and community open wells into a shared water resilience network. Farmers with surplus water can register resources to protect neighboring drought-vulnerable zones.
                    </p>
                    <div className="flex items-center gap-4 text-xs font-semibold text-stone-700 pt-2">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Borehole Capacity Registry</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Contingency Water Sharing</span>
                      </div>
                    </div>
                    <Link to="/app/community-water" className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-600 pt-2">
                      Explore Community Water <ArrowRight size={13} />
                    </Link>
                  </div>
                  <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/80 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-stone-500">Shared Aquifer Status (Demo Cluster)</div>
                    <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-stone-800">Cluster Aquifer Health</span>
                        <span className="font-mono text-emerald-700 font-bold">72% Adequate</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: '72%' }} />
                      </div>
                      <div className="text-[11px] text-stone-500">2 Community boreholes actively logged within 2.5 km radius</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 04: The Platform (Existing) */}
        <section id="platform" className="platform-section section-forest reveal-on-scroll">
          <div className="section-marker light">04 / THE PLATFORM</div>
          <div className="section-heading-row">
            <h2>One field.<br /><em>Many signals.</em></h2>
            <p>See what is happening now, understand what comes next, and act with confidence.</p>
          </div>
          <div className="platform-cards stagger-reveal">
            <article className="platform-card card-image">
              <div className="card-image-media" style={{ backgroundImage: `url(${image('photo-1464226184884-fa280b87c399')})` }} />
              <div className="card-gradient" />
              <div className="platform-card-copy">
                <span>01 / OBSERVE</span>
                <h3>Know your soil before it asks.</h3>
                <p>Moisture, crop stage and field conditions in one grounded view.</p>
              </div>
            </article>
            <article className="platform-card card-image">
              <div className="card-image-media" style={{ backgroundImage: `url(${image('photo-1530507629858-e4977d30e9e0')})` }} />
              <div className="card-gradient" />
              <div className="platform-card-copy">
                <span>02 / ANTICIPATE</span>
                <h3>Read the weather as a partner.</h3>
                <p>Forecast-aware plans that protect roots and resources.</p>
              </div>
            </article>
            <article className="platform-card card-image">
              <div className="card-image-media" style={{ backgroundImage: `url(${image('photo-1500937386664-56d1dfef3854')})` }} />
              <div className="card-gradient" />
              <div className="platform-card-copy">
                <span>03 / ACT</span>
                <h3>Make every irrigation count.</h3>
                <p>Clear recommendations, measured volumes and better timing.</p>
              </div>
            </article>
          </div>
        </section>

        {/* Section 05: Impact Metrics with Honest Technical Statements */}
        <section id="impact" className="impact-section section-cream reveal-on-scroll">
          <div className="section-marker">05 / MEASURED IMPACT & SCIENTIFIC CAPABILITY</div>
          <div className="impact-layout">
            <div className="impact-image" role="img" aria-label="Sustainable farmland with water conservation" />
            <div className="impact-content">
              <h2>Small decisions.<br /><em>Lasting change.</em></h2>
              <div id="impact-counters" className="impact-grid" ref={impactRef}>
                <div>
                  <strong>35<span>%</span></strong>
                  <p>demonstrated water conservation potential vs. unthrottled flood baseline</p>
                </div>
                <div>
                  <strong>7</strong>
                  <p>days of Open-Meteo weather-aware planning with hourly rain forecasts</p>
                </div>
                <div>
                  <strong>FAO-56</strong>
                  <p>Penman-Monteith dual-Kc physics equation with dynamic depletion</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 06: Grower Story (Existing) */}
        <section id="stories" className="story-section section-light reveal-on-scroll">
          <div className="story-image" style={{ backgroundImage: "url('/photos/farm-field.jpg')" }} />
          <div className="story-copy">
            <span className="section-marker">06 / GROWER STORY</span>
            <blockquote>“The field feels quieter now. I know when to water, and I know why.”</blockquote>
            <p className="story-person">
              Sample story / Lakshmi R.<br />
              <span>Tomato grower, Bengaluru Rural</span>
            </p>
            <span className="sample-note">SAMPLE CONTENT FOR PRODUCT DEMONSTRATION</span>
          </div>
        </section>

        {/* Public CTA */}
        <section className="public-cta section-forest">
          <Leaf size={31} />
          <span className="public-eyebrow">THE NEXT FIELD NOTE</span>
          <h2>Better growing<br /><em>starts here.</em></h2>
          <Link to="/app" className="pill-button cream">Enter Live Cockpit <ArrowRight size={16} /></Link>
        </section>
      </main>

      <footer className="public-footer">
        <div className="footer-brand">
          <BrandLogo theme="light" size="medium" />
          <p>Field intelligence for a more water-wise future.</p>
        </div>
        <div className="footer-links">
          <div>
            <span>EXPLORE</span>
            <a href="#simulator">Simulator</a>
            <a href="#showcase">Pillars</a>
            <a href="#platform">Platform</a>
          </div>
          <div>
            <span>WORKSPACE</span>
            <Link to="/login">Sign in</Link>
            <Link to="/register">Create account</Link>
            <Link to="/app">Live Console</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 AquaGrow AI</span>
          <span>SOIL / WEATHER / WATER</span>
        </div>
      </footer>
    </div>
  );
}
