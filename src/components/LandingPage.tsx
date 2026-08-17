/**
 * Shelfy 🇹🇿 — Airbnb-Style Public Landing Page & Shelf Discovery Marketplace
 * 
 * Features:
 * - Signature Airbnb-style floating Search Bar
 * - Category navigation bar: 7 visible categories at a time, swipeable for remaining, hidden scrollbars
 * - View mode switcher: Grid (7 cards in a row on wide displays), List, Map
 * - 30 verified shelf listings across Tanzania with up to 8 photos each
 * - Filter drawer with price range slider, category & placement filters
 * - Clean role-based navigation (AI Match & List Shelf moved to authenticated Host/Vendor dashboards)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Store,
  CheckCircle2,
  SlidersHorizontal,
  X,
  RotateCcw,
  ShoppingBag,
  Grid,
  List as ListIcon,
  Map as MapIcon,
  ChevronRight,
  ChevronLeft,
  Star,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { Shelf, Shop, User } from '../types/index.js';
import { InteractiveMap } from './InteractiveMap.js';
import { AirbnbShelfCard } from './AirbnbShelfCard.js';
import { AirbnbShelfListCard } from './AirbnbShelfListCard.js';
import { AirbnbShelfDetail } from './AirbnbShelfDetail.js';
import { AirbnbMapSplitView } from './AirbnbMapSplitView.js';

interface LandingPageProps {
  shelves: Shelf[];
  shops: Shop[];
  user: User | null;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  shelfCategories?: string[];
  shelfTypes?: { id: string; name: string }[];
  onBookShelf: (shelf: Shelf, startDate?: string, endDate?: string, durationMonths?: number, category?: string) => void;
  onLoginClick: () => void;
  initialShelfSlug?: string;
  openFilterSignal?: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  shelves,
  shops,
  user,
  searchQuery: externalSearchQuery,
  onSearchChange,
  shelfCategories,
  shelfTypes,
  onBookShelf,
  onLoginClick,
  initialShelfSlug,
  openFilterSignal,
}) => {
  // State for search and filters
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = (value: string) => {
    setLocalSearchQuery(value);
    onSearchChange?.(value);
  };
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(200000);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST' | 'MAP'>('GRID');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Active shelf for full Airbnb Detail View
  const [activeDetailShelf, setActiveDetailShelf] = useState<Shelf | null>(null);

  useEffect(() => {
    if (!initialShelfSlug) return;
    const found = shelves.find((s) => s.slug === initialShelfSlug || s.id === initialShelfSlug);
    if (found) setActiveDetailShelf(found);
  }, [initialShelfSlug, shelves]);

  useEffect(() => {
    if (openFilterSignal) setShowFilterDrawer(true);
  }, [openFilterSignal]);

  const openShelf = (shelf: Shelf) => {
    setActiveDetailShelf(shelf);
    const slug = shelf.slug || shelf.id;
    window.history.pushState({}, '', `/s/${slug}`);
  };

  const closeShelf = () => {
    setActiveDetailShelf(null);
    window.history.pushState({}, '', '/');
  };

  // Category scroll reference
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Airbnb style categories list with icons
  const defaultCategoryPills = [
    { id: '', label: 'All Shelves', icon: '🏪', type: 'all' },
    { id: 'EYE_LEVEL', type: 'shelfType', label: 'Eye-Level', icon: '👁️' },
    { id: 'COUNTER_DISPLAY', type: 'shelfType', label: 'Checkout Counter', icon: '🛒' },
    { id: 'ENTRANCE_DISPLAY', type: 'shelfType', label: 'Entrance Stand', icon: '✨' },
    { id: 'REFRIGERATED', type: 'shelfType', label: 'Chilled Cooler', icon: '❄️' },
    { id: 'TOP_SHELF', type: 'shelfType', label: 'Top Rack', icon: '🔝' },
    { id: 'BOTTOM_SHELF', type: 'shelfType', label: 'Bottom Bulk', icon: '📦' },
    { id: 'Dar es Salaam', type: 'city', label: 'Dar es Salaam', icon: '🌴' },
    { id: 'Mwanza', type: 'city', label: 'Mwanza', icon: '🌊' },
    { id: 'Arusha', type: 'city', label: 'Arusha', icon: '🏔️' },
    { id: 'Zanzibar', type: 'city', label: 'Zanzibar', icon: '🏖️' },
    { id: 'Dodoma', type: 'city', label: 'Dodoma', icon: '🏛️' },
    { id: 'Mbeya', type: 'city', label: 'Mbeya', icon: '⛰️' },
    { id: 'Food & Beverages', type: 'category', label: 'Food & Drinks', icon: '🧃' },
    { id: 'Organic Goods', type: 'category', label: 'Organic & Honey', icon: '🍯' },
    { id: 'Cosmetics', type: 'category', label: 'Beauty & Skincare', icon: '💄' },
    { id: 'Spices', type: 'category', label: 'Zanzibar Spices', icon: '🌿' },
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
    if (!pill.id || pill.type === 'all') {
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
    setMaxPrice(200000);
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const activeFiltersCount =
    (selectedCity ? 1 : 0) +
    (selectedType ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (maxPrice < 200000 ? 1 : 0) +
    (searchQuery ? 1 : 0);

  // If a shelf is selected, render the dedicated Airbnb Shelf Detail view
  if (activeDetailShelf) {
    return (
      <AirbnbShelfDetail
        shelf={activeDetailShelf}
        currentUser={user}
        onBack={closeShelf}
        onInitiateBooking={(shelf, start, end, months, cat) => {
          onBookShelf(shelf, start, end, months, cat);
        }}
      />
    );
  }

  return (
    <div id="shelfy-marketplace" className="min-h-screen bg-slate-950 text-white flex flex-col font-sans pb-16">
      
      {/* 1. Airbnb Category Strip Bar (Limited to ~7 items visible, swipeable, hidden scrollbars) */}
      <section className="bg-slate-950/95 border-b border-slate-800/80 sticky top-[7.25rem] sm:top-20 z-20 px-2 sm:px-6 lg:px-8 py-2 sm:py-3 backdrop-blur-md">
        <div className="w-full max-w-[2400px] mx-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => scrollCategories('left')}
            className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 hidden md:flex hover:scale-105 transition-all cursor-pointer shadow-md touch-target"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={categoryScrollRef}
            className="flex items-center gap-4 sm:gap-6 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 flex-1 scroll-smooth snap-x min-w-0"
          >
            {defaultCategoryPills.map((pill, idx) => {
              const isActive =
                (pill.type === 'all' && !selectedCity && !selectedType && !selectedCategory) ||
                (pill.type === 'city' && selectedCity === pill.id) ||
                (pill.type === 'shelfType' && selectedType === pill.id) ||
                (pill.type === 'category' && selectedCategory === pill.id);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePillClick(pill)}
                  className={`flex flex-col items-center gap-1.5 shrink-0 px-3 py-1 transition-all border-b-2 group cursor-pointer snap-start ${
                    isActive
                      ? 'border-emerald-400 text-white opacity-100 font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600 opacity-75 hover:opacity-100 font-medium'
                  }`}
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">{pill.icon}</span>
                  <span className="text-xs whitespace-nowrap">{pill.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollCategories('right')}
            className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 hidden md:flex hover:scale-105 transition-all cursor-pointer shadow-md touch-target"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          </div>

          <div className="flex items-center gap-2 shrink-0 sm:pl-2 sm:border-l sm:border-slate-800 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'GRID' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'LIST' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="List View"
              >
                <ListIcon className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('MAP')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'MAP' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Map View"
              >
                <MapIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                showFilterDrawer || activeFiltersCount > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>

          </div>

        </div>
      </section>

      {/* 2. Expandable Refinement Filter Drawer */}
      {showFilterDrawer && (
        <section className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 lg:px-8 py-5 animate-in slide-in-from-top-3">
          <div className="w-full max-w-[2400px] mx-auto space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" /> Filter Tanzania Shelf Spaces
              </span>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset all filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Keyword Search */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Keywords / Store</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Mikocheni, Kariakoo, Supermarket..."
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
                  <option value="">All Regions ({shelves.length} listings)</option>
                  <option value="Dar es Salaam">Dar es Salaam (Mikocheni, Masaki, Kariakoo, Posta)</option>
                  <option value="Mwanza">Mwanza (Rock City Mall, Station Rd)</option>
                  <option value="Arusha">Arusha (Clock Tower, Njiro Complex)</option>
                  <option value="Zanzibar">Zanzibar (Stone Town, Paje Beach)</option>
                  <option value="Dodoma">Dodoma (Capital Central)</option>
                  <option value="Mbeya">Mbeya (Highland Plaza)</option>
                </select>
              </div>

              {/* Shelf Type */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Display Placement</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Placement Types</option>
                  <option value="EYE_LEVEL">Eye-Level Display Shelf</option>
                  <option value="COUNTER_DISPLAY">Counter Checkout Impulse Box</option>
                  <option value="ENTRANCE_DISPLAY">Lobby & Entrance Glass Stand</option>
                  <option value="REFRIGERATED">Chilled / Refrigerated Cooler</option>
                  <option value="TOP_SHELF">Top Display Rack</option>
                  <option value="BOTTOM_SHELF">Bottom Bulk Shelf</option>
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

      {/* 3. Main Marketplace Content (7-in-a-Row Airbnb Cards Grid, List, or Interactive Map) */}
      <main className="w-full max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 flex-1">
        
        {/* Results count & active filter banner */}
        {viewMode !== 'MAP' && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-400 pb-3">
            <div>
              Showing <span className="font-bold text-white font-mono">{filteredShelves.length}</span> verified shelf spaces in Tanzania
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> 100% Agent Verified
              </span>
            </div>
          </div>
        )}

        {/* Zero Results State */}
        {filteredShelves.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-xl mx-auto my-8">
            <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Shelves Match Your Exact Filters</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
              Try adjusting your monthly rent slider, region selection, or keyword search.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-black hover:bg-emerald-400 transition-all cursor-pointer shadow-lg"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            {/* VIEW MODE: MAP (AIRBNB SPLIT VIEW: LIST AT LEFT, STICKY MAP AT RIGHT) */}
            {viewMode === 'MAP' && (
              <AirbnbMapSplitView
                shelves={filteredShelves}
                shops={shops}
                onSelectShelf={openShelf}
                onBookShelf={(shelf) => onBookShelf(shelf)}
              />
            )}

            {/* VIEW MODE: LIST */}
            {viewMode === 'LIST' && (
              <div className="space-y-3">
                {filteredShelves.map((shelf) => (
                  <AirbnbShelfListCard
                    key={shelf.id}
                    shelf={shelf}
                    onSelectShelf={openShelf}
                    onBookDirect={(s) => onBookShelf(s)}
                  />
                ))}
              </div>
            )}

            {/* VIEW MODE: GRID (7-IN-A-ROW ON WIDE SCREENS) */}
            {viewMode === 'GRID' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 min-[1680px]:grid-cols-7 gap-x-4 gap-y-6">
                {filteredShelves.map((shelf) => (
                  <AirbnbShelfCard
                    key={shelf.id}
                    shelf={shelf}
                    onSelectShelf={openShelf}
                    onBookDirect={(s) => onBookShelf(s)}
                  />
                ))}
              </div>
            )}
          </>
        )}

      </main>

      {/* 4. Floating Bottom "Show Map" / "Show List" Pill Button (Airbnb Signature) */}
      <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 shadow-2xl safe-bottom">
        <button
          type="button"
          onClick={() => {
            if (viewMode === 'MAP') setViewMode('GRID');
            else setViewMode('MAP');
          }}
          className="px-5 py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 shadow-2xl hover:scale-105 transition-all cursor-pointer"
        >
          {viewMode === 'MAP' ? (
            <>
              <span>Show grid</span>
              <Grid className="w-3.5 h-3.5 text-emerald-400" />
            </>
          ) : (
            <>
              <span>Show map</span>
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            </>
          )}
        </button>
      </div>

      {/* 5. Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-8 px-4 text-xs text-slate-400 mt-12">
        <div className="w-full max-w-[2400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-white">
            <span>Shelfy 🇹🇿</span>
            <span className="text-slate-500 font-normal">| The Retail Expansion Platform for Tanzania</span>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 text-slate-500">
            <a href="/legal/terms" className="hover:text-emerald-400">Terms</a>
            <a href="/legal/privacy" className="hover:text-emerald-400">Privacy</a>
            <a href="/legal/cancellation" className="hover:text-emerald-400">Cancellation</a>
            <a href="/legal/payout" className="hover:text-emerald-400">Payouts</a>
            <span>PesaPal Tanzania • M-Pesa • Tigo Pesa • Airtel Money</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

