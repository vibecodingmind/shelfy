import React, { useMemo, useState } from 'react';
import { api, setStoredToken } from '../../lib/api.js';
import { User } from '../../types/index.js';

export const AdminVendorsPanel: React.FC<{ users: User[] }> = ({ users }) => {
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  const vendors = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users
      .filter((u) => u.role === 'VENDOR')
      .filter((u) => {
        if (!needle) return true;
        return u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle);
      });
  }, [users, q]);

  const loginAs = async (userId: string) => {
    const res = await api.adminImpersonate(userId);
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token, res.data.refreshToken);
      window.location.href = '/';
      return;
    }
    setMsg(res.error?.message || 'Could not sign in as vendor.');
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <p className="text-xs text-slate-400">All vendor accounts on the marketplace. Use <strong className="text-slate-200">Login as</strong> to troubleshoot their dashboard.</p>
      {msg && <div className="text-xs text-rose-400">{msg}</div>}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors…" className="w-full max-w-md bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-xs">
          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="text-left p-3">Vendor</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id} className="border-t border-slate-800">
                <td className="p-3">
                  <div className="font-semibold text-white">{v.name}</div>
                  <div className="text-[10px] text-slate-500">{v.email}</div>
                </td>
                <td className="p-3 font-mono">{v.phone || '—'}</td>
                <td className="p-3">{v.status}</td>
                <td className="p-3 text-right">
                  <button type="button" className="text-teal-400 font-bold" onClick={() => void loginAs(v.id)}>Login as vendor</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!vendors.length && <p className="p-4 text-slate-500 text-sm">No vendors match your search.</p>}
      </div>
    </div>
  );
};
