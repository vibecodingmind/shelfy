/**
 * Shelfy 🇹🇿 — Airbnb Split Map View
 * 
 * Layout:
 * - Left Side: Scrollable listings feed (2 cards per row on desktop, 1 on tablet/mobile)
 * - Right Side: Sticky Interactive Map that remains anchored in viewport while left side scrolls
 * - Interactive Leaflet Map with custom Airbnb-style price pill markers
 * - Synchronized hover/click between listing cards and map markers
 * - City Quick-Jump navigation (Dar es Salaam, Mwanza, Arusha, Zanzibar, Dodoma, Mbeya)
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  MapPin,
  Store,
  CheckCircle2,
} from 'lucide-react';
import { Shelf, Shop } from '../types/index.js';
import { AirbnbShelfCard } from './AirbnbShelfCard.js';

interface AirbnbMapSplitViewProps {
  shelves: Shelf[];
  shops: Shop[];
  onSelectShelf: (shelf: Shelf) => void;
  onBookShelf?: (shelf: Shelf) => void;
}

export const AirbnbMapSplitView: React.FC<AirbnbMapSplitViewProps> = ({
  shelves,
  shops,
  onSelectShelf,
  onBookShelf,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const [hoveredShelfId, setHoveredShelfId] = useState<string | null>(null);
  const [activePopupShelf, setActivePopupShelf] = useState<Shelf | null>(null);

  // Helper to find shop coordinates for a shelf
  const getShelfCoordinates = (shelf: Shelf): [number, number] | null => {
    const shop = shops.find((s) => s.id === shelf.shopId);
    if (shop && typeof shop.latitude === 'number' && typeof shop.longitude === 'number') {
      return [shop.latitude, shop.longitude];
    }
    // Fallback coordinates based on shopCity if available
    const city = shelf.shopCity?.toLowerCase() || '';
    if (city.includes('dar')) return [-6.77 + (Math.random() - 0.5) * 0.05, 39.24 + (Math.random() - 0.5) * 0.05];
    if (city.includes('mwanza')) return [-2.51 + (Math.random() - 0.5) * 0.03, 32.90 + (Math.random() - 0.5) * 0.03];
    if (city.includes('arusha')) return [-3.38 + (Math.random() - 0.5) * 0.03, 36.68 + (Math.random() - 0.5) * 0.03];
    if (city.includes('zanzibar')) return [-6.16 + (Math.random() - 0.5) * 0.03, 39.20 + (Math.random() - 0.5) * 0.03];
    if (city.includes('dodoma')) return [-6.17 + (Math.random() - 0.5) * 0.03, 35.74 + (Math.random() - 0.5) * 0.03];
    if (city.includes('mbeya')) return [-8.90 + (Math.random() - 0.5) * 0.03, 33.45 + (Math.random() - 0.5) * 0.03];
    return [-6.7924, 39.2083];
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: [-6.3690, 34.8888],
      zoom: 6,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Use CartoDB Positron / Voyager Dark-compatible crisp tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> | &copy; OpenStreetMap contributors',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Trigger immediate resize recalculation for tiles
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when shelves change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const bounds = L.latLngBounds([]);

    shelves.forEach((shelf) => {
      const coords = getShelfCoordinates(shelf);
      if (!coords) return;

      bounds.extend(coords);

      const priceK = (shelf.monthlyPriceTzs / 1000).toFixed(0);
      const isHovered = hoveredShelfId === shelf.id;

      // Airbnb pill HTML element
      const iconHtml = `
        <div class="airbnb-price-pin ${isHovered ? 'hovered' : ''}" id="map-pin-${shelf.id}">
          TZS ${priceK}k
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-airbnb-div-icon',
        html: iconHtml,
        iconSize: [80, 28],
        iconAnchor: [40, 14],
      });

      const marker = L.marker(coords, { icon: customIcon });

      // Marker click handler
      marker.on('click', () => {
        setActivePopupShelf(shelf);
        map.panTo(coords, { animate: true, duration: 0.5 });
      });

      marker.on('mouseover', () => {
        setHoveredShelfId(shelf.id);
      });

      marker.on('mouseout', () => {
        setHoveredShelfId(null);
      });

      marker.addTo(map);
      markersRef.current.set(shelf.id, marker);
    });

    // Fit bounds if multiple shelves exist
    if (bounds.isValid() && shelves.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [shelves, shops]);

  // Highlight marker when shelf is hovered from the left list
  useEffect(() => {
    markersRef.current.forEach((marker, shelfId) => {
      const shelf = shelves.find((s) => s.id === shelfId);
      if (!shelf) return;

      const isHovered = hoveredShelfId === shelfId;
      const priceK = (shelf.monthlyPriceTzs / 1000).toFixed(0);

      const iconHtml = `
        <div class="airbnb-price-pin ${isHovered ? 'active' : ''}" id="map-pin-${shelf.id}">
          TZS ${priceK}k
        </div>
      `;

      marker.setIcon(
        L.divIcon({
          className: 'custom-airbnb-div-icon',
          html: iconHtml,
          iconSize: [80, 28],
          iconAnchor: [40, 14],
        })
      );

      if (isHovered && mapInstanceRef.current) {
        marker.setZIndexOffset(1000);
      } else {
        marker.setZIndexOffset(0);
      }
    });
  }, [hoveredShelfId, shelves]);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 items-start relative">
      
      {/* 1. LEFT SIDE: Scrollable Listings Feed */}
      <div className="w-full lg:w-[54%] xl:w-[56%] 2xl:w-[58%] min-w-0 space-y-6">
        
        {/* Listings Header & Counter */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-400" />
              <span>Available Retail Shelf Spaces</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing <span className="font-mono font-bold text-white">{shelves.length}</span> verified spaces across Tanzania
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Escrow Protected</span>
          </div>
        </div>

        {/* Shelves Grid (2 columns on left side for comfortable scanning) */}
        {shelves.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-8">
            <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Shelves Found</h3>
            <p className="text-xs text-slate-400">Try adjusting your filters or choose another region.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
            {shelves.map((shelf) => (
              <div
                key={shelf.id}
                onMouseEnter={() => setHoveredShelfId(shelf.id)}
                onMouseLeave={() => setHoveredShelfId(null)}
                className="transition-transform duration-200"
              >
                <AirbnbShelfCard
                  shelf={shelf}
                  onSelectShelf={onSelectShelf}
                  onBookDirect={onBookShelf}
                />
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 2. RIGHT SIDE: Sticky Map Column (Remains fixed/anchored in viewport while left list scrolls) */}
      <div className="w-full lg:w-[46%] xl:w-[44%] 2xl:w-[42%] lg:sticky lg:top-[152px] z-10 shrink-0">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[480px] lg:h-[calc(100vh-176px)] relative">
          
          {/* Leaflet Map DOM Container */}
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Floating Selected Shelf Mini Preview Popup (Airbnb Style) */}
          {activePopupShelf && (
            <div className="absolute bottom-4 left-4 right-4 z-30 animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl flex items-center gap-3.5">
                <img
                  src={activePopupShelf.photos[0] || 'https://images.unsplash.com/photo-1583258292688-d02132382025?w=800'}
                  alt={activePopupShelf.name}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-800 shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-[11px] font-bold text-emerald-400 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{activePopupShelf.shopCity}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-300 truncate">{activePopupShelf.shopName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePopupShelf(null)}
                      className="text-slate-400 hover:text-white text-xs px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <h4 className="text-xs font-bold text-white truncate mt-0.5">{activePopupShelf.name}</h4>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {activePopupShelf.widthCm}×{activePopupShelf.heightCm} cm • {activePopupShelf.shelfType.replace('_', ' ')}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800">
                    <div className="text-xs font-black text-white">
                      TZS {activePopupShelf.monthlyPriceTzs.toLocaleString()}
                      <span className="text-[10px] font-normal text-slate-400">/mo</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectShelf(activePopupShelf)}
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      View Space
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Map Top-Left Legend Pill */}
          <div className="absolute top-3 left-3 z-20 pointer-events-none">
            <div className="px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur border border-slate-800 text-[10px] font-semibold text-slate-300 flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Click price pins for details</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
