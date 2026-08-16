import { Shop, Shelf, User } from '../../types/index.js';

export type ListingStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'PUBLISHED' | 'REJECTED' | 'SUSPENDED';

export function listingStatusOf(entity: { listingStatus?: string; verificationStatus?: string; hostVerificationStatus?: string }): ListingStatus {
  if (entity.listingStatus) return entity.listingStatus as ListingStatus;
  if (entity.verificationStatus === 'VERIFIED' || entity.hostVerificationStatus === 'VERIFIED') return 'PUBLISHED';
  if (entity.verificationStatus === 'REJECTED' || entity.hostVerificationStatus === 'REJECTED') return 'REJECTED';
  if (entity.verificationStatus === 'SUSPENDED') return 'SUSPENDED';
  return 'DRAFT';
}

export function isPublishedShop(shop: Shop): boolean {
  const listing = listingStatusOf(shop);
  return shop.status === 'ACTIVE' && listing === 'PUBLISHED';
}

export function isPublishedShelf(shelf: Shelf, shop?: Shop): boolean {
  if (shelf.status !== 'ACTIVE') return false;
  if (shop && !isPublishedShop(shop)) return false;
  return listingStatusOf(shelf) === 'PUBLISHED';
}

export function canSeeUnpublished(user: User | undefined, hostId: string): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.id === hostId;
}

export function publicShops(shops: Shop[], user?: User): Shop[] {
  return shops.filter((shop) => isPublishedShop(shop) || canSeeUnpublished(user, shop.hostId));
}

export function publicShelves(shelves: Shelf[], shops: Shop[], user?: User): Shelf[] {
  return shelves.filter((shelf) => {
    const shop = shops.find((s) => s.id === shelf.shopId);
    if (shop && canSeeUnpublished(user, shop.hostId)) return true;
    return isPublishedShelf(shelf, shop);
  });
}
