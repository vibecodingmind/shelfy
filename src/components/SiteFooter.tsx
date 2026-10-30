import React from 'react';

/** Site footer — desktop/tablet (hidden on small screens with bottom nav). */
export const SiteFooter: React.FC = () => (
  <footer className="hidden md:block bg-[var(--shelfy-bg)] border-t border-[var(--shelfy-border)] py-8 px-4 sm:px-6 lg:px-8 text-xs text-[var(--shelfy-muted)] mt-12">
    <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 font-bold text-[var(--shelfy-fg)] text-center md:text-left">
        <span>Shelfy 🇹🇿</span>
        <span className="text-[var(--shelfy-muted)] font-normal">The retail expansion platform for Tanzania</span>
      </div>
      <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-3 gap-y-1">
        <a href="mailto:hello@shelfy.co.tz" className="hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold">
          hello@shelfy.co.tz
        </a>
        <span className="text-[var(--shelfy-border)] hidden sm:inline">|</span>
        <a href="/legal/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400">
          Terms
        </a>
        <a href="/legal/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400">
          Privacy
        </a>
        <a href="/legal/cancellation" className="hover:text-emerald-600 dark:hover:text-emerald-400">
          Cancellation
        </a>
        <a href="/legal/payout" className="hover:text-emerald-600 dark:hover:text-emerald-400">
          Payouts
        </a>
        <span className="w-full sm:w-auto text-center md:text-right text-[10px] text-[var(--shelfy-muted)]">
          Azam Pay · M-Pesa · Tigo Pesa · Airtel Money
        </span>
      </div>
    </div>
  </footer>
);
