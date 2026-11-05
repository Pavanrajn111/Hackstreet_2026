import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n';

export default function VoiceReader({ textToRead }) {
  const { lang, t } = useI18n();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
    }
  }, []);

  useEffect(() => {
    // Stop speech whenever language changes or component unmounts
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lang]);

  const handleToggleSpeech = () => {
    if (!supported || !textToRead) return;

    const synth = window.speechSynthesis;

    if (isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
      return;
    }

    synth.cancel(); // Reset any existing speech

    const utterance = new SpeechSynthesisUtterance(textToRead);

    // Map selected language to regional BCP-47 tags
    const langMap = {
      kn: 'kn-IN',
      hi: 'hi-IN',
      en: 'en-IN',
    };
    utterance.lang = langMap[lang] || 'en-US';
    utterance.rate = 0.95; // Slightly slower, clear cadence for farmers
    utterance.pitch = 1.0;

    // Pick best matching voice if available
    const voices = synth.getVoices();
    const matchedVoice = voices.find(
      (v) => v.lang === utterance.lang || v.lang.startsWith(lang)
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsSpeaking(false);
    };

    synth.speak(utterance);
  };

  if (!supported) {
    return null; // Gracefully hidden if browser doesn't support Web Speech API
  }

  return (
    <button
      type="button"
      onClick={handleToggleSpeech}
      aria-label={isSpeaking ? t('stop_reading') : t('read_aloud')}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer min-h-[44px] ${
        isSpeaking
          ? 'bg-amber-100 text-amber-900 border border-amber-300 ring-2 ring-amber-400'
          : 'bg-white/90 hover:bg-white text-slate-800 border border-slate-200'
      }`}
    >
      {isSpeaking ? (
        <>
          <VolumeX className="w-4 h-4 text-amber-700 animate-pulse" />
          <span>{t('stop_reading')}</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4 text-emerald-700" />
          <span>{t('read_aloud')}</span>
        </>
      )}
    </button>
  );
}
