/**
 * Shelfy 🇹🇿 — Global Airbnb-Style Navigation Header
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, LogOut, ChevronDown, UserRound, Store, SlidersHorizontal, X, Sun, Moon, MessageSquare } from 'lucide-react';
import { User, UserRole } from '../types/index.js';
import { useTheme } from '../theme/ThemeContext.js';

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
  filtersActive?: boolean;
  onClearFilters?: () => void;
  notificationsCount: number;
  messagesUnreadCount?: number;
  onNotificationsClick?: () => void;
  onMessagesClick?: () => void;
  onOpenSettings?: () => void;
  /** True when user is in vendor/host messages or standalone messages page */
  messagesNavActive?: boolean;
  /** Logo / brand — e.g. close shelf detail and return to marketplace browse */
  onHomeClick?: () => void;
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
  filtersActive = false,
  onClearFilters,
  notificationsCount,
  messagesUnreadCount = 0,
  onNotificationsClick,
  onMessagesClick,
  onOpenSettings,
  messagesNavActive = false,
  onHomeClick,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

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
    <header
      className="sticky top-0 z-40 bg-[var(--shelfy-bg)] text-[var(--shelfy-fg)] border-b border-[var(--shelfy-border)] backdrop-blur-md"
      style={{ boxShadow: 'var(--shelfy-header-shadow)' }}
    >
      <div className="w-full px-3 sm:px-5 h-16 sm:h-[4.5rem] flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          className="flex items-center gap-2 cursor-pointer select-none shrink-0"
          onClick={() => {
            onHomeClick?.();
            onSwitchView?.('MARKETPLACE');
          }}
          aria-label="Shelfy home"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
            <Store className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.25} />
          </div>
          <span className="font-black text-lg sm:text-2xl tracking-tighter bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
            shelfy
          </span>
        </button>

        <div className="flex-1 min-w-0 flex justify-center">
          <div
            className={`w-full md:max-w-sm lg:max-w-md flex items-center bg-[var(--shelfy-input-bg)] border ${
              isSearchFocused ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-[var(--shelfy-border)]'
            } rounded-full h-10 pl-3 pr-1`}
          >
            <Search className="w-4 h-4 text-[var(--shelfy-muted)] shrink-0" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search shelves, shops..."
              className="flex-1 min-w-0 bg-transparent text-sm text-[var(--shelfy-fg)] placeholder-[var(--shelfy-muted)] focus:outline-none font-medium ml-2"
              aria-label="Search shelves"
            />
            <button
              type="button"
              onClick={onOpenFilter}
              className={`ml-2 h-7 px-2 rounded-full flex items-center gap-1 text-[11px] font-bold shrink-0 ${
                filtersActive ? 'bg-emerald-500 text-slate-950' : 'bg-[var(--shelfy-elevated)] text-[var(--shelfy-fg)] hover:opacity-90'
              }`}
              aria-label="Filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filters</span>
            </button>
            {filtersActive && (
              <button
                type="button"
                onClick={onClearFilters}
                className="ml-1 h-7 w-7 rounded-full bg-[var(--shelfy-elevated)] text-[var(--shelfy-fg)] flex items-center justify-center shrink-0"
                aria-label="Clear filters"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--shelfy-border)] bg-[var(--shelfy-elevated)] text-[var(--shelfy-fg)] hover:opacity-90 transition-opacity touch-target"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          {!user ? (
            <>
              <button
                type="button"
                onClick={onMessagesClick}
                className="relative p-2 text-slate-300 hover:text-white cursor-pointer rounded-full hover:bg-slate-800 transition-colors touch-target"
                title="Messages"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--shelfy-elevated)] border border-[var(--shelfy-border)] hover:opacity-90 transition-all touch-target"
                aria-expanded={showUserDropdown}
                aria-label="Account"
              >
                <UserRound className="w-5 h-5 text-[var(--shelfy-fg)]" />
              </button>
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-44 bg-[var(--shelfy-card-bg)] border border-[var(--shelfy-border)] rounded-2xl shadow-2xl p-2 z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLoginClick('LOGIN');
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-semibold touch-target"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserDropdown(false);
                      onLoginClick('REGISTER', 'VENDOR');
                    }}
                    className="w-full text-left px-3 py-2.5 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-colors font-semibold touch-target"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
            </>
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
                onClick={onMessagesClick}
                className={`relative p-2 cursor-pointer rounded-full transition-colors touch-target ${
                  messagesNavActive
                    ? 'text-emerald-400 bg-emerald-500/15'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title="Messages"
                aria-current={messagesNavActive ? 'page' : undefined}
              >
                <MessageSquare className="w-5 h-5" />
                {messagesUnreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-sky-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center">
                    {messagesUnreadCount > 9 ? '9+' : messagesUnreadCount}
                  </span>
                )}
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
                    {notificationsCount > 9 ? '9+' : notificationsCount}
                  </span>
                )}
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1.5 pl-2 rounded-full bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all text-xs touch-target"
                  aria-expanded={showUserDropdown}
                  aria-label="Account"
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
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenSettings?.();
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-medium touch-target"
                    >
                      Account settings
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
    </header>
  );
};
