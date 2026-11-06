import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Droplets,
  MapPin,
  Plus,
  UsersRound,
  Waves,
} from 'lucide-react';

const sources = [
  {
    name: 'South canal branch',
    kind: 'Canal',
    location: 'Hoskote · South basin',
    volume: '8,200',
    unit: 'L available',
    window: 'Today, 14:00–18:00',
    level: 68,
    status: 'Flowing',
  },
  {
    name: 'Mango grove pond',
    kind: 'Pond',
    location: 'Malur · East basin',
    volume: '5,600',
    unit: 'L available',
    window: 'Tomorrow, 06:00–10:00',
    level: 44,
    status: 'Shared',
  },
  {
    name: 'Co-op borewell 02',
    kind: 'Borewell',
    location: 'Kolar · North ridge',
    volume: '3,100',
    unit: 'L available',
    window: 'Today, 17:00–19:00',
    level: 29,
    status: 'Limited',
  },
];

const exchanges = [
  {
    initials: 'MN',
    farmer: 'M. Narayan',
    detail: 'Groundnut · 2.4 acres',
    location: 'Hoskote, Karnataka',
    amount: '2,400 L',
    timing: 'Today · 14:00',
    direction: 'offering',
  },
  {
    initials: 'SK',
    farmer: 'S. Kumari',
    detail: 'Ragi · 1.8 acres',
    location: 'Malur, Karnataka',
    amount: '1,200 L',
    timing: 'Tomorrow · 06:30',
    direction: 'requesting',
  },
  {
    initials: 'RV',
    farmer: 'R. Venkatesh',
    detail: 'Tomato · 3.1 acres',
    location: 'Kolar, Karnataka',
    amount: '3,000 L',
    timing: 'Today · 17:15',
    direction: 'offering',
  },
];

const filters = ['All sources', 'Canal', 'Pond', 'Borewell'];

