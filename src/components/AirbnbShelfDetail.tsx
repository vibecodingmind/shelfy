/**
 * Shelfy 🇹🇿 — Airbnb-Style Shelf Detail View
 * Complete with 5-photo mosaic gallery, host profile, highlights,
 * interactive double-booking prevention calendar, reviews breakdown, and sticky booking card.
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  Heart,
  Star,
  MapPin,
  CheckCircle2,
  Clock,
  Store,
  Info,
  Maximize2,
  X,
  CreditCard,
} from 'lucide-react';
import { Shelf, Shop, User, Review } from '../types/index.js';
import { AvailabilityCalendar, BookedRange } from './AvailabilityCalendar.js';
import { api } from '../lib/api.js';
import { TrustBadges } from './TrustBadges.js';
import { availabilityLabel, formatShelfType, formatShopType, shelfVolumeLitres } from './shelfFacts.js';

interface AirbnbShelfDetailProps {
  shelf: Shelf;
  currentUser: User | null;
  onBack: () => void;
  onInitiateBooking: (shelf: Shelf, startDate: string, endDate: string, durationMonths: number, selectedCategory: string) => void;
  onOpenHostChat?: (hostId: string) => void;
}

export const AirbnbShelfDetail: React.FC<AirbnbShelfDetailProps> = ({
  shelf,
  currentUser,
  onBack,
  onInitiateBooking,
  onOpenHostChat,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [activePhotoModalIndex, setActivePhotoModalIndex] = useState(0);

  // Availability & Booking State
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [isDateRangeValid, setIsDateRangeValid] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    shelf.allowedCategories?.[0] || 'Food & Beverages'
  );
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [shopDetail, setShopDetail] = useState<Shop | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  // Fetch real-time availability from backend
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
      setShopDetail(res.data.shop || null);
      setReviews(Array.isArray(res.data.reviews) ? res.data.reviews : []);
    });
    return () => {
      isMounted = false;
    };
  }, [shelf.id]);

  const photos = shelf.photos && shelf.photos.length > 0
    ? shelf.photos
    : [
        'https://images.unsplash.com/photo-1583258292688-d02132382025?w=1000',
        'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1000',
        'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1000',
        'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=1000',
        'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1000',
      ];

  // Price calculations
  const monthlyRate = shelf.monthlyPriceTzs;
  const subtotal = monthlyRate * (durationMonths || 1);
  const platformFee = Math.round(subtotal * 0.10);
  const totalAmount = subtotal + platformFee;

  const handleCalendarRangeChange = (start: string, end: string, months: number, isValid: boolean) => {
    setStartDate(start);
    setEndDate(end);
    setDurationMonths(months);
    setIsDateRangeValid(isValid);
  };

  const handleBookingSubmit = () => {
    if (!startDate || !endDate) {
      alert('Please select check-in and check-out dates on the calendar first.');
      return;
    }
    if (!isDateRangeValid) {
      alert('Selected dates conflict with an existing booking. Please pick available dates.');
      return;
    }
    onInitiateBooking(shelf, startDate, endDate, durationMonths, selectedCategory);
  };

  return (
    <div id="airbnb-shelf-detail" className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28 lg:pb-20">
      
      {/* Top Floating Navigation Bar */}
      <div className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition-colors bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Marketplace</span>
          <span className="sm:hidden">Back</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: shelf.name, url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Listing link copied to clipboard!');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSaved(!isSaved)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-800 transition-all"
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
            <span className="hidden sm:inline">{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        
        {/* Title & Headline Section */}
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            {shelf.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-300 mt-2">
            <div className="flex items-center gap-1 font-bold text-white shrink-0">
              {shelf.avgRating ? (
                <>
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{shelf.avgRating.toFixed(2)}</span>
                  <span className="text-slate-400 font-medium">({shelf.reviewCount || reviews.length} vendor reviews)</span>
                </>
              ) : (
                <span className="text-slate-400 font-medium">No vendor reviews yet</span>
              )}
            </div>
            <span className="hidden sm:inline">•</span>
            <span className={`font-semibold shrink-0 ${shelf.availabilityStatus === 'AVAILABLE' ? 'text-emerald-400' : 'text-amber-300'}`}>
              {availabilityLabel(shelf.availabilityStatus)}
            </span>
            <span className="hidden md:inline">•</span>
            <span className="flex items-center gap-1 text-slate-300 min-w-0">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{shelf.shopAddress || shelf.shopCity}</span>
            </span>
          </div>
          <TrustBadges shelfId={shelf.id} />
        </div>

        {/* 2. Airbnb 5-Photo Mosaic Gallery Grid */}
        <div className="relative rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-4 gap-2.5 h-[340px] sm:h-[420px] md:h-[480px] bg-slate-900">
          
          {/* Main Large Photo (Left Half) */}
          <div
            onClick={() => { setActivePhotoModalIndex(0); setShowAllPhotos(true); }}
            className="md:col-span-2 h-full relative cursor-pointer group overflow-hidden"
          >
            <img
              src={photos[0]}
              alt={shelf.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
          </div>

          {/* Right Grid (4 photos in 2x2 on desktop) */}
          <div className="hidden md:grid md:col-span-2 grid-cols-2 gap-2.5 h-full">
            {photos.slice(1, 5).map((photoUrl, idx) => (
              <div
                key={idx}
                onClick={() => { setActivePhotoModalIndex(idx + 1); setShowAllPhotos(true); }}
                className="relative h-full cursor-pointer group overflow-hidden bg-slate-950"
              >
                <img
                  src={photoUrl}
                  alt={`${shelf.name} photo ${idx + 2}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              </div>
            ))}
          </div>

          {/* "Show All Photos" Floating Button */}
          <button
            type="button"
            onClick={() => setShowAllPhotos(true)}
            className="absolute bottom-4 right-4 bg-slate-950/85 hover:bg-slate-950 text-white backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 shadow-xl flex items-center gap-2 transition-all hover:scale-105"
          >
            <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Show all {photos.length} photos</span>
          </button>
        </div>

        {/* 3. Two-Column Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 pt-4">
          
          {/* LEFT COLUMN: Host, Specs, Highlights, Calendar, Reviews */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Host Header Card */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-6">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Retail Display Space in {shelf.shopName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {shelf.shopAddress || shopDetail?.address}
                  {shopDetail?.shopType ? ` • ${formatShopType(shopDetail.shopType)}` : ''}
                  {shopDetail?.footTrafficScore ? ` • Foot traffic ${shopDetail.footTrafficScore}/10` : ''}
                  {shelf.hostVerificationStatus === 'VERIFIED' ? ' • Verified host' : ''}
                </p>
              </div>

              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xl shadow-lg shrink-0">
                <Store className="w-7 h-7" />
              </div>
            </div>

            {/* Airbnb Highlights List */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-800 pb-6">
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Placement</span>
                <span className="text-sm font-bold text-white">{formatShelfType(shelf.shelfType)}</span>
                <span className="text-xs text-slate-400 block mt-1">{shelf.locationInsideShop}</span>
              </div>
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Size</span>
                <span className="text-sm font-mono font-bold text-white">{shelf.widthCm} × {shelf.heightCm} × {shelf.depthCm} cm</span>
                <span className="text-xs text-slate-400 block mt-1">{shelfVolumeLitres(shelf)} of display volume</span>
              </div>
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">Booking</span>
                <span className="text-sm font-bold text-emerald-400">{availabilityLabel(shelf.availabilityStatus)}</span>
                <span className="text-xs text-slate-400 block mt-1">TZS {shelf.monthlyPriceTzs.toLocaleString()} / month</span>
              </div>
            </div>

            {/* Physical Shelf Specifications Grid */}
            <div className="border-b border-slate-800 pb-6 space-y-3">
              <h3 className="text-base font-bold text-white">Shelf Specifications</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Dimensions</span>
                  <span className="text-sm font-mono font-bold text-white">{shelf.widthCm} × {shelf.heightCm} × {shelf.depthCm} cm</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Shelf Tier</span>
                  <span className="text-sm font-bold text-emerald-400">{formatShelfType(shelf.shelfType)}</span>
                </div>
                <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Internal Location</span>
                  <span className="text-sm font-bold text-white line-clamp-1">{shelf.locationInsideShop}</span>
                </div>
              </div>

              {/* Allowed Product Categories */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-400 block mb-2">Permitted Product Categories:</span>
                <div className="flex flex-wrap gap-2">
                  {shelf.allowedCategories?.map((cat, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-slate-900 border border-slate-700 text-xs font-medium text-slate-200 rounded-full flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="border-b border-slate-800 pb-6 space-y-2">
              <h3 className="text-base font-bold text-white">About this Retail Space</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {shelf.description || 'The host has not added a description for this shelf yet.'}
              </p>
            </div>

            {/* 4. Interactive Availability Calendar Section */}
            <div className="border-b border-slate-800 pb-8 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Select Rental Period</h3>
                  <p className="text-xs text-slate-400">
                    Verify real-time availability. Double-booking is strictly prevented by Shelfy booking engine.
                  </p>
                </div>
                {isLoadingAvailability && (
                  <span className="text-xs text-amber-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-spin" /> Syncing calendar...
                  </span>
                )}
              </div>

              <AvailabilityCalendar
                shelfId={shelf.id}
                bookedRanges={bookedRanges}
                monthlyPriceTzs={shelf.monthlyPriceTzs}
                selectedStartDate={startDate}
                selectedEndDate={endDate}
                onDateRangeChange={handleCalendarRangeChange}
              />
            </div>

            {/* 5. Verified Vendor Reviews & Rating Breakdown */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white">Vendor reviews</h3>
              {reviews.length === 0 ? (
                <p className="text-sm text-slate-400">No reviews have been left for this shelf yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-white">{review.reviewerName}</span>
                        <span className="text-[11px] text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs text-slate-300 leading-normal">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Sticky Airbnb Booking Widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
              
              {/* Header Price & Rating */}
              <div className="flex items-baseline justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-2xl font-black text-white font-mono">
                    TZS {shelf.monthlyPriceTzs.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-normal"> / month</span>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-white">
                  {shelf.avgRating ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{shelf.avgRating.toFixed(2)}</span>
                      <span className="text-slate-400">({shelf.reviewCount || reviews.length})</span>
                    </>
                  ) : (
                    <span className="text-slate-400 font-medium">{availabilityLabel(shelf.availabilityStatus)}</span>
                  )}
                </div>
              </div>

              {/* Date Selector Box */}
              <div className="border border-slate-700 rounded-2xl overflow-hidden bg-slate-950">
                <div className="grid grid-cols-2 border-b border-slate-800">
                  <div className="p-3 border-r border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CHECK-IN</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-white w-full focus:outline-none"
                    />
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CHECK-OUT</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-white w-full focus:outline-none"
                    />
                  </div>
                </div>

                {/* Category Selection */}
                <div className="p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">PRODUCT CATEGORY</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-200 focus:outline-none"
                  >
                    {shelf.allowedCategories?.map((c, i) => (
                      <option key={i} value={c} className="bg-slate-900 text-white">{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reserve Button */}
              <button
                type="button"
                onClick={handleBookingSubmit}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 text-slate-950 font-black text-sm hover:opacity-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <CreditCard className="w-4 h-4" />
                Reserve Space with PesaPal
              </button>

              <div className="text-center text-[11px] text-slate-400">
                You won't be charged until you verify payment on the next screen.
              </div>

              {/* Itemized Price Breakdown */}
              <div className="space-y-2 text-xs pt-4 border-t border-slate-800 font-sans">
                <div className="flex justify-between text-slate-300">
                  <span>TZS {monthlyRate.toLocaleString()} × {durationMonths} month(s)</span>
                  <span className="font-mono">TZS {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="flex items-center gap-1">Shelfy Escrow & Insurance (10%) <Info className="w-3 h-3 text-slate-500" /></span>
                  <span className="font-mono">TZS {platformFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-white pt-2 border-t border-slate-800">
                  <span>Total Due (TZS)</span>
                  <span className="font-mono text-emerald-400 font-black text-base">TZS {totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Host Contact Pill */}
              {shelf.shopId && (
                <button
                  type="button"
                  onClick={() => onOpenHostChat && onOpenHostChat(shelf.shopId)}
                  className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  Contact Shop Host
                </button>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* Mobile sticky booking bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-4 py-3 safe-bottom">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">From</div>
            <div className="font-mono font-black text-emerald-400 text-sm truncate">
              TZS {monthlyRate.toLocaleString()}
              <span className="text-slate-400 font-normal text-xs"> /mo</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleBookingSubmit}
            disabled={!startDate || !endDate || !isDateRangeValid}
            className="shrink-0 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 text-slate-950 font-black text-xs sm:text-sm disabled:opacity-50 touch-target"
          >
            Reserve
          </button>
        </div>
      </div>

      {/* 6. Photo Gallery Modal */}
      {showAllPhotos && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col p-4 sm:p-8 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">{shelf.name} — Photo Gallery</h3>
            <button
              onClick={() => setShowAllPhotos(false)}
              className="p-2 rounded-full bg-slate-900 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto max-w-4xl mx-auto w-full">
            <img
              src={photos[activePhotoModalIndex]}
              alt={`Photo ${activePhotoModalIndex + 1}`}
              className="max-h-[70vh] w-auto object-contain rounded-2xl shadow-2xl"
            />
            
            {/* Thumbnails strip */}
            <div className="flex gap-2 mt-4 overflow-x-auto p-2">
              {photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhotoModalIndex(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    i === activePhotoModalIndex ? 'border-emerald-400 scale-105' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
