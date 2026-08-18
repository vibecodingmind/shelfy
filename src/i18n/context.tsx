import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { en, sw, TranslationKey } from './sw.js';
import { SupportedLocale } from '../types/index.js';

const LOCALE_KEY = 'shelfy_locale';

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => en[key],
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    const stored = localStorage.getItem(LOCALE_KEY);
    return stored === 'sw' ? 'sw' : 'en';
  });

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    localStorage.setItem(LOCALE_KEY, next);
    document.documentElement.lang = next === 'sw' ? 'sw' : 'en';
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'sw' ? 'sw' : 'en';
  }, [locale]);

  const t = useCallback(
    (key: TranslationKey) => (locale === 'sw' ? sw[key] : en[key]),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
