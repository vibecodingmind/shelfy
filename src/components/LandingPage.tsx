/**
 * Shelfy 🇹🇿 — Public Landing Page & Shelf Discovery Marketplace
 * Featuring Airbnb-style category filters, Airbnb shelf cards, interactive map toggle,
 * and seamless transition to the full Airbnb Shelf Detail view.
 */

import React, { useState } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Store,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Building2,
  Eye,
  SlidersHorizontal,
  X,
  CreditCard,
  DollarSign,
  Calendar,
  Layers,
  ChevronRight,
  RotateCcw,
  ShoppingBag,
  Flame,
} from 'lucide-react';
import { Shelf, Shop, User } from '../types/index.js';
import { InteractiveMap } from './InteractiveMap.js';
import { AirbnbShelfCard } from './AirbnbShelfCard.js';
import { AirbnbShelfDetail } from './AirbnbShelfDetail.js';

interface LandingPageProps {
  shelves: Shelf[];
  shops: Shop[];
  user: User | null;
  onBookShelf: (shelf: Shelf, startDate?: string, endDate?: string, durationMonths?: number, category?: string) => void;
  onOpenAIShelfMatch: () => void;
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  shelves,
  shops,
  user,
  onBookShelf,
  onOpenAIShelfMatch,
  onLoginClick,
}) => {
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(150000);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP'>('GRID');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Active shelf for full Airbnb Detail View
  const [activeDetailShelf, setActiveDetailShelf] = useState<Shelf | null>(null);

  // Airbnb style category pills
  const categoryPills = [
    { id: '', label: 'All Shelves', icon: '🏪' },
    { id: 'Dar es Salaam', type: 'city', label: 'Dar es Salaam', icon: '🌴' },
    { id: 'Mwanza', type: 'city', label: 'Mwanza', icon: '🌊' },
    { id: 'Arusha', type: 'city', label: 'Arusha', icon: '🏔️' },
    { id: 'Zanzibar', type: 'city', label: 'Zanzibar', icon: '🏖️' },
    { id: 'EYE_LEVEL', type: 'shelfType', label: 'Eye-Level', icon: '👁️' },
    { id: 'COUNTER_DISPLAY', type: 'shelfType', label: 'Checkout Counter', icon: '🛒' },
    { id: 'ENTRANCE_DISPLAY', type: 'shelfType', label: 'Entrance Lobby', icon: '✨' },
    { id: 'REFRIGERATED', type: 'shelfType', label: 'Chilled Cooler', icon: '❄️' },
    { id: 'Food & Beverages', type: 'category', label: 'Food & Drinks', icon: '🧃' },
    { id: 'Cosmetics', type: 'category', label: 'Cosmetics', icon: '💄' },
  ];

  // Filtering Logic
  const filteredShelves = shelves.filter((sh) => {
    if (selectedCity && sh.shopCity?.toLowerCase() !== selectedCity.toLowerCase()) return false;
    if (selectedType && sh.shelfType !== selectedType) return false;
    if (selectedCategory && !sh.allowedCategories.some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()))) return false;
    if (sh.monthlyPriceTzs > maxPrice) return false;
    if (sh.monthlyPriceTzs < minPrice) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        sh.name.toLowerCase().includes(q) ||
        sh.shopName?.toLowerCase().includes(q) ||
        sh.shopCity?.toLowerCase().includes(q) ||
        sh.description.toLowerCase().includes(q) ||
        sh.locationInsideShop?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const handlePillClick = (pill: any) => {
    if (!pill.id) {
      setSelectedCity('');
      setSelectedType('');
      setSelectedCategory('');
    } else if (pill.type === 'city') {
      setSelectedCity(selectedCity === pill.id ? '' : pill.id);
    } else if (pill.type === 'shelfType') {
      setSelectedType(selectedType === pill.id ? '' : pill.id);
    } else if (pill.type === 'category') {
      setSelectedCategory(selectedCategory === pill.id ? '' : pill.id);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('');
    setSelectedCategory('');
    setSelectedType('');
    setMinPrice(0);
    setMaxPrice(150000);
  };

  // If a shelf is selected, render the dedicated Airbnb Shelf Detail view
  if (activeDetailShelf) {
    return (
      <AirbnbShelfDetail
        shelf={activeDetailShelf}
        currentUser={user}
        onBack={() => setActiveDetailShelf(null)}
        onInitiateBooking={(shelf, start, end, months, cat) => {
          onBookShelf(shelf, start, end, months, cat);
        }}
      />
    );
  }

  return (
    <div id="shelfy-marketplace" className="min-h-screen bg-slate-950 text-white flex flex-col font-sans">
      
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 pt-10 pb-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-5 shadow-xl">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>The Retail Expansion Platform for Tanzania 🇹🇿</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight text-white mb-5">
              Rent verified shelf space in Tanzania's top stores.{' '}
              <span className="bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Zero lease overhead.
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 mb-7 leading-relaxed max-w-2xl mx-auto">
              Discover and book prime retail display shelves in Dar es Salaam, Mwanza, Arusha, and Zanzibar. Secure checkout with PesaPal & M-Pesa, verified by on-site field agents.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onOpenAIShelfMatch}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-extrabold text-xs sm:text-sm hover:opacity-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                Find Best Shelf (AI Match)
              </button>
              {!user && (
                <button
                  type="button"
                  onClick={onLoginClick}
                  className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Store className="w-4 h-4 text-emerald-400" />
                  List Your Shop Shelf
                </button>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* 2. Airbnb Style Category Navigation Bar */}
      <section className="bg-slate-950 border-b border-slate-800/80 sticky top-16 z-20 px-4 sm:px-6 lg:px-8 py-3.5 backdrop-blur-md bg-slate-950/95">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Scrollable Pills Strip */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-1">
            {categoryPills.map((pill, idx) => {
              const isActive =
                (!pill.id && !selectedCity && !selectedType && !selectedCategory) ||
                (pill.type === 'city' && selectedCity === pill.id) ||
                (pill.type === 'shelfType' && selectedType === pill.id) ||
                (pill.type === 'category' && selectedCategory === pill.id);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePillClick(pill)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border ${
                    isActive
                      ? 'bg-white text-slate-950 border-white shadow-lg scale-102 font-black'
                      : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{pill.icon}</span>
                  <span>{pill.label}</span>
                </button>
              );
            })}
          </div>

          {/* Toggle Filter Bar & Map Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                showFilterDrawer || selectedCity || selectedType || selectedCategory || maxPrice < 150000
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(selectedCity || selectedType || selectedCategory || maxPrice < 150000) && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'GRID' ? 'MAP' : 'GRID')}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-800 transition-all flex items-center gap-1.5"
            >
              {viewMode === 'GRID' ? (
                <>
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Map</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Grid</span>
                </>
              )}
            </button>
          </div>

        </div>
      </section>

      {/* 3. Comprehensive Filter Bar (Expandable Drawer / Bar) */}
      {showFilterDrawer && (
        <section className="bg-slate-900/95 border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-5 animate-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-400" /> Refine Marketplace Search
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="w-3 h-3" /> Reset Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Keyword Search */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Keywords</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Shop, aisle, street..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* City / Region */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">City / Region (Tanzania)</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Regions</option>
                  <option value="Dar es Salaam">Dar es Salaam</option>
                  <option value="Mwanza">Mwanza</option>
                  <option value="Arusha">Arusha</option>
                  <option value="Dodoma">Dodoma</option>
                  <option value="Zanzibar">Zanzibar</option>
                  <option value="Mbeya">Mbeya</option>
                </select>
              </div>

              {/* Shelf Type */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Shelf Display Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Placement Types</option>
                  <option value="EYE_LEVEL">Eye-Level Display Shelf</option>
                  <option value="COUNTER_DISPLAY">Counter Checkout Box</option>
                  <option value="ENTRANCE_DISPLAY">Entrance Lobby Glass Case</option>
                  <option value="TOP_SHELF">Top Display Rack</option>
                  <option value="REFRIGERATED">Chilled / Refrigerated</option>
                </select>
              </div>

              {/* Price Range Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Max Monthly Rent</label>
                  <span className="text-xs font-mono font-bold text-emerald-400">TZS {maxPrice.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min={30000}
                  max={200000}
                  step={5000}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

            </div>

          </div>
        </section>
      )}

      {/* 4. Main Marketplace Content (Airbnb Cards Grid or Map) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        
        {viewMode === 'MAP' ? (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Interactive Tanzania Retail Store Locations
            </h2>
            <InteractiveMap
              shops={shops}
              shelves={shelves}
              onSelectShelf={(shelf) => setActiveDetailShelf(shelf)}
            />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Results Counter Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Verified Retail Spaces</span>
                <span className="text-xs font-mono font-semibold text-slate-400">({filteredShelves.length} listings available)</span>
              </h2>

              <button
                type="button"
                onClick={onOpenAIShelfMatch}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 transition-all hover:bg-amber-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI ShelfMatch
              </button>
            </div>

            {/* Zero Results State */}
            {filteredShelves.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
                <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">No Shelves Match Your Exact Filters</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
                  Try adjusting your monthly rent slider, region selection, or keyword search.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black hover:bg-emerald-400 transition-all cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              /* AIRBNB HOTEL-STYLE SHELF CARDS GRID */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 sm:gap-7">
                {filteredShelves.map((shelf) => (
                  <AirbnbShelfCard
                    key={shelf.id}
                    shelf={shelf}
                    onSelectShelf={(s) => setActiveDetailShelf(s)}
                    onBookDirect={(s) => onBookShelf(s)}
                  />
                ))}
              </div>
            )}

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 px-4 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-white">
            <span>Shelfy 🇹🇿</span>
            <span className="text-slate-500 font-normal">| The Retail Expansion Platform for Tanzania</span>
          </div>
          <div className="text-slate-500 text-center sm:text-right">
            PesaPal Tanzania • M-Pesa • Tigo Pesa • Airtel Money • Escrow Protected
          </div>
        </div>
      </footer>

    </div>
  );
};
