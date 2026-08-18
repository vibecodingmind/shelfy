import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n } from '../i18n/context.js';
import { SupportedLocale } from '../types/index.js';

export const LanguageSwitcher: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className={`flex items-center gap-1 ${compact ? '' : 'bg-slate-950/80 border border-slate-700 rounded-full p-0.5'}`}>
      {!compact && <Globe className="w-3.5 h-3.5 text-slate-400 ml-2" />}
      {(['en', 'sw'] as SupportedLocale[]).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
            locale === code ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
          }`}
        >
          {code === 'en' ? t('english') : t('swahili')}
        </button>
      ))}
    </div>
  );
};
