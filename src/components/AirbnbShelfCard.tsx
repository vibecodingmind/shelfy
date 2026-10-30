import React from 'react';
import { Shelf } from '../types/index.js';

interface AirbnbShelfCardProps {
  shelf: Shelf;
  onSelectShelf: (shelf: Shelf) => void;
  onBookDirect?: (shelf: Shelf) => void;
}

export const AirbnbShelfCard: React.FC<AirbnbShelfCardProps> = ({ shelf, onSelectShelf }) => {
  const photo = shelf.photos?.[0] || 'https://images.unsplash.com/photo-1583258292688-d02132382025?w=800';

  return (
    <button
      type="button"
      id={`shelf-card-${shelf.id}`}
      onClick={() => onSelectShelf(shelf)}
      className="text-left cursor-pointer flex flex-col rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition-colors"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-950">
        <img src={photo} alt={shelf.name} loading="lazy" className="w-full h-full object-cover" />
      </div>
      <div className="p-2.5 sm:p-3 space-y-0.5">
        <h3 className="font-bold text-white text-xs sm:text-sm leading-snug line-clamp-2">{shelf.name}</h3>
        <p className="text-[11px] text-slate-400 line-clamp-1">{shelf.shopCity}</p>
        <p className="whitespace-nowrap text-[11px] sm:text-sm font-black text-white font-mono pt-1">
          TZS {shelf.monthlyPriceTzs.toLocaleString()}/month
        </p>
      </div>
    </button>
  );
};
