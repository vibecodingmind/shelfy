/**
 * Shelfy 🇹🇿 — Interactive Tanzania Retail Location Map
 */

import React, { useState } from 'react';
import { MapPin, Store, Sparkles, Navigation, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Shop, Shelf } from '../types/index.js';

interface InteractiveMapProps {
  shops: Shop[];
  shelves: Shelf[];
  onSelectShelf: (shelf: Shelf) => void;
}

interface CityPin {
  id: string;
  name: string;
  region: string;
  xPercent: number; // relative SVG %
  yPercent: number;
  shopCount: number;
}

const TANZANIA_CITIES: CityPin[] = [
  { id: 'dar', name: 'Dar es Salaam', region: 'Coast / Dar', xPercent: 82, yPercent: 68, shopCount: 18 },
  { id: 'mwanza', name: 'Mwanza', region: 'Lake Victoria Zone', xPercent: 38, yPercent: 22, shopCount: 12 },
  { id: 'arusha', name: 'Arusha', region: 'Northern Circuit', xPercent: 65, yPercent: 28, shopCount: 9 },
  { id: 'dodoma', name: 'Dodoma', region: 'Capital Zone', xPercent: 55, yPercent: 54, shopCount: 7 },
  { id: 'zanzibar', name: 'Zanzibar', region: 'Island Zone', xPercent: 88, yPercent: 62, shopCount: 11 },
  { id: 'mbeya', name: 'Mbeya', region: 'Southern Highlands', xPercent: 42, yPercent: 78, shopCount: 6 },
];

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ shops, shelves, onSelectShelf }) => {
  const [selectedCity, setSelectedCity] = useState<string>('Dar es Salaam');
  const [activeShop, setActiveShop] = useState<Shop | null>(shops[0] || null);

  const cityShops = shops.filter((s) => s.city.toLowerCase().includes(selectedCity.toLowerCase()));
  const cityShelves = shelves.filter((sh) => sh.shopCity?.toLowerCase().includes(selectedCity.toLowerCase()));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl p-4 md:p-6 text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <MapPin className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white">Tanzania Retail Location Map</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Explore verified shop hosts & high foot-traffic shelf spaces across Tanzania's key commercial cities.
          </p>
        </div>

        {/* City Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {TANZANIA_CITIES.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCity(c.name);
                const firstShop = shops.find((s) => s.city.toLowerCase() === c.name.toLowerCase());
                if (firstShop) setActiveShop(firstShop);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCity.toLowerCase() === c.name.toLowerCase()
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Map Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* SVG Interactive Map Container */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 relative min-h-[380px] flex items-center justify-center overflow-hidden">
          
          {/* Stylized Tanzania Map Background SVG */}
          <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-center p-6">
            <svg viewBox="0 0 800 800" className="w-full h-full text-emerald-500 fill-current">
              <path d="M 120,200 Q 220,120 380,130 Q 520,120 620,180 Q 720,260 700,420 Q 740,500 710,580 Q 650,680 500,740 Q 320,780 200,680 Q 140,580 100,420 Z" />
            </svg>
          </div>

          {/* Grid lines overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

          {/* City Interactive Pins */}
          {TANZANIA_CITIES.map((pin) => {
            const isSelected = selectedCity.toLowerCase() === pin.name.toLowerCase();
            return (
              <div
                key={pin.id}
                onClick={() => {
                  setSelectedCity(pin.name);
                  const firstShop = shops.find((s) => s.city.toLowerCase() === pin.name.toLowerCase());
                  if (firstShop) setActiveShop(firstShop);
                }}
                style={{ top: `${pin.yPercent}%`, left: `${pin.xPercent}%` }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
              >
                <div className="relative flex items-center justify-center">
                  {/* Ping Animation for selected city */}
                  {isSelected && (
                    <span className="absolute w-8 h-8 rounded-full bg-emerald-400/40 animate-ping" />
                  )}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all ${
                      isSelected
                        ? 'bg-emerald-400 text-slate-950 scale-125 ring-4 ring-emerald-500/30 font-bold'
                        : 'bg-slate-800 text-amber-400 group-hover:scale-110 border border-amber-500/40'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                  </div>

                  {/* Pin City Label */}
                  <div
                    className={`absolute top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap shadow-md pointer-events-none ${
                      isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900/90 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {pin.name}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Bottom Map Stats */}
          <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Active Location Hub:</span>
              <span className="font-bold text-white">{selectedCity}</span>
            </div>
            <div className="text-slate-400">
              {cityShops.length} Shop(s) Available
            </div>
          </div>
        </div>

        {/* Selected City Shops List & Shelf Drawer */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-400" />
                Verified Shops in {selectedCity}
              </h3>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">
                {cityShops.length} Retailers
              </span>
            </div>

            {cityShops.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No shops listed in this region yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {cityShops.map((shop) => {
                  const shopShelfList = shelves.filter((sh) => sh.shopId === shop.id);
                  const isSelected = activeShop?.id === shop.id;

                  return (
                    <div
                      key={shop.id}
                      onClick={() => setActiveShop(shop)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 border-emerald-500/80 ring-1 ring-emerald-500/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex gap-3">
                        <img
                          src={shop.photos[0]}
                          alt={shop.name}
                          className="w-16 h-16 rounded-lg object-cover border border-slate-700 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white truncate">{shop.name}</h4>
                            <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                              Traffic {shop.footTrafficScore}/10
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{shop.address}</p>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Verified Host
                            </span>
                            <span className="text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded font-medium">
                              {shopShelfList.length} Shelf Unit(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Display available shelves under active shop */}
                      {isSelected && shopShelfList.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700/80 space-y-2">
                          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                            Available Shelves in this store:
                          </div>
                          {shopShelfList.map((sh) => (
                            <div
                              key={sh.id}
                              className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs"
                            >
                              <div>
                                <div className="font-semibold text-white">{sh.name}</div>
                                <div className="text-[10px] text-slate-400">
                                  {sh.widthCm}×{sh.heightCm}cm • TZS {sh.monthlyPriceTzs.toLocaleString()}/mo
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectShelf(sh);
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition-all flex items-center gap-1"
                              >
                                Book <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
