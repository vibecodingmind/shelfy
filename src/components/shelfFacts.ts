import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  ArrowUp,
  DoorOpen,
  Eye,
  LayoutGrid,
  Leaf,
  ShoppingCart,
  Snowflake,
  Sparkles,
  UtensilsCrossed,
  Wheat,
} from 'lucide-react';
import type { Shelf, ShelfAvailability } from '../types/index.js';

export function formatShelfType(type: string): string {
  switch (type) {
    case 'EYE_LEVEL':
      return 'Eye-level';
    case 'COUNTER_DISPLAY':
      return 'Checkout counter';
    case 'ENTRANCE_DISPLAY':
      return 'Entrance stand';
    case 'TOP_SHELF':
      return 'Top rack';
    case 'BOTTOM_SHELF':
      return 'Bottom bulk';
    case 'REFRIGERATED':
      return 'Chilled cooler';
    default:
      return type.replace(/_/g, ' ').toLowerCase();
  }
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

export const categoryNav: {
  id: string;
  type: 'all' | 'shelfType' | 'category';
  label: string;
  Icon: LucideIcon;
}[] = [
  { id: '', type: 'all', label: 'All shelves', Icon: LayoutGrid },
  { id: 'EYE_LEVEL', type: 'shelfType', label: 'Eye-level', Icon: Eye },
  { id: 'COUNTER_DISPLAY', type: 'shelfType', label: 'Checkout', Icon: ShoppingCart },
  { id: 'ENTRANCE_DISPLAY', type: 'shelfType', label: 'Entrance', Icon: DoorOpen },
  { id: 'REFRIGERATED', type: 'shelfType', label: 'Chilled', Icon: Snowflake },
  { id: 'TOP_SHELF', type: 'shelfType', label: 'Top rack', Icon: ArrowUp },
  { id: 'BOTTOM_SHELF', type: 'shelfType', label: 'Bottom bulk', Icon: Archive },
  { id: 'Food & Beverages', type: 'category', label: 'Food & drinks', Icon: UtensilsCrossed },
  { id: 'Organic Goods', type: 'category', label: 'Organic', Icon: Leaf },
  { id: 'Cosmetics', type: 'category', label: 'Beauty', Icon: Sparkles },
  { id: 'Spices', type: 'category', label: 'Spices', Icon: Wheat },
];
