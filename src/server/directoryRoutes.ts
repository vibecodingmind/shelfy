import { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest, logAuditEvent, requireAuth, requireAdminPermission } from './auth.js';
import { dbEngine } from './db.js';
import {
  claimRequests,
  directoryBusinesses,
  directorySettings,
  findDirectoryByPlaceId,
  importJobs,
  saveDirectorySettings,
} from './directory/directoryStore.js';
import { DIRECTORY_CATEGORY_META, DIRECTORY_REGIONS, REGION_CENTER } from './directory/constants.js';
import {
  fetchPlacePhoto,
  getPlaceDetails,
  placesApiStatus,
  searchNearbyPlaces,
  searchTextPlaces,
} from './directory/googlePlaces.js';
import { matchShelfStatus, runDirectoryImport } from './directory/importService.js';
import { approveDirectoryClaim, submitDirectoryClaim } from './directory/claimService.js';
import { DirectoryCategory, DirectoryPhotoSource, DirectoryRegion } from '../types/index.js';
import { newId } from './domain/ids.js';
import { putUpload } from './services/storage.js';
import { isDataUrlImage } from './domain/operations.js';

const adminPlacesLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many Places API searches. Wait a minute and try again.' } },
});

export function registerDirectoryRoutes(app: Express) {
  // ——— Public directory (no Google calls on list) ———
  app.get('/api/directory/businesses', (req: Request, res: Response) => {
    const { region, city, category, q, nearLat, nearLng, radiusKm } = req.query;
    let rows = directoryBusinesses().filter((b) => b.marketplaceStatus !== 'CLOSED');
    if (nearLat && nearLng) {
      const lat = Number(nearLat);
      const lng = Number(nearLng);
      const rKm = Math.min(50, Number(radiusKm) || 10);
      rows = rows.filter((b) => haversineKm(lat, lng, b.latitude, b.longitude) <= rKm);
    }
    if (region) rows = rows.filter((b) => b.region === String(region));
    if (city) rows = rows.filter((b) => b.city.toLowerCase().includes(String(city).toLowerCase()));
    if (category) rows = rows.filter((b) => b.directoryCategory === String(category));
    if (q) {
      const needle = String(q).toLowerCase();
      rows = rows.filter(
        (b) =>
          b.city.toLowerCase().includes(needle) ||
          (b.neighborhood || '').toLowerCase().includes(needle) ||
          b.googlePlaceId.toLowerCase().includes(needle)
      );
    }
    res.json({
      success: true,
      data: rows.map(publicDirectoryRow),
      meta: { total: rows.length, attribution: 'Business details from Google are loaded on demand.' },
    });
  });

  app.post('/api/directory/businesses/:id/claim', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      if (req.user!.role !== 'HOST' && req.user!.role !== 'VENDOR' && req.user!.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: { message: 'Only business owners (Host/Vendor) can claim listings.' } });
      }
      const claim = submitDirectoryClaim({
        directoryBusinessId: String(req.params.id),
        user: req.user!,
        message: req.body?.message,
      });
      logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'DIRECTORY_CLAIM_SUBMITTED', 'DirectoryBusiness', String(req.params.id));
      res.json({ success: true, data: claim });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message || 'Claim failed.' } });
    }
  });

  app.get('/api/directory/businesses/:id', async (req: Request, res: Response) => {
    const biz = directoryBusinesses().find((b) => b.id === req.params.id);
    if (!biz) return res.status(404).json({ success: false, error: { message: 'Business not found.' } });
    try {
      const display = await getPlaceDetails(biz.googlePlaceId);
      const licensed = licensedPhotosFor(biz.id);
      res.json({
        success: true,
        data: { ...publicDirectoryRow(biz), display, licensedPhotos: licensed },
      });
    } catch (err: any) {
      res.status(502).json({
        success: false,
        error: { message: err.message || 'Could not load business details from Google.' },
        data: publicDirectoryRow(biz),
      });
    }
  });

  app.get('/api/places/google-photo', async (req: Request, res: Response) => {
    const name = String(req.query.name || '').trim();
    if (!name) return res.status(400).send('Missing photo name.');
    try {
      const maxHeightPx = Math.min(800, Number(req.query.maxHeightPx) || 400);
      const { buffer, contentType } = await fetchPlacePhoto(name, maxHeightPx);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('X-Google-Attribution', 'Images may be subject to Google Maps Platform terms.');
      res.send(buffer);
    } catch (err: any) {
      res.status(502).json({ success: false, error: { message: err.message || 'Photo unavailable.' } });
    }
  });

  // ——— Admin: Business Directory ———
  app.get('/api/admin/directory/overview', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), (_req, res) => {
    const all = directoryBusinesses();
    res.json({
      success: true,
      data: {
        total: all.length,
        unclaimed: all.filter((b) => b.claimStatus === 'UNCLAIMED').length,
        claimed: all.filter((b) => b.claimStatus === 'CLAIMED').length,
        pendingClaims: claimRequests().filter((c) => c.status === 'PENDING').length,
        directoryOnly: all.filter((b) => b.marketplaceStatus === 'DIRECTORY_ONLY').length,
        activeMarketplace: all.filter((b) => b.marketplaceStatus === 'ACTIVE').length,
        byRegion: DIRECTORY_REGIONS.map((r) => ({ region: r, count: all.filter((b) => b.region === r).length })),
        placesApi: placesApiStatus(),
      },
    });
  });

  app.get('/api/admin/directory/settings', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), (_req, res) => {
    res.json({
      success: true,
      data: {
        settings: directorySettings(),
        placesApi: placesApiStatus(),
        categories: DIRECTORY_CATEGORY_META,
        regions: DIRECTORY_REGIONS,
      },
    });
  });

  app.put('/api/admin/directory/settings', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), (req: AuthenticatedRequest, res: Response) => {
    const patch = req.body || {};
    const saved = saveDirectorySettings(patch);
    logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'DIRECTORY_SETTINGS_UPDATED', 'DirectorySettings', 'global');
    res.json({ success: true, data: saved });
  });

  app.post('/api/admin/directory/places/test', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), adminPlacesLimiter, async (_req, res) => {
    try {
      const center = REGION_CENTER['Dar es Salaam'];
      await searchTextPlaces({
        textQuery: 'pharmacy Dar es Salaam Tanzania',
        latitude: center.latitude,
        longitude: center.longitude,
        radiusMeters: 3000,
      });
      res.json({ success: true, data: { ok: true, placesApi: placesApiStatus() } });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message || 'Connection test failed.' } });
    }
  });

  app.post('/api/admin/directory/places/search', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), adminPlacesLimiter, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        mode = 'text',
        region = 'Dar es Salaam',
        category = 'RETAIL_SHOP',
        textQuery,
        city,
        latitude,
        longitude,
        radiusMeters = 5000,
        pageToken,
      } = req.body || {};
      const reg = region as DirectoryRegion;
      const center = REGION_CENTER[reg] || REGION_CENTER['Dar es Salaam'];
      const lat = Number(latitude) || center.latitude;
      const lng = Number(longitude) || center.longitude;
      const meta = DIRECTORY_CATEGORY_META[category as DirectoryCategory] || DIRECTORY_CATEGORY_META.OTHER;
      const query =
        textQuery?.trim() ||
        `${meta.textQuery} ${city || center.defaultCity} Tanzania`;

      const result =
        mode === 'nearby'
          ? await searchNearbyPlaces({
              latitude: lat,
              longitude: lng,
              radiusMeters: Math.min(50000, Math.max(500, Number(radiusMeters))),
              includedTypes: meta.includedTypes,
              pageToken,
            })
          : await searchTextPlaces({
              textQuery: query,
              latitude: lat,
              longitude: lng,
              radiusMeters: Math.min(50000, Math.max(500, Number(radiusMeters))),
              pageToken,
            });

      const places = result.places.map((p) => ({
        ...p,
        shelfyMatch: matchShelfStatus(p.placeId),
      }));

      res.json({
        success: true,
        data: {
          places,
          nextPageToken: result.nextPageToken,
          searchContext: { region: reg, category, latitude: lat, longitude: lng, radiusMeters },
          attribution: 'Powered by Google',
          quota: placesApiStatus(),
        },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message || 'Search failed.' } });
    }
  });

  app.get('/api/admin/directory/places/:placeId', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), adminPlacesLimiter, async (req, res) => {
    try {
      const display = await getPlaceDetails(String(req.params.placeId));
      res.json({
        success: true,
        data: { ...display, shelfyMatch: matchShelfStatus(display.placeId) },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message || 'Details failed.' } });
    }
  });

  app.post('/api/admin/directory/import', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), async (req: AuthenticatedRequest, res: Response) => {
    const { placeIds, region, city, neighborhood, directoryCategory } = req.body || {};
    if (!Array.isArray(placeIds) || !placeIds.length) {
      return res.status(400).json({ success: false, error: { message: 'Select at least one business to import.' } });
    }
    if (!region || !city || !directoryCategory) {
      return res.status(400).json({ success: false, error: { message: 'region, city, and directoryCategory are required.' } });
    }
    try {
      const job = await runDirectoryImport({
        placeIds: placeIds.slice(0, 100),
        region,
        city,
        neighborhood,
        directoryCategory,
        initiatedBy: req.user!,
      });
      logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'DIRECTORY_IMPORT', 'DirectoryImportJob', job.id);
      res.json({ success: true, data: job });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err.message || 'Import failed.' } });
    }
  });

  app.get('/api/admin/directory/businesses', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), (req, res) => {
    const { claimStatus, verificationStatus, region, category } = req.query;
    let rows = [...directoryBusinesses()];
    if (claimStatus) rows = rows.filter((b) => b.claimStatus === String(claimStatus));
    if (verificationStatus) rows = rows.filter((b) => b.verificationStatus === String(verificationStatus));
    if (region) rows = rows.filter((b) => b.region === String(region));
    if (category) rows = rows.filter((b) => b.directoryCategory === String(category));
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ success: true, data: rows });
  });

  app.get('/api/admin/directory/import-jobs', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), (_req, res) => {
    res.json({ success: true, data: importJobs().slice(0, 100) });
  });

  app.get('/api/admin/directory/claims', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), (_req, res) => {
    res.json({ success: true, data: claimRequests() });
  });

  app.put('/api/admin/directory/claims/:id', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), async (req: AuthenticatedRequest, res: Response) => {
    const { status, reviewNotes } = req.body || {};
    const row = claimRequests().find((c) => c.id === req.params.id);
    if (!row) return res.status(404).json({ success: false, error: { message: 'Claim not found.' } });
    try {
      if (status === 'APPROVED') {
        row.reviewNotes = reviewNotes;
        await approveDirectoryClaim(row, req.user!.id);
        logAuditEvent(req.user!.id, req.user!.name, req.user!.role, 'DIRECTORY_CLAIM_APPROVED', 'DirectoryClaim', row.id);
      } else if (status === 'REJECTED') {
        row.status = 'REJECTED';
        row.reviewNotes = reviewNotes;
        row.reviewedBy = req.user!.id;
        row.updatedAt = new Date().toISOString();
        const biz = directoryBusinesses().find((b) => b.id === row.directoryBusinessId);
        if (biz) {
          biz.claimStatus = 'CLAIM_REJECTED';
          biz.updatedAt = new Date().toISOString();
        }
        await dbEngine.saveAsync();
      }
      res.json({ success: true, data: row });
    } catch (err: any) {
      res.status(400).json({ success: false, error: { message: err.message || 'Review failed.' } });
    }
  });

  app.put('/api/admin/directory/businesses/:id/verification', requireAuth, requireAdminPermission('MANAGE_MARKETPLACE'), (req: AuthenticatedRequest, res: Response) => {
    const { verificationStatus, marketplaceStatus } = req.body || {};
    const biz = directoryBusinesses().find((b) => b.id === req.params.id);
    if (!biz) return res.status(404).json({ success: false, error: { message: 'Not found.' } });
    if (verificationStatus) biz.verificationStatus = verificationStatus;
    if (marketplaceStatus) biz.marketplaceStatus = marketplaceStatus;
    biz.lastReviewedAt = new Date().toISOString();
    biz.updatedAt = biz.lastReviewedAt;
    void dbEngine.saveAsync();
    res.json({ success: true, data: biz });
  });

  app.post('/api/directory/businesses/:id/photos', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const biz = directoryBusinesses().find((b) => b.id === req.params.id);
    if (!biz) return res.status(404).json({ success: false, error: { message: 'Not found.' } });
    const user = req.user!;
    const allowed =
      user.role === 'ADMIN' ||
      user.role === 'FIELD_AGENT' ||
      biz.linkedHostUserId === user.id;
    if (!allowed) {
      return res.status(403).json({ success: false, error: { message: 'Not authorized to upload photos for this listing.' } });
    }
    const { imageDataUrl, source } = req.body || {};
    if (!isDataUrlImage(imageDataUrl)) {
      return res.status(400).json({ success: false, error: { message: 'Valid image data URL required.' } });
    }
    const photoSource: DirectoryPhotoSource =
      source === 'OWNER_UPLOAD' ? 'OWNER_UPLOAD' : user.role === 'FIELD_AGENT' ? 'FIELD_AGENT_UPLOAD' : 'OTHER_LICENSED_SOURCE';
    const base64 = imageDataUrl.split(',')[1];
    const bytes = Buffer.from(base64, 'base64');
    const stored = await putUpload({
      bytes,
      filename: `directory-${biz.id}-${Date.now()}.jpg`,
      contentType: 'image/jpeg',
    });
    const photo = {
      id: newId('dphoto'),
      directoryBusinessId: biz.id,
      url: stored.url,
      source: photoSource,
      uploadedBy: user.id,
      createdAt: new Date().toISOString(),
    };
    if (!dbEngine.db.directoryLicensedPhotos) dbEngine.db.directoryLicensedPhotos = [];
    dbEngine.db.directoryLicensedPhotos.unshift(photo);
    void dbEngine.saveAsync();
    res.json({ success: true, data: photo });
  });
}

function licensedPhotosFor(directoryBusinessId: string) {
  return (dbEngine.db.directoryLicensedPhotos || []).filter((p) => p.directoryBusinessId === directoryBusinessId);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function publicDirectoryRow(b: import('../types/index.js').DirectoryBusiness) {
  return {
    id: b.id,
    googlePlaceId: b.googlePlaceId,
    directoryCategory: b.directoryCategory,
    region: b.region,
    city: b.city,
    neighborhood: b.neighborhood,
    latitude: b.latitude,
    longitude: b.longitude,
    claimStatus: b.claimStatus,
    verificationStatus: b.verificationStatus,
    marketplaceStatus: b.marketplaceStatus,
    linkedShopId: b.linkedShopId,
    isDirectoryListing: true,
    hasMarketplaceShelves: Boolean(b.linkedShopId),
    licensedPhotoCount: licensedPhotosFor(b.id).length,
  };
}
