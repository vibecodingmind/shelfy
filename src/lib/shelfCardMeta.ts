import { Shelf, Shop } from '../types/index.js';

export function isFeaturedShelf(shelf: Shelf): boolean {
  return (shelf.avgRating ?? 0) >= 4.9;
}

export function isVerifiedShelf(shelf: Shelf, shop?: Shop | null): boolean {
  if (shelf.verificationStatus === 'VERIFIED') return true;
  if (shelf.hostVerificationStatus === 'VERIFIED') return true;
  if (shop?.verificationStatus === 'VERIFIED') return true;
  if (shelf.listingStatus === 'PUBLISHED' && shelf.verificationStatus !== 'REJECTED') {
    return shelf.verificationStatus === 'VERIFIED' || shop?.verificationStatus === 'VERIFIED';
  }
  return false;
}

export interface ShelfCardOverlayBadges {
  showFeatured: boolean;
  showVerified: boolean;
}

/** At most two badges; on narrow cards caller may pass compact to prefer verified over featured when both. */
export function shelfCardBadges(shelf: Shelf, shop?: Shop | null, compact = false): ShelfCardOverlayBadges {
  const featured = isFeaturedShelf(shelf);
  const verified = isVerifiedShelf(shelf, shop);
  if (compact && featured && verified) {
    return { showFeatured: false, showVerified: true };
  }
  return { showFeatured: featured, showVerified: verified };
}
