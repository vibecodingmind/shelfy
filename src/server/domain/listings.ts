import { Shop, Shelf, User } from '../../types/index.js';
import {
  isValidInStoreLabel,
  MIN_IN_STORE_LABEL_LENGTH,
  normalizeInStoreLabel,
} from '../../lib/shelfInStoreLabel.js';

export const MIN_LISTING_PHOTOS = 8;

export function hasMinimumListingPhotos(photos: string[] | undefined | null): boolean {
  if (!Array.isArray(photos)) return false;
  return photos.filter((url) => typeof url === 'string' && url.trim().length > 0).length >= MIN_LISTING_PHOTOS;
}

export type ListingStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED';

export function listingStatusOf(entity: { listingStatus?: string; verificationStatus?: string; hostVerificationStatus?: string }): ListingStatus {
  if (entity.listingStatus) return entity.listingStatus as ListingStatus;
  if (entity.verificationStatus === 'VERIFIED' || entity.hostVerificationStatus === 'VERIFIED') return 'PUBLISHED';
  if (entity.verificationStatus === 'REJECTED' || entity.hostVerificationStatus === 'REJECTED') return 'REJECTED';
  if (entity.verificationStatus === 'SUSPENDED') return 'SUSPENDED';
  return 'DRAFT';
}

export function isPublishedShop(shop: Shop): boolean {
  if (shop.deletedAt) return false;
  const listing = listingStatusOf(shop);
  return shop.status === 'ACTIVE' && listing === 'PUBLISHED';
}

export function isPublishedShelf(shelf: Shelf, shop?: Shop): boolean {
  if (shelf.deletedAt) return false;
  if (shelf.status !== 'ACTIVE') return false;
  if (shop && !isPublishedShop(shop)) return false;
  return listingStatusOf(shelf) === 'PUBLISHED';
}

export function canSeeUnpublished(user: User | undefined, hostId: string): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.id === hostId;
}

export function publicShops(shops: Shop[], user?: User): Shop[] {
  return shops.filter((shop) => {
    if (shop.deletedAt) return user?.role === 'ADMIN';
    return isPublishedShop(shop) || canSeeUnpublished(user, shop.hostId);
  });
}

export function publicShelves(shelves: Shelf[], shops: Shop[], user?: User): Shelf[] {
  return shelves.filter((shelf) => {
    if (shelf.deletedAt) return user?.role === 'ADMIN';
    const shop = shops.find((s) => s.id === shelf.shopId);
    if (shop?.deletedAt && user?.role !== 'ADMIN') return false;
    if (shop && canSeeUnpublished(user, shop.hostId)) return true;
    return isPublishedShelf(shelf, shop);
  });
}

export function canEditListing(user: User | undefined, hostId: string): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.id === hostId;
}

export const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'Dar es Salaam': { latitude: -6.7924, longitude: 39.2083 },
  Mwanza: { latitude: -2.5164, longitude: 32.9175 },
  Arusha: { latitude: -3.3869, longitude: 36.683 },
  Dodoma: { latitude: -6.163, longitude: 35.7516 },
  Zanzibar: { latitude: -6.1659, longitude: 39.1994 },
  Mbeya: { latitude: -8.9094, longitude: 33.4608 },
};

export function coordinatesForCity(city: string): { latitude: number; longitude: number } {
  return CITY_COORDINATES[city] || CITY_COORDINATES['Dar es Salaam'];
}

export function shopReadyToSubmit(shop: Pick<Shop, 'name' | 'description' | 'address' | 'city' | 'latitude' | 'longitude' | 'photos' | 'shopType'>):
  | { ok: true }
  | { ok: false; missing: string[] } {
  const missing: string[] = [];
  if (!shop.name || shop.name.trim().length < 3) missing.push('shop name');
  if (!shop.description || shop.description.trim().length < 10) missing.push('shop description');
  if (!shop.address || shop.address.trim().length < 5) missing.push('street address');
  if (!shop.city) missing.push('city');
  if (!Number.isFinite(shop.latitude) || !Number.isFinite(shop.longitude)) missing.push('map coordinates');
  if (!hasMinimumListingPhotos(shop.photos as string[])) {
    missing.push(`at least ${MIN_LISTING_PHOTOS} shop photos`);
  }
  if (!shop.shopType) missing.push('shop type');
  return missing.length ? { ok: false, missing } : { ok: true };
}

export function shelfReadyToSubmit(
  shelf: Pick<
    Shelf,
    | 'name'
    | 'widthCm'
    | 'heightCm'
    | 'depthCm'
    | 'shelfType'
    | 'monthlyPriceTzs'
    | 'allowedCategories'
    | 'photos'
    | 'locationInsideShop'
  >
): { ok: true } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  if (!shelf.name || shelf.name.trim().length < 3) missing.push('shelf name');
  if (!isValidInStoreLabel(shelf.locationInsideShop)) missing.push('in-store shelf label');
  if (!(shelf.widthCm > 0 && shelf.heightCm > 0 && shelf.depthCm > 0)) missing.push('shelf dimensions');
  if (!shelf.shelfType) missing.push('shelf type');
  if (!(shelf.monthlyPriceTzs > 0)) missing.push('monthly rent');
  if (!shelf.allowedCategories?.length) missing.push('allowed categories');
  if (!hasMinimumListingPhotos(shelf.photos as string[])) {
    missing.push(`at least ${MIN_LISTING_PHOTOS} shelf photos`);
  }
  return missing.length ? { ok: false, missing } : { ok: true };
}

export function inStoreLabelKey(label: string): string {
  return normalizeInStoreLabel(label).toLowerCase();
}

export function findDuplicateInStoreLabel(
  shelves: Shelf[],
  shopId: string,
  label: string,
  excludeShelfId?: string
): Shelf | undefined {
  const key = inStoreLabelKey(label);
  if (!key || key.length < MIN_IN_STORE_LABEL_LENGTH) return undefined;
  return shelves.find((s) => {
    if (s.shopId !== shopId) return false;
    if (excludeShelfId && s.id === excludeShelfId) return false;
    if (s.deletedAt) return false;
    return inStoreLabelKey(s.locationInsideShop) === key;
  });
}

export function assertUniqueInStoreLabel(
  shelves: Shelf[],
  shopId: string,
  label: string,
  excludeShelfId?: string
): { ok: true; normalized: string } | { ok: false; message: string } {
  const normalized = normalizeInStoreLabel(label);
  if (!isValidInStoreLabel(normalized)) {
    return {
      ok: false,
      message: `In-store shelf label must be at least ${MIN_IN_STORE_LABEL_LENGTH} characters.`,
    };
  }
  const duplicate = findDuplicateInStoreLabel(shelves, shopId, normalized, excludeShelfId);
  if (duplicate) {
    return {
      ok: false,
      message: `Another shelf in this shop already uses the label "${duplicate.locationInsideShop}". Choose a unique position label.`,
    };
  }
  return { ok: true, normalized };
}
