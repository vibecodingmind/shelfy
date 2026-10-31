/**
 * Shelfy 🇹🇿 — Airbnb-Style Public Landing Page & Shelf Discovery Marketplace
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Store,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Shelf, Shop, User } from '../types/index.js';
import { AirbnbShelfDetail } from './AirbnbShelfDetail.js';
import { shelfTypeNav } from './shelfTypeNav.js';
import { ShelfBrowseSection } from './ShelfBrowseSection.js';
import { ShelfCarouselRow } from './ShelfCarouselRow.js';
import {
  buildCategoryGroups,
  buildCityGroups,
  buildShelfTypeGroups,
  defaultActiveGroupId,
  shelvesForCityGroup,
} from '../lib/shelfBrowseGroups.js';
import { isFeaturedShelf } from '../lib/shelfCardMeta.js';
import { useFavoriteShelves } from '../hooks/useFavoriteShelves.js';
import { SiteFooter } from './SiteFooter.js';
import { DirectoryBusinessSection } from './DirectoryBusinessSection.js';

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
  onOpenHostChat?: (shopId: string, shelfId?: string, shelfName?: string) => void;
  initialShelfSlug?: string;
  openFilterSignal?: number;
  homeSignal?: number;
  clearFiltersSignal?: number;
  onFiltersActiveChange?: (active: boolean) => void;
}

const DEFAULT_CATEGORIES = [
  'Food & Beverages',
  'Cosmetics',
  'Organic Goods',
  'Spices',
  'Health & Beauty',
  'Snacks & Confectionery',
];

export const LandingPage: React.FC<LandingPageProps> = ({
  shelves,
  shops,
  user,
  searchQuery: externalSearchQuery,
  onSearchChange,
  shelfCategories,
  onBookShelf,
  onLoginClick,
  onOpenHostChat,
  initialShelfSlug,
  openFilterSignal,
  homeSignal,
  clearFiltersSignal,
  onFiltersActiveChange,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = (value: string) => {
    setLocalSearchQuery(value);
    onSearchChange?.(value);
  };
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(200000);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const [browseCategoryId, setBrowseCategoryId] = useState('__all__');
  const [browseTypeId, setBrowseTypeId] = useState('__all__');

  const [activeDetailShelf, setActiveDetailShelf] = useState<Shelf | null>(null);
  const { isFavorite, toggleFavorite } = useFavoriteShelves();

  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops]);

  const categoryLabels = shelfCategories?.length ? shelfCategories : DEFAULT_CATEGORIES;

  const cityOptions = useMemo(() => {
    const cities = new Set<string>();
    for (const sh of shelves) {
      if (sh.shopCity?.trim()) cities.add(sh.shopCity.trim());
    }
    return [...cities].sort((a, b) => a.localeCompare(b));
  }, [shelves]);

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

  useEffect(() => {
    const onPopState = () => {
      setActiveDetailShelf(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const filteredShelves = shelves.filter((sh) => {
    if (selectedType && sh.shelfType !== selectedType) return false;
    if (selectedCategory && !sh.allowedCategories.some((c) => c.toLowerCase().includes(selectedCategory.toLowerCase()))) return false;
    if (selectedCity && sh.shopCity?.toLowerCase() !== selectedCity.toLowerCase()) return false;
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

  const categoryGroups = useMemo(
    () => buildCategoryGroups(filteredShelves, categoryLabels),
    [filteredShelves, categoryLabels]
  );
  const cityGroups = useMemo(() => buildCityGroups(filteredShelves), [filteredShelves]);
  const typeGroups = useMemo(
    () => buildShelfTypeGroups(shelfTypeNav.map((t) => ({ id: t.id, label: t.label }))),
    []
  );

  useEffect(() => {
    setBrowseCategoryId(defaultActiveGroupId(categoryGroups));
  }, [categoryGroups]);

  const locationRowCities = useMemo(
    () => cityGroups.filter((g) => g.id !== '__all__').slice(0, 6),
    [cityGroups]
  );

  const featuredShelves = filteredShelves.filter((shelf) => isFeaturedShelf(shelf));
  const typeNavRef = useRef<HTMLDivElement>(null);
  const [typeCanPrev, setTypeCanPrev] = useState(false);
  const [typeCanNext, setTypeCanNext] = useState(false);
  const updateTypeNav = useCallback(() => {
    const el = typeNavRef.current;
    if (!el) return;
    setTypeCanPrev(el.scrollLeft > 4);
    setTypeCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateTypeNav();
    const el = typeNavRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateTypeNav, { passive: true });
    const ro = new ResizeObserver(updateTypeNav);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateTypeNav);
      ro.disconnect();
    };
  }, [updateTypeNav]);

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedType('');
    setSelectedSize('');
    setSelectedCity('');
    setMinPrice(0);
    setMaxPrice(200000);
    setSearchQuery('');
  };

  useEffect(() => {
    if (!clearFiltersSignal) return;
    handleResetFilters();
  }, [clearFiltersSignal]);

  const filtersActive = Boolean(
    selectedCategory || selectedType || selectedSize || selectedCity || maxPrice < 200000
  );
  useEffect(() => {
    onFiltersActiveChange?.(filtersActive);
  }, [filtersActive, onFiltersActiveChange]);

  const priceLabel = maxPrice < 200000 ? `Up to TZS ${maxPrice.toLocaleString()}` : '';

  const handleToggleFavorite = (shelfId: string) => {
    toggleFavorite(shelfId);
  };

  if (activeDetailShelf) {
    return (
      <AirbnbShelfDetail
        shelf={activeDetailShelf}
        shops={shops}
        currentUser={user}
        allShelves={shelves}
        isFavorite={isFavorite(activeDetailShelf.id)}
        onToggleFavorite={() => handleToggleFavorite(activeDetailShelf.id)}
        isFavoriteShelf={isFavorite}
        onToggleFavoriteShelf={toggleFavorite}
        onBack={closeShelf}
        onLoginClick={onLoginClick}
        onOpenHostChat={onOpenHostChat}
        onOpenRelatedShelf={(s) => openShelf(s)}
        onInitiateBooking={(shelf, start, end, months, cat) => {
          onBookShelf(shelf, start, end, months, cat);
        }}
      />
    );
  }

  return (
    <div id="shelfy-marketplace" className="min-h-screen bg-[var(--shelfy-bg)] text-[var(--shelfy-fg)] flex flex-col font-sans pb-28 md:pb-16">

      <section className="bg-[var(--shelfy-bg)] border-b border-[var(--shelfy-border)] sticky top-16 sm:top-20 z-20 py-3">
        <div className="flex items-center gap-1 px-2 sm:px-4">
          <button
            type="button"
            aria-label="Previous shelf types"
            disabled={!typeCanPrev}
            onClick={() => typeNavRef.current?.scrollBy({ left: -280, behavior: 'smooth' })}
            className="shrink-0 w-8 h-8 rounded-full border border-[var(--shelfy-border)] bg-[var(--shelfy-bg)] flex items-center justify-center text-[var(--shelfy-fg)] hover:opacity-80 disabled:opacity-35 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        <div ref={typeNavRef} className="flex flex-nowrap items-center gap-3 overflow-x-auto flex-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {shelfTypeNav.map((pill) => {
              const isActive = selectedType === pill.id;
              const Icon = pill.Icon;

              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSelectedType(selectedType === pill.id ? '' : pill.id)}
                  className={`group flex flex-col items-center gap-1.5 shrink-0 px-1 py-1 min-w-[4.25rem] transition-all border-b-2 cursor-pointer ${
                    isActive
                      ? 'border-emerald-400 text-[var(--shelfy-fg)] font-bold'
                      : 'border-transparent text-[var(--shelfy-muted)] hover:text-[var(--shelfy-fg)] font-medium'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-2xl border flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-600 dark:text-emerald-300'
                        : 'bg-[var(--shelfy-elevated)] border-[var(--shelfy-border)] text-[var(--shelfy-muted)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.75} />
                  </span>
                  <span className="text-[10px] sm:text-[11px] whitespace-nowrap">{pill.label}</span>
                </button>
              );
            })}
        </div>
          <button
            type="button"
            aria-label="Next shelf types"
            disabled={!typeCanNext}
            onClick={() => typeNavRef.current?.scrollBy({ left: 280, behavior: 'smooth' })}
            className="shrink-0 w-8 h-8 rounded-full border border-[var(--shelfy-border)] bg-[var(--shelfy-bg)] flex items-center justify-center text-[var(--shelfy-fg)] hover:opacity-80 disabled:opacity-35 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {showFilterDrawer && (
        <section className="bg-[var(--shelfy-bg)] border-b border-[var(--shelfy-border)] px-4 sm:px-6 lg:px-8 py-5 animate-in slide-in-from-top-3">
          <div className="w-full max-w-[2400px] mx-auto space-y-4">

            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-[var(--shelfy-fg)] uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" /> Filter Tanzania Shelf Spaces
              </span>
              <button
                type="button"
                onClick={() => setShowFilterDrawer(false)}
                className="text-[var(--shelfy-muted)] hover:text-[var(--shelfy-fg)]"
                aria-label="Close filters"
              >
                <X className="w-4 h-4" />
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
                  className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-xs text-[var(--shelfy-fg)] focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All categories</option>
                  {categoryLabels.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Location</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-xs text-[var(--shelfy-fg)] focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All cities</option>
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Shelf type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-xs text-[var(--shelfy-fg)] focus:outline-none focus:border-emerald-500"
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
                  className="w-full bg-[var(--shelfy-input-bg)] border border-[var(--shelfy-border)] rounded-xl px-3 py-2 text-xs text-[var(--shelfy-fg)] focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Any size</option>
                  <option value="SMALL">Small, under 80 cm wide</option>
                  <option value="MEDIUM">Medium, 80–120 cm wide</option>
                  <option value="LARGE">Large, over 120 cm wide</option>
                </select>
              </div>
            </div>

          </div>
        </section>
      )}

      {filtersActive && (
        <div className="px-4 sm:px-6 py-2 flex flex-wrap justify-center gap-2">
          {selectedCategory && (
            <button type="button" onClick={() => setSelectedCategory('')} className="inline-flex items-center gap-1 rounded-full bg-[var(--shelfy-elevated)] px-2.5 py-1 text-[11px] text-[var(--shelfy-fg)]">
              {selectedCategory} <X className="w-3 h-3" />
            </button>
          )}
          {selectedCity && (
            <button type="button" onClick={() => setSelectedCity('')} className="inline-flex items-center gap-1 rounded-full bg-[var(--shelfy-elevated)] px-2.5 py-1 text-[11px] text-[var(--shelfy-fg)]">
              {selectedCity} <X className="w-3 h-3" />
            </button>
          )}
          {selectedType && (
            <button type="button" onClick={() => setSelectedType('')} className="inline-flex items-center gap-1 rounded-full bg-[var(--shelfy-elevated)] px-2.5 py-1 text-[11px] text-[var(--shelfy-fg)]">
              {shelfTypeNav.find((type) => type.id === selectedType)?.label || selectedType} <X className="w-3 h-3" />
            </button>
          )}
          {selectedSize && (
            <button type="button" onClick={() => setSelectedSize('')} className="inline-flex items-center gap-1 rounded-full bg-[var(--shelfy-elevated)] px-2.5 py-1 text-[11px] text-[var(--shelfy-fg)]">
              {selectedSize === 'SMALL' ? 'Small' : selectedSize === 'MEDIUM' ? 'Medium' : 'Large'} <X className="w-3 h-3" />
            </button>
          )}
          {priceLabel && (
            <button type="button" onClick={() => setMaxPrice(200000)} className="inline-flex items-center gap-1 rounded-full bg-[var(--shelfy-elevated)] px-2.5 py-1 text-[11px] text-[var(--shelfy-fg)]">
              {priceLabel} <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <main className="w-full max-w-[2400px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 flex-1 space-y-12">
        {filteredShelves.length === 0 ? (
          <div className="text-center py-20 bg-[var(--shelfy-elevated)] border border-[var(--shelfy-border)] rounded-3xl p-8 max-w-xl mx-auto my-8">
            <Store className="w-12 h-12 text-[var(--shelfy-muted)] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[var(--shelfy-fg)] mb-1">No available shelves match</h3>
            <p className="text-xs text-[var(--shelfy-muted)] max-w-sm mx-auto mb-5">
              Booked shelves stay hidden. Adjust price, category, location, type, or size.
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
              <ShelfCarouselRow
                title="Featured shelves"
                shelves={featuredShelves}
                shopById={shopById}
                onSelectShelf={openShelf}
                isFavorite={isFavorite}
                onToggleFavorite={handleToggleFavorite}
                responsiveCards
              />
            )}

            <ShelfBrowseSection
              sectionKind="category"
              groups={categoryGroups}
              activeGroupId={browseCategoryId}
              onGroupChange={setBrowseCategoryId}
              allFilteredShelves={filteredShelves}
              shopById={shopById}
              onSelectShelf={openShelf}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              onSeeAll={(groupId) => {
                if (groupId !== '__all__') setSelectedCategory(groupId);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {locationRowCities.map((cityGroup) => (
              <ShelfCarouselRow
                key={cityGroup.id}
                title={`Shelves in ${cityGroup.label}`}
                shelves={shelvesForCityGroup(filteredShelves, cityGroup.id)}
                shopById={shopById}
                onSelectShelf={openShelf}
                isFavorite={isFavorite}
                onToggleFavorite={handleToggleFavorite}
                onTitleClick={() => {
                  setSelectedCity(cityGroup.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                responsiveCards
              />
            ))}

            <ShelfBrowseSection
              sectionKind="type"
              groups={typeGroups}
              activeGroupId={browseTypeId}
              onGroupChange={setBrowseTypeId}
              allFilteredShelves={filteredShelves}
              shopById={shopById}
              onSelectShelf={openShelf}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              onSeeAll={(groupId) => {
                if (groupId !== '__all__') setSelectedType(groupId);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
      </main>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <DirectoryBusinessSection city={selectedCity || undefined} user={user} />
      </div>

      <SiteFooter />

    </div>
  );
};
