/**
 * Google Places API (New) — server-side only. No automatic public calls.
 */
import { getIntegrationSecret } from '../admin/integrationStore.js';
import {
  PLACE_DETAILS_FIELD_MASK,
  PLACES_SEARCH_FIELD_MASK,
} from './constants.js';
import {
  directorySettings,
  placesCacheGet,
  placesCacheSet,
  placesQuotaExceeded,
  recordPlacesUsage,
  saveDirectorySettings,
} from './directoryStore.js';

const PLACES_BASE = 'https://places.googleapis.com/v1';

function placesApiKey(): string | null {
  return (
    getIntegrationSecret('MAPS', 'live', 'GOOGLE_PLACES_API_KEY') ||
    getIntegrationSecret('MAPS', 'live', 'GOOGLE_MAPS_API_KEY') ||
    process.env.GOOGLE_PLACES_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    null
  );
}

export function placesApiStatus() {
  const key = placesApiKey();
  const settings = directorySettings();
  const day = new Date().toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const today = settings.usageByDay.find((d) => d.date === day);
  const monthUsage = settings.usageByDay
    .filter((d) => d.date.startsWith(month))
    .reduce((sum, d) => sum + d.textSearch + d.nearbySearch + d.placeDetails + d.placePhotos, 0);
  const todayUsage = today
    ? today.textSearch + today.nearbySearch + today.placeDetails + today.placePhotos
    : 0;
  return {
    configured: Boolean(key),
    placesApiEnabled: settings.placesApiEnabled,
    mapsJsEnabled: settings.mapsJsEnabled,
    dailyQuotaLimit: settings.dailyQuotaLimit,
    monthlyQuotaLimit: settings.monthlyQuotaLimit,
    usageToday: todayUsage,
    usageMonth: monthUsage,
    quotaWarning: todayUsage >= settings.dailyQuotaLimit * 0.8 || monthUsage >= settings.monthlyQuotaLimit * 0.8,
    quotaExceeded: placesQuotaExceeded(),
    lastSuccessfulRequestAt: settings.lastSuccessfulRequestAt,
    lastError: settings.lastError,
  };
}

async function placesFetch(path: string, init: RequestInit, usageKind: 'textSearch' | 'nearbySearch' | 'placeDetails' | 'placePhotos') {
  const settings = directorySettings();
  if (!settings.placesApiEnabled) throw new Error('Google Places API is disabled in Directory Settings.');
  if (placesQuotaExceeded()) throw new Error('Places API quota limit reached. Adjust limits or wait until tomorrow.');
  const key = placesApiKey();
  if (!key) throw new Error('Google Places API key is not configured. Set it in Admin → Settings → Platform → Maps.');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': key,
    ...(init.headers as Record<string, string>),
  };

  try {
    const res = await fetch(`${PLACES_BASE}${path}`, { ...init, headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      recordPlacesUsage(usageKind, true);
      saveDirectorySettings({ lastError: `Places ${res.status}: ${body.slice(0, 200)}` });
      throw new Error(`Google Places request failed (${res.status}).`);
    }
    recordPlacesUsage(usageKind, false);
    saveDirectorySettings({ lastError: undefined });
    return res;
  } catch (err) {
    recordPlacesUsage(usageKind, true);
    if (err instanceof Error && !err.message.startsWith('Google Places')) {
      saveDirectorySettings({ lastError: err.message });
    }
    throw err;
  }
}

export function mapPlaceForClient(place: any) {
  const id = String(place.id || place.name || '').replace(/^places\//, '');
  const photos = (place.photos || []).slice(0, 5).map((p: any, index: number) => ({
    index,
    name: p.name,
    widthPx: p.widthPx,
    heightPx: p.heightPx,
    authorAttributions: p.authorAttributions || [],
    proxyUrl: p.name ? `/api/places/google-photo?name=${encodeURIComponent(p.name)}&maxHeightPx=400` : null,
  }));
  return {
    placeId: id,
    displayName: place.displayName?.text || place.displayName || null,
    formattedAddress: place.formattedAddress || null,
    location: place.location || null,
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    googleMapsUri: place.googleMapsUri || null,
    primaryType: place.primaryType || null,
    types: place.types || [],
    nationalPhoneNumber: place.nationalPhoneNumber || null,
    websiteUri: place.websiteUri || null,
    regularOpeningHours: place.regularOpeningHours || null,
    photos,
    attribution: 'Powered by Google',
  };
}

export async function searchTextPlaces(input: {
  textQuery: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  pageToken?: string;
}) {
  const body: Record<string, unknown> = {
    textQuery: input.textQuery,
    languageCode: 'en',
    regionCode: 'TZ',
    locationBias: {
      circle: {
        center: { latitude: input.latitude, longitude: input.longitude },
        radius: input.radiusMeters,
      },
    },
  };
  if (input.pageToken) body.pageToken = input.pageToken;

  const res = await placesFetch(
    '/places:searchText',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'X-Goog-FieldMask': PLACES_SEARCH_FIELD_MASK },
    },
    'textSearch'
  );
  const json = (await res.json()) as { places?: any[]; nextPageToken?: string };
  return {
    places: (json.places || []).map(mapPlaceForClient),
    nextPageToken: json.nextPageToken || null,
  };
}

export async function searchNearbyPlaces(input: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  includedTypes: string[];
  pageToken?: string;
}) {
  const body: Record<string, unknown> = {
    languageCode: 'en',
    regionCode: 'TZ',
    includedTypes: input.includedTypes.slice(0, 1),
    locationRestriction: {
      circle: {
        center: { latitude: input.latitude, longitude: input.longitude },
        radius: input.radiusMeters,
      },
    },
  };
  if (input.pageToken) body.pageToken = input.pageToken;

  const res = await placesFetch(
    '/places:searchNearby',
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'X-Goog-FieldMask': PLACES_SEARCH_FIELD_MASK },
    },
    'nearbySearch'
  );
  const json = (await res.json()) as { places?: any[]; nextPageToken?: string };
  return {
    places: (json.places || []).map(mapPlaceForClient),
    nextPageToken: json.nextPageToken || null,
  };
}

export async function getPlaceDetails(placeId: string, forceRefresh = false) {
  const id = placeId.replace(/^places\//, '');
  const cached = placesCacheGet(id);
  if (cached && !forceRefresh) return mapPlaceForClient(cached.payload);

  const res = await placesFetch(
    `/places/${id}`,
    {
      method: 'GET',
      headers: { 'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK },
    },
    'placeDetails'
  );
  const json = (await res.json()) as Record<string, unknown>;
  placesCacheSet(id, json, directorySettings().cacheTtlHours);
  return mapPlaceForClient(json);
}

export async function fetchPlacePhoto(name: string, maxHeightPx = 400): Promise<{ buffer: Buffer; contentType: string }> {
  const key = placesApiKey();
  if (!key) throw new Error('Google Places API key not configured.');
  if (placesQuotaExceeded()) throw new Error('Places API quota exceeded.');
  const url = `${PLACES_BASE}/${name.replace(/^\//, '')}/media?maxHeightPx=${maxHeightPx}`;
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'X-Goog-Api-Key': key },
  });
  recordPlacesUsage('placePhotos', !res.ok);
  if (!res.ok) throw new Error(`Photo fetch failed (${res.status}).`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType: res.headers.get('content-type') || 'image/jpeg' };
}
