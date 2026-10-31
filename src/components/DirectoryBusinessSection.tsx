import React, { useEffect, useState } from 'react';
import { MapPin, Search, Store } from 'lucide-react';
import { api } from '../lib/api.js';
import { User } from '../types/index.js';

const REGIONS = ['Mwanza', 'Dar es Salaam', 'Arusha', 'Mbeya', 'Dodoma'];

/** Public directory listings (metadata only; details loaded from Google on expand). */
export const DirectoryBusinessSection: React.FC<{ region?: string; city?: string; user?: User | null }> = ({
  region,
  city,
  user,
}) => {
  const [rows, setRows] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [display, setDisplay] = useState<Record<string, any>>({});
  const [filterRegion, setFilterRegion] = useState(region || '');
  const [filterCity, setFilterCity] = useState(city || '');
  const [filterQ, setFilterQ] = useState('');
  const [claimMsg, setClaimMsg] = useState('');

  const load = () => {
    const params: Record<string, string> = {};
    if (filterRegion) params.region = filterRegion;
    if (filterCity) params.city = filterCity;
    if (filterQ.trim()) params.q = filterQ.trim();
    void api.getDirectoryBusinesses(params).then((r) => r.success && setRows(r.data || []));
  };

  useEffect(() => {
    setFilterRegion(region || '');
    setFilterCity(city || '');
  }, [region, city]);

  useEffect(() => {
    load();
  }, [filterRegion, filterCity]);

  if (!rows.length) return null;

  const loadDisplay = async (id: string) => {
    if (display[id]) return;
    const res = await api.getDirectoryBusiness(id);
    if (res.success && res.data?.display) {
      setDisplay((d) => ({ ...d, [id]: res.data.display }));
    }
  };

  return (
    <section className="mt-10 border-t border-slate-800 pt-8">
      <h2 className="text-lg font-black text-white flex items-center gap-2 mb-2">
        <Store className="w-5 h-5 text-emerald-400" />
        Local business directory
      </h2>
      <p className="text-xs text-slate-500 mb-4">
        Discover shops in Tanzania before they join the marketplace. Business details from Google are shown on demand.
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
        >
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <input
          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white min-w-[120px]"
          placeholder="City"
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
        />
        <input
          className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white flex-1 min-w-[140px]"
          placeholder="Search city or area"
          value={filterQ}
          onChange={(e) => setFilterQ(e.target.value)}
        />
        <button type="button" onClick={load} className="px-3 py-1.5 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1">
          <Search className="w-3.5 h-3.5" /> Search
        </button>
      </div>
      {claimMsg && <p className="text-xs text-emerald-400 mb-2">{claimMsg}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((b) => {
          const det = display[b.id];
          const open = expanded === b.id;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setExpanded(open ? null : b.id);
                void loadDisplay(b.id);
              }}
              className="text-left bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/40 transition-colors"
            >
              <div className="text-[10px] uppercase text-emerald-400 font-bold">{b.directoryCategory.replace(/_/g, ' ')}</div>
              <div className="text-sm font-bold text-white mt-1">
                {open && det?.displayName ? det.displayName : `${b.city} · ${b.region}`}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                <MapPin className="w-3 h-3" />
                {b.claimStatus === 'UNCLAIMED' ? 'Unclaimed listing' : b.claimStatus}
                {b.marketplaceStatus === 'DIRECTORY_ONLY' && ' · Directory only'}
              </div>
              {open && det && (
                <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                  {det.photos?.[0]?.proxyUrl && (
                    <img src={det.photos[0].proxyUrl} alt="" className="w-full h-24 object-cover rounded-lg mb-2" />
                  )}
                  {det.formattedAddress && <div>{det.formattedAddress}</div>}
                  {det.rating != null && <div>★ {det.rating} ({det.userRatingCount ?? 0} reviews)</div>}
                  {det.websiteUri && (
                    <a href={det.websiteUri} className="text-teal-400 block truncate" target="_blank" rel="noreferrer">
                      Website
                    </a>
                  )}
                  <div className="text-[10px] text-slate-600">Powered by Google</div>
                  {user && (user.role === 'HOST' || user.role === 'VENDOR') && b.claimStatus === 'UNCLAIMED' && (
                    <button
                      type="button"
                      className="mt-2 w-full py-2 bg-teal-500 text-slate-950 font-bold rounded-lg"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const res = await api.claimDirectoryBusiness(b.id);
                        setClaimMsg(res.success ? 'Claim submitted for admin review.' : res.error?.message || 'Failed');
                        load();
                      }}
                    >
                      Claim this business
                    </button>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
