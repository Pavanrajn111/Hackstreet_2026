import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Droplets, Loader2, MapPin, RefreshCw, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { getFarms, isMockMode } from '../services/api';
import { getActiveFarmId, setActiveFarmId } from '../services/farmSelection';
import {
  createWaterRequest,
  deleteWaterResource,
  listWaterRequests,
  listWaterResources,
  registerWaterResource,
  updateWaterRequestStatus,
} from '../services/communityWaterService';

const farmKey = (farm) => String(farm?.id ?? farm?.farm_name ?? '');
const initialResource = {
  resource_type: 'farm_pond_surplus', available_quantity_litres: '', flow_rate_lpm: '120',
  water_quality: 'freshwater', availability_start: '', availability_end: '',
  sharing_type: 'free', price_per_unit: '0', price_unit: 'INR/1000L',
  approx_district: '', approx_village_or_area: '', discovery_radius_km: '10',
  description: '', suitability_notes: '', terms_and_conditions: '',
  latitude: '', longitude: '', owner_name: '', owner_contact_full: '', is_discoverable: false,
};

const toIso = (value) => value ? new Date(value).toISOString() : '';
const formatDate = (value) => value ? new Date(value).toLocaleString() : 'Unavailable';
const display = (value) => value === null || value === undefined || value === '' ? 'Unavailable' : value;

