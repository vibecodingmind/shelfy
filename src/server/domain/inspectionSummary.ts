import { DatabaseSchema } from '../seedData.js';
import { InspectionSummary, Shelf, VerificationStatus } from '../../types/index.js';

const CONDITION_SCORE: Record<string, number> = {
  EXCELLENT: 10,
  GOOD: 8,
  NEEDS_CLEANING: 6,
  DISORGANIZED: 5,
  DAMAGED: 3,
};

export function buildInspectionSummary(
  shelfId: string,
  data: Pick<DatabaseSchema, 'shelfReports' | 'shelves' | 'shops'>
): InspectionSummary | null {
  const shelf = data.shelves.find((s) => s.id === shelfId);
  if (!shelf) return null;

  const shop = data.shops.find((s) => s.id === shelf.shopId);
  const reports = data.shelfReports
    .filter((r) => r.shelfId === shelfId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const latest = reports[0];
  const hostVerified = (shop?.verificationStatus || shelf.hostVerificationStatus) === 'VERIFIED';
  const listingVerified = shelf.verificationStatus === 'VERIFIED' && shelf.listingStatus === 'PUBLISHED';

  let trustScore = 40;
  if (listingVerified) trustScore += 25;
  if (hostVerified) trustScore += 15;
  if (latest) {
    trustScore += Math.round((latest.stockLevelPercent / 100) * 10);
    trustScore += CONDITION_SCORE[latest.shelfCondition] || 5;
  }
  trustScore = Math.min(100, Math.max(0, trustScore));

  return {
    shelfId,
    verifiedListing: listingVerified,
    hostVerified,
    lastInspectionAt: latest?.createdAt,
    lastInspectionScore: latest ? CONDITION_SCORE[latest.shelfCondition] : undefined,
    lastStockLevelPercent: latest?.stockLevelPercent,
    lastCondition: latest?.shelfCondition,
    totalInspections: reports.length,
    trustScore,
  };
}

export function enrichShelfWithTrust(shelf: Shelf, summary: InspectionSummary | null) {
  return {
    ...shelf,
    inspectionSummary: summary,
  };
}
