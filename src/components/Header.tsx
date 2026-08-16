/**
 * Shelfy 🇹🇿 — Global Navigation Header & Quick Demo Switcher
 */

import React, { useState } from 'react';
import { Store, UserCheck, Shield, ShoppingBag, MapPin, Bell, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { User } from '../types/index.js';

interface HeaderProps {
  user: User | null;
  activeRole: string;
  onLoginClick: () => void;
  onDemoLogin: (email: string) => void;
  onLogout: () => void;
  notificationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeRole,
  onLoginClick,
  onDemoLogin,
  onLogout,
  notificationsCount,
}) => {
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-emerald-500/20">
            🇹🇿
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                SHELFY
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Tanzania
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Retail Expansion Platform</p>
          </div>
        </div>

        {/* Quick Demo Role Switcher & User State */}
        <div className="flex items-center gap-3">
          
          {/* Quick Demo Role Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDemoMenu(!showDemoMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-amber-500/30 transition-all shadow-sm"
              title="Quickly test as any role"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden md:inline">Demo Persona:</span>
              <span className="font-semibold text-white capitalize">{activeRole || 'Select Role'}</span>
            </button>

            {showDemoMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">
                  Switch Role Persona
                </div>
                <button
                  onClick={() => { onDemoLogin('admin@shelfy.co.tz'); setShowDemoMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-lg transition-all"
                >
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <div className="font-semibold">Main Admin</div>
                    <div className="text-[10px] text-slate-400">Platform control & verifications</div>
                  </div>
                </button>
                <button
                  onClick={() => { onDemoLogin('vendor@shelfy.co.tz'); setShowDemoMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-amber-500/10 hover:text-amber-400 rounded-lg transition-all"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <div className="text-left">
                    <div className="font-semibold">Vendor (Amina Salum)</div>
                    <div className="text-[10px] text-slate-400">Kilimanjaro Organics Ltd</div>
                  </div>
                </button>
                <button
                  onClick={() => { onDemoLogin('host@shelfy.co.tz'); setShowDemoMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-blue-500/10 hover:text-blue-400 rounded-lg transition-all"
                >
                  <Store className="w-4 h-4 text-blue-400" />
                  <div className="text-left">
                    <div className="font-semibold">Host (Juma Mkwawa)</div>
                    <div className="text-[10px] text-slate-400">Juma Mini Markets & Retail</div>
                  </div>
                </button>
                <button
                  onClick={() => { onDemoLogin('agent@shelfy.co.tz'); setShowDemoMenu(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-purple-500/10 hover:text-purple-400 rounded-lg transition-all"
                >
                  <UserCheck className="w-4 h-4 text-purple-400" />
                  <div className="text-left">
                    <div className="font-semibold">Field Agent (Baraka)</div>
                    <div className="text-[10px] text-slate-400">Mobile visits & AI shelf photo audit</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* User Profile / Notifications */}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="relative p-2 text-slate-300 hover:text-white cursor-pointer">
                <Bell className="w-5 h-5" />
                {notificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-full flex items-center justify-center">
                    {notificationsCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-white">{user.name}</div>
                  <div className="text-[10px] text-emerald-400 font-mono font-medium uppercase tracking-wide">
                    {user.role}
                  </div>
                </div>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full border border-emerald-500/40 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                )}
                <button
                  onClick={onLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-md shadow-emerald-500/20"
            >
              Sign In / Register
            </button>
          )}

        </div>

      </div>
    </header>
  );
};
