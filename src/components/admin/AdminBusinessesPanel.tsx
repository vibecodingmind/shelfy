import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Shop, User } from '../../types/index.js';
import { AdminShopImporter } from './AdminShopImporter.js';

type Tab = 'list' | 'add' | 'import';

export const AdminBusinessesPanel: React.FC<{ users: User[]; onRefresh?: () => void }> = ({ users, onRefresh }) => {
  const [tab, setTab] = useState<Tab>('list');
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [listingFilter, setListingFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: 'Dar es Salaam',
    region: 'Dar es Salaam',
    hostUserId: '',
    shopType: 'SUPERMARKET',
  });

  const load = () => {
    const params: Record<string, string> = {};
    if (q.trim()) params.q = q.trim();
    if (listingFilter) params.listing = listingFilter;
    if (verificationFilter) params.verification = verificationFilter;
    void api.getAdminBusinesses(params).then((r) => r.success && setRows(r.data || []));
  };

  useEffect(() => {
    load();
  }, [listingFilter, verificationFilter]);

  const createShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hostUserId) {
      setMsg('Select a host user.');
      return;
    }
    const res = await api.createShop({
      name: form.name,
      address: form.address,
      city: form.city,
      region: form.region,
      hostId: form.hostUserId,
      shopType: form.shopType,
      photos: [],
      latitude: -6.7924,
      longitude: 39.2083,
      description: 'Added by platform admin.',
    });
    if (res.success) {
      setMsg('Business (shop) created as draft.');
      setForm({ name: '', address: '', city: 'Dar es Salaam', region: 'Dar es Salaam', hostUserId: '', shopType: 'SUPERMARKET' });
      load();
      onRefresh?.();
    } else {
      setMsg(res.error?.message || 'Create failed.');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <p className="text-xs text-slate-400">
        <strong className="text-slate-200">Clients</strong> are retail businesses (shops, supermarkets, markets). Assign a <strong className="text-slate-200">host user</strong> under Users to manage them.
      </p>
      {msg && <div className="text-xs font-bold text-emerald-400">{msg}</div>}

      <div className="flex flex-wrap gap-2">
        {(['list', 'add', 'import'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${tab === t ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'border-slate-700 text-slate-300'}`}
          >
            {t === 'list' ? 'All businesses' : t === 'add' ? 'Add business' : 'Import (Google)'}
          </button>
        ))}
      </div>

      {tab === 'import' && (
        <AdminShopImporter
          hosts={users.filter((u) => u.role === 'HOST' || u.role === 'VENDOR')}
          onDone={() => {
            load();
            onRefresh?.();
            setMsg('Import finished.');
          }}
        />
      )}

      {tab === 'add' && (
        <form onSubmit={createShop} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid md:grid-cols-2 gap-3 max-w-2xl">
          <select required value={form.hostUserId} onChange={(e) => setForm({ ...form, hostUserId: e.target.value })} className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
            <option value="">Assign host user…</option>
            {users.filter((u) => u.role !== 'ADMIN' && u.role !== 'FIELD_AGENT').map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email}) — {u.role}</option>
            ))}
          </select>
          <input required placeholder="Business / shop name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          <input required placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
          <select value={form.shopType} onChange={(e) => setForm({ ...form, shopType: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
            <option value="SUPERMARKET">Supermarket</option>
            <option value="MINI_MARKET">Mini market</option>
            <option value="PHARMACY">Pharmacy</option>
            <option value="CONVENIENCE">Convenience</option>
            <option value="SPECIALTY">Specialty</option>
          </select>
          <button type="submit" className="md:col-span-2 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">Create business</button>
        </form>
      )}

      {tab === 'list' && (
        <>
          <div className="flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, address, host…" className="flex-1 min-w-[160px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
            <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white">
              <option value="">All verification</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select value={listingFilter} onChange={(e) => setListingFilter(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white">
              <option value="">All listing</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Listed / published</option>
              <option value="UNDER_REVIEW">Under review</option>
            </select>
            <button type="button" onClick={load} className="px-3 py-2 bg-slate-800 text-xs font-bold rounded-xl text-white">Search</button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="text-left p-3">Business</th>
                  <th className="text-left p-3">City</th>
                  <th className="text-left p-3">Host user</th>
                  <th className="text-left p-3">Verified</th>
                  <th className="text-left p-3">Listed</th>
                  <th className="text-left p-3">Shelves</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s: Shop & { listingStatus?: string; shelfCount?: number; host?: User }) => (
                  <tr key={s.id} className="border-t border-slate-800 text-slate-300">
                    <td className="p-3">
                      <div className="font-bold text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]">{s.address}</div>
                    </td>
                    <td className="p-3">{s.city}</td>
                    <td className="p-3">{s.hostName || s.host?.name || s.hostId}</td>
                    <td className="p-3">{s.verificationStatus}</td>
                    <td className="p-3">{s.listingStatus || 'DRAFT'}</td>
                    <td className="p-3">{s.shelfCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="p-4 text-slate-500 text-sm">No businesses yet. Add or import shops.</p>}
          </div>
        </>
      )}
    </div>
  );
};
