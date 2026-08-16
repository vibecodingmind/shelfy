/**
 * Shelfy 🇹🇿 — Global Airbnb-Style Navigation Header
 */

import React, { useState } from 'react';
import { Store, Search, Bell, LogOut, User as UserIcon, Shield, ShoppingBag, SlidersHorizontal, ChevronDown } from 'lucide-react';
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
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* 1. Left: Brand Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          onClick={() => {
            if (onSwitchView) onSwitchView('MARKETPLACE');
          }}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-400 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-emerald-500/20">
            🇹🇿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-2xl tracking-tighter bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                shelfy
              </span>
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Tanzania
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-1 hidden sm:block font-medium">Retail Shelf Marketplace</p>
          </div>
        </div>

        {/* 2. Center: Airbnb-Style Pill Search Bar */}
        <div className="hidden md:flex items-center justify-center flex-1 max-w-xl mx-4">
          <div
            className={`w-full flex items-center bg-slate-950/80 border ${
              isSearchFocused ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-700/80 hover:border-slate-600'
            } rounded-full py-1.5 pl-5 pr-2 shadow-lg transition-all duration-200`}
          >
            <div className="flex-1 flex items-center divide-x divide-slate-800 text-xs">
              
              {/* Search Segment 1: Location & Keywords */}
              <div className="pr-3 flex-1 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Dar es Salaam, Masaki, Kariakoo..."
                  className="w-full bg-transparent text-white placeholder-slate-400 text-xs focus:outline-none font-medium"
                />
              </div>

              {/* Search Segment 2: Anywhere in Tanzania */}
              <div className="px-3 hidden lg:block text-slate-300 font-semibold cursor-pointer hover:text-white shrink-0">
                Any Shelf Type
              </div>

              {/* Search Segment 3: Filter Trigger */}
              <div className="pl-3 pr-2 hidden sm:block">
                <button
                  type="button"
                  onClick={onOpenFilter}
                  className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-semibold text-xs transition-colors"
                >
                  <SlidersHorizontal className="w-3 h-3" /> Filters
                </button>
              </div>
            </div>

            {/* Search Action Button */}
            <button
              type="button"
              onClick={onOpenFilter}
              className="w-9 h-9 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer ml-2"
              title="Search Shelves"
            >
              <Search className="w-4 h-4 text-slate-950 font-bold" />
            </button>
          </div>
        </div>

        {/* 3. Right: Authentication / Profile / Host Link */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* If NOT logged in */}
          {!user ? (
            <div className="flex items-center gap-2">
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
                className="px-4 py-2 text-xs font-bold text-slate-200 hover:text-white rounded-full hover:bg-slate-800 border border-slate-700/80 transition-colors"
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => onLoginClick('REGISTER', 'VENDOR')}
                className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded-full transition-all shadow-md shadow-emerald-500/20"
              >
                Sign Up
              </button>
            </div>
          ) : (
            /* If Logged in */
            <div className="flex items-center gap-3">
              
              {/* Active Role Portal Navigation Pill */}
              <button
                type="button"
                onClick={() => {
                  if (onSwitchView) {
                    onSwitchView(activeRole === 'MARKETPLACE' ? user.role : 'MARKETPLACE');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  activeRole !== 'MARKETPLACE'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
                }`}
              >
                {activeRole === 'MARKETPLACE' ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Go to {user.role === 'ADMIN' ? 'Admin Panel' : `${user.role} Portal`}</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>View Marketplace</span>
                  </>
                )}
              </button>

              {/* Notification Bell */}
              <div className="relative p-2 text-slate-300 hover:text-white cursor-pointer rounded-full hover:bg-slate-800 transition-colors">
                <Bell className="w-5 h-5" />
                {notificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 text-slate-950 text-[10px] font-extrabold rounded-full flex items-center justify-center">
                    {notificationsCount}
                  </span>
                )}
              </div>

              {/* User Avatar & Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1.5 pl-2 rounded-full bg-slate-800 border border-slate-700 hover:border-slate-600 transition-all text-xs"
                >
                  <div className="text-right hidden sm:block pr-1">
                    <div className="text-xs font-bold text-white leading-tight">{user.name.split(' ')[0]}</div>
                    <div className="text-[9px] text-emerald-400 font-mono uppercase font-semibold">
                      {user.role}
                    </div>
                  </div>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-emerald-500/50" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <div className="font-bold text-white text-xs truncate">{user.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{user.email}</div>
                      <div className="mt-1.5 inline-block text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono font-bold">
                        Role: {user.role}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSwitchView) onSwitchView('MARKETPLACE');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-medium"
                    >
                      Public Marketplace
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (onSwitchView) onSwitchView(user.role);
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-medium"
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
                      className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors font-semibold flex items-center gap-2"
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
