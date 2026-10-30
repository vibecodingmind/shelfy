import {
  Archive,
  ArrowUp,
  Columns3,
  DoorOpen,
  Eye,
  LayoutGrid,
  PanelsTopLeft,
  Refrigerator,
  Rows3,
  ShoppingCart,
  Square,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { SHELF_TYPE_CATALOG } from '../lib/shelfTypes.js';

const SHELF_TYPE_ICONS: Record<string, LucideIcon> = {
  FRONT_SHELF: DoorOpen,
  BACK_SHELF: Rows3,
  COUNTER_DISPLAY: ShoppingCart,
  EYE_LEVEL: Eye,
  ENTRANCE_DISPLAY: Store,
  WINDOW_DISPLAY: PanelsTopLeft,
  END_CAP: Columns3,
  TOP_SHELF: ArrowUp,
  BOTTOM_SHELF: Archive,
  REFRIGERATED: Refrigerator,
  WALL_SHELF: Square,
  ISLAND_DISPLAY: LayoutGrid,
};

export const shelfTypeNav = SHELF_TYPE_CATALOG.map((type) => ({
  id: type.id,
  label: type.name,
  Icon: SHELF_TYPE_ICONS[type.id] || LayoutGrid,
}));
