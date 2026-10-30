import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Shelf, Shop } from '../types/index.js';
import { BrowseGroup } from '../lib/shelfBrowseGroups.js';
import { AirbnbShelfCard } from './AirbnbShelfCard.js';
import { isFeaturedShelf, isVerifiedShelf } from '../lib/shelfCardMeta.js';
import { capRailShelves } from '../lib/shelfBrowseGroups.js';

interface ShelfBrowseSectionProps {
  sectionKind: 'category' | 'type';
  groups: BrowseGroup[];
  activeGroupId: string;
  onGroupChange: (groupId: string) => void;
  allFilteredShelves: Shelf[];
  shopById: Map<string, Shop>;
  onSelectShelf: (shelf: Shelf) => void;
  isFavorite: (shelfId: string) => boolean;
  onToggleFavorite: (shelfId: string) => void;
  onSeeAll?: (groupId: string) => void;
}

function rowTitle(kind: 'category' | 'type', group: BrowseGroup): string {
  if (group.id === '__all__') {
    return kind === 'category' ? 'Popular shelves by category' : 'Popular shelves by type';
  }
  if (kind === 'category') return `Shelves for ${group.label}`;
  return `${group.label} shelves`;
}

export const ShelfBrowseSection: React.FC<ShelfBrowseSectionProps> = ({
  sectionKind,
  groups,
  activeGroupId,
  onGroupChange,
  allFilteredShelves,
  shopById,
  onSelectShelf,
  isFavorite,
  onToggleFavorite,
  onSeeAll,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];
  const shelves = useMemo(() => {
    if (!activeGroup) return [];
    if (sectionKind === 'category') {
      if (activeGroup.id === '__all__') return capRailShelves(allFilteredShelves);
      const cat = activeGroup.id.toLowerCase();
      return capRailShelves(
        allFilteredShelves.filter((s) =>
          s.allowedCategories.some((c) => c.toLowerCase() === cat || c.toLowerCase().includes(cat))
        )
      );
    }
    if (activeGroup.id === '__all__') return capRailShelves(allFilteredShelves);
    return capRailShelves(allFilteredShelves.filter((s) => s.shelfType === activeGroup.id));
  }, [activeGroup, allFilteredShelves, sectionKind]);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [shelves, updateArrows]);

  const scrollByPage = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  if (groups.length <= 1 && shelves.length === 0) return null;

  const title = activeGroup ? rowTitle(sectionKind, activeGroup) : 'Browse shelves';

  const groupChips =
    groups.length > 1 ? (
      <div className="flex flex-nowrap items-center gap-1.5 min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => {
          const active = activeGroupId === g.id;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onGroupChange(g.id)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold transition-colors ${
                active ? 'bg-[var(--shelfy-fg)] text-[var(--shelfy-bg)]' : 'bg-[var(--shelfy-chip-idle)] text-[var(--shelfy-chip-idle-fg)] hover:opacity-90'
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 sm:gap-3 min-h-9">
        <button
          type="button"
          onClick={() => onSeeAll?.(activeGroupId)}
          className="group text-left shrink-0 max-w-[38%] sm:max-w-none sm:shrink cursor-pointer"
        >
          <h2 className="text-sm sm:text-lg font-semibold text-[var(--shelfy-fg)] truncate sm:whitespace-nowrap">
            <span className="group-hover:underline underline-offset-4 decoration-[var(--shelfy-muted)]">{title}</span>
            <ChevronRight className="inline w-4 h-4 sm:w-5 sm:h-5 text-[var(--shelfy-muted)] align-middle ml-0.5" />
          </h2>
        </button>

        {groupChips}

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            type="button"
            aria-label="Previous"
            disabled={!canPrev}
            onClick={() => scrollByPage(-1)}
            className="w-8 h-8 rounded-full border border-[var(--shelfy-border)] bg-[var(--shelfy-bg)] flex items-center justify-center text-[var(--shelfy-fg)] hover:opacity-80 disabled:opacity-35 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={!canNext}
            onClick={() => scrollByPage(1)}
            className="w-8 h-8 rounded-full border border-[var(--shelfy-border)] bg-[var(--shelfy-bg)] flex items-center justify-center text-[var(--shelfy-fg)] hover:opacity-80 disabled:opacity-35 disabled:pointer-events-none"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {shelves.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">No shelves in this group with current filters.</p>
      ) : (
        <div
          ref={scrollerRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {shelves.map((shelf) => {
            const shop = shopById.get(shelf.shopId);
            return (
              <div
                key={shelf.id}
                className="snap-start shrink-0 w-[42vw] sm:w-[28vw] md:w-[22vw] lg:w-[18vw] xl:w-[15vw] max-w-[280px] min-w-[140px]"
              >
                <AirbnbShelfCard
                  shelf={shelf}
                  shopName={shop?.name || shelf.shopName}
                  isFeatured={isFeaturedShelf(shelf)}
                  isVerified={isVerifiedShelf(shelf, shop)}
                  isFavorite={isFavorite(shelf.id)}
                  onToggleFavorite={() => onToggleFavorite(shelf.id)}
                  onSelectShelf={onSelectShelf}
                  variant="airbnb"
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
