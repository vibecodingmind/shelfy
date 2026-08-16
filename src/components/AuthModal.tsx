/**
 * Shelfy 🇹🇿 — Authentication & Registration Modal with 1-Click Role Logins
 */

import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Phone, Building, Store, ShoppingBag, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types/index.js';
import { api } from '../lib/api.js';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'LOGIN' | 'REGISTER';
  initialRole?: UserRole;
  onClose: () => void;
  onSuccess: (data: { user: any; token: string; vendorProfile?: any; hostProfile?: any }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'LOGIN',
  initialRole = 'VENDOR',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+255 ');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Food & Beverages');

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const res = await api.login({ email, password });
    if (res.success && res.data) {
      onSuccess(res.data);
      onClose();
    } else {
      setErrorMsg(res.error?.message || 'Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  const handleQuickDemoLogin = async (demoEmail: string) => {
    setErrorMsg('');
    setLoading(true);
    const res = await api.login({ email: demoEmail, password: 'Password123!' });
    if (res.success && res.data) {
      onSuccess(res.data);
      onClose();
    } else {
      setErrorMsg(res.error?.message || 'Demo login failed.');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const res = await api.register({
      name,
      email,
      phone,
      password,
      role,
      businessName,
      category,
    });

    if (res.success && res.data) {
      onSuccess(res.data);
      onClose();
    } else {
      setErrorMsg(res.error?.message || 'Registration failed.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 relative shadow-2xl animate-in fade-in zoom-in-95 text-white max-h-[90vh] overflow-y-auto">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-slate-950 font-bold text-xl shadow-lg shadow-emerald-500/20 shrink-0">
            🇹🇿
          </div>
          <div>
            <h2 className="text-xl font-black text-white">
              {mode === 'LOGIN' ? 'Sign in to Shelfy' : 'Create your Shelfy account'}
            </h2>
            <p className="text-xs text-slate-400">Tanzania's retail shelf marketplace & shop network</p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setErrorMsg(''); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'LOGIN'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setErrorMsg(''); }}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              mode === 'REGISTER'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* 1-CLICK DEMO LOGIN ACCOUNTS (Visible on Login tab) */}
        {mode === 'LOGIN' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Instant Demo Role Access
              </span>
              <span className="text-[10px] text-slate-400">1-click login</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Host Demo */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickDemoLogin('host@shelfy.co.tz')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left transition-all group flex items-start gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Store className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-blue-400 flex items-center gap-1">
                    Shop Host <span className="text-[10px] text-blue-400 font-mono font-normal">→</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Juma Mkwawa (Shops)</div>
                </div>
              </button>

              {/* Vendor Demo */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickDemoLogin('vendor@shelfy.co.tz')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 rounded-xl text-left transition-all group flex items-start gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-amber-400 flex items-center gap-1">
                    Brand Vendor <span className="text-[10px] text-amber-400 font-mono font-normal">→</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Amina (Kilimanjaro)</div>
                </div>
              </button>

              {/* Admin Demo */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickDemoLogin('admin@shelfy.co.tz')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-left transition-all group flex items-start gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-emerald-400 flex items-center gap-1">
                    Platform Admin <span className="text-[10px] text-emerald-400 font-mono font-normal">→</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Governance & Categories</div>
                </div>
              </button>

              {/* Field Agent Demo */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickDemoLogin('agent@shelfy.co.tz')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 rounded-xl text-left transition-all group flex items-start gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white group-hover:text-purple-400 flex items-center gap-1">
                    Field Agent <span className="text-[10px] text-purple-400 font-mono font-normal">→</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">Baraka (Audits & Visits)</div>
                </div>
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-500">
                <span className="bg-slate-900 px-3">or sign in with password</span>
              </div>
            </div>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'LOGIN' ? (
          <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. yourname@domain.co.tz"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all mt-2 cursor-pointer"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegister} className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">I want to join as a:</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'VENDOR', label: 'Brand Vendor', desc: 'Rent shelves for products', icon: ShoppingBag },
                  { id: 'HOST', label: 'Shop Host', desc: 'Monetize store space', icon: Store },
                ].map((r) => {
                  const Icon = r.icon;
                  const isSel = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as UserRole)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                        isSel
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="e.g. Amina Salum"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="amina@kilimanjaro.co.tz"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Phone Number (Tanzania)</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="+255 754 123 456"
              />
            </div>

            {role === 'VENDOR' && (
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Brand / Product Business Name</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Kilimanjaro Organics Ltd"
                />
              </div>
            )}

            {role === 'HOST' && (
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Supermarket / Retail Shop Name</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Masaki Fresh Express Supermarket"
                />
              </div>
            )}

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all mt-2 cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Register Account'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
