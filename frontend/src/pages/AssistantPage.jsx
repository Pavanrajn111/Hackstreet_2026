import React, { useEffect, useState } from 'react';
import { MessageSquarePlus, Sprout } from 'lucide-react';
import ChatConversation from '../components/ChatConversation';
import { getActiveFarmId } from '../services/farmSelection';
import { listFarms } from '../services/farmService';

export default function AssistantPage() {
  const [farms, setFarms] = useState([]);
  const [farmId, setFarmId] = useState(getActiveFarmId());

  useEffect(() => {
    listFarms().then(setFarms).catch(() => setFarms([]));
  }, []);

  return <div className="assistant-page"><div className="assistant-page-heading"><div><span className="workspace-eyebrow">FIELD INTELLIGENCE / AI</span><h1>Your field companion.</h1><p>Ask AquaGrow to connect your farm data with a clear next decision.</p></div><label className="assistant-farm-select"><Sprout size={15} /><select value={farmId || ''} onChange={(event) => setFarmId(event.target.value || null)}><option value="">Select a farm</option>{farms.map((farm) => <option key={farm.id} value={farm.id}>{farm.farm_name}</option>)}</select></label></div><div className="assistant-layout"><aside className="assistant-sidebar"><button type="button" className="assistant-new-button" onClick={() => window.location.reload()}><MessageSquarePlus size={16} /> New conversation</button><span className="workspace-eyebrow">CONVERSATIONS</span><p>Your conversations are kept in this session until persistent chat storage is configured.</p></aside><section className="assistant-panel"><ChatConversation farmId={farmId} /></section></div></div>;
}
