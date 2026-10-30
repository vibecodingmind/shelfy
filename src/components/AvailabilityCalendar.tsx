/**
 * Monthly shelf rental calendar — Airbnb-style dual month, duration presets.
 * Selection state is controlled by the parent (single source of truth).
 */

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import {
  addMonthsIsoDate,
  findEarliestAvailableStart,
  isDayOccupied,
  rangeOverlapsAnyBooking,
  todayIsoDate,
} from '../lib/monthlyRentalDates.js';

export interface BookedRange {
  bookingId?: string;
  startDate: string;
  endDate: string;
  status?: string;
  vendorName?: string;
}

const DURATION_PRESETS = [
  { months: 1, label: '1 mo' },
  { months: 3, label: '3 mo' },
  { months: 6, label: '6 mo' },
  { months: 12, label: '1 yr' },
] as const;

interface AvailabilityCalendarProps {
  shelfId?: string;
  bookedRanges: BookedRange[];
  monthlyPriceTzs: number;
  selectedStartDate?: string;
  selectedEndDate?: string;
  activeDurationMonths?: number | null;
  onDateRangeChange: (start: string, end: string, monthsCount: number, isValid: boolean) => void;
  onDurationPreset?: (months: number) => void;
  compact?: boolean;
  /** When false, duration chips are hidden (e.g. booking widget shows them) */
  showDurationPresets?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDateStrUTC(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month, day));
  return d.toISOString().slice(0, 10);
}

function buildMonthGrid(year: number, month: number, bookedRanges: BookedRange[], todayStr: string) {
  const firstDayIndex = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const days: Array<{
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isPast: boolean;
    isBooked: boolean;
  }> = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const dateStr = formatDateStrUTC(year, month - 1, dayNum);
    days.push({
      dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isPast: dateStr < todayStr,
      isBooked: isDayOccupied(dateStr, bookedRanges),
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = formatDateStrUTC(year, month, i);
    days.push({
      dateStr,
      dayNumber: i,
      isCurrentMonth: true,
      isPast: dateStr < todayStr,
      isBooked: isDayOccupied(dateStr, bookedRanges),
    });
  }

  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const dateStr = formatDateStrUTC(year, month + 1, i);
    days.push({
      dateStr,
      dayNumber: i,
      isCurrentMonth: false,
      isPast: dateStr < todayStr,
      isBooked: isDayOccupied(dateStr, bookedRanges),
    });
  }

  return days;
}

