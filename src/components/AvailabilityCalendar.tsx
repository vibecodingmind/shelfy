/**
 * Shelfy 🇹🇿 — Interactive Shelf Availability Calendar
 * Shows existing bookings, visualizes occupancy, and strictly prevents double-booking.
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
} from 'lucide-react';

export interface BookedRange {
  bookingId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status?: string;
  vendorName?: string;
}

interface AvailabilityCalendarProps {
  shelfId: string;
  bookedRanges: BookedRange[];
  monthlyPriceTzs: number;
  selectedStartDate?: string;
  selectedEndDate?: string;
  onDateRangeChange: (start: string, end: string, monthsCount: number, isValid: boolean) => void;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  shelfId,
  bookedRanges = [],
  monthlyPriceTzs,
  selectedStartDate: initialStart,
  selectedEndDate: initialEnd,
  onDateRangeChange,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [startDate, setStartDate] = useState<string>(initialStart || '');
  const [endDate, setEndDate] = useState<string>(initialEnd || '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to format date as YYYY-MM-DD
  const formatDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = useMemo(() => formatDateStr(new Date()), []);

  // Check if a date string is inside any booked range
  const isDateBooked = (dateStr: string): { booked: boolean; vendor?: string } => {
    for (const range of bookedRanges) {
      if (dateStr >= range.startDate && dateStr <= range.endDate) {
        return { booked: true, vendor: range.vendorName };
      }
    }
    return { booked: false };
  };

  // Check if a whole range [startStr, endStr] contains any booked days
  const doesRangeOverlapBooked = (startStr: string, endStr: string): boolean => {
    for (const range of bookedRanges) {
      // Overlap condition: max(start1, start2) <= min(end1, end2)
      if (startStr <= range.endDate && endStr >= range.startDate) {
        return true;
      }
    }
    return false;
  };

  // Calculate days in current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isPast: boolean;
      isBooked: boolean;
      bookedBy?: string;
    }> = [];

    // Prev month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      const str = formatDateStr(d);
      const { booked, vendor } = isDateBooked(str);
      days.push({
        dateStr: str,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isPast: str < todayStr,
        isBooked: booked,
        bookedBy: vendor,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const str = formatDateStr(d);
      const { booked, vendor } = isDateBooked(str);
      days.push({
        dateStr: str,
        dayNumber: i,
        isCurrentMonth: true,
        isPast: str < todayStr,
        isBooked: booked,
        bookedBy: vendor,
      });
    }

    // Next month leading days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const str = formatDateStr(d);
      const { booked, vendor } = isDateBooked(str);
      days.push({
        dateStr: str,
        dayNumber: i,
        isCurrentMonth: false,
        isPast: str < todayStr,
        isBooked: booked,
        bookedBy: vendor,
      });
    }

    return days;
  }, [year, month, bookedRanges, todayStr]);

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Click day handler
  const handleDateClick = (dateStr: string, isPast: boolean, isBooked: boolean) => {
    if (isPast) return;
    if (isBooked) {
      setErrorMessage('This date is already booked by another vendor. Please select open dates.');
      return;
    }

    setErrorMessage(null);

    // If no start date or both already set, reset and start fresh
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateStr);
      setEndDate('');
      onDateRangeChange(dateStr, '', 1, false);
    } else if (startDate && !endDate) {
      if (dateStr < startDate) {
        // User clicked an earlier date, make it the new start date
        setStartDate(dateStr);
        setEndDate('');
        onDateRangeChange(dateStr, '', 1, false);
      } else if (dateStr === startDate) {
        // Clicked same date: default 1 month from start
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + 1);
        const endStr = formatDateStr(d);
        if (doesRangeOverlapBooked(startDate, endStr)) {
          setErrorMessage('Selected 1-month range conflicts with an existing booking. Please pick another end date.');
          return;
        }
        setEndDate(endStr);
        onDateRangeChange(startDate, endStr, 1, true);
      } else {
        // Verify no overlapping bookings in between
        if (doesRangeOverlapBooked(startDate, dateStr)) {
          setErrorMessage('Double-booking prevented: Date range intersects an active booking! Please select non-overlapping dates.');
          return;
        }
        setEndDate(dateStr);

        // Approximate months count
        const startD = new Date(startDate);
        const endD = new Date(dateStr);
        const diffDays = Math.round((endD.getTime() - startD.getTime()) / (1000 * 3600 * 24));
        const monthsCount = Math.max(1, Math.round(diffDays / 30));

        onDateRangeChange(startDate, dateStr, monthsCount, true);
      }
    }
  };

  // Preset durations (1 month, 3 months, 6 months)
  const applyPresetDuration = (months: number) => {
    const baseStart = startDate && startDate >= todayStr ? startDate : todayStr;
    const startD = new Date(baseStart);
    const endD = new Date(startD);
    endD.setMonth(endD.getMonth() + months);
    const endStr = formatDateStr(endD);

    if (doesRangeOverlapBooked(baseStart, endStr)) {
      setErrorMessage(`Cannot book ${months} month(s) from ${baseStart}: Overlaps with an existing reservation.`);
      return;
    }

    setStartDate(baseStart);
    setEndDate(endStr);
    setErrorMessage(null);
    onDateRangeChange(baseStart, endStr, months, true);
  };

  // Summary computations
  const durationMonths = useMemo(() => {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)));
    return Math.max(1, Math.round(diffDays / 30));
  }, [startDate, endDate]);

  const estimatedTotal = durationMonths * monthlyPriceTzs;

  return (
    <div id="availability-calendar" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl text-white">
      
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Interactive Availability Calendar</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select check-in & check-out dates. Verified against real-time shelf bookings.
          </p>
        </div>

        {/* Quick Month Navigation */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-sm font-bold min-w-32 text-center text-white">
            {monthNames[month]} {year}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Duration Presets */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Quick Select:</span>
        <button
          type="button"
          onClick={() => applyPresetDuration(1)}
          className="px-3 py-1 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 text-xs font-semibold rounded-lg border border-slate-700 transition-all"
        >
          1 Month
        </button>
        <button
          type="button"
          onClick={() => applyPresetDuration(3)}
          className="px-3 py-1 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 text-xs font-semibold rounded-lg border border-slate-700 transition-all"
        >
          3 Months (Quarter)
        </button>
        <button
          type="button"
          onClick={() => applyPresetDuration(6)}
          className="px-3 py-1 bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 text-xs font-semibold rounded-lg border border-slate-700 transition-all"
        >
          6 Months
        </button>
      </div>

      {/* Conflict Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
          <div key={i} className="text-[11px] font-semibold text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-5">
        {calendarDays.map((day, idx) => {
          const isSelectedStart = startDate === day.dateStr;
          const isSelectedEnd = endDate === day.dateStr;
          const isInSelectedRange =
            startDate && endDate && day.dateStr >= startDate && day.dateStr <= endDate;

          let cellBg = 'bg-slate-950/60 text-slate-300 hover:bg-slate-800';

          if (day.isPast) {
            cellBg = 'bg-slate-950/30 text-slate-600 cursor-not-allowed';
          } else if (day.isBooked) {
            cellBg = 'bg-rose-950/30 text-rose-400/80 border border-rose-900/40 cursor-not-allowed';
          } else if (isSelectedStart || isSelectedEnd) {
            cellBg = 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/30';
          } else if (isInSelectedRange) {
            cellBg = 'bg-emerald-500/20 text-emerald-300 border-y border-emerald-500/30';
          } else if (!day.isCurrentMonth) {
            cellBg = 'bg-slate-950/20 text-slate-600 hover:bg-slate-800/40';
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={day.isPast || day.isBooked}
              onClick={() => handleDateClick(day.dateStr, day.isPast, day.isBooked)}
              title={
                day.isBooked
                  ? `Booked (${day.bookedBy || 'Occupied'})`
                  : day.isPast
                  ? 'Past date'
                  : `Select ${day.dateStr}`
              }
              className={`relative h-11 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all ${cellBg}`}
            >
              <span>{day.dayNumber}</span>
              {day.isBooked && !day.isPast && (
                <span className="text-[9px] text-rose-400 font-mono scale-90 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" /> Booked
                </span>
              )}
              {isSelectedStart && (
                <span className="text-[8px] font-black uppercase tracking-tighter text-slate-950 -mt-0.5">Start</span>
              )}
              {isSelectedEnd && (
                <span className="text-[8px] font-black uppercase tracking-tighter text-slate-950 -mt-0.5">End</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend & Summary Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
        
        {/* Color Legend */}
        <div className="flex flex-wrap items-center gap-3 text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-[11px]">Selected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-700" />
            <span className="text-[11px]">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-900/60 border border-rose-700" />
            <span className="text-[11px]">Occupied / Booked</span>
          </div>
        </div>

        {/* Selected Range Display */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Duration & Period</span>
            <span className="font-semibold text-white">
              {startDate ? startDate : 'Select Start'} → {endDate ? endDate : 'Select End'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Subtotal</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              TZS {estimatedTotal.toLocaleString()}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
