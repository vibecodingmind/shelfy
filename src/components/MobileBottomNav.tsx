import React, { useState } from 'react';
import { Bell, Home, LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import { User } from '../types/index.js';

interface MobileBottomNavProps {
  user: User | null;
  activeRole: string;
  notificationsCount: number;
  onSwitchView?: (roleView: string) => void;
  onNotificationsClick?: () => void;
  onLoginClick: (initialMode?: 'LOGIN' | 'REGISTER') => void;
  onLogout: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  user,
  activeRole,
  notificationsCount,
  onSwitchView,
  onNotificationsClick,
  onLoginClick,
  onLogout,
}) => {
  const [accountOpen, setAccountOpen] = useState(false);
  const onMarket = activeRole === 'MARKETPLACE';

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-[var(--shelfy-border)] bg-[var(--shelfy-bg)] backdrop-blur-md safe-bottom" aria-label="App">
      {accountOpen && (
        <div className="absolute bottom-full right-3 mb-2 w-52 rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl">
          {!user ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  onLoginClick('LOGIN');
                }}
                className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  onLoginClick('REGISTER');
                }}
                className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              <div className="border-b border-slate-800 px-3 py-2">
                <div className="truncate text-xs font-bold text-white">{user.name}</div>
                <div className="truncate text-[10px] text-slate-400">{user.email}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  onSwitchView?.('MARKETPLACE');
                }}
                className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"
              >
                Marketplace
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  onSwitchView?.(user.role);
                }}
                className="w-full rounded-xl px-3 py-2.5 text-left text-xs text-slate-300 hover:bg-slate-800"
              >
                My workspace
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen(false);
                  onLogout();
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </>
          )}
        </div>
      )}

      <div className={`grid ${user ? 'grid-cols-4' : 'grid-cols-2'}`}>
        <button
          type="button"
          onClick={() => {
            setAccountOpen(false);
            onSwitchView?.('MARKETPLACE');
          }}
          className={`flex flex-col items-center gap-1 py-2 text-[10px] font-bold ${onMarket ? 'text-emerald-400' : 'text-slate-400'}`}
        >
          <Home className="h-5 w-5" />
          Home
        </button>
        {user && (
          <button
            type="button"
            onClick={() => {
              setAccountOpen(false);
              onSwitchView?.(user.role);
            }}
            className={`flex flex-col items-center gap-1 py-2 text-[10px] font-bold ${!onMarket ? 'text-emerald-400' : 'text-slate-400'}`}
          >
            <LayoutDashboard className="h-5 w-5" />
            Workspace
          </button>
        )}
        {user && (
          <button
            type="button"
            onClick={() => {
              setAccountOpen(false);
              onNotificationsClick?.();
            }}
            className="relative flex flex-col items-center gap-1 py-2 text-[10px] font-bold text-slate-400"
          >
            <Bell className="h-5 w-5" />
            {notificationsCount > 0 && (
              <span className="absolute right-[28%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-black text-slate-950">
                {notificationsCount}
              </span>
            )}
            Alerts
          </button>
        )}
        <button
          type="button"
          onClick={() => setAccountOpen((open) => !open)}
          className="flex flex-col items-center gap-1 py-1.5 text-[10px] font-bold text-slate-300"
          aria-expanded={accountOpen}
          aria-label={user ? 'Account' : 'Log in or register'}
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-emerald-500/50 object-cover" />
          ) : (
            <span className={`flex h-8 w-8 items-center justify-center rounded-full border ${accountOpen ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300' : 'border-slate-600 bg-slate-800 text-slate-200'}`}>
              <UserRound className="h-4 w-4" />
            </span>
          )}
          {user ? user.name.split(' ')[0] : 'Account'}
        </button>
      </div>
    </nav>
  );
};
