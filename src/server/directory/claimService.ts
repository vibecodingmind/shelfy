import { dbEngine } from '../db.js';
import { newId } from '../domain/ids.js';
import { uniqueSlug } from '../domain/slugs.js';
import {
  DirectoryBusiness,
  DirectoryCategory,
  DirectoryClaimRequest,
  Shop,
  User,
} from '../../types/index.js';
import { claimRequests, directoryBusinesses } from './directoryStore.js';
import { getPlaceDetails } from './googlePlaces.js';

function categoryToShopType(category: DirectoryCategory): Shop['shopType'] {
  const map: Partial<Record<DirectoryCategory, Shop['shopType']>> = {
    PHARMACY: 'PHARMACY',
    SUPERMARKET: 'SUPERMARKET',
    GROCERY_STORE: 'MINI_MARKET',
    CONVENIENCE_STORE: 'CONVENIENCE',
    RETAIL_SHOP: 'SPECIALTY',
    ELECTRONICS_STORE: 'SPECIALTY',
    CLOTHING_STORE: 'BOUTIQUE',
    MARKET: 'MINI_MARKET',
    SHOPPING_CENTRE: 'SUPERMARKET',
    HARDWARE_STORE: 'SPECIALTY',
    RESTAURANT: 'SPECIALTY',
    OTHER: 'SPECIALTY',
  };
  return map[category] || 'SPECIALTY';
}

export function submitDirectoryClaim(input: {
  directoryBusinessId: string;
  user: User;
  message?: string;
}): DirectoryClaimRequest {
  const biz = directoryBusinesses().find((b) => b.id === input.directoryBusinessId);
  if (!biz) throw new Error('Directory business not found.');
  if (biz.claimStatus === 'CLAIMED') throw new Error('This business is already claimed.');
  if (biz.claimStatus === 'CLAIM_PENDING') throw new Error('A claim is already pending review.');

  const pending = claimRequests().find(
    (c) => c.directoryBusinessId === biz.id && c.status === 'PENDING' && c.requesterUserId === input.user.id
  );
  if (pending) return pending;

  const now = new Date().toISOString();
  const row: DirectoryClaimRequest = {
    id: newId('dclaim'),
    directoryBusinessId: biz.id,
    requesterUserId: input.user.id,
    requesterName: input.user.name,
    requesterEmail: input.user.email,
    message: input.message?.trim(),
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
  if (!dbEngine.db.directoryClaimRequests) dbEngine.db.directoryClaimRequests = [];
  dbEngine.db.directoryClaimRequests.unshift(row);
  biz.claimStatus = 'CLAIM_PENDING';
  biz.updatedAt = now;
  void dbEngine.saveAsync();
  return row;
}

/** Creates a draft Shop for the claimant and links the directory record (onboarding). */
export async function provisionShopForClaim(biz: DirectoryBusiness, host: User): Promise<Shop> {
  if (biz.linkedShopId) {
    const existing = dbEngine.db.shops.find((s) => s.id === biz.linkedShopId);
    if (existing) return existing;
  }

  let name = `${biz.city} business`;
  let address = biz.city;
  try {
    const display = await getPlaceDetails(biz.googlePlaceId);
    if (display.displayName) name = String(display.displayName);
    if (display.formattedAddress) address = String(display.formattedAddress);
  } catch {
    // Shop stub uses city-level placeholders until host completes profile.
  }

  const now = new Date().toISOString();
  const shopId = newId('shop');
  const shop: Shop = {
    id: shopId,
    hostId: host.id,
    hostName: host.name,
    name: name.slice(0, 120),
    description: 'Claimed from Shelfy business directory. Complete your shop profile to publish shelves.',
    address,
    city: biz.city,
    region: biz.region,
    latitude: biz.latitude,
    longitude: biz.longitude,
    photos: [],
    status: 'ACTIVE',
    verificationStatus: 'PENDING',
    listingStatus: 'DRAFT',
    slug: uniqueSlug(`${biz.city} ${name}`, dbEngine.db.shops.map((s) => s.slug || '')),
    shopType: categoryToShopType(biz.directoryCategory),
    createdAt: now,
    updatedAt: now,
  };
  dbEngine.db.shops.push(shop);
  biz.linkedShopId = shopId;
  biz.linkedHostUserId = host.id;
  biz.marketplaceStatus = 'ONBOARDING';
  biz.verificationStatus = 'PENDING_VERIFICATION';
  biz.updatedAt = now;
  return shop;
}

export async function approveDirectoryClaim(claim: DirectoryClaimRequest, reviewerId: string): Promise<void> {
  const biz = directoryBusinesses().find((b) => b.id === claim.directoryBusinessId);
  if (!biz) throw new Error('Directory business missing.');
  const host = dbEngine.db.users.find((u) => u.id === claim.requesterUserId);
  if (!host) throw new Error('Claimant user not found.');

  if (host.role !== 'HOST' && host.role !== 'ADMIN') {
    host.role = 'HOST';
    host.updatedAt = new Date().toISOString();
    if (!dbEngine.db.hostProfiles.some((h) => h.userId === host.id)) {
      dbEngine.db.hostProfiles.push({
        id: newId('hp'),
        userId: host.id,
        businessName: host.name,
        phone: host.phone || '',
        verificationStatus: 'PENDING',
      });
    }
  }

  await provisionShopForClaim(biz, host);
  biz.claimStatus = 'CLAIMED';
  claim.status = 'APPROVED';
  claim.reviewedBy = reviewerId;
  claim.updatedAt = new Date().toISOString();
  await dbEngine.saveAsync();
}