export default function CommunityWaterPage() {
  const [activeFilter, setActiveFilter] = useState('All sources');
  const [requestOpen, setRequestOpen] = useState(false);
  const [previewNotice, setPreviewNotice] = useState('');
  const visibleSources = useMemo(
    () => activeFilter === 'All sources'
      ? sources
      : sources.filter((source) => source.kind === activeFilter),
    [activeFilter],
  );

  const previewRequest = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = String(form.get('amount') ?? '').trim();
    const window = String(form.get('window') ?? '').trim();
    setPreviewNotice(`Preview only: ${amount} L for ${window}. Nothing was sent or saved.`);
    event.currentTarget.reset();
  };

  return (
    <div className="community-water">
      <div className="community-water-topline">
        <p className="page-kicker"><span /> COMMUNITY WATER / HACKATHON SHOWCASE</p>
        <span className="community-demo-badge"><span /> Illustrative demo data</span>
      </div>

      <section className="community-hero">
        <div className="community-hero-copy">
          <span className="workspace-eyebrow">BETTER TOGETHER, DROP BY DROP</span>
          <h1>Water moves<br /><em>when we share.</em></h1>
          <p>
            A community view of local water availability and farmer-to-farmer
            coordination, designed for water-wise decisions.
          </p>
          <div className="community-hero-meta">
            <MapPin size={14} /> Kolar district, Karnataka
            <span className="community-meta-divider" />
            <Clock3 size={14} /> Sample week · 12–18 August
          </div>
        </div>
        <div className="community-hero-art" aria-hidden="true">
          <div className="community-water-orbit orbit-one" />
          <div className="community-water-orbit orbit-two" />
          <div className="community-water-drop"><Droplets size={46} strokeWidth={1.2} /></div>
          <span className="community-art-caption">SHARED RESOURCE<br />LOCAL IMPACT</span>
        </div>
      </section>

      <div className="community-demo-notice" role="note">
        <span>SHOWCASE MODE</span>
        <p>
          All names, quantities, locations and schedules below are illustrative.
          This prototype does not connect to a shared water network or save requests.
        </p>
      </div>

      <section className="community-metrics" aria-label="Community water summary">
        <div>
          <span>WATER OFFERED</span>
          <strong>16.9k <small>L</small></strong>
          <p><ArrowUpRight size={14} /> Sampled across 3 sources</p>
        </div>
        <div>
          <span>FARMERS COORDINATING</span>
          <strong>24</strong>
          <p><UsersRound size={14} /> Illustrative community count</p>
        </div>
        <div>
          <span>SHARES COMPLETED</span>
          <strong>18 <small>of 26</small></strong>
          <p><BadgeCheck size={14} /> Demo activity, not live data</p>
        </div>
      </section>

      <section className="community-section">
        <div className="dashboard-section-heading">
          <div>
            <span className="workspace-eyebrow">LOCAL AVAILABILITY</span>
            <h2>Water near you</h2>
          </div>
          <div className="community-filter" role="group" aria-label="Filter water sources">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                aria-pressed={activeFilter === filter}
                className={activeFilter === filter ? 'is-active' : ''}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        <div className="community-source-grid">
          {visibleSources.map((source) => (
            <article className="community-source-card" key={source.name}>
              <div className="community-source-top">
                <span className="community-source-icon"><Waves size={18} /></span>
                <span className={`community-source-status status-${source.status.toLowerCase()}`}>
                  {source.status}
                </span>
              </div>
              <span className="community-source-kind">{source.kind} / COMMUNITY SOURCE</span>
              <h3>{source.name}</h3>
              <p className="community-source-location"><MapPin size={13} />{source.location}</p>
              <div className="community-source-volume">
                <strong>{source.volume}</strong><span>{source.unit}</span>
              </div>
              <div className="community-water-meter" aria-label={`${source.level}% illustrative availability`}>
                <span style={{ width: `${source.level}%` }} />
              </div>
              <p className="community-source-window"><Clock3 size={13} />{source.window}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="community-exchange-layout">
        <div className="community-exchanges">
          <div className="dashboard-section-heading">
            <div>
              <span className="workspace-eyebrow">FARMER-TO-FARMER</span>
              <h2>Exchange board</h2>
            </div>
            <span className="community-board-label"><span /> SAMPLE BOARD</span>
          </div>
          <div className="community-exchange-list">
            {exchanges.map((exchange) => (
              <article className="community-exchange" key={exchange.initials}>
                <span className="community-avatar">{exchange.initials}</span>
                <div className="community-exchange-person">
                  <strong>{exchange.farmer}</strong>
                  <span>{exchange.detail}</span>
                  <small><MapPin size={12} />{exchange.location}</small>
                </div>
                <div className="community-exchange-amount">
                  <strong>{exchange.direction === 'offering' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{exchange.amount}</strong>
                  <span>{exchange.direction} · {exchange.timing}</span>
                </div>
              </article>
            ))}
          </div>
          <p className="community-list-footnote">Sample profiles only · no farmer information is stored or shared</p>
        </div>

        <aside className="community-request-card">
          <span className="workspace-eyebrow">TAKE A LOOK AHEAD</span>
          <h2>Plan a water share.</h2>
          <p>
            Preview how a local request could appear on a community board. This
            demonstration stays in your browser and is cleared when you leave.
          </p>
          {!requestOpen ? (
            <button type="button" className="community-request-button" onClick={() => setRequestOpen(true)}>
              <Plus size={16} /> Preview a request
            </button>
          ) : (
            <form className="community-request-form" onSubmit={previewRequest}>
              <label>
                Amount to coordinate
                <input name="amount" type="number" min="1" max="100000" placeholder="e.g. 1200" required />
              </label>
              <label>
                Preferred time window
                <input name="window" type="text" maxLength="40" placeholder="e.g. Tomorrow morning" required />
              </label>
              <button type="submit" className="community-request-button">Show local preview <ArrowUpRight size={15} /></button>
              <button type="button" className="community-cancel-button" onClick={() => { setRequestOpen(false); setPreviewNotice(''); }}>
                Cancel
              </button>
            </form>
          )}
          {previewNotice && <p className="community-preview-notice" role="status">{previewNotice}</p>}
          <div className="community-request-foot"><Droplets size={15} /> Local-only preview · not a real water request</div>
        </aside>
      </section>
    </div>
  );
}
