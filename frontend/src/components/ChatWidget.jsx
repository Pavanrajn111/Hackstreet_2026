import React, { useState } from 'react';
import { Bot, MessageCircle, X } from 'lucide-react';
import ChatConversation from './ChatConversation';
import { getActiveFarmId } from '../services/farmSelection';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  return <div className="assistant-widget">{open && <div className="assistant-widget-panel"><div className="assistant-widget-heading"><div><Bot size={16} /><strong>AquaGrow AI</strong></div><button type="button" onClick={() => setOpen(false)} aria-label="Close assistant"><X size={15} /></button></div><ChatConversation compact farmId={getActiveFarmId()} /></div>}{!open && <button type="button" className="assistant-widget-trigger" onClick={() => setOpen(true)} aria-label="Open AquaGrow AI assistant"><MessageCircle size={20} /></button>}</div>;
}
