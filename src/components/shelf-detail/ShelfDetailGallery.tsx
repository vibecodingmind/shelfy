import React from 'react';
import { Maximize2, X } from 'lucide-react';

interface ShelfDetailGalleryProps {
  shelfName: string;
  photos: string[];
  showAllPhotos: boolean;
  activePhotoModalIndex: number;
  onOpenPhoto: (index: number) => void;
  onOpenAll: () => void;
  onCloseAll: () => void;
  onSelectModalIndex: (index: number) => void;
}

/** Airbnb-style hero: 1 large tile + 2×2 grid (5 visible), modal for all photos. */
export const ShelfDetailGallery: React.FC<ShelfDetailGalleryProps> = ({
  shelfName,
  photos,
  showAllPhotos,
  activePhotoModalIndex,
  onOpenPhoto,
  onOpenAll,
  onCloseAll,
  onSelectModalIndex,
}) => {
  const hero = photos[0];
  const grid = photos.slice(1, 5);
  while (grid.length < 4 && photos.length) {
    grid.push(photos[grid.length % photos.length]);
  }

  return (
    <>
      <div className="relative">
        <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2 h-[min(52vw,420px)] max-h-[480px] rounded-xl overflow-hidden">
          <button type="button" onClick={() => onOpenPhoto(0)} className="col-span-2 row-span-2 relative overflow-hidden group">
            <img src={hero} alt={shelfName} className="w-full h-full object-cover group-hover:brightness-95 transition-all" />
          </button>
          {grid.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onOpenPhoto(idx + 1)}
              className="relative overflow-hidden group"
            >
              <img src={url} alt="" className="w-full h-full object-cover group-hover:brightness-95 transition-all" />
            </button>
          ))}
        </div>

        {photos.length > 1 && (
          <button
            type="button"
            onClick={onOpenAll}
            className="hidden md:flex absolute bottom-4 right-4 bg-white text-neutral-900 px-4 py-2 rounded-lg text-sm font-semibold border border-neutral-200 shadow-md items-center gap-2 hover:shadow-lg z-10"
          >
            <Maximize2 className="w-4 h-4" />
            Show all photos
          </button>
        )}

        <div className="md:hidden relative rounded-xl overflow-hidden h-64">
          <button type="button" onClick={() => onOpenPhoto(0)} className="w-full h-full block">
            <img src={hero} alt={shelfName} className="w-full h-full object-cover" />
          </button>
          <button
            type="button"
            onClick={onOpenAll}
            className="absolute bottom-3 right-3 bg-[var(--shelfy-bg)]/95 text-[var(--shelfy-fg)] backdrop-blur px-3 py-1.5 rounded-lg text-xs font-bold border border-[var(--shelfy-border)] flex items-center gap-1.5"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {photos.length} photos
          </button>
        </div>
      </div>

      {showAllPhotos && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col p-4 sm:p-8">
          <div className="flex items-center justify-between pb-4 border-b border-white/20">
            <h3 className="text-sm font-bold text-white">{shelfName}</h3>
            <button type="button" onClick={onCloseAll} className="p-2 rounded-full bg-white/10 text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto max-w-4xl mx-auto w-full">
            <img src={photos[activePhotoModalIndex]} alt="" className="max-h-[70vh] w-auto object-contain rounded-2xl" />
            <div className="flex gap-2 mt-4 overflow-x-auto p-2 max-w-full">
              {photos.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectModalIndex(i)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 ${
                    i === activePhotoModalIndex ? 'border-white scale-105' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
