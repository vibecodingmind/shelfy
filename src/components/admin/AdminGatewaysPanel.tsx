import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export const AdminGatewaysPanel: React.FC<{ onNotify?: (msg: string) => void }> = ({ onNotify }) => {
  const [gateways, setGateways] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [secrets, setSecrets] = useState({
    AZAMPAY_APP_NAME: '',
    AZAMPAY_CLIENT_ID: '',
    AZAMPAY_CLIENT_SECRET: '',
    AZAMPAY_API_KEY: '',
  });
  const [environment, setEnvironment] = useState<'sandbox' | 'live'>('sandbox');

  const load = () => void api.getAdminGateways().then((res) => res.success && setGateways(res.data || []));

  useEffect(() => {
    load();
  }, []);

  const azam = gateways.find((g) => g.provider === 'AZAMPAY');

  const save = async () => {
    const res = await api.updateAdminGateway('AZAMPAY', {
      enabled: true,
      isDefault: true,
      environment,
      secrets: Object.fromEntries(Object.entries(secrets).filter(([, v]) => v.trim())),
    });
    const text = res.success ? 'Gateway saved. Secrets encrypted at rest.' : res.error?.message || 'Save failed.';
    setMsg(text);
    onNotify?.(text);
    if (res.success) setSecrets({ AZAMPAY_APP_NAME: '', AZAMPAY_CLIENT_ID: '', AZAMPAY_CLIENT_SECRET: '', AZAMPAY_API_KEY: '' });
    load();
  };

  const test = async () => {
    const res = await api.testAdminGateway('AZAMPAY');
    const text = res.success ? `Connection OK (${res.data?.durationMs}ms)` : res.error?.message || 'Test failed.';
    setMsg(text);
    onNotify?.(text);
    load();
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {msg && <div className="text-xs text-emerald-400 font-bold">{msg}</div>}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-white">Azam Pay</h2>
        <p className="text-xs text-slate-400">Credentials are stored encrypted. Values are never returned after save.</p>
        <select value={environment} onChange={(e) => setEnvironment(e.target.value as 'sandbox' | 'live')} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
          <option value="sandbox">Sandbox</option>
          <option value="live">Production (live)</option>
        </select>
        {Object.keys(secrets).map((key) => (
          <input
            key={key}
            type="password"
            placeholder={`${key} (leave blank to keep)`}
            value={(secrets as any)[key]}
            onChange={(e) => setSecrets({ ...secrets, [key]: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
          />
        ))}
        {azam?.config?.lastTestMessage && (
          <p className="text-[10px] text-slate-500">Last test: {azam.config.lastTestOk ? 'OK' : 'Failed'} — {azam.config.lastTestMessage}</p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={save} className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">Save</button>
          <button type="button" onClick={test} className="px-4 py-2 border border-slate-600 text-slate-200 font-bold text-xs rounded-xl">Test connection</button>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-xs font-bold text-slate-400 mb-2">Other providers (not integrated)</h3>
        {gateways.filter((g) => !g.integrated).map((g) => (
          <div key={g.provider} className="text-xs text-slate-500 py-1">{g.name} — not available until adapter is implemented.</div>
        ))}
      </div>
    </div>
  );
};
