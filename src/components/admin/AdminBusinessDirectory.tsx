import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutGrid,
  MapPinned,
  Building2,
  UserX,
  FileQuestion,
  ShieldCheck,
  Tags,
  History,
  Settings,
  Loader2,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { AdminDirectoryImporter } from './AdminDirectoryImporter.js';
type DirectoryView =
  | 'overview'
  | 'importer'
  | 'all'
  | 'unclaimed'
  | 'claims'
  | 'verification'
  | 'categories'
  | 'history'
  | 'settings';

const NAV: { id: DirectoryView; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Directory Overview', icon: LayoutGrid },
  { id: 'importer', label: 'Google Maps Importer', icon: MapPinned },
  { id: 'all', label: 'All Businesses', icon: Building2 },
  { id: 'unclaimed', label: 'Unclaimed Businesses', icon: UserX },
  { id: 'claims', label: 'Claim Requests', icon: FileQuestion },
  { id: 'verification', label: 'Business Verification', icon: ShieldCheck },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'history', label: 'Import History', icon: History },
  { id: 'settings', label: 'Directory Settings', icon: Settings },
];

export const AdminBusinessDirectory: React.FC = () => {
  const [view, setView] = useState<DirectoryView>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadOverview = useCallback(() => {
    void api.getAdminDirectoryOverview().then((r) => r.success && setOverview(r.data));
  }, []);

  const loadBusinesses = useCallback((params?: Record<string, string>) => {
    setLoading(true);
    void api.getAdminDirectoryBusinesses(params).then((r) => {
      if (r.success) setBusinesses(r.data || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (view === 'overview') loadOverview();
    if (view === 'all') loadBusinesses();
    if (view === 'unclaimed') loadBusinesses({ claimStatus: 'UNCLAIMED' });
    if (view === 'verification') loadBusinesses({ verificationStatus: 'PENDING_VERIFICATION' });
    if (view === 'claims') void api.getAdminDirectoryClaims().then((r) => r.success && setClaims(r.data || []));
    if (view === 'history') void api.getAdminDirectoryImportJobs().then((r) => r.success && setJobs(r.data || []));
    if (view === 'settings') void api.getAdminDirectorySettings().then((r) => r.success && setSettings(r.data));
  }, [view, loadBusinesses, loadOverview]);

  const businessTable = (rows: any[]) => (
    <div className="overflow-x-auto border border-slate-800 rounded-2xl">
      <table className="w-full text-xs">
        <thead className="bg-slate-900 text-slate-400">
          <tr>
            <th className="text-left p-2">Place ID</th>
            <th className="text-left p-2">Region</th>
            <th className="text-left p-2">City</th>
            <th className="text-left p-2">Category</th>
            <th className="text-left p-2">Claim</th>
            <th className="text-left p-2">Marketplace</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-slate-800 text-slate-300">
              <td className="p-2 font-mono text-[10px]">{b.googlePlaceId}</td>
              <td className="p-2">{b.region}</td>
              <td className="p-2">{b.city}</td>
              <td className="p-2">{b.directoryCategory}</td>
              <td className="p-2">{b.claimStatus}</td>
              <td className="p-2">{b.marketplaceStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="p-4 text-slate-500 text-sm">No directory businesses yet. Use Google Maps Importer.</p>}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 animate-in fade-in">
      <nav className="lg:w-56 shrink-0 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={`shrink-0 lg:w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold border ${
                view === item.id
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 min-w-0 space-y-4">
        {msg && <div className="text-xs text-emerald-400 font-bold">{msg}</div>}

        {view === 'overview' && overview && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['Total businesses', overview.total],
              ['Unclaimed', overview.unclaimed],
              ['Claimed', overview.claimed],
              ['Pending claims', overview.pendingClaims],
              ['Directory only', overview.directoryOnly],
              ['Active marketplace', overview.activeMarketplace],
            ].map(([label, val]) => (
              <div key={String(label)} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-[10px] text-slate-500 uppercase">{label}</div>
                <div className="text-2xl font-black text-white">{val}</div>
              </div>
            ))}
            <div className="sm:col-span-2 lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs text-slate-400">
              <div className="font-bold text-white mb-2">Places API usage</div>
              <div>Today: {overview.placesApi?.usageToday} / {overview.placesApi?.dailyQuotaLimit}</div>
              <div>Month: {overview.placesApi?.usageMonth} / {overview.placesApi?.monthlyQuotaLimit}</div>
              {overview.placesApi?.quotaWarning && (
                <div className="text-amber-400 mt-2">Approaching configured quota — refine searches or raise limits in Directory Settings.</div>
              )}
            </div>
          </div>
        )}

        {view === 'importer' && <AdminDirectoryImporter onImported={() => { loadOverview(); setMsg('Import completed.'); }} />}

        {(view === 'all' || view === 'unclaimed' || view === 'verification') && (
          <>
            {loading && <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />}
            {!loading && view === 'verification' ? (
              <div className="space-y-2">
                {businesses.map((b) => (
                  <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs flex flex-wrap justify-between gap-2">
                    <div>
                      <div className="font-mono text-slate-400">{b.googlePlaceId}</div>
                      <div className="text-white">{b.city} · {b.verificationStatus} · {b.marketplaceStatus}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="px-2 py-1 bg-emerald-500 text-slate-950 rounded-lg font-bold"
                        onClick={async () => {
                          await api.updateAdminDirectoryVerification(b.id, { verificationStatus: 'VERIFIED', marketplaceStatus: 'DIRECTORY_ONLY' });
                          setMsg('Marked verified.');
                          loadBusinesses({ verificationStatus: 'PENDING_VERIFICATION' });
                        }}
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 border border-slate-600 rounded-lg"
                        onClick={async () => {
                          await api.updateAdminDirectoryVerification(b.id, { verificationStatus: 'REJECTED' });
                          setMsg('Rejected.');
                          loadBusinesses({ verificationStatus: 'PENDING_VERIFICATION' });
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
                {!businesses.length && businessTable(businesses)}
              </div>
            ) : (
              !loading && businessTable(businesses)
            )}
          </>
        )}

        {view === 'claims' && (
          <div className="space-y-2">
            {claims.map((c) => (
              <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs flex flex-wrap justify-between gap-2">
                <div>
                  <div className="text-white font-bold">{c.requesterName}</div>
                  <div className="text-slate-500">{c.requesterEmail} · {c.status}</div>
                </div>
                {c.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 bg-emerald-500 text-slate-950 rounded-lg font-bold"
                      onClick={async () => {
                        await api.reviewDirectoryClaim(c.id, { status: 'APPROVED' });
                        setMsg('Claim approved.');
                        void api.getAdminDirectoryClaims().then((r) => r.success && setClaims(r.data || []));
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 border border-slate-600 rounded-lg"
                      onClick={async () => {
                        await api.reviewDirectoryClaim(c.id, { status: 'REJECTED' });
                        setMsg('Claim rejected.');
                        void api.getAdminDirectoryClaims().then((r) => r.success && setClaims(r.data || []));
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!claims.length && <p className="text-slate-500 text-sm">No claim requests.</p>}
          </div>
        )}

        {view === 'categories' && settings?.categories && (
          <div className="grid sm:grid-cols-2 gap-2">
            {Object.entries(settings.categories).map(([key, meta]: [string, any]) => (
              <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs">
                <div className="font-bold text-white">{meta.label}</div>
                <div className="text-slate-500 font-mono">{key}</div>
                <div className="text-slate-400 mt-1">Google types: {meta.includedTypes?.join(', ')}</div>
              </div>
            ))}
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-3">
            {jobs.map((j) => (
              <div key={j.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs">
                <div className="font-bold text-white">{j.region} · {j.directoryCategory} · {j.city}</div>
                <div className="text-slate-500">{j.createdAt} · {j.status}</div>
                {j.summary && (
                  <div className="mt-2 text-slate-300">
                    Created {j.summary.created}, duplicates {j.summary.duplicates}, failed {j.summary.failed}, review {j.summary.needsReview}
                  </div>
                )}
              </div>
            ))}
            {!jobs.length && <p className="text-slate-500">No imports yet.</p>}
          </div>
        )}

        {view === 'settings' && settings && (
          <DirectorySettingsForm
            initial={settings}
            onSaved={(m) => {
              setMsg(m);
              void api.getAdminDirectorySettings().then((r) => r.success && setSettings(r.data));
            }}
          />
        )}
      </div>
    </div>
  );
};

const DirectorySettingsForm: React.FC<{ initial: any; onSaved: (msg: string) => void }> = ({ initial, onSaved }) => {
  const s = initial.settings || {};
  const [dailyQuotaLimit, setDailyQuotaLimit] = useState(s.dailyQuotaLimit ?? 500);
  const [monthlyQuotaLimit, setMonthlyQuotaLimit] = useState(s.monthlyQuotaLimit ?? 10000);
  const [cacheTtlHours, setCacheTtlHours] = useState(s.cacheTtlHours ?? 24);
  const [placesApiEnabled, setPlacesApiEnabled] = useState(s.placesApiEnabled !== false);
  const [enabled, setEnabled] = useState(s.enabled !== false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg space-y-4 text-sm">
      <h2 className="font-bold text-white">Directory & Google Places</h2>
      <p className="text-xs text-slate-500">
        API key: Admin → Settings → Platform → Maps (server key with Places API enabled). Searches run only when an admin clicks Search.
      </p>
      <div className="text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
        <div>Status: {initial.placesApi?.configured ? 'Key configured' : 'Missing API key'}</div>
        <div>Last success: {initial.placesApi?.lastSuccessfulRequestAt || '—'}</div>
        <div>Last error: {initial.placesApi?.lastError || '—'}</div>
      </div>
      <label className="flex items-center gap-2 text-slate-300">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-emerald-500" />
        Directory enabled
      </label>
      <label className="flex items-center gap-2 text-slate-300">
        <input type="checkbox" checked={placesApiEnabled} onChange={(e) => setPlacesApiEnabled(e.target.checked)} className="accent-emerald-500" />
        Places API enabled
      </label>
      <label className="block text-[11px] text-slate-400">Daily quota</label>
      <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" value={dailyQuotaLimit} onChange={(e) => setDailyQuotaLimit(Number(e.target.value))} />
      <label className="block text-[11px] text-slate-400">Monthly quota</label>
      <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" value={monthlyQuotaLimit} onChange={(e) => setMonthlyQuotaLimit(Number(e.target.value))} />
      <label className="block text-[11px] text-slate-400">Display cache TTL (hours)</label>
      <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" value={cacheTtlHours} onChange={(e) => setCacheTtlHours(Number(e.target.value))} />
      <button
        type="button"
        className="w-full py-3 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs"
        onClick={async () => {
          const res = await api.updateAdminDirectorySettings({
            enabled,
            placesApiEnabled,
            dailyQuotaLimit,
            monthlyQuotaLimit,
            cacheTtlHours,
          });
          onSaved(res.success ? 'Directory settings saved.' : res.error?.message || 'Save failed.');
        }}
      >
        Save directory settings
      </button>
      <button
        type="button"
        className="w-full py-2 border border-slate-600 text-slate-200 rounded-xl text-xs font-bold"
        onClick={async () => {
          const res = await api.testAdminDirectoryPlaces();
          onSaved(res.success ? 'Places API connection OK.' : res.error?.message || 'Test failed.');
        }}
      >
        Test Places API connection
      </button>
    </div>
  );
};
