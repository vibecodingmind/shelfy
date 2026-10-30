export const SHELF_TYPE_CATALOG = [
  {
    id: 'FRONT_SHELF',
    name: 'Front shelf',
    description: 'The first bay facing shoppers as they enter the aisle.',
    icon: '🚪',
  },
  {
    id: 'BACK_SHELF',
    name: 'Back shelves',
    description: 'Rear-wall and back-of-aisle racks for larger packs.',
    icon: '📚',
  },
  {
    id: 'COUNTER_DISPLAY',
    name: 'Counter shelves',
    description: 'Checkout and till shelves for impulse purchases.',
    icon: '🛒',
  },
  {
    id: 'EYE_LEVEL',
    name: 'Eye-level shelf',
    description: 'Prime line-of-sight bay between about 120cm and 160cm.',
    icon: '👁️',
  },
  {
    id: 'ENTRANCE_DISPLAY',
    name: 'Entrance shelf',
    description: 'Lobby and doorway display seen by arriving shoppers.',
    icon: '✨',
  },
  {
    id: 'WINDOW_DISPLAY',
    name: 'Window shelf',
    description: 'Street-facing glass shelf for passersby.',
    icon: '🪟',
  },
  {
    id: 'END_CAP',
    name: 'End-cap shelf',
    description: 'Aisle-end feature that catches cross-traffic.',
    icon: '🎯',
  },
  {
    id: 'TOP_SHELF',
    name: 'Top shelf',
    description: 'Upper rack used as a brand marquee.',
    icon: '🔝',
  },
  {
    id: 'BOTTOM_SHELF',
    name: 'Bottom shelf',
    description: 'Floor-level bay for bulk and heavy packs.',
    icon: '📦',
  },
  {
    id: 'REFRIGERATED',
    name: 'Chilled shelf',
    description: 'Cooled case, typically 2°C–6°C, for drinks and fresh goods.',
    icon: '❄️',
  },
  {
    id: 'WALL_SHELF',
    name: 'Wall shelf',
    description: 'Side-wall run along the shop perimeter.',
    icon: '🧱',
  },
  {
    id: 'ISLAND_DISPLAY',
    name: 'Island shelf',
    description: 'Freestanding mid-floor unit shoppers walk around.',
    icon: '🏝️',
  },
] as const;

export type ShelfTypeId = (typeof SHELF_TYPE_CATALOG)[number]['id'];

export function shelfTypeName(id: string): string {
  return SHELF_TYPE_CATALOG.find((type) => type.id === id)?.name || id.replace(/_/g, ' ').toLowerCase();
}
