import type { Shelf, ShelfAvailability } from '../types/index.js';
import { shelfTypeName } from '../lib/shelfTypes.js';

export function formatShelfType(type: string): string {
  return shelfTypeName(type);
}

export function availabilityLabel(status: ShelfAvailability | string | undefined): string {
  if (status === 'AVAILABLE') return 'Available';
  if (status === 'BOOKED') return 'Booked';
  if (status === 'MAINTENANCE') return 'Maintenance';
  return 'Unlisted';
}

export function shelfVolumeLitres(shelf: Pick<Shelf, 'widthCm' | 'heightCm' | 'depthCm'>): string {
  const litres = (shelf.widthCm * shelf.heightCm * shelf.depthCm) / 1000;
  return `${litres >= 10 ? Math.round(litres) : litres.toFixed(1)} L`;
}

export function formatShopType(type?: string): string {
  if (!type) return '';
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
