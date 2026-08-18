import React, { useEffect, useState } from 'react';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { SavedSearch } from '../types/index.js';
import { api } from '../lib/api.js';
import { useI18n } from '../i18n/context.js';

export const SavedSearchPanel: React.FC<{ query?: string; city?: string; category?: string }> = ({
  query = '',
  city = '',
  category = '',
}) => {
  const { t } = useI18n();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [name, setName] = useState('My shelf search');

  const load = () => {
    api.getSavedSearches().then((res) => {
      if (res.success && res.data) setSearches(res.data);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    await api.createSavedSearch({ name, query, city, category, alertsEnabled: true });
    load();
  };

  const handleDelete = async (id: string) => {
    await api.deleteSavedSearch(id);
    load();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-white">{t('savedSearches')}</h3>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
        />
        <button
          type="button"
          onClick={handleSave}
          className="px-3 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> {t('saveSearch')}
        </button>
      </div>
      <div className="space-y-2">
        {searches.map((s) => (
          <div key={s.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
            <div>
              <div className="font-bold text-white">{s.name}</div>
              <div className="text-slate-500">{[s.city, s.category, s.query].filter(Boolean).join(' · ') || 'Any shelf'}</div>
              {s.alertsEnabled && <span className="text-[10px] text-emerald-400 font-bold">{t('alertsOn')}</span>}
            </div>
            <button type="button" onClick={() => handleDelete(s.id)} className="text-rose-400 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
