import React, { useEffect, useState } from 'react';
import { TrendingUp, Calendar, DollarSign, Layers } from 'lucide-react';
import { HostAnalytics } from '../types/index.js';
import { api } from '../lib/api.js';
import { useI18n } from '../i18n/context.js';

export const HostAnalyticsPanel: React.FC = () => {
  const { t } = useI18n();
  const [data, setData] = useState<HostAnalytics | null>(null);

  useEffect(() => {
    api.getHostAnalytics().then((res) => {
      if (res.success && res.data) setData(res.data);
    });
  }, []);

  if (!data) return <div className="text-xs text-slate-500">Loading analytics…</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Stat icon={Calendar} label={t('pendingApprovals')} value={String(data.pendingApprovals)} color="text-amber-400" />
        <Stat icon={Layers} label={t('activeRentals')} value={String(data.activeRentals)} color="text-emerald-400" />
        <Stat icon={DollarSign} label={t('earnings')} value={`TZS ${data.totalEarningsTzs.toLocaleString()}`} color="text-blue-400" />
        <Stat icon={TrendingUp} label={t('occupancy')} value={`${data.occupancyRatePercent}%`} color="text-purple-400" />
      </div>
      {data.topShelves.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Top shelves</h4>
          {data.topShelves.map((s) => (
            <div key={s.shelfId} className="flex justify-between text-xs py-2 border-b border-slate-800 last:border-0">
              <span className="text-white font-semibold">{s.shelfName}</span>
              <span className="text-emerald-400 font-mono">TZS {s.earningsTzs.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function Stat({ icon: Icon, label, value, color }: { icon: typeof Calendar; label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <div className={`flex items-center gap-2 text-xs font-bold mb-2 ${color}`}><Icon className="w-4 h-4" /> {label}</div>
      <div className="text-xl font-black text-white truncate">{value}</div>
    </div>
  );
}
