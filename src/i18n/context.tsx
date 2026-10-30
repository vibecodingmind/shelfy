import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { en, TranslationKey } from './en.js';

interface I18nContextValue {
  locale: 'en';
  setLocale: () => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => en[key],
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = 'en';
    try {
      localStorage.removeItem('shelfy_locale');
    } catch {
      /* private mode */
    }
  }, []);

  const setLocale = useCallback(() => {}, []);
  const t = useCallback((key: TranslationKey) => en[key], []);
  const value = useMemo(() => ({ locale: 'en' as const, setLocale, t }), [setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
