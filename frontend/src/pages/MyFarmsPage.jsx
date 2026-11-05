import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Check, ChevronRight, MapPin, Plus, Ruler, Sprout, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isMockMode, getFarms, saveFarm } from '../services/api';
import { createFarm, getFarm, listFarms } from '../services/farmService';
import { defaultFarm } from '../data/mockFarm';
import { getActiveFarmId, setActiveFarmId } from '../services/farmSelection';
import LoadingState from '../components/LoadingState';

const EMPTY_FORM = {
  ...defaultFarm,
  farm_name: '',
  district: '',
  crop: '',
  soil_type: '',
  sowing_date: '',
};

const formatArea = (area) => (area === undefined || area === null || area === '' ? 'Area not recorded' : `${area} ha`);
const getFarmKey = (farm) => farm?.id ?? farm?.farm_name;

export default function MyFarmsPage() {
  const [farms, setFarms] = useState([]);
  const [activeFarmId, setActiveFarmIdState] = useState(getActiveFarmId());
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const loadFarms = async () => {
    setLoading(true);
    setError('');
    try {
      const result = isMockMode() ? await getFarms() : await listFarms();
      const nextFarms = Array.isArray(result) ? result : [];
      setFarms(nextFarms);
      const storedId = getActiveFarmId();
      const storedFarm = nextFarms.find((farm) => String(getFarmKey(farm)) === String(storedId));
      const nextActive = storedFarm || nextFarms[0];
      if (nextActive) {
        const nextKey = getFarmKey(nextActive);
        setActiveFarmIdState(nextKey);
        setActiveFarmId(nextKey);
      }
    } catch (loadError) {
      try {
        const fallback = await getFarms();
        setFarms(Array.isArray(fallback) ? fallback : []);
      } catch (fallbackError) {
        console.error('Failed to load farms:', loadError);
        setError('Could not load your farms. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarms();
  }, []);

  const activeFarm = useMemo(
    () => farms.find((farm) => String(getFarmKey(farm)) === String(activeFarmId)) || farms[0],
    [farms, activeFarmId]
  );

  const handleSelect = (farm) => {
    const key = getFarmKey(farm);
    if (key === undefined) return;
    setActiveFarmIdState(key);
    setActiveFarmId(key);
  };

  const handleOpenDetails = async (farm) => {
    if (farm?.id === undefined || isMockMode()) {
      setSelectedFarm(farm);
      return;
    }
    setSelectedFarm(farm);
    setDetailsLoading(true);
    try {
      setSelectedFarm(await getFarm(farm.id));
    } catch (detailsError) {
      console.warn('Could not load farm details:', detailsError.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateForm = (event) => {
    const { name, value, type } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'number' && value !== '' ? Number(value) : value,
    }));
    setFormError('');
  };

  const validateForm = () => {
    if (!formData.farm_name.trim() || !formData.crop.trim() || !formData.soil_type.trim()) {
      return 'Farm name, crop, and soil type are required.';
    }
    if (!formData.sowing_date || !formData.farm_area_hectares || formData.farm_area_hectares <= 0) {
      return 'Sowing date and a positive farm area are required.';
    }
    if (formData.latitude < -90 || formData.latitude > 90 || formData.longitude < -180 || formData.longitude > 180) {
      return 'Location coordinates are outside the supported range.';
    }
    return '';
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const created = isMockMode()
        ? await saveFarm(formData)
        : await createFarm(formData);
      await loadFarms();
      if (created?.id !== undefined) handleSelect(created);
      setShowForm(false);
      setFormData(EMPTY_FORM);
    } catch (createError) {
      const canUseOfflineFallback = createError?.code === 'NETWORK_ERROR' || createError?.code === 'TIMEOUT';
      if (!canUseOfflineFallback) {
        setFormError(createError?.message || 'The farm could not be saved.');
      } else {
        try {
          const offlineCreated = await saveFarm(formData);
          await loadFarms();
          if (offlineCreated?.id !== undefined) handleSelect(offlineCreated);
          setShowForm(false);
          setFormData(EMPTY_FORM);
        } catch (fallbackError) {
          console.error('Failed to create farm:', fallbackError);
          setFormError('The farm could not be saved offline. Please try again.');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading your farms..." />;

  return (
    <div className="workspace-page">
      <div className="workspace-heading farms-heading">
        <div>
          <span className="workspace-eyebrow">WORKSPACE / MY FARMS</span>
          <h1>Every field, in one view.</h1>
          <p>Choose the farm you want to use for today&apos;s field intelligence.</p>
        </div>
        <button type="button" className="auth-submit farms-add-button" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Add farm
        </button>
      </div>

      {error && (
        <div className="farms-error"><AlertCircle size={17} />{error}<button type="button" onClick={loadFarms}>Retry</button></div>
      )}

      {farms.length === 0 ? (
        <section className="empty-workspace farms-empty">
          <Sprout size={34} />
          <span className="workspace-eyebrow">NO FIELD RECORDS YET</span>
          <h2>Start with your first farm.</h2>
          <p>Add the field details that power weather-aware irrigation decisions.</p>
          <button type="button" className="outline-action" onClick={() => setShowForm(true)}><Plus size={15} /> Add your first farm</button>
        </section>
      ) : (
        <div className="farms-layout">
          <section className="farms-grid">
            {farms.map((farm) => {
              const isActive = String(getFarmKey(farm)) === String(getFarmKey(activeFarm));
              return (
                <article key={getFarmKey(farm)} className={`farm-card ${isActive ? 'is-active' : ''}`}>
                  <div className="farm-card-top">
                    <span className="farm-card-index">{String(farms.indexOf(farm) + 1).padStart(2, '0')}</span>
                    {isActive && <span className="farm-active-label"><Check size={12} /> Active field</span>}
                  </div>
                  <h2>{farm.farm_name || 'Unnamed farm'}</h2>
                  <p className="farm-location"><MapPin size={14} /> {farm.district || 'Location not recorded'}</p>
                  <div className="farm-card-facts">
                    <span><Sprout size={14} />{farm.crop || 'Crop not recorded'}</span>
                    <span><Ruler size={14} />{formatArea(farm.farm_area_hectares)}</span>
                  </div>
                  <p className="farm-soil">{farm.soil_type || 'Soil profile not recorded'}</p>
                  <div className="farm-card-actions">
                    <button type="button" className="farm-select-button" onClick={() => handleSelect(farm)} disabled={isActive}>
                      {isActive ? 'Selected' : 'Use this farm'} {!isActive && <ArrowRight size={14} />}
                    </button>
                    <button type="button" className="farm-details-button" onClick={() => handleOpenDetails(farm)}>Details <ChevronRight size={14} /></button>
                  </div>
                </article>
              );
            })}
          </section>
          {activeFarm && (
            <aside className="farm-active-panel">
              <span className="workspace-eyebrow">ACTIVE FIELD</span>
              <h2>{activeFarm.farm_name || 'Selected farm'}</h2>
              <p>{activeFarm.crop || 'Crop not recorded'} / {formatArea(activeFarm.farm_area_hectares)}</p>
              <Link to="/app" className="outline-action">Open field overview <ArrowRight size={14} /></Link>
            </aside>
          )}
        </div>
      )}

      {showForm && (
        <div className="farm-modal-backdrop" role="presentation">
          <section className="farm-modal" role="dialog" aria-modal="true" aria-labelledby="add-farm-title">
            <div className="farm-modal-header">
              <div><span className="workspace-eyebrow">NEW FIELD RECORD</span><h2 id="add-farm-title">Add a farm.</h2></div>
              <button type="button" className="farm-close-button" onClick={() => setShowForm(false)} aria-label="Close add farm form"><X size={19} /></button>
            </div>
            <form onSubmit={handleCreate} className="farm-create-form">
              {formError && <p className="farm-form-error"><AlertCircle size={15} /> {formError}</p>}
              <label>Farm name<input name="farm_name" value={formData.farm_name} onChange={updateForm} placeholder="e.g. North field" /></label>
              <label>District<input name="district" value={formData.district} onChange={updateForm} placeholder="e.g. Bengaluru Rural" /></label>
              <div className="farm-form-row">
                <label>Crop<input name="crop" value={formData.crop} onChange={updateForm} placeholder="e.g. Tomato" /></label>
                <label>Soil type<input name="soil_type" value={formData.soil_type} onChange={updateForm} placeholder="e.g. Red Sandy Loam" /></label>
              </div>
              <div className="farm-form-row">
                <label>Area (hectares)<input type="number" min="0.01" step="0.01" name="farm_area_hectares" value={formData.farm_area_hectares} onChange={updateForm} /></label>
                <label>Sowing date<input type="date" name="sowing_date" value={formData.sowing_date} onChange={updateForm} /></label>
              </div>
              <div className="farm-form-row">
                <label>Latitude<input type="number" step="any" name="latitude" value={formData.latitude} onChange={updateForm} /></label>
                <label>Longitude<input type="number" step="any" name="longitude" value={formData.longitude} onChange={updateForm} /></label>
              </div>
              <div className="farm-modal-actions">
                <button type="button" className="outline-action" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="auth-submit" disabled={saving}>{saving ? 'Saving...' : 'Save farm'} {!saving && <ArrowRight size={15} />}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedFarm && (
        <div className="farm-modal-backdrop" role="presentation">
          <section className="farm-modal farm-details-modal" role="dialog" aria-modal="true" aria-labelledby="farm-details-title">
            <div className="farm-modal-header">
              <div><span className="workspace-eyebrow">FIELD DETAILS</span><h2 id="farm-details-title">{selectedFarm.farm_name || 'Farm details'}</h2></div>
              <button type="button" className="farm-close-button" onClick={() => setSelectedFarm(null)} aria-label="Close farm details"><X size={19} /></button>
            </div>
            {detailsLoading ? <LoadingState message="Reading farm details..." /> : (
              <div className="farm-detail-list">
                <p><span>Location</span><strong>{selectedFarm.district || 'Not recorded'}</strong></p>
                <p><span>Crop</span><strong>{selectedFarm.crop || 'Not recorded'}</strong></p>
                <p><span>Area</span><strong>{formatArea(selectedFarm.farm_area_hectares)}</strong></p>
                <p><span>Soil</span><strong>{selectedFarm.soil_type || 'Not recorded'}</strong></p>
                <p><span>Irrigation</span><strong>{selectedFarm.irrigation_method || 'Not recorded'}</strong></p>
                <p><span>Coordinates</span><strong>{selectedFarm.latitude}, {selectedFarm.longitude}</strong></p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
