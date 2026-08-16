/**
 * Shelfy 🇹🇿 — Main Admin Platform Dashboard & Control Panel
 */

import React, { useState } from 'react';
import {
  Shield,
  Users,
  Store,
  DollarSign,
  TrendingUp,
  Sliders,
  FileText,
  UserCheck,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Building,
  Layers,
  Activity,
  Sparkles,
} from 'lucide-react';
import { User, AuditLog, PlatformSettings, Shop, Shelf, Booking } from '../types/index.js';

interface AdminDashboardProps {
  stats: any;
  users: User[];
  shops: Shop[];
  shelves: Shelf[];
  bookings: Booking[];
  auditLogs: AuditLog[];
  settings: PlatformSettings;
  onUpdateUserStatus: (userId: string, status: string) => void;
  onUpdateSettings: (settings: Partial<PlatformSettings>) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  users,
  shops,
  shelves,
  bookings,
  auditLogs,
  settings,
  onUpdateUserStatus,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'SHOPS' | 'BOOKINGS' | 'SETTINGS' | 'AUDIT'>('OVERVIEW');
  const [commissionInput, setCommissionInput] = useState<number>(settings?.commissionPercentage || 10);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">
      
      {/* Left Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 px-2 py-3 border-b border-slate-800 mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-extrabold text-sm tracking-wider text-white">ADMIN CONTROL</span>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'OVERVIEW', label: 'Platform Overview', icon: Activity },
              { id: 'USERS', label: 'User Management', icon: Users },
              { id: 'SHOPS', label: 'Shops & Shelves', icon: Store },
              { id: 'BOOKINGS', label: 'Bookings & Financials', icon: DollarSign },
              { id: 'SETTINGS', label: 'Commission & Rules', icon: Sliders },
              { id: 'AUDIT', label: 'Security Audit Logs', icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl mt-6 text-center text-xs text-slate-400">
          <div>Platform Currency: <span className="text-emerald-400 font-bold">TZS</span></div>
          <div>Commission: <span className="text-amber-400 font-bold">{settings?.commissionPercentage || 10}%</span></div>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        
        {/* Header Title */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-400" />
              Main Admin Platform Command
            </h1>
            <p className="text-xs text-slate-400 mt-1">Full platform authority over users, shops, shelves, payments, and system rules.</p>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">Total Users Registered</div>
                <div className="text-2xl font-black text-white">{stats?.usersCount || users.length}</div>
                <div className="text-[11px] text-emerald-400 font-medium mt-1">
                  Vendors: {stats?.vendorsCount || 2} | Hosts: {stats?.hostsCount || 2}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">Active Retail Shops</div>
                <div className="text-2xl font-black text-amber-400">{shops.length}</div>
                <div className="text-[11px] text-slate-400 font-medium mt-1">
                  Shelves Listed: {shelves.length}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">Total Gross GMV</div>
                <div className="text-2xl font-black text-emerald-400">
                  TZS {(stats?.totalRevenueTzs || 225000).toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-400 font-medium mt-1">PesaPal Verified Payments</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">Platform Commission Earnings</div>
                <div className="text-2xl font-black text-teal-300">
                  TZS {(stats?.totalCommissionsTzs || 22500).toLocaleString()}
                </div>
                <div className="text-[11px] text-teal-400 font-medium mt-1">
                  Rate: {settings?.commissionPercentage || 10}%
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Users */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" /> Platform User Overview
                </h3>
                <div className="space-y-3">
                  {users.slice(0, 5).map((u) => (
                    <div key={u.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.email} • {u.phone}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-400 border border-amber-500/20">
                          {u.role}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {u.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographic Active Regions */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-400" /> Geographic Retail Distribution
                </h3>
                <div className="space-y-3">
                  {[
                    { city: 'Dar es Salaam', count: 3, gmv: 'TZS 315,000' },
                    { city: 'Mwanza', count: 1, gmv: 'TZS 60,000' },
                    { city: 'Arusha', count: 1, gmv: 'TZS 80,000' },
                    { city: 'Zanzibar', count: 1, gmv: 'TZS 110,000' },
                  ].map((loc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                      <div className="font-bold text-white">{loc.city}</div>
                      <div className="text-right">
                        <div className="font-mono text-emerald-400 font-bold">{loc.gmv}</div>
                        <div className="text-[10px] text-slate-400">{loc.count} Active Shop(s)</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'USERS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-bold text-white mb-4">User Accounts & Role Permissions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-[10px] text-slate-400">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-400 border border-amber-500/20">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{u.phone}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.role !== 'ADMIN' && (
                          <div className="flex items-center gap-2">
                            {u.status === 'ACTIVE' ? (
                              <button
                                onClick={() => onUpdateUserStatus(u.id, 'SUSPENDED')}
                                className="px-2.5 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded font-bold text-[10px] flex items-center gap-1"
                              >
                                <Ban className="w-3 h-3" /> Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => onUpdateUserStatus(u.id, 'ACTIVE')}
                                className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded font-bold text-[10px] flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Activate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SHOPS & SHELVES */}
        {activeTab === 'SHOPS' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-base font-bold text-white mb-4">Platform Retail Shops ({shops.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shops.map((sp) => (
                  <div key={sp.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex gap-4">
                    <img src={sp.photos[0]} alt={sp.name} className="w-20 h-20 rounded-lg object-cover border border-slate-700" />
                    <div>
                      <div className="text-xs font-bold text-white">{sp.name}</div>
                      <div className="text-[11px] text-emerald-400">{sp.city} • {sp.address}</div>
                      <div className="text-[10px] text-slate-400 mt-1">Host: {sp.hostName}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">Verified</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">Traffic: {sp.footTrafficScore}/10</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SETTINGS */}
        {activeTab === 'SETTINGS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl">
            <h2 className="text-lg font-bold text-white mb-4">Platform Business Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">Platform Commission Percentage (%)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={5}
                    max={25}
                    value={commissionInput}
                    onChange={(e) => setCommissionInput(Number(e.target.value))}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-lg font-mono font-bold text-amber-400">{commissionInput}%</span>
                </div>
              </div>

              <button
                onClick={() => onUpdateSettings({ commissionPercentage: commissionInput })}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Save Platform Commission Rule
              </button>
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT LOGS */}
        {activeTab === 'AUDIT' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-bold text-white mb-4">Security & Operational Audit Log Trail</h2>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-mono text-emerald-400 font-bold mr-2">[{log.action}]</span>
                    <span className="text-white font-semibold">{log.userName}</span>
                    <span className="text-slate-400 ml-2">{log.details}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
