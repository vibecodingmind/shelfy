import { dbEngine } from '../db.js';
import { newId } from '../domain/ids.js';
import {
  DirectoryBusiness,
  DirectoryCategory,
  DirectoryImportJob,
  DirectoryRegion,
  User,
} from '../../types/index.js';
import { findDirectoryByPlaceId, normalizePlaceId } from './directoryStore.js';
import { getPlaceDetails } from './googlePlaces.js';

export function matchShelfStatus(placeId: string): { inDirectory: boolean; directoryBusinessId?: string; linkedShopId?: string } {
  const existing = findDirectoryByPlaceId(placeId);
  if (!existing) return { inDirectory: false };
  return {
    inDirectory: true,
    directoryBusinessId: existing.id,
    linkedShopId: existing.linkedShopId,
  };
}

export async function runDirectoryImport(input: {
  placeIds: string[];
  region: DirectoryRegion;
  city: string;
  neighborhood?: string;
  directoryCategory: DirectoryCategory;
  initiatedBy: User;
}): Promise<DirectoryImportJob> {
  const job: DirectoryImportJob = {
    id: newId('dimp'),
    initiatedBy: input.initiatedBy.id,
    initiatedByName: input.initiatedBy.name,
    region: input.region,
    city: input.city.trim(),
    directoryCategory: input.directoryCategory,
    placeIds: input.placeIds.map(normalizePlaceId),
    status: 'RUNNING',
    records: [],
    createdAt: new Date().toISOString(),
  };

  if (!dbEngine.db.directoryImportJobs) dbEngine.db.directoryImportJobs = [];
  if (!dbEngine.db.directoryBusinesses) dbEngine.db.directoryBusinesses = [];

  let created = 0;
  let duplicates = 0;
  let failed = 0;
  let needsReview = 0;

  for (const placeId of job.placeIds) {
    try {
      const dup = findDirectoryByPlaceId(placeId);
      if (dup) {
        duplicates += 1;
        job.records!.push({ placeId, status: 'DUPLICATE', directoryBusinessId: dup.id });
        continue;
      }

      let lat = 0;
      let lng = 0;
      try {
        const details = await getPlaceDetails(placeId);
        lat = details.location?.latitude ?? 0;
        lng = details.location?.longitude ?? 0;
      } catch {
        needsReview += 1;
        job.records!.push({ placeId, status: 'NEEDS_REVIEW', error: 'Could not verify place coordinates.' });
        continue;
      }

      if (!lat || !lng) {
        needsReview += 1;
        job.records!.push({ placeId, status: 'NEEDS_REVIEW', error: 'Missing coordinates.' });
        continue;
      }

      const now = new Date().toISOString();
      const business: DirectoryBusiness = {
        id: newId('dbiz'),
        googlePlaceId: normalizePlaceId(placeId),
        dataSource: 'GOOGLE_PLACES',
        directoryCategory: input.directoryCategory,
        region: input.region,
        city: input.city,
        neighborhood: input.neighborhood,
        latitude: lat,
        longitude: lng,
        claimStatus: 'UNCLAIMED',
        verificationStatus: 'NOT_VERIFIED',
        marketplaceStatus: 'DIRECTORY_ONLY',
        importJobId: job.id,
        createdAt: now,
        updatedAt: now,
        lastReviewedAt: now,
      };
      dbEngine.db.directoryBusinesses.push(business);
      created += 1;
      job.records!.push({ placeId, status: 'CREATED', directoryBusinessId: business.id });
    } catch (err: any) {
      failed += 1;
      job.records!.push({ placeId, status: 'FAILED', error: err.message || 'Import failed.' });
    }
  }

  job.status = 'COMPLETED';
  job.completedAt = new Date().toISOString();
  job.summary = {
    total: job.placeIds.length,
    created,
    duplicates,
    failed,
    needsReview,
  };
  dbEngine.db.directoryImportJobs.unshift(job);
  await dbEngine.saveAsync();
  return job;
}
