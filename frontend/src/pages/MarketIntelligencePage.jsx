import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, BrainCircuit, LineChart as LineChartIcon, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getPriceForecast, listPriceForecasts } from '../services/priceForecastService';

const formatPrice = (value, currency = 'INR') => (
  typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
    : 'Unavailable'
);

const formatPercent = (value) => (
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}%` : 'Unavailable'
);

const chartDate = (month) => {
  const parsed = new Date(month);
  return Number.isNaN(parsed.getTime()) ? month : parsed.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

export default function MarketIntelligencePage() {
  const [overview, setOverview] = useState(null);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');

  const commodities = useMemo(() => Object.keys(overview?.commodities || {}), [overview]);

  useEffect(() => {
    let active = true;
    const loadOverview = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await listPriceForecasts();
        if (!active) return;
        setOverview(response);
        const firstCommodity = Object.keys(response?.commodities || {})[0] || '';
        setSelectedCommodity((current) => current || firstCommodity);
      } catch (requestError) {
        if (active) setError(requestError?.message || 'Could not load market forecasts.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadOverview();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedCommodity) return undefined;
    let active = true;
    const loadDetail = async () => {
      setDetailLoading(true);
      setDetailError('');
      try {
        const response = await getPriceForecast(selectedCommodity);
        if (active) setDetail(response);
      } catch (requestError) {
        if (active) {
          setDetail(null);
          setDetailError(requestError?.message || 'Could not load this commodity forecast.');
        }
      } finally {
        if (active) setDetailLoading(false);
      }
    };
    loadDetail();
    return () => { active = false; };
  }, [selectedCommodity]);

  const chartData = useMemo(() => {
    if (!detail) return [];
    const history = (detail.recent_history || []).map((item) => ({
      period: chartDate(item.month),
      sortKey: item.month,
      historical: item.price,
    }));
    const forecast = (detail.forecast_12m || []).map((item) => ({
      period: chartDate(item.month),
      sortKey: item.month,
      forecast: item.forecast_price,
    }));
    return [...history, ...forecast].sort((a, b) => String(a.sortKey).localeCompare(String(b.sortKey)));
  }, [detail]);

  const handleCommodityChange = (event) => {
    setSelectedCommodity(event.target.value);
  };

  if (loading) return <div className="workspace-page"><div className="hybrid-empty-result"><Loader2 size={18} className="animate-spin" /> Loading market intelligence...</div></div>;
  if (error && !overview) {
    return <div className="workspace-page"><div className="history-notice"><AlertCircle size={16} />{error}</div></div>;
  }

  return (
    <div className="workspace-page">
      <div className="workspace-heading">
        <div>
          <span className="workspace-eyebrow">MARKET INTELLIGENCE / ML</span>
          <h1>Read the market ahead.</h1>
          <p>Explore backend-provided prices, historical observations and twelve-month forecasts.</p>
        </div>
        <div className="hybrid-icon"><BarChart3 size={21} /></div>
      </div>

      {error && <div className="history-notice"><AlertCircle size={16} />{error}</div>}

      <section className="market-model-banner">
        <div><BrainCircuit size={18} /><div><span className="workspace-eyebrow">MODEL INFORMATION</span><strong>{overview?.model_family || 'Unavailable'}</strong></div></div>
        <p>Forecast values and market indicators below are returned by the backend. No frontend prices or forecasts are generated.</p>
      </section>

      <section className="market-overview-section">
        <div className="dashboard-section-heading">
          <div><span className="workspace-eyebrow">MARKET OVERVIEW</span><h2>{overview?.total_commodities ?? commodities.length} commodities in the feed.</h2></div>
        </div>
        {commodities.length === 0 ? <div className="hybrid-empty-result">No commodity forecasts were returned.</div> : (
          <div className="market-commodity-grid">
            {commodities.map((commodity) => {
              const item = overview.commodities[commodity];
              const positive = item?.trend === 'Bullish';
              const negative = item?.trend === 'Bearish';
              return (
                <button type="button" className={`market-commodity-card ${commodity === selectedCommodity ? 'is-selected' : ''}`} key={commodity} onClick={() => setSelectedCommodity(commodity)}>
                  <div className="market-card-topline"><span>{item?.crop_name || commodity}</span>{positive ? <TrendingUp size={16} /> : negative ? <TrendingDown size={16} /> : <LineChartIcon size={16} />}</div>
                  <h3>{commodity}</h3>
                  <strong>{formatPrice(item?.last_price, item?.currency)}</strong>
                  <div className="market-card-meta"><span>{item?.trend || 'Trend unavailable'}</span><span>{formatPercent(item?.growth_pct)}</span></div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="hybrid-input-panel market-detail-panel">
        <div className="hybrid-result-summary">
          <div>
            <span className="workspace-eyebrow">COMMODITY FORECAST</span>
            <h2>{detail?.commodity || selectedCommodity || 'Select a commodity'}</h2>
            <p>Historical values and forecasts use the dates and prices returned by the selected API response.</p>
          </div>
          <label className="market-select-label">Commodity<select value={selectedCommodity} onChange={handleCommodityChange}>{commodities.map((commodity) => <option key={commodity} value={commodity}>{commodity}</option>)}</select></label>
        </div>

        {detailLoading ? <div className="hybrid-empty-result"><Loader2 size={18} className="animate-spin" /> Loading commodity forecast...</div> : detailError ? <div className="history-notice"><AlertCircle size={16} />{detailError}</div> : detail ? (
          <>
            <div className="market-detail-stats">
              <article><span>Latest price</span><strong>{formatPrice(detail.last_price, detail.currency)}</strong></article>
              <article><span>Trend</span><strong>{detail.trend || 'Unavailable'}</strong></article>
              <article><span>Growth</span><strong>{formatPercent(detail.growth_pct)}</strong></article>
              <article><span>Forecast points</span><strong>{detail.forecast_12m?.length ?? 0}</strong></article>
            </div>
            {chartData.length > 0 ? (
              <div className="market-chart-card">
                <div className="market-chart-legend"><span><i className="market-legend historical" />Historical</span><span><i className="market-legend forecast" />Forecast</span></div>
                <div className="market-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}><XAxis dataKey="period" tick={{ fontSize: 10 }} minTickGap={24} /><YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${value}`} /><Tooltip formatter={(value) => formatPrice(value, detail.currency)} /><Line type="monotone" dataKey="historical" stroke="#537b47" strokeWidth={2} dot={false} connectNulls /><Line type="monotone" dataKey="forecast" stroke="#c58d32" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls /></LineChart></ResponsiveContainer></div>
              </div>
            ) : <div className="hybrid-empty-result">No historical or forecast series were returned.</div>}
            <div className="hybrid-detail-grid">
              <p><span>Crop name</span><strong>{detail.crop_name || 'Unavailable'}</strong></p>
              <p><span>Currency</span><strong>{detail.currency || 'Unavailable'}</strong></p>
              <p><span>Forecast error (MAE)</span><strong>{formatPrice(detail.mae, detail.currency)}</strong></p>
              {detail.naive_mae !== null && detail.naive_mae !== undefined && <p><span>Naive baseline MAE</span><strong>{formatPrice(detail.naive_mae, detail.currency)}</strong></p>}
              {detail.confidence && <p><span>Model confidence</span><strong style={{ textTransform: 'capitalize' }}>{detail.confidence}{detail.beats_naive === false ? ' (High MAE)' : ''}</strong></p>}
              {detail.data_source && <p><span>Data source</span><strong style={{ textTransform: 'capitalize' }}>{detail.data_source}</strong></p>}
              <p><span>Historical observations</span><strong>{detail.recent_history?.length ?? 0}</strong></p>
            </div>
          </>
        ) : <div className="hybrid-empty-result">Select a commodity to load its forecast.</div>}
      </section>
    </div>
  );
}
