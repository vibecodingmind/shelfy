import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { User } from '../../types/index.js';

export const AdminClientsPanel: React.FC = () => {
  const [clients, setClients] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', roles: 'VENDOR', businessName: '' });

  const load = () => {
    void api.getAdminClients({ q }).then((res) => {
      if (res.success && res.data) setClients(res.data);
    });
  };

  useEffect(() => {
    load();
  }, [q]);

  const createClient = async (e: React.FormEvent) => {
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
      setMsg(res.data?.temporaryPassword ? `Created. Temp password: ${res.data.temporaryPassword}` : 'Client created.');
      setForm({ name: '', email: '', phone: '', roles: 'VENDOR', businessName: '' });
      load();
    } else {
      setMsg(res.error?.message || 'Failed.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {msg && <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">{msg}</div>}

      <form onSubmit={createClient} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid md:grid-cols-2 gap-3">
        <h2 className="md:col-span-2 text-sm font-bold text-white">Add client</h2>
        <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <input placeholder="Roles (e.g. VENDOR,HOST)" value={form.roles} onChange={(e) => setForm({ ...form, roles: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <input placeholder="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="md:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <button type="submit" className="md:col-span-2 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">Create client</button>
      </form>

      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clients…" className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <button
          type="button"
          className="px-3 py-2 text-xs font-bold border border-slate-700 rounded-xl text-slate-300"
          onClick={() => {
            const token = localStorage.getItem('shelfy_auth_token');
            void fetch('/api/admin/clients/export.csv', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
              .then((r) => r.text())
              .then((csv) => {
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'shelfy-clients.csv';
                a.click();
              });
          }}
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-xs">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Role</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-t border-slate-800">
                <td className="p-3 text-white font-semibold">{c.name}</td>
                <td className="p-3 text-slate-300">{c.email}</td>
                <td className="p-3">{c.role}</td>
                <td className="p-3">{c.status}</td>
                <td className="p-3 text-right space-x-2">
                  <button type="button" className="text-emerald-400 font-bold" onClick={() => void api.adminVerifyClientEmail(c.id).then(load)}>Verify email</button>
                  <button type="button" className="text-amber-400 font-bold" onClick={() => void api.adminResetClientPassword(c.id).then(() => setMsg('Reset initiated.'))}>Reset pwd</button>
                  {c.status !== 'SUSPENDED' ? (
                    <button type="button" className="text-rose-400 font-bold" onClick={() => void api.updateUserStatus(c.id, 'SUSPENDED').then(load)}>Suspend</button>
                  ) : (
                    <button type="button" className="text-emerald-400 font-bold" onClick={() => void api.updateUserStatus(c.id, 'ACTIVE').then(load)}>Activate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
