import React, { useEffect, useState } from 'react';
import { Building, Users } from 'lucide-react';
import { api } from '../../lib/api.js';
import { Booking, PlatformSettings, Shop, User } from '../../types/index.js';

const presets = [
  { id: 'today', days: 0, label: 'Today' },
  { id: '7d', days: 7, label: '7 days' },
  { id: '30d', days: 30, label: '30 days' },
  { id: '90d', days: 90, label: '90 days' },
];

function rangeForDays(days: number) {
  const end = new Date();
  const start = new Date();
  if (days > 0) start.setDate(start.getDate() - days);
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

type SnapshotProps = {
  stats?: any;
  users?: User[];
  shops?: Shop[];
  shelves?: { id: string }[];
  bookings?: Booking[];
  settings?: PlatformSettings;
};

export const AdminAnalyticsPanel: React.FC<SnapshotProps> = ({ stats, users = [], shops = [], shelves = [], bookings = [], settings }) => {
  const [preset, setPreset] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = presets.find((x) => x.id === preset);
    const range = p ? rangeForDays(p.days) : { from: customFrom, to: customTo };
    if (!range.from || !range.to) return;
    setLoading(true);
    void api.getAdminAnalytics(range).then((res) => {
      if (res.success) setData(res.data);
      setLoading(false);
    });
  }, [preset, customFrom, customTo]);

  const kpis = data?.kpis;
  const series = data?.series;

  const BarChart = ({ rows, valueKey, label }: { rows: { date: string; [k: string]: any }[]; valueKey: string; label: string }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
      <h3 className="text-sm font-bold text-white mb-3">{label}</h3>
      {!rows?.length ? (
        <p className="text-xs text-slate-500">No data in range.</p>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {rows.slice(-14).map((r) => {
            const max = Math.max(...rows.map((x) => Number(x[valueKey]) || 0), 1);
            const h = Math.round(((Number(r[valueKey]) || 0) / max) * 100);
            return (
              <div key={r.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-emerald-500/80 rounded-t" style={{ height: `${Math.max(h, 4)}%` }} title={`${r.date}: ${r[valueKey]}`} />
                <span className="text-[8px] text-slate-500 rotate-0 truncate w-full text-center">{r.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {(stats || users.length > 0) && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-slate-400 text-xs font-semibold mb-1">Total users</div>
              <div className="text-2xl font-black text-white">{stats?.usersCount ?? users.length}</div>
              <div className="text-[11px] text-emerald-400 mt-1">
                Vendors: {stats?.vendorsCount ?? 0} · Hosts: {stats?.hostsCount ?? 0}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-slate-400 text-xs font-semibold mb-1">Client businesses</div>
              <div className="text-2xl font-black text-amber-400">{shops.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Occupancy {stats?.occupancy?.paidPercent ?? 0}% ({stats?.occupancy?.windowDays ?? 30}d)</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-slate-400 text-xs font-semibold mb-1">Gross GMV</div>
              <div className="text-2xl font-black text-emerald-400">TZS {(stats?.totalRevenueTzs || 0).toLocaleString()}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-slate-400 text-xs font-semibold mb-1">Platform commission</div>
              <div className="text-2xl font-black text-teal-300">TZS {(stats?.totalCommissionsTzs || 0).toLocaleString()}</div>
              <div className="text-[11px] text-teal-400 mt-1">Rate: {settings?.commissionPercentage ?? 10}%</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-slate-400 text-xs font-semibold mb-1">Products</div>
              <div className="text-2xl font-black text-white">{stats?.productsCount ?? 0}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-slate-400 text-xs font-semibold mb-1">Available shelves</div>
              <div className="text-2xl font-black text-white">{stats?.availableShelves ?? 0}</div>
              <div className="text-[11px] text-slate-400 mt-1">of {stats?.shelvesCount ?? shelves.length} total</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-slate-400 text-xs font-semibold mb-1">Bookings</div>
              <div className="text-2xl font-black text-white">{stats?.bookingsCount ?? bookings.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Active {stats?.activeBookings ?? 0} · Pending {stats?.pendingBookings ?? 0}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="text-slate-400 text-xs font-semibold mb-1">Pending approvals</div>
              <div className="text-2xl font-black text-amber-300">{stats?.pendingVerifications ?? 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" /> Recent users
              </h3>
              <div className="space-y-3">
                {users.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-white">{u.name}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-amber-400">{u.role}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" /> GMV by city
              </h3>
              <div className="space-y-3">
                {(stats?.cityBreakdown || []).map((row: any) => (
                  <div key={row.city} className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <div className="font-bold text-white">{row.city}</div>
                      <div className="text-[10px] text-slate-400">{row.shops} shops</div>
                    </div>
                    <div className="font-mono text-emerald-400">TZS {(row.gmv || 0).toLocaleString()}</div>
                  </div>
                ))}
                {!stats?.cityBreakdown?.length && <p className="text-xs text-slate-500">No city breakdown yet.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2 items-end">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${preset === p.id ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'border-slate-700 text-slate-300'}`}
          >
            {p.label}
          </button>
        ))}
        <button type="button" onClick={() => setPreset('custom')} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${preset === 'custom' ? 'bg-emerald-500 text-slate-950' : 'border-slate-700 text-slate-300'}`}>
          Custom
        </button>
        {preset === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" />
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white" />
          </>
        )}
      </div>

      {loading && <p className="text-sm text-slate-400">Loading analytics…</p>}

      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            ['Users', kpis.totalUsers],
            ['Vendors', kpis.vendors],
            ['Hosts', kpis.hosts],
            ['Agents', kpis.agents],
            ['Products', kpis.products],
            ['Bookings', kpis.bookingsTotal],
            ['Pending bookings', kpis.pendingBookings],
            ['Revenue (range)', `${(kpis.revenueTzsInRange || 0).toLocaleString()} TZS`],
            ['Platform fees', `${(kpis.platformFeesTzs || 0).toLocaleString()} TZS`],
            ['Active subs', kpis.activeSubscriptions],
            ['Pending KYC', kpis.pendingVerifications],
            ['Pending inspections', kpis.pendingInspections],
          ].map(([label, val]) => (
            <div key={String(label)} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="text-[10px] text-slate-500 uppercase font-bold">{label}</div>
              <div className="text-lg font-black text-white mt-1">{val}</div>
            </div>
          ))}
        </div>
      )}

      {series && (
        <div className="grid md:grid-cols-2 gap-4">
          <BarChart rows={series.registrations} valueKey="count" label="Registrations" />
          <BarChart rows={series.revenueTzs} valueKey="amountTzs" label="Revenue (TZS)" />
          <BarChart rows={series.bookings} valueKey="count" label="Bookings" />
          <BarChart rows={series.paymentsSuccess} valueKey="count" label="Successful payments" />
        </div>
      )}
    </div>
  );
};
