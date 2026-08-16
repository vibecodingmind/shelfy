/**
 * Shelfy 🇹🇿 — Authentication & Registration Modal
 */

import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Phone, Building, Store, ShoppingBag, Shield } from 'lucide-react';
import { UserRole } from '../types/index.js';
import { api } from '../lib/api.js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { user: any; token: string; vendorProfile?: any; hostProfile?: any }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+255 ');
  const [role, setRole] = useState<UserRole>('VENDOR');
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
      setErrorMsg(res.error?.message || 'Login failed.');
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 text-white">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-lg">
            🇹🇿
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {mode === 'LOGIN' ? 'Sign In to Shelfy' : 'Create Shelfy Account'}
            </h2>
            <p className="text-xs text-slate-400">Retail expansion platform for Tanzania</p>
          </div>
        </div>

        {errorMsg && (
          <div className="my-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'LOGIN' ? (
          <form onSubmit={handleLogin} className="space-y-4 text-xs mt-4">
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
                  placeholder="e.g. vendor@shelfy.co.tz"
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
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all mt-2"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            <div className="text-center pt-2 text-xs text-slate-400">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('REGISTER')}
                className="text-emerald-400 font-bold hover:underline"
              >
                Register
              </button>
            </div>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegister} className="space-y-3 text-xs mt-4">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Select Account Type</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'VENDOR', label: 'Vendor', icon: ShoppingBag },
                  { id: 'HOST', label: 'Shop Host', icon: Store },
                  { id: 'FIELD_AGENT', label: 'Agent', icon: UserIcon },
                ].map((r) => {
                  const Icon = r.icon;
                  const isSel = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id as UserRole)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1 ${
                        isSel
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" /> {r.label}
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                placeholder="+255 754 123 456"
              />
            </div>

            {role === 'VENDOR' && (
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Brand / Business Name</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                  placeholder="e.g. Kilimanjaro Organics Ltd"
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all mt-2"
            >
              {loading ? 'Creating Account...' : 'Register Account'}
            </button>

            <div className="text-center pt-2 text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className="text-emerald-400 font-bold hover:underline"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
