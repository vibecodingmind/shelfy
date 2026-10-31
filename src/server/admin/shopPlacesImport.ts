import { dbEngine } from '../db.js';
import { newId } from '../domain/ids.js';
import { uniqueSlug } from '../domain/slugs.js';
import { getPlaceDetails } from '../directory/googlePlaces.js';
import { Shop, User } from '../../types/index.js';

function categoryToShopType(category: string): Shop['shopType'] {
  const map: Record<string, Shop['shopType']> = {
    PHARMACY: 'PHARMACY',
    SUPERMARKET: 'SUPERMARKET',
    GROCERY_STORE: 'MINI_MARKET',
    CONVENIENCE_STORE: 'CONVENIENCE',
  };
  return map[category] || 'SUPERMARKET';
}

export async function importPlacesAsShops(input: {
  placeIds: string[];
  hostUserId: string;
  city: string;
  region: string;
  directoryCategory?: string;
}): Promise<{ created: Shop[]; duplicates: string[]; failed: Array<{ placeId: string; error: string }> }> {
  const host = dbEngine.db.users.find((u) => u.id === input.hostUserId);
  if (!host) throw new Error('Host user not found.');

  const created: Shop[] = [];
  const duplicates: string[] = [];
  const failed: Array<{ placeId: string; error: string }> = [];

  for (const rawId of input.placeIds) {
    const placeId = rawId.replace(/^places\//, '');
    try {
      const existing = dbEngine.db.shops.find(
        (s) => (s as any).googlePlaceId === placeId || s.slug === placeId
      );
      if (existing) {
        duplicates.push(placeId);
        continue;
      }

      const details = await getPlaceDetails(placeId);
      const name = String(details.displayName || `${input.city} shop`).slice(0, 120);
      const address = String(details.formattedAddress || input.city);
      const lat = details.location?.latitude ?? -6.7924;
      const lng = details.location?.longitude ?? 39.2083;
      const now = new Date().toISOString();
      const shop: Shop & { googlePlaceId?: string } = {
        id: newId('shop'),
        hostId: host.id,
        hostName: host.name,
        name,
        description: 'Imported via Google Places. Complete listing photos and publish when ready.',
        address,
        city: input.city,
        region: input.region || input.city,
        latitude: lat,
        longitude: lng,
        photos: [],
        status: 'ACTIVE',
        verificationStatus: 'PENDING',
        listingStatus: 'DRAFT',
        slug: uniqueSlug(`${input.city} ${name}`, dbEngine.db.shops.map((s) => s.slug || '')),
        shopType: categoryToShopType(input.directoryCategory || 'SUPERMARKET'),
        createdAt: now,
        updatedAt: now,
        googlePlaceId: placeId,
      };
      dbEngine.db.shops.push(shop);
      created.push(shop);
    } catch (err: any) {
      failed.push({ placeId, error: err.message || 'Import failed' });
    }
  }

  await dbEngine.saveAsync();
  return { created, duplicates, failed };
}
