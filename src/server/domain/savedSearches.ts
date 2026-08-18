import { SavedSearch, Shelf } from '../../types/index.js';

export function shelfMatchesSearch(shelf: Shelf, search: SavedSearch): boolean {
  if (search.city && !(shelf.shopCity || '').toLowerCase().includes(search.city.toLowerCase())) {
    return false;
  }
  if (search.category && !(shelf.allowedCategories || []).some((c) => c.toLowerCase().includes(search.category!.toLowerCase()))) {
    return false;
  }
  if (search.maxPriceTzs && shelf.monthlyPriceTzs > search.maxPriceTzs) {
    return false;
  }
  if (search.shelfType && shelf.shelfType !== search.shelfType) {
    return false;
  }
  if (search.query) {
    const q = search.query.toLowerCase();
    const hay = `${shelf.name} ${shelf.description} ${shelf.shopName || ''} ${shelf.shopCity || ''}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return shelf.listingStatus === 'PUBLISHED' && shelf.status === 'ACTIVE';
}

export function findNewMatchesForSearch(
  search: SavedSearch,
  shelves: Shelf[],
  knownShelfIds: Set<string>
): Shelf[] {
  return shelves.filter((s) => !knownShelfIds.has(s.id) && shelfMatchesSearch(s, search));
}
