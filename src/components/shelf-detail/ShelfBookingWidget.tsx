import React from 'react';
import { Store } from 'lucide-react';
import {
  BOOK_SHELF_LABEL,
  SHELF_BOOKING_FLOW_STEPS,
  SIGN_IN_TO_BOOK_LABEL,
} from '../../lib/bookingFlowCopy.js';
import { Shelf } from '../../types/index.js';
import { availabilityLabel } from '../shelfFacts.js';
import { formatShortDate } from '../../lib/monthlyRentalDates.js';

const DURATION_PRESETS = [1, 3, 6, 12] as const;

interface ShelfBookingWidgetProps {
  shelf: Shelf;
  shopName?: string;
  reviewCount: number;
  currentUser: { id: string } | null;
  startDate: string;
  endDate: string;
  durationMonths: number;
  activeDurationMonths: number | null;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  onDurationPreset?: (months: number) => void;
  onStartDateChange?: (isoDate: string) => void;
  minStartDate?: string;
  monthlyRate: number;
  bookingError: string;
  onReserve: () => void;
  onLogin: () => void;
  onContactHost?: () => void;
  variant: 'sticky' | 'mobile' | 'compact';
}

export const ShelfBookingWidget: React.FC<ShelfBookingWidgetProps> = ({
  shelf,
  shopName,
  reviewCount,
  currentUser,
  startDate,
  endDate,
  durationMonths,
  activeDurationMonths,
  selectedCategory,
  onCategoryChange,
  onDurationPreset,
  onStartDateChange,
  minStartDate,
  monthlyRate,
  bookingError,
  onReserve,
  onLogin,
  onContactHost,
  variant,
}) => {
  const canReserve = Boolean(startDate && endDate && durationMonths >= 1);
  const categories = shelf.allowedCategories || [];
  const presetHighlight = activeDurationMonths ?? durationMonths;

  const durationChips = (
    <div className="flex flex-wrap gap-2">
      {DURATION_PRESETS.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onDurationPreset?.(m)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            presetHighlight === m
              ? 'bg-[var(--shelfy-fg)] text-[var(--shelfy-bg)] border-[var(--shelfy-fg)]'
              : 'border-[var(--shelfy-border)] text-[var(--shelfy-muted)] hover:border-[var(--shelfy-fg)]/30'
          }`}
        >
          {m === 12 ? '1 year' : `${m} mo`}
        </button>
      ))}
    </div>
  );

  const dateRow = (
    <div className="rounded-xl border border-[var(--shelfy-border)] overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-[var(--shelfy-border)]">
        <label className="p-3 block hover:bg-[var(--shelfy-elevated)] transition-colors cursor-pointer">
          <span className="text-[10px] font-bold uppercase text-[var(--shelfy-muted)] block">Start</span>
          <input
            type="date"
            value={startDate}
            min={minStartDate}
            onChange={(e) => onStartDateChange?.(e.target.value)}
            className="mt-0.5 w-full bg-transparent text-sm font-medium text-[var(--shelfy-fg)] border-0 p-0 focus:outline-none focus:ring-0 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </label>
        <div className="p-3">
          <span className="text-[10px] font-bold uppercase text-[var(--shelfy-muted)] block">End</span>
          <span className="text-sm font-medium text-[var(--shelfy-fg)] mt-0.5 block">
            {endDate ? formatShortDate(endDate) : 'Select duration'}
          </span>
        </div>
      </div>
    </div>
  );

  if (variant === 'compact') {
    return (
      <div
        id="mobile-booking"
        className="lg:hidden bg-[var(--shelfy-card-bg)] border border-[var(--shelfy-border)] rounded-xl p-4 shadow-sm space-y-3 scroll-mt-24"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-semibold">
            TZS {monthlyRate.toLocaleString()}
            <span className="text-sm text-[var(--shelfy-muted)] font-normal"> / mo</span>
          </span>
          <span className="text-xs text-[var(--shelfy-muted)]">{durationMonths} mo total</span>
        </div>
        {dateRow}
        {durationChips}
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          disabled={!categories.length}
          className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-lg px-3 py-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {bookingError && <p className="text-[11px] text-rose-500">{bookingError}</p>}
        <button
          type="button"
          onClick={currentUser ? onReserve : onLogin}
          disabled={currentUser ? !canReserve : false}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold disabled:opacity-40"
        >
          {currentUser ? BOOK_SHELF_LABEL : SIGN_IN_TO_BOOK_LABEL}
        </button>
      </div>
    );
  }

  if (variant === 'mobile') {
    return (
      <div className="lg:hidden fixed bottom-[4.75rem] md:bottom-0 inset-x-0 z-40 bg-[var(--shelfy-bg)]/95 backdrop-blur-md border-t border-[var(--shelfy-border)] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] text-[var(--shelfy-muted)] uppercase tracking-wide">From</div>
            <div className="font-mono font-black text-[var(--shelfy-fg)] text-sm truncate">
              TZS {monthlyRate.toLocaleString()}
              <span className="text-[var(--shelfy-muted)] font-normal text-xs"> /mo</span>
            </div>
            {startDate && endDate && (
              <div className="text-[10px] text-[var(--shelfy-muted)] truncate">
                {formatShortDate(startDate)} – {formatShortDate(endDate)}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={currentUser ? onReserve : onLogin}
            disabled={currentUser ? !canReserve : false}
            className="shrink-0 px-5 py-3 rounded-lg bg-[var(--shelfy-fg)] text-[var(--shelfy-bg)] font-bold text-xs sm:text-sm disabled:opacity-40 touch-target"
          >
            {currentUser ? BOOK_SHELF_LABEL : 'Sign in'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--shelfy-card-bg)] border border-[var(--shelfy-border)] rounded-xl p-6 shadow-[0_6px_16px_rgba(0,0,0,0.08)] space-y-4">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <span className="text-2xl font-semibold text-[var(--shelfy-fg)]">
            TZS {monthlyRate.toLocaleString()}
          </span>
          <span className="text-sm text-[var(--shelfy-muted)]"> / month</span>
        </div>
        {shelf.avgRating ? (
          <span className="text-xs font-medium text-[var(--shelfy-muted)] underline underline-offset-2">
            ★ {shelf.avgRating.toFixed(2)} · {reviewCount}
          </span>
        ) : (
          <span className="text-xs text-[var(--shelfy-muted)]">{availabilityLabel(shelf.availabilityStatus)}</span>
        )}
      </div>

      {dateRow}
      {durationChips}

      <div>
        <span className="text-[10px] font-bold text-[var(--shelfy-muted)] uppercase tracking-wider block mb-1">
          Product on shelf
        </span>
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          disabled={!categories.length}
          className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--shelfy-fg)]"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {bookingError && <p className="text-[11px] text-rose-500">{bookingError}</p>}

      <button
        type="button"
        onClick={currentUser ? onReserve : onLogin}
        disabled={currentUser ? !canReserve : false}
        className="w-full py-3.5 rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {currentUser ? BOOK_SHELF_LABEL : SIGN_IN_TO_BOOK_LABEL}
      </button>

      <div className="rounded-xl border border-[var(--shelfy-border)] bg-[var(--shelfy-elevated)]/50 p-3 space-y-2">
        <p className="text-[11px] font-semibold text-[var(--shelfy-fg)]">What happens after you book</p>
        <ol className="text-[11px] text-[var(--shelfy-muted)] space-y-1.5 list-decimal list-inside leading-relaxed">
          {SHELF_BOOKING_FLOW_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      {onContactHost && (
        <button
          type="button"
          onClick={onContactHost}
          className="w-full py-2.5 rounded-lg border border-[var(--shelfy-border)] text-sm font-semibold text-[var(--shelfy-fg)] flex items-center justify-center gap-2"
        >
          <Store className="w-4 h-4" /> Message shop owner
        </button>
      )}

      <p className="text-[11px] text-[var(--shelfy-muted)] line-clamp-1">{shopName || shelf.shopName || 'Retail shop'}</p>
    </div>
  );
};
