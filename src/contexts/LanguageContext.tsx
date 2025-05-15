
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Locale, Translations } from '@/types';

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const defaultLocale: Locale = 'en';

async function loadTranslations(locale: Locale): Promise<Translations> {
  try {
    const module = await import(`@/locales/${locale}.json`);
    return module.default;
  } catch (error) {
    console.warn(`Could not load translations for locale "${locale}", falling back to English.`);
    const module = await import(`@/locales/en.json`);
    return module.default;
  }
}


export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedLocale = localStorage.getItem('locale') as Locale | null;
    const initialLocale = storedLocale || defaultLocale;
    setLocaleState(initialLocale);
    
    loadTranslations(initialLocale).then(data => {
      setTranslations(data);
      setIsLoading(false);
    });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setIsLoading(true);
    loadTranslations(newLocale).then(data => {
      setLocaleState(newLocale);
      setTranslations(data);
      localStorage.setItem('locale', newLocale);
      setIsLoading(false);
    });
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    if (isLoading || !translations) return key; // Return key or a loading string if translations not loaded

    const translation = translations[key];
    if (typeof translation === 'function') {
      return translation(params || {});
    }
    if (typeof translation === 'string') {
      let result = translation;
      if (params) {
        Object.keys(params).forEach(paramKey => {
          result = result.replace(`{${paramKey}}`, String(params[paramKey]));
        });
      }
      return result;
    }
    console.warn(`Translation key "${key}" not found for locale "${locale}".`);
    return key; // Fallback to key if not found
  }, [translations, locale, isLoading]);

  if (isLoading && Object.keys(translations).length === 0) {
    // You might want a more sophisticated loading UI here
    return <div>Loading translations...</div>; 
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