function MonthPanel({
  year,
  month,
  bookedRanges,
  todayStr,
  startDate,
  endDate,
  onDayClick,
}: {
  year: number;
  month: number;
  bookedRanges: BookedRange[];
  todayStr: string;
  startDate: string;
  endDate: string;
  onDayClick: (dateStr: string, isPast: boolean, isBooked: boolean) => void;
}) {
  const days = useMemo(() => buildMonthGrid(year, month, bookedRanges, todayStr), [year, month, bookedRanges, todayStr]);

  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-[var(--shelfy-fg)] mb-3 text-center">
        {MONTH_NAMES[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] font-semibold text-[var(--shelfy-muted)] py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const isStart = startDate === day.dateStr;
          const isEndDay = endDate === day.dateStr;
          const inRange =
            startDate && endDate && day.dateStr >= startDate && day.dateStr < endDate;

          let cellClass =
            'relative aspect-square max-h-10 rounded-lg text-xs font-medium flex items-center justify-center transition-colors ';

          if (day.isPast) {
            cellClass += 'text-[var(--shelfy-muted)]/40 cursor-not-allowed line-through decoration-[var(--shelfy-border)]';
          } else if (day.isBooked) {
            cellClass += 'text-rose-500/70 bg-rose-500/10 cursor-not-allowed line-through';
          } else if (isStart || isEndDay) {
            cellClass += 'bg-[var(--shelfy-fg)] text-[var(--shelfy-bg)] font-bold z-[1]';
          } else if (inRange) {
            cellClass += 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 rounded-none first:rounded-l-lg last:rounded-r-lg';
          } else if (!day.isCurrentMonth) {
            cellClass += 'text-[var(--shelfy-muted)]/50 hover:bg-[var(--shelfy-elevated)]';
          } else {
            cellClass += 'text-[var(--shelfy-fg)] hover:bg-[var(--shelfy-elevated)] hover:border hover:border-[var(--shelfy-border)]';
          }

          return (
            <button
              key={day.dateStr + day.dayNumber}
              type="button"
              disabled={day.isPast || day.isBooked}
              onClick={() => onDayClick(day.dateStr, day.isPast, day.isBooked)}
              className={cellClass}
              title={day.isBooked ? 'Booked' : day.dateStr}
            >
              {day.dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  bookedRanges = [],
  monthlyPriceTzs,
  selectedStartDate = '',
  selectedEndDate = '',
  activeDurationMonths = null,
  onDateRangeChange,
  onDurationPreset,
  compact = false,
  showDurationPresets = true,
}) => {
  const [viewStart, setViewStart] = useState(() => {
    const t = new Date();
    return { year: t.getUTCFullYear(), month: t.getUTCMonth() };
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDuration, setPendingDuration] = useState<number>(activeDurationMonths || 1);

  const todayStr = todayIsoDate();
  const startDate = selectedStartDate || '';
  const endDate = selectedEndDate || '';

  const secondMonth = useMemo(() => {
    const m = viewStart.month + 1;
    if (m > 11) return { year: viewStart.year + 1, month: 0 };
    return { year: viewStart.year, month: m };
  }, [viewStart]);

  const durationMonths = useMemo(() => {
    if (!startDate || !endDate) return pendingDuration || 1;
    const startD = new Date(`${startDate}T00:00:00.000Z`);
    const endD = new Date(`${endDate}T00:00:00.000Z`);
    let months = (endD.getUTCFullYear() - startD.getUTCFullYear()) * 12 + (endD.getUTCMonth() - startD.getUTCMonth());
    if (endD.getUTCDate() > startD.getUTCDate()) months += 1;
    if (endD.getUTCDate() < startD.getUTCDate()) months -= 1;
    return Math.max(1, months);
  }, [startDate, endDate, pendingDuration]);

  const applyDuration = (months: number, explicitStart?: string) => {
    setPendingDuration(months);
    onDurationPreset?.(months);

    const baseStart =
      explicitStart ||
      (startDate && startDate >= todayStr && !isDayOccupied(startDate, bookedRanges) ? startDate : null) ||
      findEarliestAvailableStart(bookedRanges, months, todayStr);

    if (!baseStart) {
      setErrorMessage(`No ${months}-month opening in the next two years. Try a shorter stay.`);
      onDateRangeChange('', '', months, false);
      return;
    }

    const endStr = addMonthsIsoDate(baseStart, months);
    if (rangeOverlapsAnyBooking(baseStart, endStr, bookedRanges)) {
      const next = findEarliestAvailableStart(bookedRanges, months, baseStart);
      if (!next) {
        setErrorMessage(`Cannot book ${months} month(s) — shelf is reserved in that period.`);
        onDateRangeChange(baseStart, '', months, false);
        return;
      }
      const nextEnd = addMonthsIsoDate(next, months);
      setErrorMessage(null);
      onDateRangeChange(next, nextEnd, months, true);
      return;
    }

    setErrorMessage(null);
    onDateRangeChange(baseStart, endStr, months, true);
  };

  const handleDayClick = (dateStr: string, isPast: boolean, isBooked: boolean) => {
    if (isPast || isBooked) {
      setErrorMessage(isBooked ? 'That day is already booked.' : 'Past dates cannot be selected.');
      return;
    }
    setErrorMessage(null);

    const months = pendingDuration || activeDurationMonths || 1;
    const endStr = addMonthsIsoDate(dateStr, months);

    if (rangeOverlapsAnyBooking(dateStr, endStr, bookedRanges)) {
      setErrorMessage(`A ${months}-month stay from this date overlaps another booking. Try another start date or duration.`);
      onDateRangeChange(dateStr, '', months, false);
      return;
    }

    onDateRangeChange(dateStr, endStr, months, true);
  };

  const shiftView = (delta: number) => {
    setViewStart((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      while (m < 0) {
        m += 12;
        y -= 1;
      }
      while (m > 11) {
        m -= 12;
        y += 1;
      }
      return { year: y, month: m };
    });
  };

  const estimatedTotal = durationMonths * monthlyPriceTzs;
  const presetActive = activeDurationMonths ?? pendingDuration;

  return (
    <div
      id="availability-calendar"
      className={`bg-[var(--shelfy-card-bg)] border border-[var(--shelfy-border)] rounded-2xl shadow-sm text-[var(--shelfy-fg)] ${
        compact ? 'p-4' : 'p-5'
      }`}
    >
      {showDurationPresets && (
      <div className="flex flex-wrap gap-2 mb-4">
        {DURATION_PRESETS.map(({ months, label }) => (
          <button
            key={months}
            type="button"
            onClick={() => applyDuration(months)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              presetActive === months
                ? 'bg-[var(--shelfy-fg)] text-[var(--shelfy-bg)] border-[var(--shelfy-fg)]'
                : 'bg-[var(--shelfy-bg)] text-[var(--shelfy-fg)] border-[var(--shelfy-border)] hover:border-emerald-500/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      )}

      {errorMessage && (
        <div className="mb-3 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => shiftView(-1)}
          className="p-2 rounded-full border border-[var(--shelfy-border)] hover:bg-[var(--shelfy-elevated)]"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-[11px] text-[var(--shelfy-muted)]">Tap a start date · end auto-set by duration</span>
        <button
          type="button"
          onClick={() => shiftView(1)}
          className="p-2 rounded-full border border-[var(--shelfy-border)] hover:bg-[var(--shelfy-elevated)]"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className={`flex gap-6 ${compact ? 'flex-col sm:flex-row' : 'flex-col md:flex-row'}`}>
        <MonthPanel
          year={viewStart.year}
          month={viewStart.month}
          bookedRanges={bookedRanges}
          todayStr={todayStr}
          startDate={startDate}
          endDate={endDate}
          onDayClick={handleDayClick}
        />
        <MonthPanel
          year={secondMonth.year}
          month={secondMonth.month}
          bookedRanges={bookedRanges}
          todayStr={todayStr}
          startDate={startDate}
          endDate={endDate}
          onDayClick={handleDayClick}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--shelfy-border)] flex flex-wrap items-end justify-between gap-3 text-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[var(--shelfy-muted)] block">Your rental</span>
          <span className="font-semibold">
            {startDate || 'Start'} → {endDate || 'End'}
          </span>
          <span className="text-[var(--shelfy-muted)] block mt-0.5">
            {durationMonths} month{durationMonths !== 1 ? 's' : ''} · end date is checkout day (exclusive)
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-[var(--shelfy-muted)] block">Rent subtotal</span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            TZS {estimatedTotal.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
