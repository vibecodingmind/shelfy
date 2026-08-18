import React, { useEffect, useState } from 'react';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { VendorAnalytics } from '../types/index.js';
import { api } from '../lib/api.js';
import { useI18n } from '../i18n/context.js';

export const VendorAnalyticsPanel: React.FC = () => {
  const { t } = useI18n();
  const [data, setData] = useState<VendorAnalytics | null>(null);

  useEffect(() => {
    api.getVendorAnalytics().then((res) => {
      if (res.success && res.data) setData(res.data);
    });
  }, []);

  if (!data) return <div className="text-xs text-slate-500">Loading analytics…</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-2"><Calendar className="w-4 h-4" /> {t('bookings')}</div>
        <div className="text-2xl font-black text-white">{data.totalBookings}</div>
        <div className="text-[11px] text-slate-400">{data.activeBookings} {t('activeRentals')}</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-2"><DollarSign className="w-4 h-4" /> {t('totalSpend')}</div>
        <div className="text-2xl font-black text-white">TZS {data.totalSpendTzs.toLocaleString()}</div>
        <div className="text-[11px] text-slate-400">Renewal rate {data.renewalRatePercent}%</div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-blue-400 text-xs font-bold mb-2"><TrendingUp className="w-4 h-4" /> {t('analytics')}</div>
        <div className="text-2xl font-black text-white">{data.expiringSoon}</div>
        <div className="text-[11px] text-slate-400">Expiring soon</div>
      </div>
    </div>
  );
};
