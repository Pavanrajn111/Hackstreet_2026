import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowRight, Check, Leaf, Menu, Sprout, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const image = (id, width = 1400) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);
  const heroVideoRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncVideoMotion = () => {
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

  return (
    <div className="public-site">
      <header className={`public-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <Link to="/" className="public-brand"><span className="public-brand-mark"><Sprout size={20} /></span><strong>AquaGrow</strong></Link>
        <nav className={menuOpen ? 'public-links is-open' : 'public-links'}>
          <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a><a href="#approach" onClick={() => setMenuOpen(false)}>Our approach</a><a href="#impact" onClick={() => setMenuOpen(false)}>Impact</a><a href="#stories" onClick={() => setMenuOpen(false)}>Stories</a>
        </nav>
        <div className="public-nav-actions"><Link to="/login" className="public-signin">Sign in</Link><Link to="/register" className="pill-button light">Enter AquaGrow <ArrowRight size={15} /></Link><button className="public-menu" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
      </header>

      <main>
        <section className="public-hero" ref={heroRef}>
          <video
            className="public-hero-video"
            ref={heroVideoRef}
            autoPlay
            loop
            muted
            playsInline
            poster={image('photo-1500382017468-9049fed80a4d', 2200)}
            aria-hidden="true"
          >
            <source src="https://assets.mixkit.co/videos/preview/mixkit-green-fields-and-mountains-under-a-cloudy-sky-12330-large.mp4" type="video/mp4" />
          </video>
          <div className="public-hero-overlay" />
          <div className="public-hero-content reveal-on-load">
            <span className="public-eyebrow">INTELLIGENCE FOR EVERY FIELD</span>
            <h1>Grow with intelligence.<br /><em>Make every drop count.</em></h1>
            <p>Understand your soil, anticipate the weather and make smarter irrigation decisions with AquaGrow AI.</p>
            <div className="hero-actions"><Link to="/register" className="pill-button cream">Explore AquaGrow <ArrowRight size={16} /></Link><a href="#platform" className="text-link">Discover the platform <ArrowDownRight size={16} /></a></div>
          </div>
          <div className="hero-caption"><span>01 / THE FIELD RECORD</span><span>SOIL • WEATHER • WATER</span></div>
        </section>

        <section className="public-intro section-light reveal-on-scroll">
          <div className="section-marker">02 / WHY AQUAGROW</div>
          <div className="intro-grid"><h2>The acre is not a number.<br /><em>It is a living system.</em></h2><div><p className="lead">AquaGrow connects the signals beneath your feet with the decisions in your hands.</p><p>We turn complex agronomy into a clear rhythm for the people who grow our food. Less guesswork. Less waste. Better days in the field.</p><Link to="/register" className="arrow-link">Start with your field <span><ArrowRight size={15} /></span></Link></div></div>
        </section>

        <section id="platform" className="platform-section section-forest reveal-on-scroll">
          <div className="section-marker light">03 / THE PLATFORM</div>
          <div className="section-heading-row"><h2>One field.<br /><em>Many signals.</em></h2><p>See what is happening now, understand what comes next, and act with confidence.</p></div>
          <div className="platform-cards stagger-reveal">
            <article className="platform-card card-image"><div className="card-image-media" style={{ backgroundImage: `url(${image('photo-1464226184884-fa280b87c399')})` }} /><div className="card-gradient" /><div className="platform-card-copy"><span>01 / OBSERVE</span><h3>Know your soil before it asks.</h3><p>Moisture, crop stage and field conditions in one grounded view.</p></div></article>
            <article className="platform-card card-image"><div className="card-image-media" style={{ backgroundImage: `url(${image('photo-1530507629858-e4977d30e9e0')})` }} /><div className="card-gradient" /><div className="platform-card-copy"><span>02 / ANTICIPATE</span><h3>Read the weather as a partner.</h3><p>Forecast-aware plans that protect roots and resources.</p></div></article>
            <article className="platform-card card-image"><div className="card-image-media" style={{ backgroundImage: `url(${image('photo-1500937386664-56d1dfef3854')})` }} /><div className="card-gradient" /><div className="platform-card-copy"><span>03 / ACT</span><h3>Make every irrigation count.</h3><p>Clear recommendations, measured volumes and better timing.</p></div></article>
          </div>
        </section>

        <section id="approach" className="editorial-split section-light reveal-on-scroll">
          <div className="editorial-photo" style={{ backgroundImage: `url(${image('photo-1500382017468-9049fed80a4d')})` }}><span className="photo-label">AQUAGROW / FIELD NOTE 001</span></div>
          <div className="editorial-copy"><span className="section-marker">04 / OUR APPROACH</span><h2>Precision can feel<br /><em>natural.</em></h2><p className="lead">The best technology does not add noise to a grower's day. It makes the next decision feel obvious.</p><div className="check-list"><p><Check size={17} /> Built around your crop and your soil</p><p><Check size={17} /> Designed for changing weather</p><p><Check size={17} /> Clear enough to use in the field</p></div><Link to="/app" className="arrow-link">Explore the field console <span><ArrowRight size={15} /></span></Link></div>
        </section>

        <section id="impact" className="impact-section section-cream reveal-on-scroll"><div className="section-marker">05 / MEASURED IMPACT</div><h2>Small decisions.<br /><em>Lasting change.</em></h2><div className="impact-grid"><div><strong>35<span>%</span></strong><p>potential water saved with responsive irrigation</p></div><div><strong>7</strong><p>days of weather-aware planning at a glance</p></div><div><strong>01</strong><p>clear recommendation for your next action</p></div></div></section>

        <section id="stories" className="story-section section-light reveal-on-scroll"><div className="story-image" style={{ backgroundImage: `url(${image('photo-1592982537447-6f7a30c7f7f8')})` }} /><div className="story-copy"><span className="section-marker">06 / GROWER STORY</span><blockquote>“The field feels quieter now. I know when to water, and I know why.”</blockquote><p className="story-person">Sample story / Lakshmi R.<br /><span>Tomato grower, Bengaluru Rural</span></p><span className="sample-note">SAMPLE CONTENT FOR PRODUCT DEMONSTRATION</span></div></section>

        <section className="public-cta section-forest"><Leaf size={31} /><span className="public-eyebrow">THE NEXT FIELD NOTE</span><h2>Better growing<br /><em>starts here.</em></h2><Link to="/register" className="pill-button cream">Build your field record <ArrowRight size={16} /></Link></section>
      </main>
      <footer className="public-footer"><div className="footer-brand"><span className="public-brand-mark"><Sprout size={20} /></span><h3>AquaGrow</h3><p>Field intelligence for a more water-wise future.</p></div><div className="footer-links"><div><span>EXPLORE</span><a href="#platform">Platform</a><a href="#approach">Our approach</a><a href="#impact">Impact</a></div><div><span>WORKSPACE</span><Link to="/login">Sign in</Link><Link to="/register">Create account</Link><Link to="/app">Demo console</Link></div></div><div className="footer-bottom"><span>© 2026 AquaGrow AI</span><span>SOIL / WEATHER / WATER</span></div></footer>
    </div>
  );
}
