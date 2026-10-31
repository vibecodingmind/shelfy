import { DirectoryCategory, DirectoryRegion } from '../../types/index.js';
import { CITY_COORDINATES } from '../domain/listings.js';

export const DIRECTORY_REGIONS: DirectoryRegion[] = ['Mwanza', 'Dar es Salaam', 'Arusha', 'Mbeya', 'Dodoma'];

export const REGION_CENTER: Record<DirectoryRegion, { latitude: number; longitude: number; defaultCity: string }> = {
  Mwanza: { ...CITY_COORDINATES.Mwanza, defaultCity: 'Mwanza' },
  'Dar es Salaam': { ...CITY_COORDINATES['Dar es Salaam'], defaultCity: 'Dar es Salaam' },
  Arusha: { ...CITY_COORDINATES.Arusha, defaultCity: 'Arusha' },
  Mbeya: { ...CITY_COORDINATES.Mbeya, defaultCity: 'Mbeya' },
  Dodoma: { ...CITY_COORDINATES.Dodoma, defaultCity: 'Dodoma' },
};

export const DIRECTORY_CATEGORY_META: Record<
  DirectoryCategory,
  { label: string; textQuery: string; includedTypes: string[] }
> = {
  SUPERMARKET: { label: 'Supermarket', textQuery: 'supermarket', includedTypes: ['supermarket', 'grocery_store'] },
  PHARMACY: { label: 'Pharmacy', textQuery: 'pharmacy', includedTypes: ['pharmacy', 'drugstore'] },
  MARKET: { label: 'Local market', textQuery: 'market', includedTypes: ['market'] },
  SHOPPING_CENTRE: { label: 'Shopping centre', textQuery: 'shopping mall', includedTypes: ['shopping_mall'] },
  GROCERY_STORE: { label: 'Grocery store', textQuery: 'grocery store', includedTypes: ['grocery_store'] },
  CONVENIENCE_STORE: { label: 'Convenience store', textQuery: 'convenience store', includedTypes: ['convenience_store'] },
  RETAIL_SHOP: { label: 'Retail shop', textQuery: 'retail shop', includedTypes: ['store'] },
  ELECTRONICS_STORE: { label: 'Electronics store', textQuery: 'electronics store', includedTypes: ['electronics_store'] },
  CLOTHING_STORE: { label: 'Clothing store', textQuery: 'clothing store', includedTypes: ['clothing_store'] },
  HARDWARE_STORE: { label: 'Hardware store', textQuery: 'hardware store', includedTypes: ['hardware_store'] },
  RESTAURANT: { label: 'Restaurant', textQuery: 'restaurant', includedTypes: ['restaurant'] },
  OTHER: { label: 'Other', textQuery: 'shop', includedTypes: ['store'] },
};

export const PLACES_SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.primaryType',
  'places.types',
  'places.photos',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.regularOpeningHours',
  'nextPageToken',
].join(',');

export const PLACE_DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'googleMapsUri',
  'primaryType',
  'types',
  'photos',
  'nationalPhoneNumber',
  'websiteUri',
  'regularOpeningHours',
].join(',');
