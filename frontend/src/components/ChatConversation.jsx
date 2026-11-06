import React, { useEffect, useRef, useState } from 'react';
import { Bot, Copy, RefreshCw, Send, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendChatMessage } from '../services/chatService';

export const suggestedPrompts = [
  'What should I grow on my farm?',
  'Should I irrigate my farm today?',
  'How can I reduce water consumption?',
  'Which crops offer better market opportunities?',
  'Help me plan a hybrid farming layout.',
  'How can I prepare for water shortages?',
];

const safeMarkdownComponents = {
  a: ({ href, children }) => {
    const isSafe = typeof href === 'string' && /^(https?:|mailto:)/i.test(href);
    if (!isSafe) return <span>{children}</span>;
    return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
  },
};

export default function ChatConversation({ farmId = null, compact = false, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [lastRequest, setLastRequest] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const send = async (text = input) => {
    const message = text.trim();
    if (!message || sending || message.length > 4000) return;
    const nextMessages = [...messages, { role: 'user', content: message, createdAt: new Date() }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setSending(true);
    const payload = {
      message,
      farm_id: farmId || undefined,
      history: nextMessages.slice(-20).map(({ role, content }) => ({ role, content })),
    };
    setLastRequest(payload);
    try {
      const response = await sendChatMessage(payload);
      setMessages((current) => [...current, {
        role: 'assistant',
        content: response.message,
        sources: response.sources,
        finishReason: response.finish_reason,
        createdAt: new Date(),
      }]);
    } catch (requestError) {
      setError(requestError?.message || 'The assistant could not respond. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const regenerate = () => {
    if (lastRequest) send(lastRequest.message);
  };

  const copyResponse = async (content) => {
    await navigator.clipboard?.writeText(content);
  };

  return (
    <div className={`assistant-conversation ${compact ? 'is-compact' : ''}`}>
      {onClose && <button type="button" className="assistant-close" onClick={onClose} aria-label="Close assistant"><X size={17} /></button>}
      {messages.length === 0 ? (
        <div className="assistant-welcome">
          <div className="assistant-mark"><Sparkles size={20} /></div>
          <span className="workspace-eyebrow">AQUAGROW AI ASSISTANT</span>
          <h2>Hello! I&apos;m AquaGrow AI.</h2>
          <p>Your intelligent farming companion. Ask me about crops, irrigation, weather, market prices, and sustainable farming.</p>
          <div className="assistant-prompts">{suggestedPrompts.map((prompt) => <button type="button" key={prompt} onClick={() => send(prompt)}>{prompt}</button>)}</div>
        </div>
      ) : (
        <div className="assistant-messages">
          {messages.map((message, index) => <article className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}><div className="assistant-message-avatar">{message.role === 'assistant' ? <Bot size={15} /> : 'You'}</div><div><div className="assistant-message-content">{message.role === 'assistant' ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={safeMarkdownComponents}>{message.content}</ReactMarkdown> : message.content}</div>{message.finishReason === 'MAX_TOKENS' && <small className="assistant-truncation-warning">This answer reached the response limit. Ask me to continue.</small>}{message.sources?.length > 0 && <small className="assistant-sources">Sources: {message.sources.join(' · ')}</small>}{message.role === 'assistant' && <div className="assistant-message-actions"><button type="button" onClick={() => copyResponse(message.content)} aria-label="Copy response"><Copy size={13} /></button><button type="button" onClick={regenerate} aria-label="Regenerate response"><RefreshCw size={13} /></button></div>}</div></article>)}
          {sending && <div className="assistant-typing"><Bot size={15} /> AquaGrow is thinking<span>...</span></div>}
          <div ref={endRef} />
        </div>
      )}
      {error && <div className="assistant-error" role="alert">{error} <button type="button" onClick={() => lastRequest && send(lastRequest.message)}>Retry</button></div>}
      <form className="assistant-composer" onSubmit={(event) => { event.preventDefault(); send(); }}>
        <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} maxLength={4000} placeholder="Ask about your field..." disabled={sending} rows={compact ? 1 : 2} />
        <button type="submit" disabled={sending || !input.trim()} aria-label="Send message"><Send size={16} /></button>
      </form>
      <small className="assistant-disclaimer">AI guidance is based on available AquaGrow data. Verify high-impact decisions with local field conditions.</small>
    </div>
  );
}
