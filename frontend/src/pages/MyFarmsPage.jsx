import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Check, ChevronRight, MapPin, Pencil, Plus, Ruler, Sprout, Trash2, X, LocateFixed, Loader2 } from 'lucide-react';
import { detectBrowserLocation } from '../services/locationService';
import { Link } from 'react-router-dom';
import { isMockMode, getFarms, saveFarm, updateSavedFarm, deleteSavedFarm } from '../services/api';
import { createFarm, deleteFarm, getFarm, listFarms, updateFarm, getOfflineQueue, enqueueOfflineFarmMutation, replayOfflineFarmQueue } from '../services/farmService';
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
const getFarmPayload = (farm) => ({
  farm_name: farm.farm_name,
  district: farm.district,
  latitude: farm.latitude,
  longitude: farm.longitude,
  crop: farm.crop,
  soil_type: farm.soil_type,
  sowing_date: farm.sowing_date,
  farm_area_hectares: farm.farm_area_hectares,
  irrigation_method: farm.irrigation_method,
  last_irrigation_date: farm.last_irrigation_date,
  pump_flow_rate_lpm: farm.pump_flow_rate_lpm,
});

export default function MyFarmsPage() {
  const [farms, setFarms] = useState([]);
  const [activeFarmId, setActiveFarmIdState] = useState(getActiveFarmId());
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [editingFarm, setEditingFarm] = useState(null);
  const [deletingFarm, setDeletingFarm] = useState(null);
  const [detectingGps, setDetectingGps] = useState(false);

  const handleDetectGpsForFarm = async () => {
    setDetectingGps(true);
    try {
      const loc = await detectBrowserLocation();
      setFormData((current) => ({
        ...current,
        latitude: loc.latitude,
        longitude: loc.longitude,
        district: current.district || loc.placeName,
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setDetectingGps(false);
    }
  };
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [operationSuccess, setOperationSuccess] = useState('');
  const [offlineQueue, setOfflineQueue] = useState(getOfflineQueue());

  const refreshQueue = () => setOfflineQueue(getOfflineQueue());

  useEffect(() => {
    const handleOnline = async () => {
      try {
        const res = await replayOfflineFarmQueue();
        refreshQueue();
        if (res.replayed > 0) {
          setOperationSuccess(`Synced ${res.replayed} offline farm mutation(s) with the server.`);
          await loadFarms();
        }
      } catch (e) {
        console.warn('Offline sync replay error:', e);
      }
    };

    window.addEventListener('online', handleOnline);
    if (navigator.onLine) {
      handleOnline();
    }
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const isPendingSync = (farm) => {
    return offlineQueue.some((item) => (
      (item.farmId && String(item.farmId) === String(farm?.id)) ||
      (farm?._queued) ||
      (item.payload?.farm_name && item.payload?.farm_name === farm?.farm_name)
    ));
  };

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
      const canUseOfflineFallback = loadError?.code === 'NETWORK_ERROR' || loadError?.code === 'TIMEOUT';
      if (canUseOfflineFallback) {
        const fallback = await getFarms();
        setFarms(Array.isArray(fallback) ? fallback : []);
      } else {
        console.error('Failed to load farms:', loadError);
        setError(loadError?.message || 'Could not load your farms.');
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

  const handleEdit = (farm) => {
    setSelectedFarm(null);
    setOperationError('');
    setOperationSuccess('');
    setFormData({ ...EMPTY_FORM, ...farm });
    setEditingFarm(farm);
  };

  const handleDelete = async () => {
    if (!deletingFarm || saving) return;
    setSaving(true);
    setOperationError('');
    try {
      if (isMockMode() || deletingFarm.id === undefined) {
        deleteSavedFarm();
      } else {
        await deleteFarm(deletingFarm.id);
      }
      const deletedKey = getFarmKey(deletingFarm);
      const remaining = farms.filter((farm) => String(getFarmKey(farm)) !== String(deletedKey));
      setFarms(remaining);
      if (String(getFarmKey(activeFarm)) === String(deletedKey)) {
        const nextFarm = remaining[0];
        if (nextFarm) handleSelect(nextFarm);
        else {
          setActiveFarmIdState(null);
          setActiveFarmId(null);
        }
      }
      setDeletingFarm(null);
      setOperationSuccess(`${deletingFarm.farm_name || 'Farm'} was deleted.`);
      await loadFarms();
    } catch (deleteError) {
      const canUseOfflineFallback = deleteError?.code === 'NETWORK_ERROR' || deleteError?.code === 'TIMEOUT';
      if (canUseOfflineFallback) {
        if (deletingFarm.id !== undefined) {
          enqueueOfflineFarmMutation({ action: 'delete', farmId: deletingFarm.id });
          refreshQueue();
        }
        deleteSavedFarm();
        setDeletingFarm(null);
        setOperationSuccess('The farm was removed on this device. It will sync deletion when connectivity is restored.');
        await loadFarms();
      } else {
        setOperationError(deleteError?.message || 'The farm could not be deleted.');
      }
    } finally {
      setSaving(false);
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
          enqueueOfflineFarmMutation({ action: 'create', payload: formData });
          refreshQueue();
          const offlineCreated = await saveFarm({ ...formData, _queued: true });
          await loadFarms();
          if (offlineCreated?.id !== undefined) handleSelect(offlineCreated);
          setShowForm(false);
          setFormData(EMPTY_FORM);
          setOperationSuccess('Farm saved offline. It will automatically sync when you reconnect.');
        } catch (fallbackError) {
          console.error('Failed to create farm:', fallbackError);
          setFormError('The farm could not be saved offline. Please try again.');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage || !editingFarm) {
      setFormError(validationMessage || 'The farm could not be identified.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const updated = isMockMode() || editingFarm.id === undefined
        ? updateSavedFarm({ ...editingFarm, ...formData })
        : await updateFarm(editingFarm.id, getFarmPayload(formData));
      const updatedKey = getFarmKey(editingFarm);
      setFarms((current) => current.map((farm) => (
        String(getFarmKey(farm)) === String(updatedKey) ? { ...farm, ...updated } : farm
      )));
      if (String(getFarmKey(activeFarm)) === String(updatedKey)) {
        handleSelect({ ...editingFarm, ...updated });
      }
      setEditingFarm(null);
      setFormData(EMPTY_FORM);
      setOperationSuccess(`${updated.farm_name || 'Farm'} was updated.`);
      await loadFarms();
    } catch (updateError) {
      const canUseOfflineFallback = updateError?.code === 'NETWORK_ERROR' || updateError?.code === 'TIMEOUT';
      if (canUseOfflineFallback) {
        enqueueOfflineFarmMutation({ action: 'update', farmId: editingFarm.id, payload: getFarmPayload(formData) });
        refreshQueue();
        updateSavedFarm(formData);
        setEditingFarm(null);
        setFormData(EMPTY_FORM);
        setOperationSuccess('The farm was updated on this device. It will sync when connectivity is restored.');
        await loadFarms();
      } else {
        setFormError(updateError?.message || 'The farm could not be updated.');
      }
    } finally {
      setSaving(false);
    }
  };

  const openCreateForm = () => {
    setOperationError('');
    setOperationSuccess('');
    setFormError('');
    setFormData(EMPTY_FORM);
    setShowForm(true);
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
        <button type="button" className="auth-submit farms-add-button" onClick={openCreateForm}>
          <Plus size={16} /> Add farm
        </button>
      </div>

      {error && (
        <div className="farms-error"><AlertCircle size={17} />{error}<button type="button" onClick={loadFarms}>Retry</button></div>
      )}
      {operationError && <div className="farms-error"><AlertCircle size={17} />{operationError}</div>}
      {operationSuccess && <div className="farms-success"><Check size={17} />{operationSuccess}</div>}

      {farms.length === 0 ? (
        <section className="empty-workspace farms-empty">
          <Sprout size={34} />
          <span className="workspace-eyebrow">NO FIELD RECORDS YET</span>
          <h2>Start with your first farm.</h2>
          <p>Add the field details that power weather-aware irrigation decisions.</p>
          <button type="button" className="outline-action" onClick={openCreateForm}><Plus size={15} /> Add your first farm</button>
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
                    {isPendingSync(farm) && <span className="pending-sync-badge" title="Changes queued locally, will sync when online">Pending Sync</span>}
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
                    <div className="farm-card-secondary-actions">
                      <button type="button" className="farm-details-button" onClick={() => handleOpenDetails(farm)}>Details <ChevronRight size={14} /></button>
                      <button type="button" className="farm-icon-button" onClick={() => handleEdit(farm)} aria-label={`Edit ${farm.farm_name || 'farm'}`}><Pencil size={14} /></button>
                      <button type="button" className="farm-icon-button is-danger" onClick={() => { setOperationError(''); setDeletingFarm(farm); }} aria-label={`Delete ${farm.farm_name || 'farm'}`}><Trash2 size={14} /></button>
                    </div>
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
              <div className="flex items-center justify-between mt-2 mb-1 px-1">
                <span className="text-xs font-semibold text-slate-700">Coordinates</span>
                <button
                  type="button"
                  onClick={handleDetectGpsForFarm}
                  disabled={detectingGps}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  {detectingGps ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
                  <span>Detect My Field GPS</span>
                </button>
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
            <div className="farm-modal-actions">
              <button type="button" className="outline-action" onClick={() => handleEdit(selectedFarm)}><Pencil size={14} /> Edit farm</button>
              <button type="button" className="farm-delete-action" onClick={() => { setSelectedFarm(null); setDeletingFarm(selectedFarm); }}><Trash2 size={14} /> Delete farm</button>
            </div>
          </section>
        </div>
      )}

      {editingFarm && (
        <div className="farm-modal-backdrop" role="presentation">
          <section className="farm-modal" role="dialog" aria-modal="true" aria-labelledby="edit-farm-title">
            <div className="farm-modal-header">
              <div><span className="workspace-eyebrow">FIELD RECORD / EDIT</span><h2 id="edit-farm-title">Update this farm.</h2></div>
              <button type="button" className="farm-close-button" onClick={() => setEditingFarm(null)} aria-label="Close edit farm form"><X size={19} /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="farm-create-form">
              {formError && <p className="farm-form-error"><AlertCircle size={15} /> {formError}</p>}
              <label>Farm name<input name="farm_name" value={formData.farm_name || ''} onChange={updateForm} /></label>
              <label>District<input name="district" value={formData.district || ''} onChange={updateForm} /></label>
              <div className="farm-form-row">
                <label>Crop<input name="crop" value={formData.crop || ''} onChange={updateForm} /></label>
                <label>Soil type<input name="soil_type" value={formData.soil_type || ''} onChange={updateForm} /></label>
              </div>
              <div className="farm-form-row">
                <label>Area (hectares)<input type="number" min="0.01" step="0.01" name="farm_area_hectares" value={formData.farm_area_hectares ?? ''} onChange={updateForm} /></label>
                <label>Sowing date<input type="date" name="sowing_date" value={formData.sowing_date || ''} onChange={updateForm} /></label>
              </div>
              <div className="flex items-center justify-between mt-2 mb-1 px-1">
                <span className="text-xs font-semibold text-slate-700">Coordinates</span>
                <button
                  type="button"
                  onClick={handleDetectGpsForFarm}
                  disabled={detectingGps}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                >
                  {detectingGps ? <Loader2 size={12} className="animate-spin" /> : <LocateFixed size={12} />}
                  <span>Detect My Field GPS</span>
                </button>
              </div>
              <div className="farm-form-row">
                <label>Latitude<input type="number" step="any" name="latitude" value={formData.latitude ?? ''} onChange={updateForm} /></label>
                <label>Longitude<input type="number" step="any" name="longitude" value={formData.longitude ?? ''} onChange={updateForm} /></label>
              </div>
              <div className="farm-modal-actions">
                <button type="button" className="outline-action" onClick={() => setEditingFarm(null)}>Cancel</button>
                <button type="submit" className="auth-submit" disabled={saving}>{saving ? 'Updating...' : 'Update farm'} {!saving && <ArrowRight size={15} />}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deletingFarm && (
        <div className="farm-modal-backdrop" role="presentation">
          <section className="farm-modal farm-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-farm-title">
            <div className="farm-modal-header">
              <div><span className="workspace-eyebrow">REMOVE FIELD RECORD</span><h2 id="delete-farm-title">Delete this farm?</h2></div>
              <button type="button" className="farm-close-button" onClick={() => setDeletingFarm(null)} aria-label="Cancel delete"><X size={19} /></button>
            </div>
            <p className="farm-delete-copy">You are about to delete <strong>{deletingFarm.farm_name || 'this farm'}</strong>. This cannot be undone.</p>
            <div className="farm-modal-actions">
              <button type="button" className="outline-action" onClick={() => setDeletingFarm(null)}>Keep farm</button>
              <button type="button" className="farm-delete-action" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete farm'} <Trash2 size={14} /></button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
