/**
 * Shelfy 🇹🇿 — Airbnb-Style Horizontal List Card View
 */

import React, { useState } from 'react';
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Star,
  MapPin,
  CheckCircle2,
  TrendingUp,
  Eye,
  Store,
  Sparkles,
} from 'lucide-react';
import { Shelf } from '../types/index.js';

interface AirbnbShelfListCardProps {
  shelf: Shelf;
  onSelectShelf: (shelf: Shelf) => void;
  onBookDirect?: (shelf: Shelf) => void;
}

export const AirbnbShelfListCard: React.FC<AirbnbShelfListCardProps> = ({
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
      case 'EYE_LEVEL': return 'Eye-Level Display';
      case 'COUNTER_DISPLAY': return 'Checkout Counter Stand';
      case 'ENTRANCE_DISPLAY': return 'Lobby Entrance Stand';
      case 'TOP_SHELF': return 'Top Shelf Rack';
      case 'BOTTOM_SHELF': return 'Bottom Shelf';
      case 'REFRIGERATED': return 'Chilled Cooler';
      default: return type.replace('_', ' ');
    }
  };

  return (
    <div
      id={`shelf-list-card-${shelf.id}`}
      onClick={() => onSelectShelf(shelf)}
      className="group cursor-pointer flex flex-col sm:flex-row rounded-2xl overflow-hidden bg-slate-900/90 border border-slate-800 hover:border-slate-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 p-3.5 gap-4"
    >
      {/* 1. Left: Photo Carousel */}
      <div className="relative aspect-[4/3] sm:w-64 sm:h-44 shrink-0 overflow-hidden bg-slate-950 rounded-xl select-none">
        <img
          src={photos[photoIndex]}
          alt={shelf.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <span className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" /> Verified
          </span>
        </div>

        {/* Favorite Heart */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/60 hover:bg-slate-900 text-white backdrop-blur transition-transform active:scale-90"
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
        </button>

        {/* Prev / Next Carousel */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevPhoto}
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/80 text-white flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 carousel-nav transition-opacity border border-slate-700 hover:scale-110 touch-target"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextPhoto}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-950/80 text-white flex items-center justify-center opacity-70 sm:opacity-0 sm:group-hover:opacity-100 carousel-nav transition-opacity border border-slate-700 hover:scale-110 touch-target"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        {/* Photo Count Pill */}
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-slate-950/80 backdrop-blur text-[9px] font-mono text-slate-300">
          {photoIndex + 1}/{photos.length} photos
        </div>
      </div>

      {/* 2. Middle: Content & Specs */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          {/* Location & Rating Header */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-white font-bold">{shelf.shopCity || 'Tanzania'}</span>
              <span className="text-slate-600">•</span>
              <span className="truncate">{shelf.shopName}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-amber-400 shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>4.9</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
            {shelf.name}
          </h3>

          {/* Placement & Dimension Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold border border-slate-700">
              {formatShelfType(shelf.shelfType)}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono">
              {shelf.widthCm}×{shelf.heightCm}×{shelf.depthCm} cm
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5" /> High Foot Traffic
            </span>
          </div>

          <p className="text-xs text-slate-400 line-clamp-2 mb-2 font-normal">
            {shelf.description}
          </p>
        </div>

        {/* Categories preview */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
          <span className="text-slate-400 font-medium">Categories:</span>
          {shelf.allowedCategories.slice(0, 3).map((c, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* 3. Right: Pricing & CTA */}
      <div className="sm:w-48 shrink-0 flex flex-row sm:flex-col items-end justify-between border-t sm:border-t-0 sm:border-l border-slate-800/80 pt-3 sm:pt-0 sm:pl-4">
        <div className="text-left sm:text-right">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Rent Rate</div>
          <div className="text-base sm:text-lg font-black text-white">
            TZS {shelf.monthlyPriceTzs.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">
            ~TZS {Math.round(shelf.monthlyPriceTzs / 30).toLocaleString()} / day
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onBookDirect) onBookDirect(shelf);
            else onSelectShelf(shelf);
          }}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer mt-2 w-full text-center"
        >
          Book Space
        </button>
      </div>
    </div>
  );
};
