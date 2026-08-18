/**
 * Shelfy 🇹🇿 — Global Airbnb-Style Navigation Header
 */

import React, { useState, useEffect, useRef } from 'react';
import { Store, Search, Bell, LogOut, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher.js';
import { User, UserRole } from '../types/index.js';

interface HeaderProps {
  user: User | null;
  activeRole: string;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onLoginClick: (initialMode?: 'LOGIN' | 'REGISTER', initialRole?: UserRole) => void;
  onDemoLogin?: (email: string) => void;
  onLogout: () => void;
  onSwitchView?: (roleView: string) => void;
  onOpenFilter?: () => void;
  notificationsCount: number;
  onNotificationsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeRole,
  searchQuery = '',
  onSearchChange,
  onLoginClick,
  onLogout,
  onSwitchView,
  onOpenFilter,
  notificationsCount,
  onNotificationsClick,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserDropdown) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowUserDropdown(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [showUserDropdown]);

  const portalLabel =
    activeRole === 'MARKETPLACE'
      ? user?.role === 'ADMIN'
        ? 'Admin'
        : user?.role === 'FIELD_AGENT'
          ? 'Agent'
          : user?.role === 'HOST'
            ? 'Host'
            : 'Portal'
      : 'Market';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
        <div
          className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none shrink-0 min-w-0"
          onClick={() => onSwitchView?.('MARKETPLACE')}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-lg sm:text-xl shadow-lg shadow-emerald-500/20 shrink-0">
            🇹🇿
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-black text-xl sm:text-2xl tracking-tighter bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                shelfy
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-extrabold tracking-wider px-1 sm:px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                TZ
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 -mt-0.5 hidden sm:block font-medium truncate">
              Retail Shelf Marketplace
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center justify-center flex-1 max-w-xl mx-4">
          <div
            className={`w-full flex items-center bg-slate-950/80 border ${
              isSearchFocused ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-700/80 hover:border-slate-600'
            } rounded-full py-1.5 pl-5 pr-2 shadow-lg transition-all duration-200`}
          >
            <div className="flex-1 flex items-center divide-x divide-slate-800 text-xs">
              <div className="pr-3 flex-1 flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Dar es Salaam, Masaki, Kariakoo..."
                  className="w-full min-w-0 bg-transparent text-white placeholder-slate-400 text-xs focus:outline-none font-medium"
                />
              </div>
              <div className="pl-3 pr-2 hidden sm:block">
                <button
                  type="button"
                  onClick={onOpenFilter}
                  className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-semibold text-xs transition-colors touch-target"
                >
                  <SlidersHorizontal className="w-3 h-3" /> Filters
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenFilter}
              className="w-9 h-9 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer ml-2 touch-target"
              title="Search Shelves"
            >
              <Search className="w-4 h-4 text-slate-950 font-bold" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <LanguageSwitcher compact />
          {!user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => onLoginClick('REGISTER', 'HOST')}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
              >
                <Store className="w-4 h-4 text-blue-400" />
                <span>Shelfy your store</span>
              </button>
              <button
                type="button"
                onClick={() => onLoginClick('LOGIN')}
                className="px-3 sm:px-4 py-2 text-xs font-bold text-slate-200 hover:text-white rounded-full hover:bg-slate-800 border border-slate-700/80 transition-colors touch-target"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onLoginClick('REGISTER', 'VENDOR')}
                className="px-3 sm:px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-full transition-all shadow-md shadow-emerald-500/20 touch-target"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-3">
              <button
                type="button"
                onClick={() => onSwitchView?.(activeRole === 'MARKETPLACE' ? user.role : 'MARKETPLACE')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all border touch-target max-w-[7rem] sm:max-w-none ${
                  activeRole !== 'MARKETPLACE'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${activeRole !== 'MARKETPLACE' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}
                />
                <span className="truncate">
                  {activeRole === 'MARKETPLACE' ? portalLabel : 'Market'}
                </span>
              </button>

              <button
                type="button"
                onClick={onNotificationsClick}
                className="relative p-2 text-slate-300 hover:text-white cursor-pointer rounded-full hover:bg-slate-800 transition-colors touch-target"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notificationsCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-emerald-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center">
                    {notificationsCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1.5 pl-2 rounded-full bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all text-xs touch-target"
                  aria-expanded={showUserDropdown}
                >
                  <div className="text-right hidden sm:block pr-1">
                    <div className="text-xs font-bold text-white leading-tight">{user.name.split(' ')[0]}</div>
                    <div className="text-[9px] text-emerald-400 font-mono uppercase font-semibold">{user.role}</div>
                  </div>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-emerald-500/50" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <div className="font-bold text-white text-xs truncate">{user.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchView?.('MARKETPLACE');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-medium touch-target"
                    >
                      Public Marketplace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchView?.(user.role);
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-medium touch-target"
                    >
                      My {user.role.replace('_', ' ')} Workspace
                    </button>
                    <div className="border-t border-slate-800 my-1" />
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors font-semibold flex items-center gap-2 touch-target"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile search row */}
      <div className="md:hidden border-t border-slate-800/80 px-4 py-2.5 bg-slate-950/60">
        <div className="flex items-center gap-2 max-w-7xl mx-auto">
          <div className="flex-1 flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-full pl-3 pr-2 py-1.5 min-w-0">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search shelves, cities, shops..."
              className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onOpenFilter}
            className="p-2.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 touch-target shrink-0"
            aria-label="Open filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
