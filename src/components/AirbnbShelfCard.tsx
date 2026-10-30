import React from 'react';
import { Heart, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Shelf } from '../types/index.js';
import { formatShelfType } from './shelfFacts.js';

interface AirbnbShelfCardProps {
  shelf: Shelf;
  onSelectShelf: (shelf: Shelf) => void;
  onBookDirect?: (shelf: Shelf) => void;
  shopName?: string;
  hostName?: string;
  isFeatured?: boolean;
  isVerified?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  variant?: 'default' | 'airbnb';
}

export const AirbnbShelfCard: React.FC<AirbnbShelfCardProps> = ({
  shelf,
  onSelectShelf,
  shopName,
  isFeatured = false,
  isVerified = false,
  isFavorite = false,
  onToggleFavorite,
  variant = 'airbnb',
}) => {
  const photo = shelf.photos?.[0] || 'https://images.unsplash.com/photo-1583258292688-d02132382025?w=800';
  const displayShop = shopName || shelf.shopName || 'Retail shop';
  const city = shelf.shopCity || 'Tanzania';
  const hasRating = (shelf.avgRating ?? 0) > 0;
  const reviewCount = shelf.reviewCount ?? 0;
  const isAirbnb = variant === 'airbnb';

  const openShelf = () => onSelectShelf(shelf);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.();
  };

  const headline = isAirbnb
    ? `${formatShelfType(shelf.shelfType)} in ${city}`
    : shelf.name;

  const subline = isAirbnb ? displayShop : `${displayShop} · ${city}`;

  return (
    <article className={`flex flex-col gap-2 ${isAirbnb ? '' : 'rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-colors'}`}>
      <div className={`relative aspect-square w-full overflow-hidden bg-slate-950 ${isAirbnb ? 'rounded-xl' : ''}`}>
        <button type="button" onClick={openShelf} className="absolute inset-0 w-full h-full cursor-pointer">
          <img src={photo} alt={shelf.name} loading="lazy" className="w-full h-full object-cover" />
        </button>

        <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
          {isFeatured && (
            <span
              className="w-7 h-7 rounded-full bg-white/95 shadow-sm flex items-center justify-center"
              title="Featured shelf"
              aria-label="Featured shelf"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.25} />
            </span>
          )}
          {isVerified && (
            <span
              className="w-7 h-7 rounded-full bg-white/95 shadow-sm flex items-center justify-center"
              title="Verified shop"
              aria-label="Verified shop"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.25} />
            </span>
          )}
        </div>

        {onToggleFavorite && (
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={isFavorite ? 'Remove favourite' : 'Add to favourites'}
            aria-pressed={isFavorite}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-transform active:scale-90"
          >
            <Heart
              strokeWidth={2}
              className={`w-[22px] h-[22px] drop-shadow-md ${
                isFavorite
                  ? 'fill-rose-500 text-rose-500'
                  : 'fill-black/20 text-white stroke-white'
              }`}
            />
          </button>
        )}
      </div>

      <button
        type="button"
        id={`shelf-card-${shelf.id}`}
        onClick={openShelf}
        className="text-left cursor-pointer flex flex-col w-full gap-0.5 px-0.5"
      >
        {!isAirbnb && (
          <h3 className="font-bold text-white text-xs sm:text-sm leading-snug line-clamp-2">{shelf.name}</h3>
        )}

        <p className={`font-semibold text-[var(--shelfy-fg)] leading-snug line-clamp-2 ${isAirbnb ? 'text-sm' : 'text-xs sm:text-sm'}`}>
          {isAirbnb ? headline : subline}
        </p>

        {isAirbnb && (
          <p className="text-xs text-[var(--shelfy-muted)] line-clamp-1">{shelf.name} · {displayShop}</p>
        )}

        {!isAirbnb && (
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] min-h-[1rem]">
            {hasRating ? (
              <>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                <span className="font-bold text-white">{shelf.avgRating!.toFixed(2)}</span>
                <span className="text-slate-500">({reviewCount})</span>
              </>
            ) : (
              <span className="text-slate-500">New · No reviews yet</span>
            )}
          </div>
        )}

        <div className={`flex items-center justify-between gap-2 ${isAirbnb ? 'text-sm mt-0.5' : 'pt-0.5'}`}>
          <span className={`text-[var(--shelfy-fg)] ${isAirbnb ? 'font-normal text-[13px]' : 'whitespace-nowrap tracking-tight text-[10px] sm:text-sm font-black font-mono'}`}>
            TZS {shelf.monthlyPriceTzs.toLocaleString()}
            <span className="text-[var(--shelfy-muted)] font-normal"> / month</span>
          </span>
          {hasRating ? (
            <span className="inline-flex items-center gap-0.5 shrink-0 text-[13px] font-medium text-[var(--shelfy-fg)]">
              <Star className="w-3 h-3 fill-[var(--shelfy-fg)] text-[var(--shelfy-fg)]" />
              {shelf.avgRating!.toFixed(1)}
              {reviewCount > 0 && !isAirbnb && (
                <span className="text-slate-500 text-[10px]">({reviewCount})</span>
              )}
            </span>
          ) : isAirbnb ? (
            <span className="text-[11px] text-slate-500 shrink-0">New</span>
          ) : null}
        </div>
      </button>
    </article>
  );
};
