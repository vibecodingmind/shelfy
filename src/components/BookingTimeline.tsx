import React, { useEffect, useState } from 'react';
import { Clock, User } from 'lucide-react';
import { BookingStatusHistory } from '../types/index.js';
import { api } from '../lib/api.js';
import { useI18n } from '../i18n/context.js';

interface BookingTimelineProps {
  bookingId: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_APPROVAL: 'text-amber-400',
  APPROVED: 'text-blue-400',
  PAID: 'text-emerald-400',
  ACTIVE: 'text-emerald-400',
  EXPIRING: 'text-orange-400',
  COMPLETED: 'text-slate-400',
  CANCELLED: 'text-rose-400',
  REJECTED: 'text-rose-400',
};

export const BookingTimeline: React.FC<BookingTimelineProps> = ({ bookingId }) => {
  const { t } = useI18n();
  const [history, setHistory] = useState<BookingStatusHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getBookingHistory(bookingId).then((res) => {
      if (mounted && res.success && res.data) setHistory(res.data);
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [bookingId]);

  if (loading) return <div className="text-xs text-slate-500 py-2">Loading timeline…</div>;

  return (
    <div className="mt-3">
      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t('bookingTimeline')}</h4>
      <ol className="relative border-l border-slate-700 ml-2 space-y-3">
        {history.map((h) => (
          <li key={h.id} className="ml-4">
            <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-slate-800 border-2 border-emerald-500" />
            <div className={`text-xs font-bold ${STATUS_COLORS[h.toStatus] || 'text-white'}`}>{h.toStatus.replace(/_/g, ' ')}</div>
            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
              <Clock className="w-3 h-3" /> {new Date(h.createdAt).toLocaleString()}
              <User className="w-3 h-3 ml-1" /> {h.actorRole}
            </div>
            {h.reason && <div className="text-[10px] text-slate-400 mt-0.5">{h.reason}</div>}
          </li>
        ))}
      </ol>
    </div>
  );
};
