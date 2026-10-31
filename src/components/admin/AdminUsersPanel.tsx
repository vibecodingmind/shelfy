import React, { useEffect, useMemo, useState } from 'react';
import { api, setStoredToken } from '../../lib/api.js';
import { Shop, User } from '../../types/index.js';

export const AdminUsersPanel: React.FC<{
  users: User[];
  shops: Shop[];
  onUpdateUserStatus: (userId: string, status: string) => void;
  onRefresh?: () => void;
}> = ({ users, shops, onUpdateUserStatus, onRefresh }) => {
  const [clients, setClients] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', roles: 'HOST', businessName: '' });

  const load = () => {
    void api.getAdminClients({ q: q.trim() || undefined, role: roleFilter || undefined, status: statusFilter || undefined }).then((res) => {
      if (res.success && res.data) setClients(res.data);
    });
  };

  useEffect(() => {
    load();
  }, [roleFilter, statusFilter]);

  const shopsByHost = useMemo(() => {
    const map = new Map<string, Shop[]>();
    shops.forEach((s) => {
      const list = map.get(s.hostId) || [];
      list.push(s);
      map.set(s.hostId, list);
    });
    return map;
  }, [shops]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const roles = form.roles.split(',').map((r) => r.trim()).filter(Boolean);
    const res = await api.createAdminClient({
      name: form.name,
      email: form.email,
      phone: form.phone,
      roles,
      vendorProfile: roles.includes('VENDOR') ? { businessName: form.businessName, category: 'Food & Beverages', address: '', city: 'Dar es Salaam', region: 'Dar es Salaam' } : undefined,
      hostProfile: roles.includes('HOST') ? { businessName: form.businessName || form.name } : undefined,
    });
    if (res.success) {
      setMsg(res.data?.temporaryPassword ? `Created. Temp password: ${res.data.temporaryPassword}` : 'User created.');
      setForm({ name: '', email: '', phone: '', roles: 'HOST', businessName: '' });
      load();
      onRefresh?.();
    } else {
      setMsg(res.error?.message || 'Failed.');
    }
  };

  const loginAs = async (userId: string) => {
    const res = await api.adminImpersonate(userId);
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token, res.data.refreshToken);
      window.location.href = '/';
      return;
    }
    setMsg(res.error?.message || 'Could not sign in as user.');
  };

  const rows = clients.length ? clients : users.filter((u) => u.role !== 'ADMIN');

  return (
    <div className="space-y-6 animate-in fade-in">
      <p className="text-xs text-slate-400">
        <strong className="text-slate-200">Users</strong> are people (hosts, vendors, agents). They manage one or more <strong className="text-slate-200">client businesses</strong> depending on subscription limits.
      </p>
      {msg && <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">{msg}</div>}

      <form onSubmit={createUser} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid md:grid-cols-2 gap-3">
        <h2 className="md:col-span-2 text-sm font-bold text-white">Add user</h2>
        <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <input placeholder="Roles (HOST,VENDOR)" value={form.roles} onChange={(e) => setForm({ ...form, roles: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <input placeholder="Business / brand name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <button type="submit" className="md:col-span-2 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">Create user</button>
      </form>

      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users…" className="flex-1 min-w-[160px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white">
          <option value="">All roles</option>
          <option value="HOST">Host</option>
          <option value="VENDOR">Vendor</option>
          <option value="FIELD_AGENT">Field agent</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
        <button type="button" onClick={load} className="px-3 py-2 bg-slate-800 text-xs font-bold rounded-xl text-white">Search</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-xs">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Businesses</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((u) => u.role !== 'ADMIN')
              .map((u) => {
                const owned = shopsByHost.get(u.id) || [];
                return (
                  <tr key={u.id} className="border-t border-slate-800">
                    <td className="p-3">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-[10px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="p-3">{u.role}</td>
                    <td className="p-3 text-slate-300 max-w-[200px]">
                      {owned.length ? owned.map((s) => s.name).join(', ') : '—'}
                    </td>
                    <td className="p-3">{u.status}</td>
                    <td className="p-3 text-right space-x-2 whitespace-nowrap">
                      {u.role !== 'ADMIN' && (
                        <button type="button" className="text-teal-400 font-bold" onClick={() => void loginAs(u.id)}>
                          Login as
                        </button>
                      )}
                      <button type="button" className="text-emerald-400 font-bold" onClick={() => void api.adminVerifyClientEmail(u.id).then(load)}>Verify</button>
                      {u.status !== 'SUSPENDED' ? (
                        <button type="button" className="text-rose-400 font-bold" onClick={() => onUpdateUserStatus(u.id, 'SUSPENDED')}>Suspend</button>
                      ) : (
                        <button type="button" className="text-emerald-400 font-bold" onClick={() => onUpdateUserStatus(u.id, 'ACTIVE')}>Activate</button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
