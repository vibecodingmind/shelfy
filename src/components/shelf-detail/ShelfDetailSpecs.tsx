import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Shelf } from '../../types/index.js';
import { formatShelfType, shelfVolumeLitres } from '../shelfFacts.js';
import { formatInStoreLabelDisplay } from '../../lib/shelfInStoreLabel.js';
import { normalizeShelfRules } from '../../lib/shelfRules.js';

interface ShelfDetailSpecsProps {
  shelf: Shelf;
}

function goodForBullets(shelf: Shelf): string[] {
  const bullets: string[] = [];
  bullets.push(`${formatShelfType(shelf.shelfType)} placement at ${formatInStoreLabelDisplay(shelf)}`);
  if (shelf.allowedCategories?.length) {
    bullets.push(`Ideal for ${shelf.allowedCategories.slice(0, 3).join(', ')}`);
  }
  bullets.push(`${shelfVolumeLitres(shelf)} display volume for packs and POS materials`);
  return bullets;
}

export const ShelfDetailSpecs: React.FC<ShelfDetailSpecsProps> = ({ shelf }) => {
  const shelfRules = normalizeShelfRules(shelf.shelfRules);

  return (
  <div id="overview" className="space-y-6 border-b border-[var(--shelfy-border)] pb-6 scroll-mt-24">
    <div>
      <h3 className="text-base font-bold text-[var(--shelfy-fg)] mb-2">Why this shelf</h3>
      <ul className="space-y-1.5 text-sm text-[var(--shelfy-muted)]">
        {goodForBullets(shelf).map((line) => (
          <li key={line} className="flex gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-[var(--shelfy-elevated)] p-4 rounded-2xl border border-[var(--shelfy-border)]">
        <span className="text-[10px] uppercase font-semibold text-[var(--shelfy-muted)] block">In-store label</span>
        <span className="text-sm font-bold text-[var(--shelfy-fg)]">{formatInStoreLabelDisplay(shelf)}</span>
        <span className="text-xs text-[var(--shelfy-muted)] block mt-1">{formatShelfType(shelf.shelfType)}</span>
      </div>
      <div className="bg-[var(--shelfy-elevated)] p-4 rounded-2xl border border-[var(--shelfy-border)]">
        <span className="text-[10px] uppercase font-semibold text-[var(--shelfy-muted)] block">Size</span>
        <span className="text-sm font-mono font-bold text-[var(--shelfy-fg)]">
          {shelf.widthCm} × {shelf.heightCm} × {shelf.depthCm} cm
        </span>
        <span className="text-xs text-[var(--shelfy-muted)] block mt-1">{shelfVolumeLitres(shelf)} volume</span>
      </div>
      <div className="bg-[var(--shelfy-elevated)] p-4 rounded-2xl border border-[var(--shelfy-border)]">
        <span className="text-[10px] uppercase font-semibold text-[var(--shelfy-muted)] block">Rent</span>
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">TZS {shelf.monthlyPriceTzs.toLocaleString()}/mo</span>
      </div>
    </div>

    <div>
      <h3 className="text-base font-bold text-[var(--shelfy-fg)] mb-2">Permitted categories</h3>
      <div className="flex flex-wrap gap-2">
        {shelf.allowedCategories?.map((cat) => (
          <span
            key={cat}
            className="px-3 py-1 bg-[var(--shelfy-elevated)] border border-[var(--shelfy-border)] text-xs font-medium text-[var(--shelfy-fg)] rounded-full inline-flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            {cat}
          </span>
        ))}
      </div>
    </div>

    <div>
      <h3 className="text-base font-bold text-[var(--shelfy-fg)] mb-2">Shelf rules</h3>
      <p className="text-xs text-[var(--shelfy-muted)] mb-3">
        Set by the shop owner for this shelf. Follow these when you rent and stock the space.
      </p>
      {shelfRules.length > 0 ? (
        <ul className="space-y-2 text-sm text-[var(--shelfy-fg)]">
          {shelfRules.map((rule) => (
            <li key={rule} className="flex gap-2">
              <span className="text-[var(--shelfy-muted)] shrink-0">•</span>
              <span>{rule}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--shelfy-muted)] italic">The host has not added shelf rules yet.</p>
      )}
    </div>
  </div>
  );
};
