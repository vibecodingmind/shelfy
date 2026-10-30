/**
 * Shelfy 🇹🇿 — Airbnb-Style Public Landing Page & Shelf Discovery Marketplace
 * 
 * Features:
 * - Signature Airbnb-style floating Search Bar
 * - Category navigation bar: 7 visible categories at a time, swipeable for remaining, hidden scrollbars
 * - View mode switcher: Grid (7 cards in a row on wide displays), List
 * - 30 verified shelf listings across Tanzania with up to 8 photos each
 * - Filter drawer with price range slider, category & placement filters
 * - Clean role-based navigation (AI Match & List Shelf moved to authenticated Host/Vendor dashboards)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Store,
  SlidersHorizontal,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Shelf, Shop, User } from '../types/index.js';
import { AirbnbShelfCard } from './AirbnbShelfCard.js';
import { AirbnbShelfDetail } from './AirbnbShelfDetail.js';
import { shelfTypeNav } from './shelfTypeNav.js';

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
  homeSignal?: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  shelves,
  user,
  searchQuery: externalSearchQuery,
  onSearchChange,
  shelfCategories,
  shelfTypes,
  onBookShelf,
  onLoginClick,
  initialShelfSlug,
  openFilterSignal,
  homeSignal,
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
  const [selectedSize, setSelectedSize] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(200000);
  const [minPrice, setMinPrice] = useState<number>(0);
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

  useEffect(() => {
    if (!homeSignal) return;
    setActiveDetailShelf(null);
    if (window.location.pathname !== '/') window.history.pushState({}, '', '/');
    window.scrollTo({ top: 0 });
  }, [homeSignal]);

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

  // Filtering Logic
  const filteredShelves = shelves.filter((sh) => {
    if (selectedCity && sh.shopCity?.toLowerCase() !== selectedCity.toLowerCase()) return false;
    if (selectedType && sh.shelfType !== selectedType) return false;
    if (selectedCategory && !sh.allowedCategories.some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()))) return false;
    if (selectedSize === 'SMALL' && sh.widthCm >= 80) return false;
    if (selectedSize === 'MEDIUM' && (sh.widthCm < 80 || sh.widthCm > 120)) return false;
    if (selectedSize === 'LARGE' && sh.widthCm <= 120) return false;
    if (sh.availabilityStatus !== 'AVAILABLE') return false;
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

  const featuredShelves = filteredShelves.filter((shelf) => (shelf.avgRating || 0) >= 4.9);
  const otherShelves = filteredShelves.filter((shelf) => (shelf.avgRating || 0) < 4.9);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedSize('');
    setMinPrice(0);
    setMaxPrice(200000);
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

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
    <div id="shelfy-marketplace" className="min-h-screen bg-slate-950 text-white flex flex-col font-sans pb-28 md:pb-16">
      
      {/* 1. Airbnb Category Strip Bar (Limited to ~7 items visible, swipeable, hidden scrollbars) */}
      <section className="bg-slate-950/95 border-b border-slate-800/80 sticky top-16 sm:top-20 z-20 px-2 sm:px-6 lg:px-8 py-2 sm:py-3 backdrop-blur-md">
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
            {shelfTypeNav.map((pill) => {
              const isActive = selectedType === pill.id;
              const Icon = pill.Icon;

              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSelectedType(selectedType === pill.id ? '' : pill.id)}
                  className={`group flex flex-col items-center gap-1.5 shrink-0 px-2 py-1 min-w-[4.75rem] transition-all border-b-2 cursor-pointer snap-start ${
                    isActive
                      ? 'border-emerald-400 text-white font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600 font-medium'
                  }`}
                >
                  <span
                    className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300 group-hover:border-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.75} />
                  </span>
                  <span className="text-[11px] whitespace-nowrap">{pill.label}</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Price / month</label>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-mono font-bold text-emerald-400">Up to TZS {maxPrice.toLocaleString()}</span>
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

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All categories</option>
                  {(shelfCategories && shelfCategories.length > 0
                    ? shelfCategories
                    : ['Food & Beverages', 'Cosmetics', 'Organic Goods', 'Spices', 'Health & Beauty', 'Snacks & Confectionery']
                  ).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Shelf type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All shelf types</option>
                  {shelfTypeNav.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Size</label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Any size</option>
                  <option value="SMALL">Small, under 80 cm wide</option>
                  <option value="MEDIUM">Medium, 80–120 cm wide</option>
                  <option value="LARGE">Large, over 120 cm wide</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Location</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All locations</option>
                  <option value="Dar es Salaam">Dar es Salaam</option>
                  <option value="Mwanza">Mwanza</option>
                  <option value="Arusha">Arusha</option>
                  <option value="Zanzibar">Zanzibar</option>
                  <option value="Dodoma">Dodoma</option>
                  <option value="Mbeya">Mbeya</option>
                </select>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* 3. Main Marketplace Content (7-in-a-Row Airbnb Cards Grid or List) */}
      <main className="w-full max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 flex-1 space-y-8">
        {filteredShelves.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/60 border border-slate-800 rounded-3xl p-8 max-w-xl mx-auto my-8">
            <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No available shelves match</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
              Booked shelves stay hidden. Adjust price, category, type, size, or location.
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
            {featuredShelves.length > 0 && (
              <section>
                <h2 className="text-lg font-black text-white mb-3">Featured shelves</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {featuredShelves.map((shelf) => (
                    <AirbnbShelfCard key={shelf.id} shelf={shelf} onSelectShelf={openShelf} />
                  ))}
                </div>
              </section>
            )}
            {otherShelves.length > 0 && (
              <section>
                <h2 className="text-lg font-black text-white mb-3">Other shelves</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {otherShelves.map((shelf) => (
                    <AirbnbShelfCard key={shelf.id} shelf={shelf} onSelectShelf={openShelf} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* 4. Footer */}
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

