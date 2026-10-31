import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export const AdminSubscriptionsPanel: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', priceTzs: 50000, entitlements: 'REDUCED_COMMISSION' });

  const load = () => {
    void api.getSubscriptionPlans().then((r) => r.success && setPlans(r.data || []));
    void api.getSubscriptions().then((r) => r.success && setSubs(r.data || []));
  };

  useEffect(() => {
    load();
  }, []);

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createSubscriptionPlan({
      name: form.name,
      priceTzs: Number(form.priceTzs),
      entitlements: form.entitlements.split(',').map((s) => s.trim()),
      billingPeriod: 'MONTHLY',
    });
    setForm({ name: '', priceTzs: 50000, entitlements: 'REDUCED_COMMISSION' });
    load();
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <form onSubmit={createPlan} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid md:grid-cols-3 gap-3">
        <input required placeholder="Plan name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <input required type="number" placeholder="Price TZS" value={form.priceTzs} onChange={(e) => setForm({ ...form, priceTzs: Number(e.target.value) })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <input placeholder="Entitlements (comma)" value={form.entitlements} onChange={(e) => setForm({ ...form, entitlements: e.target.value })} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white" />
        <button type="submit" className="md:col-span-3 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">Create plan</button>
      </form>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-2">Plans ({plans.length})</h3>
          {plans.map((p) => (
            <div key={p.id} className="text-xs text-slate-300 py-2 border-b border-slate-800">{p.name} — {p.priceTzs.toLocaleString()} TZS — {p.entitlements?.join(', ')}</div>
          ))}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-white mb-2">Active subscriptions ({subs.length})</h3>
          {subs.map((s) => (
            <div key={s.id} className="text-xs text-slate-300 py-2 border-b border-slate-800">{s.userId} → {s.planId} ({s.status})</div>
          ))}
        </div>
      </div>
    </div>
  );
};
