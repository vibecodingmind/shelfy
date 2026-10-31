import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Loader2, Search, Download, CheckSquare, Square } from 'lucide-react';
import { api } from '../../lib/api.js';
import { OPENSTREETMAP_TILE_ATTRIBUTION, OPENSTREETMAP_TILE_URL } from '../../lib/shopMapLocation.js';
import { DirectoryCategory, DirectoryRegion, User } from '../../types/index.js';

const REGIONS: DirectoryRegion[] = ['Mwanza', 'Dar es Salaam', 'Arusha', 'Mbeya', 'Dodoma'];
const CATEGORIES: DirectoryCategory[] = [
  'SUPERMARKET',
  'PHARMACY',
  'MARKET',
  'SHOPPING_CENTRE',
  'GROCERY_STORE',
  'CONVENIENCE_STORE',
  'RETAIL_SHOP',
  'ELECTRONICS_STORE',
  'CLOTHING_STORE',
  'HARDWARE_STORE',
  'RESTAURANT',
  'OTHER',
];

export const AdminShopImporter: React.FC<{ hosts: User[]; onDone?: () => void }> = ({ hosts, onDone }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);

  const [hostUserId, setHostUserId] = useState('');
  const [region, setRegion] = useState<DirectoryRegion>('Dar es Salaam');
  const [category, setCategory] = useState<DirectoryCategory>('SUPERMARKET');
  const [city, setCity] = useState('Dar es Salaam');
  const [textQuery, setTextQuery] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(8000);
  const [mode, setMode] = useState<'text' | 'nearby'>('text');
  const [searching, setSearching] = useState(false);
  const [places, setPlaces] = useState<any[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState({ lat: -6.7924, lng: 39.2083 });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = L.map(mapRef.current, { zoomControl: true }).setView([mapCenter.lat, mapCenter.lng], 12);
    L.tileLayer(OPENSTREETMAP_TILE_URL, { attribution: OPENSTREETMAP_TILE_ATTRIBUTION }).addTo(map);
    markersLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    map.on('moveend', () => {
      const c = map.getCenter();
      setMapCenter({ lat: c.lat, lng: c.lng });
    });
    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    mapInstance.current?.setView([mapCenter.lat, mapCenter.lng], mapInstance.current.getZoom());
  }, [mapCenter.lat, mapCenter.lng]);

  useEffect(() => {
    if (!markersLayer.current) return;
    markersLayer.current.clearLayers();
    places.forEach((p) => {
      const lat = p.location?.latitude;
      const lng = p.location?.longitude;
      if (lat == null || lng == null) return;
      const marker = L.circleMarker([lat, lng], {
        radius: selected.has(p.placeId) ? 9 : 6,
        color: p.shelfyMatch?.existingShop ? '#f59e0b' : '#10b981',
        fillOpacity: 0.85,
      });
      marker.on('click', () => toggleSelect(p.placeId));
      marker.bindTooltip(p.displayName || p.placeId, { direction: 'top' });
      marker.addTo(markersLayer.current!);
    });
  }, [places, selected]);

  const runSearch = async (pageToken?: string) => {
    setSearching(true);
    setError('');
    const res = await api.searchAdminPlaces({
      mode,
      region,
      category,
      city,
      textQuery: textQuery || undefined,
      latitude: mapCenter.lat,
      longitude: mapCenter.lng,
      radiusMeters,
      pageToken,
    });
    setSearching(false);
    if (!res.success) {
      setError(res.error?.message || 'Search failed.');
      return;
    }
    const data = res.data;
    setPlaces(pageToken ? [...places, ...(data.places || [])] : data.places || []);
    setNextPageToken(data.nextPageToken || null);
  };

  const toggleSelect = (placeId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  };

  const runImport = async () => {
    if (!hostUserId) {
      setError('Select a host user to assign imported shops.');
      return;
    }
    if (!selected.size) {
      setError('Select at least one business.');
      return;
    }
    setImporting(true);
    const res = await api.importAdminBusinessPlaces({
      placeIds: [...selected],
      hostUserId,
      region,
      city,
      directoryCategory: category,
    });
    setImporting(false);
    if (res.success && res.data) {
      setLastResult(res.data);
      setSelected(new Set());
      onDone?.();
    } else {
      setError(res.error?.message || 'Import failed.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200">
        Import creates <strong>client businesses</strong> (Shop records) assigned to a host user. Google Place IDs are stored; complete photos and publish from the host dashboard.
      </div>

      <select
        required
        value={hostUserId}
        onChange={(e) => setHostUserId(e.target.value)}
        className="w-full max-w-md bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
      >
        <option value="">Assign host user for imports…</option>
        {hosts.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name} ({h.email}) — {h.role}
          </option>
        ))}
      </select>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">Search controls</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-slate-500">Region</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white" value={region} onChange={(e) => setRegion(e.target.value as DirectoryRegion)}>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-500">Category</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white" value={category} onChange={(e) => setCategory(e.target.value as DirectoryCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <input className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <input className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white" placeholder="Search by name (optional)" value={textQuery} onChange={(e) => setTextQuery(e.target.value)} />
          <div className="flex gap-2 text-xs">
            <select className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-white" value={mode} onChange={(e) => setMode(e.target.value as 'text' | 'nearby')}>
              <option value="text">Text search</option>
              <option value="nearby">Nearby search</option>
            </select>
            <input type="number" className="w-24 bg-slate-950 border border-slate-700 rounded-lg p-2 text-white" value={radiusMeters} onChange={(e) => setRadiusMeters(Number(e.target.value))} title="Radius meters" />
          </div>
          <button type="button" disabled={searching} onClick={() => void runSearch()} className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs disabled:opacity-50">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search Google Places
          </button>
          {nextPageToken && (
            <button type="button" disabled={searching} onClick={() => void runSearch(nextPageToken)} className="w-full py-2 border border-slate-600 text-slate-300 rounded-xl text-xs">
              Load more results
            </button>
          )}
          {error && <p className="text-rose-400 text-xs">{error}</p>}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[280px]">
          <div ref={mapRef} className="w-full h-[320px]" />
          <p className="text-[10px] text-slate-500 p-2">Amber = already imported as a Shelfy shop.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button type="button" onClick={() => setSelected(new Set(places.map((p) => p.placeId)))} className="text-xs font-bold text-slate-300 flex items-center gap-1">
          <CheckSquare className="w-4 h-4" /> Select all on page
        </button>
        <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-slate-500 flex items-center gap-1">
          <Square className="w-4 h-4" /> Clear
        </button>
        <span className="text-xs text-slate-400">{selected.size} selected · {places.length} shown</span>
        <button
          type="button"
          disabled={importing || !selected.size}
          onClick={() => void runImport()}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs disabled:opacity-50"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Import as clients
        </button>
      </div>

      {lastResult && (
        <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
          Created {lastResult.created?.length ?? 0}, duplicates {lastResult.duplicates?.length ?? 0}, failed {lastResult.failed?.length ?? 0}.
        </div>
      )}

      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {places.map((p) => (
          <div key={p.placeId} className={`flex gap-3 p-3 rounded-xl border ${selected.has(p.placeId) ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-800 bg-slate-900'}`}>
            <button type="button" onClick={() => toggleSelect(p.placeId)} className="shrink-0 mt-1">
              {selected.has(p.placeId) ? <CheckSquare className="w-5 h-5 text-emerald-400" /> : <Square className="w-5 h-5 text-slate-600" />}
            </button>
            <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 shrink-0">Place</div>
            <div className="flex-1 min-w-0 text-xs">
              <div className="font-bold text-white truncate">{p.displayName || '—'}</div>
              <div className="text-slate-400 truncate">{p.formattedAddress || '—'}</div>
              {p.shelfyMatch?.existingShop && <span className="text-amber-400 font-bold">Already in Shelfy</span>}
              <div className="text-[10px] text-slate-600 font-mono truncate">{p.placeId}</div>
            </div>
          </div>
        ))}
        {!places.length && !searching && <p className="text-slate-500 text-sm p-4">Run a search to discover businesses.</p>}
      </div>
    </div>
  );
};
