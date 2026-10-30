import type { Shelf } from '../types/index.js';

export const IN_STORE_LABEL_FIELD = 'In-store shelf label / position';

export const IN_STORE_LABEL_HELPER =
  'How staff find this shelf in your shop (e.g. Aisle 2, eye level – Slot B). Must be unique within this shop.';

export const IN_STORE_LABEL_PLACEHOLDER = 'Aisle 2 – Slot B';

export const IN_STORE_LABEL_FALLBACK = 'In-store position not set';

export const MIN_IN_STORE_LABEL_LENGTH = 3;

export function normalizeInStoreLabel(raw: string | undefined | null): string {
  if (raw == null) return '';
  return raw.trim().replace(/\s+/g, ' ');
}

export function isValidInStoreLabel(raw: string | undefined | null): boolean {
  return normalizeInStoreLabel(raw).length >= MIN_IN_STORE_LABEL_LENGTH;
}

export function formatInStoreLabelDisplay(shelf: Pick<Shelf, 'locationInsideShop'>): string {
  const normalized = normalizeInStoreLabel(shelf.locationInsideShop);
  return normalized || IN_STORE_LABEL_FALLBACK;
}
