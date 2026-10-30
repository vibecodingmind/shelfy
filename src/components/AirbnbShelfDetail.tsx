/**
 * Shelfy — Public shelf detail (monthly rental, theme-aware)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Heart,
  Star,
  Flag,
  Eye,
  Upload,
} from 'lucide-react';
import { Shelf, Shop, User, Review } from '../types/index.js';
import { BookedRange } from './AvailabilityCalendar.js';
import { api } from '../lib/api.js';
import { formatShelfType } from './shelfFacts.js';
import { formatInStoreLabelDisplay } from '../lib/shelfInStoreLabel.js';
import { openStreetMapUrl, resolveShopCoords } from '../lib/shopMapLocation.js';
import { ShelfShopLocationSection } from './shelf-detail/ShelfShopLocationSection.js';
import { ShelfDetailGallery } from './shelf-detail/ShelfDetailGallery.js';
import { ShelfDetailSpecs } from './shelf-detail/ShelfDetailSpecs.js';
import { ShelfDetailTrustPanel } from './shelf-detail/ShelfDetailTrustPanel.js';
import { ShelfBookingWidget } from './shelf-detail/ShelfBookingWidget.js';
import { LegalDocumentModal, LegalModalSlug } from './LegalDocumentModal.js';
import { ShelfCarouselRow } from './ShelfCarouselRow.js';
import { SiteFooter } from './SiteFooter.js';
import {
  addMonthsIsoDate,
  findEarliestAvailableStart,
  isDayOccupied,
  rangeOverlapsAnyBooking,
  todayIsoDate,
} from '../lib/monthlyRentalDates.js';

const STOCK_PHOTOS = [
  'https://images.unsplash.com/photo-1583258292688-d02132382025?w=1000',
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1000',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1000',
  'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1000',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000',
  'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1000&q=80',
  'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1000&q=80',
  'https://images.unsplash.com/photo-1583258292688-d02132382025?w=1000&q=80',
];

interface AirbnbShelfDetailProps {
  shelf: Shelf;
  shops?: Shop[];
  currentUser: User | null;
  allShelves?: Shelf[];
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onBack: () => void;
  onLoginClick?: () => void;
  onInitiateBooking: (shelf: Shelf, startDate: string, endDate: string, durationMonths: number, selectedCategory: string) => void;
  onOpenHostChat?: (shopId: string, shelfId?: string, shelfName?: string) => void;
  onOpenRelatedShelf?: (shelf: Shelf) => void;
  isFavoriteShelf?: (id: string) => boolean;
  onToggleFavoriteShelf?: (id: string) => void;
}

function ratingBreakdown(reviews: Review[]) {
  const counts = [0, 0, 0, 0, 0];
  reviews.forEach((r) => {
    const i = Math.min(5, Math.max(1, r.rating)) - 1;
    counts[i] += 1;
  });
  return counts;
}

export const AirbnbShelfDetail: React.FC<AirbnbShelfDetailProps> = ({
  shelf: shelfProp,
  shops = [],
  currentUser,
  allShelves = [],
  isFavorite = false,
  onToggleFavorite,
  onBack: _onBack,
  onLoginClick,
  onInitiateBooking,
  onOpenHostChat,
  onOpenRelatedShelf,
  isFavoriteShelf,
  onToggleFavoriteShelf,
}) => {
  const [detailShelf, setDetailShelf] = useState<Shelf>(shelfProp);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [activePhotoModalIndex, setActivePhotoModalIndex] = useState(0);
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [activeDurationMonths, setActiveDurationMonths] = useState<number>(1);
  const [isDateRangeValid, setIsDateRangeValid] = useState<boolean>(false);
  const [initialDatesApplied, setInitialDatesApplied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>(shelfProp.allowedCategories?.[0] || '');
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [shopDetail, setShopDetail] = useState<Shop | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookingError, setBookingError] = useState('');
  const [legalModalSlug, setLegalModalSlug] = useState<LegalModalSlug | null>(null);

  const openPolicy = useCallback((slug: LegalModalSlug) => {
    setLegalModalSlug(slug);
  }, []);

  useEffect(() => {
    setDetailShelf(shelfProp);
    setSelectedCategory(shelfProp.allowedCategories?.[0] || '');
    setStartDate('');
    setEndDate('');
    setDurationMonths(1);
    setActiveDurationMonths(1);
    setIsDateRangeValid(false);
    setInitialDatesApplied(false);
    setBookingError('');
  }, [shelfProp.id]);

  const shelf = detailShelf;

  useEffect(() => {
    const shopName = shelf.shopName || shopDetail?.name || 'Shelfy';
    const inStore = formatInStoreLabelDisplay(shelf);
    const hasLabel = inStore && !inStore.includes('not set');
    document.title = hasLabel
      ? `${shelf.name} · ${inStore} · ${shopName} · Shelfy`
      : `${shelf.name} · ${shopName} · Shelfy`;
    return () => {
      document.title = 'Shelfy';
    };
  }, [shelf.name, shelf.locationInsideShop, shelf.shopName, shopDetail?.name]);

  useEffect(() => {
    let isMounted = true;
    const loadAvailability = async () => {
      setIsLoadingAvailability(true);
      const res = await api.getShelfAvailability(shelf.id);
      if (isMounted && res.success && res.data) {
        setBookedRanges(res.data.bookedRanges || []);
      }
      if (isMounted) setIsLoadingAvailability(false);
    };
    loadAvailability();
    return () => {
      isMounted = false;
    };
  }, [shelf.id]);

  useEffect(() => {
    let isMounted = true;
    api.getShelfById(shelf.id).then((res) => {
      if (!isMounted || !res.success || !res.data) return;
      const data = res.data;
      setDetailShelf((prev) => ({
        ...prev,
        ...data,
        photos: data.photos?.length ? data.photos : prev.photos,
      }));
      setShopDetail(data.shop || null);
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    });
    return () => {
      isMounted = false;
    };
  }, [shelf.id]);

  const photos =
    shelf.photos && shelf.photos.length > 0 ? shelf.photos : STOCK_PHOTOS;

  const monthlyRate = shelf.monthlyPriceTzs;
  const shopById = useMemo(() => new Map(shops.map((s) => [s.id, s])), [shops]);

  const otherShopShelves = allShelves.filter(
    (s) => s.shopId === shelf.shopId && s.id !== shelf.id && s.availabilityStatus === 'AVAILABLE'
  );
  const similarShelves = allShelves
    .filter(
      (s) =>
        s.id !== shelf.id &&
        s.availabilityStatus === 'AVAILABLE' &&
        (s.shopCity === shelf.shopCity || s.shelfType === shelf.shelfType)
    )
    .slice(0, 20);

  const isHostPreview = currentUser?.role === 'HOST' && shopDetail?.hostId === currentUser.id;

  const handleCalendarRangeChange = (start: string, end: string, months: number, isValid: boolean) => {
    setStartDate(start);
    setEndDate(end);
    setDurationMonths(months);
    setActiveDurationMonths(months);
    setIsDateRangeValid(isValid);
    if (isValid) setBookingError('');
  };

  const applyDurationPreset = (months: number) => {
    setActiveDurationMonths(months);
    const today = todayIsoDate();
    const baseStart =
      startDate && startDate >= today && !isDayOccupied(startDate, bookedRanges)
        ? startDate
        : findEarliestAvailableStart(bookedRanges, months, today);

    if (!baseStart) {
      setBookingError(`No ${months}-month opening available soon. Try a shorter period.`);
      setStartDate('');
      setEndDate('');
      setIsDateRangeValid(false);
      return;
    }

    const end = addMonthsIsoDate(baseStart, months);
    if (rangeOverlapsAnyBooking(baseStart, end, bookedRanges)) {
      setBookingError('That period overlaps another booking.');
      setIsDateRangeValid(false);
      return;
    }

    setBookingError('');
    handleCalendarRangeChange(baseStart, end, months, true);
  };

  useEffect(() => {
    if (isLoadingAvailability || initialDatesApplied) return;
    applyDurationPreset(1);
    setInitialDatesApplied(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when availability loads per shelf
  }, [isLoadingAvailability, shelf.id, initialDatesApplied]);

  const handleBookingSubmit = () => {
    if (!currentUser) {
      onLoginClick?.();
      return;
    }
    const categories = shelf.allowedCategories || [];
    if (!categories.length) {
      setBookingError('This listing has no permitted categories. Contact support.');
      return;
    }
    if (!selectedCategory || !categories.includes(selectedCategory)) {
      setBookingError('Select a product category that matches this shelf.');
      return;
    }
    if (!startDate || !endDate) {
      setBookingError('Choose a start date and rental length (1 mo, 3 mo, 6 mo, or 1 yr).');
      return;
    }
    if (!isDateRangeValid || !endDate) {
      setBookingError('Those dates are not available. Change the start date or duration.');
      return;
    }
    setBookingError('');
    onInitiateBooking(shelf, startDate, endDate, durationMonths, selectedCategory);
  };

  const handleContactHost = () => {
    if (!currentUser) {
      onLoginClick?.();
      return;
    }
    if (shelf.shopId && onOpenHostChat) onOpenHostChat(shelf.shopId, shelf.id, shelf.name);
  };

  const handleReportListing = () => {
    const reason = window.prompt('Briefly describe the issue with this listing (photos, location, etc.):');
    if (!reason?.trim()) return;
    const subject = encodeURIComponent(`Report listing: ${shelf.name} (${shelf.id})`);
    const body = encodeURIComponent(`${reason.trim()}\n\nURL: ${window.location.href}`);
    window.location.href = `mailto:hello@shelfy.co.tz?subject=${subject}&body=${body}`;
  };

  const resolvedCoords = resolveShopCoords(shopDetail, shelf, shopById);
  const mapsUrl = resolvedCoords
    ? openStreetMapUrl(resolvedCoords.latitude, resolvedCoords.longitude)
    : null;
  const inStoreLabelDisplay = formatInStoreLabelDisplay(shelf);

  const reviewCount = shelf.reviewCount ?? reviews.length;
  const breakdown = ratingBreakdown(reviews);

  const favCheck = isFavoriteShelf ?? (() => false);
  const favToggle = onToggleFavoriteShelf ?? (() => {});

  const handleStartDateChange = (iso: string) => {
    if (!iso) return;
    const months = activeDurationMonths || durationMonths || 1;
    if (isDayOccupied(iso, bookedRanges)) {
      setBookingError('That start date is already booked. Pick another day.');
      handleCalendarRangeChange(iso, '', months, false);
      return;
    }
    const end = addMonthsIsoDate(iso, months);
    if (rangeOverlapsAnyBooking(iso, end, bookedRanges)) {
      setBookingError('That period overlaps another booking. Try a shorter duration or later start.');
      handleCalendarRangeChange(iso, '', months, false);
      return;
    }
    setBookingError('');
    handleCalendarRangeChange(iso, end, months, true);
  };

  const locationLabel = [shelf.shopCity || shopDetail?.city, shopDetail?.region].filter(Boolean).join(', ');

  const bookingWidgetProps = {
    shelf,
    shopName: shopDetail?.name,
    reviewCount,
    currentUser,
    startDate,
    endDate,
    durationMonths,
    activeDurationMonths,
    selectedCategory,
    onCategoryChange: setSelectedCategory,
    onDurationPreset: applyDurationPreset,
    onStartDateChange: handleStartDateChange,
    minStartDate: todayIsoDate(),
    monthlyRate,
    bookingError,
    onReserve: handleBookingSubmit,
    onLogin: () => onLoginClick?.(),
    onContactHost:
      shelf.shopId && shopDetail?.hostId !== currentUser?.id ? handleContactHost : undefined,
  };

  return (
    <div
      id="airbnb-shelf-detail"
      className="min-h-screen bg-[var(--shelfy-bg)] text-[var(--shelfy-fg)] font-sans pb-40 md:pb-28 lg:pb-20 overflow-visible"
    >
      {isHostPreview && (
        <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-center text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          Preview as vendor — customers see this page when browsing.
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Airbnb order: title + share/save, subtitle line, then photos */}
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight leading-[1.15] text-[var(--shelfy-fg)]">
                {shelf.name}
              </h1>
              <p className="mt-2 text-sm font-semibold text-[var(--shelfy-fg)]">
                <span className="text-[var(--shelfy-muted)] font-medium">In-store:</span> {inStoreLabelDisplay}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[var(--shelfy-fg)]">
                {shelf.avgRating ? (
                  <>
                    <span className="inline-flex items-center gap-0.5 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-[var(--shelfy-fg)] text-[var(--shelfy-fg)]" />
                      {shelf.avgRating.toFixed(2)}
                    </span>
                    <span className="text-[var(--shelfy-muted)]">·</span>
                    <button type="button" className="font-semibold underline underline-offset-2">
                      {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                    </button>
                    <span className="text-[var(--shelfy-muted)]">·</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-[var(--shelfy-muted)]">New listing</span>
                    <span className="text-[var(--shelfy-muted)]">·</span>
                  </>
                )}
                <span className="text-[var(--shelfy-muted)]">{shelf.shopName || shopDetail?.name}</span>
                {locationLabel && (
                  <>
                    <span className="text-[var(--shelfy-muted)]">·</span>
                    {mapsUrl ? (
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline underline-offset-2 truncate max-w-[min(100%,320px)] hover:opacity-80"
                      >
                        {locationLabel}
                      </a>
                    ) : (
                      <span className="font-semibold truncate max-w-[min(100%,320px)]">{locationLabel}</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4 shrink-0 sm:pt-1">
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: shelf.name, url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4 hover:opacity-80"
              >
                <Upload className="w-4 h-4" />
                Share
              </button>
              <button
                type="button"
                onClick={() => onToggleFavorite?.()}
                aria-label={isFavorite ? 'Remove favourite' : 'Save to favourites'}
                aria-pressed={isFavorite}
                className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4 hover:opacity-80"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                Save
              </button>
            </div>
          </div>
        </header>

        <ShelfDetailGallery
          shelfName={shelf.name}
          photos={photos}
          showAllPhotos={showAllPhotos}
          activePhotoModalIndex={activePhotoModalIndex}
          onOpenPhoto={(i) => {
            setActivePhotoModalIndex(i);
            setShowAllPhotos(true);
          }}
          onOpenAll={() => setShowAllPhotos(true)}
          onCloseAll={() => setShowAllPhotos(false)}
          onSelectModalIndex={setActivePhotoModalIndex}
        />

        <div className="pt-6 lg:hidden">
          <ShelfBookingWidget variant="compact" {...bookingWidgetProps} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-x-12 gap-y-10 pt-10 mt-2 border-t border-[var(--shelfy-border)] items-start">
          <div className="min-w-0 space-y-10 order-1">
            <section className="border-b border-[var(--shelfy-border)] pb-8 space-y-3">
              <h2 className="text-[22px] font-semibold">About this shelf</h2>
              <p className="text-base text-[var(--shelfy-fg)] leading-relaxed whitespace-pre-wrap">
                {shelf.description || 'The host has not added a description for this shelf yet.'}
              </p>
            </section>

            <ShelfShopLocationSection shelf={shelf} shop={shopDetail} shopsById={shopById} />

            <ShelfDetailSpecs shelf={shelf} />

            <ShelfDetailTrustPanel shelfId={shelf.id} />

            {otherShopShelves.length > 0 && (
              <div className="border-b border-[var(--shelfy-border)] pb-8">
                <ShelfCarouselRow
                  title="More shelves at this shop"
                  shelves={otherShopShelves}
                  shopById={shopById}
                  onSelectShelf={(s) => onOpenRelatedShelf?.(s)}
                  isFavorite={favCheck}
                  onToggleFavorite={favToggle}
                  responsiveCards
                />
              </div>
            )}

            <div id="policies" className="border-b border-[var(--shelfy-border)] pb-8 space-y-2 scroll-mt-28">
              <h3 className="text-lg font-bold">Booking policies</h3>
              <p className="text-xs text-[var(--shelfy-muted)] leading-relaxed">
                Monthly rentals are billed in full-month blocks. Payment is held in escrow until the host confirms
                placement. Cancellations follow our published policy based on how far ahead you cancel.
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => openPolicy('cancellation')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Cancellation policy
                </button>
                <button
                  type="button"
                  onClick={() => openPolicy('payout')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Payout & escrow
                </button>
                <button
                  type="button"
                  onClick={() => openPolicy('terms')}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  Terms of service
                </button>
              </div>
            </div>

            <div id="vendor-reviews" className="space-y-4 scroll-mt-28">
              <h3 className="text-lg font-bold">Vendor reviews</h3>
              {reviews.length === 0 ? (
                <p className="text-sm text-[var(--shelfy-muted)]">
                  No reviews yet. Trust scores and verification help you decide in the meantime.
                </p>
              ) : (
                <>
                  {reviews.length >= 3 && (
                    <div className="space-y-1 max-w-xs">
                      {[5, 4, 3, 2, 1].map((stars) => {
                        const count = breakdown[stars - 1];
                        const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                        return (
                          <div key={stars} className="flex items-center gap-2 text-[11px]">
                            <span className="w-3">{stars}</span>
                            <div className="flex-1 h-1.5 bg-[var(--shelfy-input-bg)] rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[var(--shelfy-muted)] w-6">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-[var(--shelfy-elevated)] p-4 rounded-2xl border border-[var(--shelfy-border)] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs">{review.reviewerName}</span>
                          <span className="text-[11px] text-[var(--shelfy-muted)]">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <p className="text-xs text-[var(--shelfy-muted)] leading-normal">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleReportListing}
              className="text-xs text-[var(--shelfy-muted)] hover:text-rose-500 flex items-center gap-1.5 pt-4"
            >
              <Flag className="w-3.5 h-3.5" /> Report inaccurate photos or listing
            </button>

            {similarShelves.length > 0 && (
              <section className="pt-10 border-t border-[var(--shelfy-border)] w-full min-w-0">
                <ShelfCarouselRow
                  title="Similar shelves"
                  shelves={similarShelves}
                  shopById={shopById}
                  onSelectShelf={(s) => onOpenRelatedShelf?.(s)}
                  isFavorite={favCheck}
                  onToggleFavorite={favToggle}
                  responsiveCards
                />
              </section>
            )}
          </div>

          <aside
            id="shelf-booking-panel"
            className="order-2 hidden lg:block w-full min-w-0 lg:sticky lg:top-[calc(var(--shelfy-header-height)+0.75rem)] lg:self-start lg:z-20 scroll-mt-24 max-h-[calc(100vh-var(--shelfy-header-height)-1.5rem)] overflow-y-auto overscroll-behavior-contain"
          >
            <ShelfBookingWidget variant="sticky" {...bookingWidgetProps} />
          </aside>
        </div>

        <SiteFooter />
      </div>

      <div className="lg:hidden">
        <ShelfBookingWidget variant="mobile" {...bookingWidgetProps} />
      </div>

      <LegalDocumentModal slug={legalModalSlug} onClose={() => setLegalModalSlug(null)} />
    </div>
  );
};
