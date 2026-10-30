import { Shelf } from '../types/index.js';

export const MAX_SHELVES_PER_RAIL = 12;
/** Max category pills in browse row (excluding "All"). */
export const MAX_CATEGORY_CHIPS = 5;

export interface BrowseGroup {
  id: string;
  label: string;
}

function sortShelvesForRail(shelves: Shelf[]): Shelf[] {
  return [...shelves].sort((a, b) => {
    const ra = a.avgRating ?? 0;
    const rb = b.avgRating ?? 0;
    if (rb !== ra) return rb - ra;
    return a.monthlyPriceTzs - b.monthlyPriceTzs;
  });
}

export function capRailShelves(shelves: Shelf[], max = MAX_SHELVES_PER_RAIL): Shelf[] {
  return sortShelvesForRail(shelves).slice(0, max);
}

function shelfMatchesCategoryLabel(shelf: Shelf, label: string): boolean {
  const cat = label.toLowerCase();
  return shelf.allowedCategories.some(
    (c) => c.toLowerCase() === cat || c.toLowerCase().includes(cat)
  );
}

export function buildCategoryGroups(
  shelves: Shelf[],
  categoryLabels: string[],
  maxCategories = MAX_CATEGORY_CHIPS
): BrowseGroup[] {
  const groups: BrowseGroup[] = [{ id: '__all__', label: 'All' }];
  const ranked = categoryLabels
    .map((label) => ({
      label,
      count: shelves.filter((s) => shelfMatchesCategoryLabel(s, label)).length,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxCategories);

  for (const { label } of ranked) {
    groups.push({ id: label, label });
  }
  return groups;
}

export function shelvesForCategoryGroup(shelves: Shelf[], groupId: string): Shelf[] {
  if (groupId === '__all__') return capRailShelves(shelves);
  const cat = groupId.toLowerCase();
  return capRailShelves(shelves.filter((s) => shelfMatchesCategoryLabel(s, groupId)));
}

export function buildCityGroups(shelves: Shelf[], maxCities = 8): BrowseGroup[] {
  const counts = new Map<string, number>();
  for (const s of shelves) {
    const city = s.shopCity?.trim() || 'Other';
    counts.set(city, (counts.get(city) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxCities);
  const groups: BrowseGroup[] = [{ id: '__all__', label: 'All' }];
  for (const [city] of sorted) {
    groups.push({ id: city, label: city });
  }
  return groups;
}

export function shelvesForCityGroup(shelves: Shelf[], groupId: string): Shelf[] {
  if (groupId === '__all__') return capRailShelves(shelves);
  if (groupId === 'Other') {
    return capRailShelves(shelves.filter((s) => !s.shopCity?.trim()));
  }
  const city = groupId.toLowerCase();
  return capRailShelves(shelves.filter((s) => s.shopCity?.toLowerCase() === city));
}

export function buildShelfTypeGroups(typeOptions: { id: string; label: string }[]): BrowseGroup[] {
  const groups: BrowseGroup[] = [{ id: '__all__', label: 'All' }];
  for (const t of typeOptions) {
    groups.push({ id: t.id, label: t.label });
  }
  return groups;
}

export function shelvesForTypeGroup(shelves: Shelf[], groupId: string): Shelf[] {
  if (groupId === '__all__') return capRailShelves(shelves);
  return capRailShelves(shelves.filter((s) => s.shelfType === groupId));
}

export function defaultActiveGroupId(groups: BrowseGroup[]): string {
  if (groups.length <= 1) return '__all__';
  const firstSpecific = groups.find((g) => g.id !== '__all__');
  return firstSpecific?.id ?? '__all__';
}
