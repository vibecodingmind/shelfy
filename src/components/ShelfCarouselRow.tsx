import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Shelf, Shop } from '../types/index.js';
import { AirbnbShelfCard } from './AirbnbShelfCard.js';
import { isFeaturedShelf, isVerifiedShelf } from '../lib/shelfCardMeta.js';

/** Desktop (lg+): 7 visible; tablet: 3; mobile: 2. Uses scroller width, not viewport. */
function cardsPerViewForWidth(width: number): number {
  if (width >= 1024) return 7;
  if (width >= 640) return 3;
  return 2;
}

function flexClassForCardsPerView(n: number): string {
  switch (n) {
    case 2:
      return 'flex-[0_0_calc((100%-1rem)/2)]';
    case 3:
      return 'flex-[0_0_calc((100%-2rem)/3)]';
    case 4:
      return 'flex-[0_0_calc((100%-3rem)/4)]';
    case 7:
      return 'flex-[0_0_calc((100%-6rem)/7)]';
    default:
      return 'flex-[0_0_42vw] sm:flex-[0_0_28vw] md:flex-[0_0_22vw] lg:flex-[0_0_18vw] xl:flex-[0_0_15vw] max-w-[280px] min-w-[140px]';
  }
}

interface ShelfCarouselRowProps {
  title: string;
  shelves: Shelf[];
  shopById: Map<string, Shop>;
  onSelectShelf: (shelf: Shelf) => void;
  isFavorite: (shelfId: string) => boolean;
  onToggleFavorite: (shelfId: string) => void;
  onTitleClick?: () => void;
  /** Fixed visible count (ignored when responsiveCards is true) */
  cardsPerView?: number;
  /** 2 / 3 / 7 from container width (640 / 1024 breakpoints) */
  responsiveCards?: boolean;
}

export const ShelfCarouselRow: React.FC<ShelfCarouselRowProps> = ({
  title,
  shelves,
  shopById,
  onSelectShelf,
  isFavorite,
  onToggleFavorite,
  onTitleClick,
  cardsPerView,
  responsiveCards = false,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [visibleCount, setVisibleCount] = useState(() =>
    responsiveCards ? 2 : cardsPerView ?? 0
  );

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (responsiveCards) {
      setVisibleCount(cardsPerViewForWidth(el.clientWidth));
    }
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [responsiveCards]);

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
      ro.disconnect();
    };
  }, [shelves, updateArrows]);

  const effectiveCount = responsiveCards ? visibleCount : cardsPerView ?? 0;

  const scrollByPage = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step =
      effectiveCount > 0 ? (el.clientWidth / effectiveCount) * Math.min(3, effectiveCount) : el.clientWidth * 0.85;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  if (shelves.length === 0) return null;

  const cardFlexClass = responsiveCards || cardsPerView
    ? flexClassForCardsPerView(responsiveCards ? visibleCount : cardsPerView!)
    : flexClassForCardsPerView(0);

  return (
    <section className="w-full min-w-0 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onTitleClick}
          disabled={!onTitleClick}
          className={`group text-left min-w-0 ${onTitleClick ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <h2 className="text-base sm:text-lg font-semibold text-[var(--shelfy-fg)] truncate flex items-center gap-0.5">
            <span className="group-hover:underline underline-offset-4 decoration-[var(--shelfy-muted)]">{title}</span>
            {onTitleClick && <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--shelfy-muted)] shrink-0" />}
          </h2>
        </button>

        {shelves.length > effectiveCount && effectiveCount > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              aria-label="Previous shelves"
              disabled={!canPrev}
              onClick={() => scrollByPage(-1)}
              className="w-8 h-8 rounded-full border border-[var(--shelfy-border)] bg-[var(--shelfy-bg)] flex items-center justify-center text-[var(--shelfy-fg)] hover:opacity-80 disabled:opacity-35 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Next shelves"
              disabled={!canNext}
              onClick={() => scrollByPage(1)}
              className="w-8 h-8 rounded-full border border-[var(--shelfy-border)] bg-[var(--shelfy-bg)] flex items-center justify-center text-[var(--shelfy-fg)] hover:opacity-80 disabled:opacity-35 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div
        ref={scrollerRef}
        className="flex w-full min-w-0 gap-4 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {shelves.map((shelf) => {
          const shop = shopById.get(shelf.shopId);
          return (
            <div key={shelf.id} className={`snap-start min-w-0 ${cardFlexClass}`}>
              <AirbnbShelfCard
                shelf={shelf}
                shopName={shop?.name || shelf.shopName}
                hostName={shop?.hostName}
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
    </section>
  );
};
