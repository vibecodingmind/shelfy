import type { Shelf, Shop } from '../types/index.js';

export function hasValidShopCoords(lat: number | undefined | null, lng: number | undefined | null): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

/** Standard OSM raster tiles for Leaflet (see openstreetmap.org copyright). */
export const OPENSTREETMAP_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const OPENSTREETMAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function openStreetMapUrl(lat: number, lng: number, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

export function resolveShopCoords(
  shop: Shop | null | undefined,
  shelf: Pick<Shelf, 'shopId' | 'shopLatitude' | 'shopLongitude'>,
  shopsById?: Map<string, Shop>
): { latitude: number; longitude: number } | null {
  if (shop && hasValidShopCoords(shop.latitude, shop.longitude)) {
    return { latitude: shop.latitude, longitude: shop.longitude };
  }
  const fromProp = shopsById?.get(shelf.shopId);
  if (fromProp && hasValidShopCoords(fromProp.latitude, fromProp.longitude)) {
    return { latitude: fromProp.latitude, longitude: fromProp.longitude };
  }
  if (hasValidShopCoords(shelf.shopLatitude, shelf.shopLongitude)) {
    return { latitude: shelf.shopLatitude!, longitude: shelf.shopLongitude! };
  }
  return null;
}

export function formatShopAddressLines(shop: Shop | null | undefined, shelf: Pick<Shelf, 'shopName' | 'shopCity' | 'shopAddress'>): string[] {
  const name = shop?.name || shelf.shopName;
  const address = shop?.address || shelf.shopAddress;
  const city = shop?.city || shelf.shopCity;
  return [name, address, city].filter((part): part is string => Boolean(part && String(part).trim()));
}
