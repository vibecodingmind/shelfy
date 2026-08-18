import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Booking } from '../types/index.js';
import { api } from '../lib/api.js';
import { useI18n } from '../i18n/context.js';
import { BookingTimeline } from './BookingTimeline.js';

export const HostApprovalInbox: React.FC<{ onAction: () => void }> = ({ onAction }) => {
  const { t } = useI18n();
  const [pending, setPending] = useState<Booking[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => {
    api.getPendingBookings().then((res) => {
      if (res.success && res.data) setPending(res.data);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    await api.updateBookingStatus(id, status);
    load();
    onAction();
  };

  if (!pending.length) {
    return <p className="text-xs text-slate-500 text-center py-6">No pending approvals.</p>;
  }

  return (
    <div className="space-y-3">
      {pending.map((b) => (
        <div key={b.id} className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white">{b.shelfName}</div>
              <div className="text-slate-400">{b.vendorBusinessName || b.vendorName} · TZS {b.totalPriceTzs.toLocaleString()}</div>
              <div className="text-slate-500 mt-1">{b.startDate} → {b.endDate}</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleStatus(b.id, 'APPROVED')}
                className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> {t('approve')}
              </button>
              <button
                type="button"
                onClick={() => handleStatus(b.id, 'REJECTED')}
                className="px-3 py-1.5 bg-rose-500/20 text-rose-400 font-bold rounded-lg flex items-center gap-1 border border-rose-500/30"
              >
                <XCircle className="w-3.5 h-3.5" /> {t('reject')}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
            className="text-[10px] text-emerald-400 mt-2 font-semibold"
          >
            {expandedId === b.id ? 'Hide timeline' : 'View timeline'}
          </button>
          {expandedId === b.id && <BookingTimeline bookingId={b.id} />}
        </div>
      ))}
    </div>
  );
};
