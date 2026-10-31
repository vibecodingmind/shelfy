import { dbEngine } from '../db.js';
import {
  DirectoryBusiness,
  DirectoryClaimRequest,
  DirectoryImportJob,
  DirectorySettings,
  PlacesDisplayCacheEntry,
} from '../../types/index.js';

export const DEFAULT_DIRECTORY_SETTINGS: DirectorySettings = {
  enabled: true,
  dailyQuotaLimit: 500,
  monthlyQuotaLimit: 10000,
  cacheTtlHours: 24,
  placesApiEnabled: true,
  mapsJsEnabled: true,
  usageByDay: [],
};

export function directorySettings(): DirectorySettings {
  const s = dbEngine.db.directorySettings;
  return { ...DEFAULT_DIRECTORY_SETTINGS, ...(s || {}) };
}

export function saveDirectorySettings(patch: Partial<DirectorySettings>): DirectorySettings {
  dbEngine.db.directorySettings = { ...directorySettings(), ...patch };
  void dbEngine.saveAsync();
  return dbEngine.db.directorySettings!;
}

export function directoryBusinesses(): DirectoryBusiness[] {
  return dbEngine.db.directoryBusinesses || [];
}

export function findDirectoryByPlaceId(placeId: string): DirectoryBusiness | undefined {
  const normalized = normalizePlaceId(placeId);
  return directoryBusinesses().find((b) => normalizePlaceId(b.googlePlaceId) === normalized);
}

export function normalizePlaceId(placeId: string): string {
  return placeId.replace(/^places\//, '').trim();
}

export function placesCacheGet(placeId: string): PlacesDisplayCacheEntry | undefined {
  const id = normalizePlaceId(placeId);
  const row = (dbEngine.db.placesDisplayCache || []).find((c) => c.placeId === id);
  if (!row) return undefined;
  if (new Date(row.expiresAt).getTime() < Date.now()) return undefined;
  return row;
}

export function placesCacheSet(placeId: string, payload: Record<string, unknown>, ttlHours: number): void {
  const id = normalizePlaceId(placeId);
  const now = new Date();
  const entry: PlacesDisplayCacheEntry = {
    placeId: id,
    payload,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString(),
  };
  if (!dbEngine.db.placesDisplayCache) dbEngine.db.placesDisplayCache = [];
  dbEngine.db.placesDisplayCache = [
    entry,
    ...dbEngine.db.placesDisplayCache.filter((c) => c.placeId !== id),
  ].slice(0, 5000);
}

export function recordPlacesUsage(kind: 'textSearch' | 'nearbySearch' | 'placeDetails' | 'placePhotos', error = false): void {
  const day = new Date().toISOString().slice(0, 10);
  const settings = directorySettings();
  let row = settings.usageByDay.find((d) => d.date === day);
  if (!row) {
    row = { date: day, textSearch: 0, nearbySearch: 0, placeDetails: 0, placePhotos: 0, errors: 0 };
    settings.usageByDay.unshift(row);
    settings.usageByDay = settings.usageByDay.slice(0, 90);
  }
  row[kind] += 1;
  if (error) row.errors += 1;
  saveDirectorySettings({
    usageByDay: settings.usageByDay,
    lastSuccessfulRequestAt: error ? settings.lastSuccessfulRequestAt : new Date().toISOString(),
    lastError: error ? settings.lastError : undefined,
  });
}

export function placesQuotaExceeded(): boolean {
  const s = directorySettings();
  const day = new Date().toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const today = s.usageByDay.find((d) => d.date === day);
  const monthTotal = s.usageByDay
    .filter((d) => d.date.startsWith(month))
    .reduce((sum, d) => sum + d.textSearch + d.nearbySearch + d.placeDetails + d.placePhotos, 0);
  const todayTotal = today
    ? today.textSearch + today.nearbySearch + today.placeDetails + today.placePhotos
    : 0;
  return todayTotal >= s.dailyQuotaLimit || monthTotal >= s.monthlyQuotaLimit;
}

export function importJobs(): DirectoryImportJob[] {
  return dbEngine.db.directoryImportJobs || [];
}

export function claimRequests(): DirectoryClaimRequest[] {
  return dbEngine.db.directoryClaimRequests || [];
}
