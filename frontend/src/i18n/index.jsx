import React, { createContext, useContext, useState, useEffect } from 'react';
import en from './en.json';
import kn from './kn.json';
import hi from './hi.json';

const translations = { en, kn, hi };

const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('agr002_lang') || import.meta.env.VITE_DEFAULT_LANGUAGE || 'en';
  });

  useEffect(() => {
    localStorage.setItem('agr002_lang', lang);
  }, [lang]);

  const t = (key) => {
    return translations[lang]?.[key] || translations.en?.[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
