import React, { useEffect, useState } from 'react';
import { ShieldCheck, ClipboardCheck, Star } from 'lucide-react';
import { InspectionSummary } from '../../types/index.js';
import { api } from '../../lib/api.js';
import { TrustBadges } from '../TrustBadges.js';

interface ShelfDetailTrustPanelProps {
  shelfId: string;
}

export const ShelfDetailTrustPanel: React.FC<ShelfDetailTrustPanelProps> = ({ shelfId }) => {
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

  return (
    <div id="trust-compliance" className="border-b border-[var(--shelfy-border)] pb-8 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-[var(--shelfy-fg)]">Trust & compliance</h3>
        <p className="text-xs text-[var(--shelfy-muted)] mt-1">
          Field agents verify shelf condition and shop compliance. Scores help brands book with confidence.
        </p>
      </div>
      <TrustBadges shelfId={shelfId} compact />
      {summary && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-[var(--shelfy-elevated)] rounded-xl p-3 border border-[var(--shelfy-border)]">
            <dt className="text-[var(--shelfy-muted)] flex items-center gap-1">
              <Star className="w-3 h-3" /> Trust score
            </dt>
            <dd className="font-bold text-[var(--shelfy-fg)] mt-1">{summary.trustScore}/100</dd>
          </div>
          <div className="bg-[var(--shelfy-elevated)] rounded-xl p-3 border border-[var(--shelfy-border)]">
            <dt className="text-[var(--shelfy-muted)] flex items-center gap-1">
              <ClipboardCheck className="w-3 h-3" /> Inspections
            </dt>
            <dd className="font-bold text-[var(--shelfy-fg)] mt-1">{summary.totalInspections}</dd>
          </div>
          {summary.lastInspectionAt && (
            <div className="bg-[var(--shelfy-elevated)] rounded-xl p-3 border border-[var(--shelfy-border)]">
              <dt className="text-[var(--shelfy-muted)]">Last visit</dt>
              <dd className="font-bold text-[var(--shelfy-fg)] mt-1">{new Date(summary.lastInspectionAt).toLocaleDateString()}</dd>
            </div>
          )}
          {summary.lastCondition && (
            <div className="bg-[var(--shelfy-elevated)] rounded-xl p-3 border border-[var(--shelfy-border)]">
              <dt className="text-[var(--shelfy-muted)]">Condition</dt>
              <dd className="font-bold text-[var(--shelfy-fg)] mt-1">{summary.lastCondition}</dd>
            </div>
          )}
          {summary.verifiedListing && (
            <div className="col-span-2 sm:col-span-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
              <ShieldCheck className="w-4 h-4" /> Verified listing on Shelfy
            </div>
          )}
        </dl>
      )}
    </div>
  );
};
