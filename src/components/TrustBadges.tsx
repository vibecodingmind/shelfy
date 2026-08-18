import React, { useEffect, useState } from 'react';
import { ShieldCheck, ClipboardCheck, Star } from 'lucide-react';
import { InspectionSummary } from '../types/index.js';
import { api } from '../lib/api.js';
import { useI18n } from '../i18n/context.js';

interface TrustBadgesProps {
  shelfId: string;
  compact?: boolean;
}

export const TrustBadges: React.FC<TrustBadgesProps> = ({ shelfId, compact }) => {
  const { t } = useI18n();
  const [summary, setSummary] = useState<InspectionSummary | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getInspectionSummary(shelfId).then((res) => {
      if (mounted && res.success && res.data) setSummary(res.data);
    });
    return () => {
      mounted = false;
    };
  }, [shelfId]);

  if (!summary) return null;

  const badges = [
    summary.verifiedListing && { icon: ShieldCheck, label: t('trustVerified'), color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    summary.totalInspections > 0 && { icon: ClipboardCheck, label: `${t('trustInspected')} (${summary.totalInspections})`, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
    { icon: Star, label: `${t('trustScore')}: ${summary.trustScore}/100`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  ].filter(Boolean) as Array<{ icon: typeof ShieldCheck; label: string; color: string }>;

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-4'}`}>
      {badges.map((b) => {
        const Icon = b.icon;
        return (
          <span
            key={b.label}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${b.color}`}
          >
            <Icon className="w-3 h-3" /> {b.label}
          </span>
        );
      })}
    </div>
  );
};
