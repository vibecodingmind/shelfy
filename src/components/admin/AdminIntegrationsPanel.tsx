import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';

export const AdminIntegrationsPanel: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    void api.getAdminIntegrationsConfig().then((r) => r.success && setConfig(r.data));
    void api.getAdminIntegrationLogs().then((r) => r.success && setLogs(r.data || []));
  }, []);

  const createClient = async () => {
    const res = await api.createApiClient({ name: 'External integration', scopes: ['read:shelves'] });
    if (res.success && res.data?.apiKey) {
      setApiKey(res.data.apiKey);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      {!config?.encryptionConfigured && (
        <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          Set INTEGRATION_ENCRYPTION_KEY on the server to store credentials from this panel.
        </div>
      )}
      {config?.status && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
          <div className="font-bold text-white">Connection status</div>
          <div className="text-slate-300">Email: {config.status.email?.configured ? 'Configured' : 'Not configured'}</div>
          <div className="text-slate-300">Azam Pay: {config.status.azampay?.configured ? 'Configured' : 'Not configured'} ({config.status.azampay?.environment})</div>
          <div className="text-slate-300">Gemini: {config.gemini?.configured ? 'Configured' : 'Not configured'}</div>
        </div>
      )}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <h3 className="text-sm font-bold text-white mb-2">API clients</h3>
        <button type="button" onClick={createClient} className="px-3 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl">Create API client</button>
        {apiKey && <p className="mt-2 text-xs text-amber-300 break-all">New key (copy now): {apiKey}</p>}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-h-64 overflow-y-auto">
        <h3 className="text-sm font-bold text-white mb-2">Integration logs</h3>
        {logs.slice(0, 30).map((l) => (
          <div key={l.id} className="text-[10px] text-slate-400 py-1 border-b border-slate-800">
            {l.createdAt} {l.provider} {l.operation} {l.success ? 'OK' : 'FAIL'} {l.errorMessage || ''}
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500">Live admin WebRTC inspection join is not available — field agents submit photos and GPS via the agent app.</p>
    </div>
  );
};
