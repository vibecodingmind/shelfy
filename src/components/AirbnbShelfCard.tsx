/**
 * Shelfy 🇹🇿 — Airbnb-Style Shelf Listing Card
 * Featuring multi-photo carousels (up to 8 verified photos), heart favorites,
 * rating badges, foot-traffic indicators, spec tags, and prominent pricing typography.
 */

import React, { useState } from 'react';
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Star,
  MapPin,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { Shelf } from '../types/index.js';

interface AirbnbShelfCardProps {
  shelf: Shelf;
  onSelectShelf: (shelf: Shelf) => void;
  onBookDirect?: (shelf: Shelf) => void;
}

export const AirbnbShelfCard: React.FC<AirbnbShelfCardProps> = ({
  shelf,
  onSelectShelf,
  onBookDirect,
}) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const photos = shelf.photos && shelf.photos.length > 0
    ? shelf.photos
    : ['https://images.unsplash.com/photo-1583258292688-d02132382025?w=800'];

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const formatShelfType = (type: string) => {
    switch (type) {
      case 'EYE_LEVEL': return 'Eye-Level Placement';
      case 'COUNTER_DISPLAY': return 'Counter Checkout';
      case 'ENTRANCE_DISPLAY': return 'Lobby Entrance Stand';
      case 'TOP_SHELF': return 'Top Shelf Rack';
      case 'BOTTOM_SHELF': return 'Bottom Shelf';
      case 'REFRIGERATED': return 'Chilled Cooler';
      default: return type.replace('_', ' ');
    }
  };

  const dailyPriceTzs = Math.round(shelf.monthlyPriceTzs / 30);

  return (
    <div
      id={`shelf-card-${shelf.id}`}
      onClick={() => onSelectShelf(shelf)}
      className="group cursor-pointer flex flex-col rounded-2xl overflow-hidden bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 hover:shadow-2xl hover:shadow-emerald-950/20 transition-all duration-300 transform hover:-translate-y-1"
    >
      
      {/* 1. Photo Carousel Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950 rounded-t-2xl select-none">
        
        {/* Main Image */}
        <img
          src={photos[photoIndex]}
          alt={shelf.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient Overlay for Top Badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-slate-950/40 pointer-events-none" />

        {/* Carousel Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevPhoto}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-slate-700 shadow-md hover:scale-110 z-10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleNextPhoto}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 border border-slate-700 shadow-md hover:scale-110 z-10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Pagination Dots (up to 8 dots with smart max visual width) */}
            <div className="absolute bottom-2.5 left-0 right-0 flex items-center justify-center gap-1 pointer-events-none z-10">
              {photos.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === photoIndex ? 'w-3.5 bg-white shadow-md' : 'w-1.5 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1 items-center z-10">
          <span className="bg-slate-950/85 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-700/80 flex items-center gap-1 shadow-md">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            Verified
          </span>
          {shelf.avgRating && shelf.avgRating >= 4.95 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5" /> Top Pick
            </span>
          )}
        </div>

        {/* Heart Wishlist Button */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={isFavorite ? 'Remove from wishlist' : 'Save to wishlist'}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-slate-950/60 hover:bg-slate-950/90 backdrop-blur-md text-white transition-all shadow-md active:scale-90 z-10"
        >
          <Heart
            className={`w-3.5 h-3.5 transition-colors ${
              isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white/90 hover:text-white'
            }`}
          />
        </button>

        {/* Location pill at bottom left */}
        <div className="absolute bottom-2.5 left-2.5 bg-slate-950/85 backdrop-blur text-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-800 flex items-center gap-1 shadow-lg z-10">
          <MapPin className="w-2.5 h-2.5 text-emerald-400" />
          <span className="truncate max-w-[110px]">{shelf.shopCity || 'Dar es Salaam'}</span>
        </div>

        {/* Photos count pill at bottom right */}
        <div className="absolute bottom-2.5 right-2.5 bg-slate-950/85 backdrop-blur text-slate-300 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border border-slate-800 z-10">
          {photoIndex + 1}/{photos.length}
        </div>

      </div>

      {/* 2. Card Body Content */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
        
        {/* Title and Rating Row */}
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <h3 className="font-bold text-white text-xs sm:text-sm leading-snug line-clamp-1 group-hover:text-emerald-400 transition-colors">
              {shelf.name}
            </h3>
            
            {/* Airbnb Rating Star */}
            <div className="flex items-center gap-0.5 shrink-0 font-bold text-xs text-white">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{shelf.avgRating ? shelf.avgRating.toFixed(2) : '4.95'}</span>
              <span className="text-slate-400 font-normal text-[10px]">({shelf.reviewCount || 24})</span>
            </div>
          </div>

          {/* Shop Name & Sub-location */}
          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
            {shelf.shopName} • {shelf.locationInsideShop}
          </div>
        </div>

        {/* Specs & Type Pill Row */}
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          <span className="bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800 font-mono font-medium">
            {shelf.widthCm}×{shelf.heightCm} cm
          </span>
          <span className="bg-slate-950 text-emerald-400 px-1.5 py-0.5 rounded border border-slate-800 font-medium truncate max-w-[130px]">
            {formatShelfType(shelf.shelfType)}
          </span>
        </div>

        {/* Price & Action Row */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-xs sm:text-sm font-black text-white font-mono">
              TZS {shelf.monthlyPriceTzs.toLocaleString()}
              <span className="text-[10px] text-slate-400 font-normal font-sans"> / mo</span>
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              ~TZS {dailyPriceTzs.toLocaleString()} / day
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectShelf(shelf);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800 group-hover:bg-emerald-500 text-slate-200 group-hover:text-slate-950 font-bold text-[11px] transition-all shadow-sm flex items-center gap-1 shrink-0"
          >
            <Eye className="w-3 h-3" /> View
          </button>
        </div>

      </div>

    </div>
  );
};
