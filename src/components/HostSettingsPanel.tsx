import React, { useEffect, useState } from 'react';
import { User, HostProfile } from '../types/index.js';
import { api } from '../lib/api.js';

interface HostSettingsPanelProps {
  user: User;
  hostProfile?: HostProfile | null;
  onUpdated: () => void;
}

export const HostSettingsPanel: React.FC<HostSettingsPanelProps> = ({ user, hostProfile, onUpdated }) => {
  const [payoutPhone, setPayoutPhone] = useState(hostProfile?.payoutPhone || hostProfile?.phone || user.phone || '');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setPayoutPhone(hostProfile?.payoutPhone || hostProfile?.phone || user.phone || '');
  }, [hostProfile, user.phone]);

  useEffect(() => {
    void api.getWithdrawals().then((res) => {
      if (res.success && res.data) setWithdrawals(res.data);
    });
  }, []);

  const savePayoutPhone = async () => {
    setMsg('');
    const res = await api.updateMe({ hostProfile: { payoutPhone } });
    if (res.success) {
      setMsg('Payout number saved.');
      onUpdated();
    } else {
      setMsg(res.error?.message || 'Save failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-lg">
        <h3 className="text-sm font-bold text-white mb-3">Payout mobile money</h3>
        <p className="text-xs text-slate-400 mb-3">Administrators use this number when processing your withdrawal to M-Pesa / Tigo / Airtel.</p>
        <input
          value={payoutPhone}
          onChange={(e) => setPayoutPhone(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white mb-3"
          placeholder="0754 123 456"
        />
        <button type="button" onClick={savePayoutPhone} className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold">
          Save payout number
        </button>
        {msg && <p className="text-xs text-emerald-400 mt-2">{msg}</p>}
        <p className="text-[11px] text-slate-500 mt-3">
          Full profile and password: header menu → <strong className="text-slate-400">Account settings</strong>.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-3">Withdrawal history</h3>
        {withdrawals.length === 0 ? (
          <p className="text-xs text-slate-500">No withdrawals yet. Request one from the Earnings tab.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-left border-b border-slate-800">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Amount</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2">Reference</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-slate-800/80 text-slate-300">
                    <td className="py-2 pr-2">{new Date(w.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-2 font-mono text-emerald-400">TZS {w.amountTzs?.toLocaleString()}</td>
                    <td className="py-2 pr-2">{w.status}</td>
                    <td className="py-2 font-mono text-slate-500">{w.payoutReference || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