export default function CommunityWaterPage() {
  const [farms, setFarms] = useState([]);
  const [farm, setFarm] = useState(null);
  const [resources, setResources] = useState([]);
  const [requests, setRequests] = useState([]);
  const [resourceForm, setResourceForm] = useState(initialResource);
  const [requestForm, setRequestForm] = useState({ resource_id: '', requested_quantity_litres: '', preferred_start_time: '', preferred_end_time: '', requester_message: '', delivery_method: 'pipe_connection' });
  const [filters, setFilters] = useState({ radius_km: '15', resource_type: '', sharing_type: '', water_quality: '', min_quantity: '' });
  const [loading, setLoading] = useState(true);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [savingResource, setSavingResource] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [statusLoading, setStatusLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadNetwork = async (selectedFarm = farm) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        radius_km: Number(filters.radius_km) || 15,
        ...(selectedFarm?.id !== undefined ? { requesting_farm_id: selectedFarm.id } : {}),
        ...(filters.resource_type ? { resource_type: filters.resource_type } : {}),
        ...(filters.sharing_type ? { sharing_type: filters.sharing_type } : {}),
        ...(filters.water_quality ? { water_quality: filters.water_quality } : {}),
        ...(filters.min_quantity ? { min_quantity: Number(filters.min_quantity) } : {}),
      };
      const [nextResources, nextRequests] = await Promise.all([
        listWaterResources(params),
        selectedFarm?.id !== undefined
          ? Promise.all([
            listWaterRequests({ requesting_farm_id: selectedFarm.id }),
            listWaterRequests({ owner_farm_id: selectedFarm.id }),
          ]).then(([made, received]) => [...made, ...received.filter((request) => !made.some((item) => item.id === request.id))])
          : Promise.resolve([]),
      ]);
      setResources(Array.isArray(nextResources) ? nextResources : []);
      setRequests(Array.isArray(nextRequests) ? nextRequests : []);
    } catch (requestError) {
      setError(requestError?.message || 'Could not load community water data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getFarms().then((availableFarms) => {
      if (!active) return;
      const selectedId = getActiveFarmId();
      const selected = availableFarms?.find((candidate) => farmKey(candidate) === String(selectedId)) || availableFarms?.[0] || null;
      setFarms(availableFarms || []);
      setFarm(selected);
      if (selected) setResourceForm((current) => ({ ...current, latitude: selected.latitude ?? '', longitude: selected.longitude ?? '', approx_district: selected.district || '' }));
      loadNetwork(selected);
    }).catch((loadError) => { if (active) { setError(loadError?.message || 'Could not load farms.'); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const changeFarm = (event) => {
    const selected = farms.find((candidate) => farmKey(candidate) === event.target.value) || null;
    setFarm(selected);
    setActiveFarmId(selected?.id ?? selected?.farm_name ?? null);
    setRequests([]);
    loadNetwork(selected);
  };

  const changeResource = (event) => setResourceForm((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));
  const changeRequest = (event) => setRequestForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const changeFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));

  const requireLive = () => {
    if (isMockMode()) {
      setError('Community water sharing requires Live API mode. Switch off Demo Mode to use the backend network.');
      return false;
    }
    return true;
  };

  const submitResource = async (event) => {
    event.preventDefault();
    if (savingResource) return;
    if (!requireLive()) return;
    if (farm?.id === undefined) { setError('A registered farm with a backend ID is required to register a water resource.'); return; }
    const required = ['available_quantity_litres', 'availability_start', 'availability_end', 'latitude', 'longitude'];
    if (required.some((name) => resourceForm[name] === '')) { setError('Quantity, availability window, latitude, and longitude are required.'); return; }
    setSavingResource(true); setError(''); setSuccess('');
    try {
      const payload = {
        owner_farm_id: farm.id, owner_name: resourceForm.owner_name || undefined, owner_contact_full: resourceForm.owner_contact_full || undefined,
        resource_type: resourceForm.resource_type, description: resourceForm.description || undefined,
        available_quantity_litres: Number(resourceForm.available_quantity_litres), flow_rate_lpm: Number(resourceForm.flow_rate_lpm),
        water_quality: resourceForm.water_quality, suitability_notes: resourceForm.suitability_notes || undefined,
        availability_start: toIso(resourceForm.availability_start), availability_end: toIso(resourceForm.availability_end),
        sharing_type: resourceForm.sharing_type, price_per_unit: Number(resourceForm.price_per_unit || 0), price_unit: resourceForm.price_unit,
        terms_and_conditions: resourceForm.terms_and_conditions || undefined, latitude: Number(resourceForm.latitude), longitude: Number(resourceForm.longitude),
        approx_district: resourceForm.approx_district || undefined, approx_village_or_area: resourceForm.approx_village_or_area || undefined,
        discovery_radius_km: Number(resourceForm.discovery_radius_km), is_discoverable: resourceForm.is_discoverable,
      };
      await registerWaterResource(payload);
      setSuccess('Water resource registered. It is discoverable only because you explicitly selected that option.');
      setResourceForm((current) => ({ ...initialResource, latitude: current.latitude, longitude: current.longitude, approx_district: current.approx_district }));
      await loadNetwork(farm);
    } catch (requestError) { setError(requestError?.message || 'Could not register the water resource.'); }
    finally { setSavingResource(false); }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (savingRequest) return;
    if (!requireLive()) return;
    if (farm?.id === undefined) { setError('A registered requesting farm is required to submit a water request.'); return; }
    if (!requestForm.resource_id || !requestForm.requested_quantity_litres || !requestForm.preferred_start_time || !requestForm.preferred_end_time) { setError('Resource, quantity, and both preferred times are required.'); return; }
    setSavingRequest(true); setError(''); setSuccess('');
    try {
      await createWaterRequest({ requesting_farm_id: farm.id, resource_id: Number(requestForm.resource_id), requested_quantity_litres: Number(requestForm.requested_quantity_litres), preferred_start_time: toIso(requestForm.preferred_start_time), preferred_end_time: toIso(requestForm.preferred_end_time), requester_message: requestForm.requester_message || undefined, delivery_method: requestForm.delivery_method || undefined });
      setSuccess('Water request submitted. It starts as pending until the resource owner responds.');
      setRequestForm({ resource_id: '', requested_quantity_litres: '', preferred_start_time: '', preferred_end_time: '', requester_message: '', delivery_method: 'pipe_connection' });
      await loadNetwork(farm);
    } catch (requestError) { setError(requestError?.message || 'Could not submit the water request.'); }
    finally { setSavingRequest(false); }
  };

  const transitionRequest = async (requestId, status) => {
    if (statusLoading || !requireLive()) return;
    setStatusLoading(requestId); setError(''); setSuccess('');
    try {
      await updateWaterRequestStatus(requestId, { status });
      setSuccess(`Request marked ${status}.`);
      await loadNetwork(farm);
    } catch (requestError) { setError(requestError?.message || 'Could not update request status.'); }
    finally { setStatusLoading(null); }
  };

  const removeResource = async (resourceId) => {
    if (!requireLive() || !window.confirm('Remove this resource from the community registry?')) return;
    try {
      await deleteWaterResource(resourceId);
      setSuccess('Resource removed from the registry.');
      await loadNetwork(farm);
    } catch (requestError) { setError(requestError?.message || 'Could not remove the resource.'); }
  };

  return (
    <div className="workspace-page">
      <div className="workspace-heading"><div><span className="workspace-eyebrow">COMMUNITY WATER / OPT-IN NETWORK</span><h1>Share water, carefully.</h1><p>Discover explicitly shared resources and coordinate requests without exposing exact public locations or private contact details.</p></div><div className="hybrid-icon"><Droplets size={21} /></div></div>
      {error && <div className="history-notice"><AlertCircle size={16} />{error}</div>}
      {success && <div className="history-notice hybrid-success-notice"><CheckCircle2 size={16} />{success}</div>}
      <section className="hybrid-input-panel">
        <div className="hybrid-panel-heading"><div className="hybrid-icon"><MapPin size={21} /></div><div><span className="workspace-eyebrow">COMMUNITY CONTEXT</span><h2>Choose your registered farm.</h2><p>Farm IDs are required by the backend for registration and requests.</p></div></div>
        <div className="hybrid-form"><label>Farm<span>Active context</span><select value={farmKey(farm)} onChange={changeFarm}><option value="">No selected farm</option>{farms.map((candidate) => <option key={farmKey(candidate)} value={farmKey(candidate)}>{candidate.farm_name || candidate.crop || 'Unnamed farm'}</option>)}</select></label><div className="hybrid-detail-grid"><p><span>Farm ID</span><strong>{farm?.id ?? 'Unavailable'}</strong></p><p><span>Location</span><strong>{farm?.district || 'Unavailable'}</strong></p><p><span>Coordinates</span><strong>{farm?.latitude ?? 'Unavailable'}, {farm?.longitude ?? 'Unavailable'}</strong></p></div></div>
      </section>
      <section className="hybrid-input-panel">
        <div className="hybrid-result-summary"><div><span className="workspace-eyebrow">DISCOVER SHARED RESOURCES</span><h2>Find available water.</h2></div><button type="button" className="outline-action" onClick={() => loadNetwork(farm)} disabled={loading}><RefreshCw size={15} /> Refresh</button></div>
        <div className="community-filter-grid">{[['radius_km', 'Radius (km)'], ['min_quantity', 'Minimum litres']].map(([name, label]) => <label key={name}>{label}<input type="number" name={name} min="0" value={filters[name]} onChange={changeFilter} /></label>)}<label>Resource type<select name="resource_type" value={filters.resource_type} onChange={changeFilter}><option value="">All types</option><option value="farm_pond_surplus">Farm pond surplus</option><option value="borewell_slot">Borewell slot</option><option value="shared_pump">Shared pump</option><option value="water_tanker">Water tanker</option><option value="open_well_surplus">Open well surplus</option></select></label><label>Sharing type<select name="sharing_type" value={filters.sharing_type} onChange={changeFilter}><option value="">All terms</option><option value="free">Free</option><option value="paid">Paid</option><option value="negotiable">Negotiable</option><option value="cost_sharing">Cost sharing</option></select></label></div>
        {loading ? <div className="hybrid-empty-result"><Loader2 size={18} className="animate-spin" /> Loading discoverable resources...</div> : resources.length ? <div className="community-resource-grid">{resources.map((resource) => <article className="hybrid-candidate" key={resource.id}><div className="community-card-topline"><span className="hybrid-rank">{resource.status}</span><span>{resource.approx_distance_km === null || resource.approx_distance_km === undefined ? 'Distance unavailable' : `${resource.approx_distance_km} km`}</span></div><h3>{resource.resource_type}</h3><p>{resource.description || 'No description returned.'}</p><div className="hybrid-detail-grid"><p><span>Available</span><strong>{display(resource.available_quantity_litres)} {resource.quantity_unit || 'litres'}</strong></p><p><span>Quality</span><strong>{display(resource.water_quality)}</strong></p><p><span>Sharing</span><strong>{display(resource.sharing_type)} {resource.price_per_unit ? `· ${resource.price_per_unit} ${resource.price_unit || ''}` : ''}</strong></p><p><span>Area</span><strong>{resource.approx_village_or_area || resource.approx_district || 'Unavailable'}</strong></p><p><span>Window</span><strong>{formatDate(resource.availability_start)} – {formatDate(resource.availability_end)}</strong></p><p><span>Owner contact</span><strong>{resource.owner_contact_masked || 'Masked'}</strong></p></div><button type="button" className="hybrid-expand" onClick={() => setRequestForm((current) => ({ ...current, resource_id: String(resource.id) }))}><Send size={14} /> Request this resource</button>{resource.owner_farm_id === farm?.id && <button type="button" className="hybrid-expand community-danger-action" onClick={() => removeResource(resource.id)}><Trash2 size={14} /> Remove my resource</button>}</article>)}</div> : <div className="hybrid-empty-result">No discoverable active resources matched these filters.</div>}
      </section>
      <section className="hybrid-input-panel">
        <div className="hybrid-panel-heading"><div className="hybrid-icon"><Send size={21} /></div><div><span className="workspace-eyebrow">REQUEST WATER</span><h2>Send a pending request.</h2><p>The owner decides whether a request is accepted, declined or completed.</p></div></div>
        <form onSubmit={submitRequest} className="hybrid-form"><div className="hybrid-form-grid"><label>Resource ID<span>Selected resource</span><input name="resource_id" type="number" min="1" value={requestForm.resource_id} onChange={changeRequest} required /></label><label>Quantity<span>litres</span><input name="requested_quantity_litres" type="number" min="0.01" value={requestForm.requested_quantity_litres} onChange={changeRequest} required /></label><label>Preferred start<span>local time</span><input name="preferred_start_time" type="datetime-local" value={requestForm.preferred_start_time} onChange={changeRequest} required /></label><label>Preferred end<span>local time</span><input name="preferred_end_time" type="datetime-local" value={requestForm.preferred_end_time} onChange={changeRequest} required /></label><label>Delivery method<span>optional</span><input name="delivery_method" value={requestForm.delivery_method} onChange={changeRequest} /></label><label>Message<span>optional</span><input name="requester_message" value={requestForm.requester_message} onChange={changeRequest} /></label></div><button type="submit" className="hybrid-submit auth-submit" disabled={savingRequest}>{savingRequest ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Submit request</>}</button></form>
      </section>
      <section className="hybrid-input-panel">
        <div className="hybrid-result-summary"><div><span className="workspace-eyebrow">MY REQUESTS</span><h2>Track the exchange.</h2></div><ShieldCheck size={21} color="#537b47" /></div>
        {requests.length ? <div className="community-request-list">{requests.map((request) => {
          const isOwner = String(request.resource_owner_farm_id) === String(farm?.id);
          return <article className="hybrid-saved-plan" key={request.id}><div className="community-card-topline"><span className="hybrid-rank">{request.status}</span><span>{isOwner ? 'Received' : 'Sent'} · Request #{request.id}</span></div><h3>{request.resource_type || `Resource ${request.resource_id}`}</h3><p>{request.requested_quantity_litres} litres · {request.delivery_method || 'Delivery method unavailable'}</p><div className="hybrid-detail-grid"><p><span>Preferred window</span><strong>{formatDate(request.preferred_start_time)} – {formatDate(request.preferred_end_time)}</strong></p><p><span>Agreed quantity</span><strong>{display(request.agreed_quantity_litres)} litres</strong></p><p><span>Owner contact</span><strong>{request.owner_contact || 'Revealed only after acceptance'}</strong></p><p><span>Owner notes</span><strong>{request.owner_response_notes || 'Unavailable'}</strong></p></div>{isOwner && request.status === 'pending' && <><button type="button" className="hybrid-expand" onClick={() => transitionRequest(request.id, 'accepted')} disabled={statusLoading === request.id}>{statusLoading === request.id ? 'Updating...' : 'Accept request'}</button><button type="button" className="hybrid-expand community-danger-action" onClick={() => transitionRequest(request.id, 'declined')} disabled={statusLoading === request.id}>Decline</button></>}{!isOwner && request.status === 'pending' && <button type="button" className="hybrid-expand" onClick={() => transitionRequest(request.id, 'cancelled')} disabled={statusLoading === request.id}>{statusLoading === request.id ? 'Updating...' : 'Cancel request'}</button>}{!isOwner && request.status === 'accepted' && <button type="button" className="hybrid-expand" onClick={() => transitionRequest(request.id, 'completed')} disabled={statusLoading === request.id}>{statusLoading === request.id ? 'Updating...' : 'Mark completed'}</button>}</article>;
        })}</div> : <div className="hybrid-empty-result">No requests are associated with the selected registered farm.</div>}
      </section>
      <section className="hybrid-input-panel community-resource-form">
        <div className="hybrid-panel-heading"><div className="hybrid-icon"><Droplets size={21} /></div><div><span className="workspace-eyebrow">OFFER A RESOURCE</span><h2>Share available water.</h2><p>Exact coordinates are not shown in public discovery. Discoverability is opt-in and contact details are masked until an accepted exchange.</p></div></div>
        <form onSubmit={submitResource} className="hybrid-form"><div className="hybrid-form-grid"><label>Resource type<select name="resource_type" value={resourceForm.resource_type} onChange={changeResource}><option value="farm_pond_surplus">Farm pond surplus</option><option value="borewell_slot">Borewell slot</option><option value="shared_pump">Shared pump</option><option value="water_tanker">Water tanker</option><option value="open_well_surplus">Open well surplus</option></select></label><label>Available quantity<span>litres</span><input name="available_quantity_litres" type="number" min="0.01" value={resourceForm.available_quantity_litres} onChange={changeResource} required /></label><label>Available from<input name="availability_start" type="datetime-local" value={resourceForm.availability_start} onChange={changeResource} required /></label><label>Available until<input name="availability_end" type="datetime-local" value={resourceForm.availability_end} onChange={changeResource} required /></label><label>Latitude<input name="latitude" type="number" min="-90" max="90" step="any" value={resourceForm.latitude} onChange={changeResource} required /></label><label>Longitude<input name="longitude" type="number" min="-180" max="180" step="any" value={resourceForm.longitude} onChange={changeResource} required /></label><label>Sharing type<select name="sharing_type" value={resourceForm.sharing_type} onChange={changeResource}><option value="free">Free</option><option value="paid">Paid</option><option value="negotiable">Negotiable</option><option value="cost_sharing">Cost sharing</option></select></label><label>Water quality<input name="water_quality" value={resourceForm.water_quality} onChange={changeResource} /></label><label>Owner name<input name="owner_name" value={resourceForm.owner_name} onChange={changeResource} /></label><label>Owner contact<input name="owner_contact_full" value={resourceForm.owner_contact_full} onChange={changeResource} /></label><label>Description<input name="description" value={resourceForm.description} onChange={changeResource} /></label><label>Terms<input name="terms_and_conditions" value={resourceForm.terms_and_conditions} onChange={changeResource} /></label></div><label className="community-consent"><input type="checkbox" name="is_discoverable" checked={resourceForm.is_discoverable} onChange={changeResource} /> I explicitly consent to make this resource discoverable to nearby community farmers.</label><button type="submit" className="hybrid-submit auth-submit" disabled={savingResource}>{savingResource ? <><Loader2 size={16} className="animate-spin" /> Registering...</> : 'Register water resource'}</button></form>
      </section>
    </div>
  );
}
