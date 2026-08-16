import type { Prisma, PrismaClient } from '@prisma/client';
import { DatabaseSchema } from './seedData.js';
import { User } from '../types/index.js';

function asDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mustDate(value?: string | null): Date {
  return asDate(value) || new Date();
}

function iso(value?: Date | null): string | undefined {
  return value ? value.toISOString() : undefined;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return (value ?? []) as Prisma.InputJsonValue;
}

function listingStatusForWrite(entity: { listingStatus?: string; verificationStatus?: string }) {
  if (entity.listingStatus) return entity.listingStatus as any;
  return entity.verificationStatus === 'VERIFIED' ? 'PUBLISHED' : 'DRAFT';
}

export async function relationalUserCount(prisma: PrismaClient): Promise<number> {
  return prisma.user.count();
}

export async function importSchemaToPrisma(prisma: PrismaClient, data: DatabaseSchema): Promise<void> {
  await persistSchemaToPrisma(prisma, data);
}

export async function loadSchemaFromPrisma(prisma: PrismaClient): Promise<DatabaseSchema> {
  const [
    users,
    vendorProfiles,
    hostProfiles,
    shops,
    shelves,
    products,
    inventory,
    bookings,
    bookingStatusHistory,
    payments,
    paymentAttempts,
    payouts,
    fieldVisits,
    fieldReports,
    notifications,
    messages,
    auditLogs,
    reviews,
    disputes,
    authTokens,
    ledgerAccounts,
    ledgerEntries,
    withdrawals,
    verificationRequests,
    settingsRow,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.vendorProfile.findMany(),
    prisma.hostProfile.findMany(),
    prisma.shop.findMany(),
    prisma.shelf.findMany(),
    prisma.product.findMany(),
    prisma.inventoryItem.findMany(),
    prisma.booking.findMany(),
    prisma.bookingStatusHistory.findMany(),
    prisma.payment.findMany(),
    prisma.paymentAttempt.findMany(),
    prisma.payout.findMany(),
    prisma.fieldVisit.findMany(),
    prisma.fieldReport.findMany(),
    prisma.notification.findMany(),
    prisma.message.findMany(),
    prisma.auditLog.findMany(),
    prisma.review.findMany(),
    prisma.dispute.findMany(),
    prisma.authToken.findMany(),
    prisma.ledgerAccount.findMany(),
    prisma.ledgerEntry.findMany(),
    prisma.withdrawal.findMany(),
    prisma.verificationRequest.findMany(),
    prisma.platformSetting.findUnique({ where: { id: 'main' } }),
  ]);

  return {
    schemaVersion: 6,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      passwordHash: u.passwordHash,
      role: u.role,
      status: u.status,
      avatarUrl: u.avatarUrl || undefined,
      emailVerifiedAt: iso(u.emailVerifiedAt),
      phoneVerifiedAt: iso(u.phoneVerifiedAt),
      failedLoginCount: u.failedLoginCount,
      lockedUntil: iso(u.lockedUntil),
      lastLoginAt: iso(u.lastLoginAt),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
    vendorProfiles: vendorProfiles.map((p) => ({
      id: p.id,
      userId: p.userId,
      businessName: p.businessName,
      businessRegistration: p.businessRegistration || undefined,
      description: p.description || undefined,
      category: p.category,
      address: p.address,
      city: p.city,
      region: p.region,
      country: p.country,
      verificationStatus: p.verificationStatus as any,
    })),
    hostProfiles: hostProfiles.map((p) => ({
      id: p.id,
      userId: p.userId,
      businessName: p.businessName,
      businessRegistration: p.businessRegistration || undefined,
      description: p.description || undefined,
      phone: p.phone,
      verificationStatus: p.verificationStatus as any,
    })),
    shops: shops.map((s) => ({
      id: s.id,
      hostId: s.hostId,
      hostName: s.hostName || undefined,
      name: s.name,
      description: s.description,
      address: s.address,
      city: s.city,
      region: s.region,
      latitude: s.latitude,
      longitude: s.longitude,
      photos: (s.photos as string[]) || [],
      status: s.status,
      verificationStatus: s.verificationStatus as any,
      listingStatus: s.listingStatus as any,
      slug: s.slug || undefined,
      deletedAt: iso(s.deletedAt),
      footTrafficScore: s.footTrafficScore || undefined,
      shopType: s.shopType,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    shelves: shelves.map((s) => ({
      id: s.id,
      shopId: s.shopId,
      shopName: s.shopName || undefined,
      shopCity: s.shopCity || undefined,
      shopAddress: s.shopAddress || undefined,
      shopLatitude: s.shopLatitude || undefined,
      shopLongitude: s.shopLongitude || undefined,
      hostVerificationStatus: (s.hostVerificationStatus as any) || undefined,
      name: s.name,
      description: s.description,
      widthCm: s.widthCm,
      heightCm: s.heightCm,
      depthCm: s.depthCm,
      shelfType: s.shelfType as any,
      locationInsideShop: s.locationInsideShop,
      monthlyPriceTzs: s.monthlyPriceTzs,
      availabilityStatus: s.availabilityStatus,
      allowedCategories: (s.allowedCategories as string[]) || [],
      photos: (s.photos as string[]) || [],
      status: s.status,
      verificationStatus: s.verificationStatus as any,
      listingStatus: s.listingStatus as any,
      slug: s.slug || undefined,
      deletedAt: iso(s.deletedAt),
      avgRating: s.avgRating || undefined,
      reviewCount: s.reviewCount,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    products: products.map((p) => ({
      id: p.id,
      vendorId: p.vendorId,
      vendorName: p.vendorName || undefined,
      name: p.name,
      description: p.description,
      category: p.category,
      sku: p.sku,
      priceTzs: p.priceTzs,
      images: (p.images as string[]) || [],
      status: p.status,
      stockQuantity: p.stockQuantity,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    shelfInventory: inventory.map((i) => ({
      id: i.id,
      shelfId: i.shelfId,
      productId: i.productId,
      productName: i.productName || undefined,
      productSku: i.productSku || undefined,
      vendorId: i.vendorId,
      quantity: i.quantity,
      minStockLevel: i.minStockLevel,
      stockStatus: i.stockStatus as any,
      lastUpdated: i.lastUpdated.toISOString(),
    })),
    bookings: bookings.map((b) => ({
      id: b.id,
      vendorId: b.vendorId,
      vendorName: b.vendorName || undefined,
      vendorBusinessName: b.vendorBusinessName || undefined,
      shelfId: b.shelfId,
      shelfName: b.shelfName || undefined,
      shopName: b.shopName || undefined,
      shopCity: b.shopCity || undefined,
      hostId: b.hostId,
      startDate: b.startDate,
      endDate: b.endDate,
      durationMonths: b.durationMonths,
      monthlyPriceTzs: b.monthlyPriceTzs,
      totalPriceTzs: b.totalPriceTzs,
      platformFeeTzs: b.platformFeeTzs,
      hostEarningsTzs: b.hostEarningsTzs,
      status: b.status as any,
      paymentStatus: b.paymentStatus,
      notes: b.notes || undefined,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    })),
    bookingStatusHistory: bookingStatusHistory.map((h) => ({
      id: h.id,
      bookingId: h.bookingId,
      fromStatus: (h.fromStatus as any) || undefined,
      toStatus: h.toStatus as any,
      actorId: h.actorId || undefined,
      actorRole: h.actorRole,
      reason: h.reason || undefined,
      createdAt: h.createdAt.toISOString(),
    })),
    payments: payments.map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      vendorId: p.vendorId,
      amountTzs: p.amountTzs,
      currency: p.currency,
      provider: p.provider as any,
      transactionReference: p.transactionReference,
      pesapalTrackingId: p.pesapalTrackingId || undefined,
      status: p.status,
      paidAt: iso(p.paidAt),
      createdAt: p.createdAt.toISOString(),
    })),
    paymentAttempts: paymentAttempts.map((a) => ({
      id: a.id,
      paymentId: a.paymentId,
      status: a.status,
      payload: (a.payload as Record<string, unknown>) || undefined,
      createdAt: a.createdAt.toISOString(),
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      hostId: p.hostId,
      hostName: p.hostName || undefined,
      hostBusinessName: p.hostBusinessName || undefined,
      grossAmountTzs: p.grossAmountTzs,
      commissionTzs: p.commissionTzs,
      netAmountTzs: p.netAmountTzs,
      status: p.status as any,
      payoutReference: p.payoutReference || undefined,
      paidAt: iso(p.paidAt),
      createdAt: p.createdAt.toISOString(),
    })),
    fieldVisits: fieldVisits.map((v) => ({
      id: v.id,
      agentId: v.agentId,
      agentName: v.agentName || undefined,
      shopId: v.shopId,
      shopName: v.shopName || undefined,
      shopAddress: v.shopAddress || undefined,
      shopCity: v.shopCity || undefined,
      shopLatitude: v.shopLatitude || undefined,
      shopLongitude: v.shopLongitude || undefined,
      shelfId: v.shelfId,
      shelfName: v.shelfName || undefined,
      scheduledAt: v.scheduledAt.toISOString(),
      startedAt: iso(v.startedAt),
      completedAt: iso(v.completedAt),
      checkedInAt: iso(v.checkedInAt),
      status: v.status as any,
      latitude: v.latitude || undefined,
      longitude: v.longitude || undefined,
      notes: v.notes || undefined,
      createdAt: v.createdAt.toISOString(),
    })),
    shelfReports: fieldReports.map((r) => ({
      id: r.id,
      visitId: r.visitId,
      agentId: r.agentId,
      agentName: r.agentName || undefined,
      shelfId: r.shelfId,
      shopId: r.shopId,
      stockLevelPercent: r.stockLevelPercent,
      shelfCondition: r.shelfCondition as any,
      notes: r.notes,
      photos: (r.photos as string[]) || [],
      aiAnalysis: (r.aiAnalysis as any) || undefined,
      createdAt: r.createdAt.toISOString(),
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type as any,
      readAt: iso(n.readAt),
      createdAt: n.createdAt.toISOString(),
    })),
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName,
      senderRole: m.senderRole as any,
      receiverId: m.receiverId,
      bookingId: m.bookingId || undefined,
      content: m.content,
      readAt: iso(m.readAt),
      createdAt: m.createdAt.toISOString(),
    })),
    auditLogs: auditLogs.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.userName,
      userRole: l.userRole as any,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      details: l.details || undefined,
      timestamp: l.timestamp.toISOString(),
    })),
    reviews: reviews.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      reviewerId: r.reviewerId,
      reviewerName: r.reviewerName,
      reviewerRole: r.reviewerRole as any,
      targetId: r.targetId,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    })),
    disputes: disputes.map((d) => ({
      id: d.id,
      bookingId: d.bookingId,
      raisedById: d.raisedById,
      raisedByName: d.raisedByName,
      againstId: d.againstId,
      againstName: d.againstName,
      reason: d.reason,
      status: d.status as any,
      resolutionDetails: d.resolutionDetails || undefined,
      resolvedById: d.resolvedById || undefined,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    authTokens: authTokens.map((t) => ({
      id: t.id,
      userId: t.userId,
      type: t.type as any,
      tokenHash: t.tokenHash,
      expiresAt: t.expiresAt.toISOString(),
      usedAt: iso(t.usedAt),
      createdAt: t.createdAt.toISOString(),
    })),
    ledgerAccounts: ledgerAccounts.map((a) => ({
      id: a.id,
      ownerType: a.ownerType as any,
      ownerId: a.ownerId,
      type: a.type as any,
    })),
    ledgerEntries: ledgerEntries.map((e) => ({
      id: e.id,
      accountId: e.accountId,
      amountTzs: e.amountTzs,
      direction: e.direction as any,
      type: e.type as any,
      refType: e.refType,
      refId: e.refId,
      idempotencyKey: e.idempotencyKey,
      memo: e.memo || undefined,
      createdAt: e.createdAt.toISOString(),
    })),
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      hostId: w.hostId,
      amountTzs: w.amountTzs,
      method: w.method,
      status: w.status as any,
      payoutReference: w.payoutReference || undefined,
      failureReason: w.failureReason || undefined,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
    verificationRequests: verificationRequests.map((v) => ({
      id: v.id,
      subjectType: v.subjectType as any,
      subjectId: v.subjectId,
      requestedBy: v.requestedBy,
      status: v.status as any,
      notes: v.notes || undefined,
      reviewedBy: v.reviewedBy || undefined,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
    settings: ((settingsRow?.value as unknown) as DatabaseSchema['settings']) || ({} as DatabaseSchema['settings']),
  };
}

export async function persistSchemaToPrisma(prisma: PrismaClient, data: DatabaseSchema): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const user of data.users) {
      await tx.user.upsert({
        where: { id: user.id },
        create: mapUserWrite(user),
        update: mapUserWrite(user),
      });
    }
    for (const profile of data.vendorProfiles) {
      await tx.vendorProfile.upsert({
        where: { id: profile.id },
        create: {
          id: profile.id,
          userId: profile.userId,
          businessName: profile.businessName,
          businessRegistration: profile.businessRegistration,
          description: profile.description,
          category: profile.category,
          address: profile.address,
          city: profile.city,
          region: profile.region,
          country: profile.country,
          verificationStatus: profile.verificationStatus as any,
        },
        update: {
          businessName: profile.businessName,
          verificationStatus: profile.verificationStatus as any,
          description: profile.description,
        },
      });
    }
    for (const profile of data.hostProfiles) {
      await tx.hostProfile.upsert({
        where: { id: profile.id },
        create: {
          id: profile.id,
          userId: profile.userId,
          businessName: profile.businessName,
          businessRegistration: profile.businessRegistration,
          description: profile.description,
          phone: profile.phone,
          verificationStatus: profile.verificationStatus as any,
        },
        update: {
          businessName: profile.businessName,
          verificationStatus: profile.verificationStatus as any,
        },
      });
    }
    for (const shop of data.shops) {
      await tx.shop.upsert({
        where: { id: shop.id },
        create: {
          id: shop.id,
          hostId: shop.hostId,
          hostName: shop.hostName,
          name: shop.name,
          description: shop.description,
          address: shop.address,
          city: shop.city,
          region: shop.region,
          latitude: shop.latitude,
          longitude: shop.longitude,
          photos: jsonValue(shop.photos),
          status: shop.status,
          verificationStatus: shop.verificationStatus as any,
          listingStatus: listingStatusForWrite(shop),
          slug: shop.slug,
          deletedAt: asDate(shop.deletedAt),
          footTrafficScore: shop.footTrafficScore,
          shopType: shop.shopType,
          createdAt: mustDate(shop.createdAt),
          updatedAt: mustDate(shop.updatedAt),
        },
        update: {
          name: shop.name,
          status: shop.status,
          verificationStatus: shop.verificationStatus as any,
          listingStatus: listingStatusForWrite(shop),
          slug: shop.slug,
          deletedAt: asDate(shop.deletedAt),
          photos: jsonValue(shop.photos),
          updatedAt: mustDate(shop.updatedAt),
        },
      });
    }
    for (const shelf of data.shelves) {
      await tx.shelf.upsert({
        where: { id: shelf.id },
        create: {
          id: shelf.id,
          shopId: shelf.shopId,
          shopName: shelf.shopName,
          shopCity: shelf.shopCity,
          shopAddress: shelf.shopAddress,
          shopLatitude: shelf.shopLatitude,
          shopLongitude: shelf.shopLongitude,
          hostVerificationStatus: shelf.hostVerificationStatus as any,
          name: shelf.name,
          description: shelf.description,
          widthCm: shelf.widthCm,
          heightCm: shelf.heightCm,
          depthCm: shelf.depthCm,
          shelfType: coerceShelfType(shelf.shelfType),
          locationInsideShop: shelf.locationInsideShop,
          monthlyPriceTzs: shelf.monthlyPriceTzs,
          availabilityStatus: shelf.availabilityStatus,
          allowedCategories: jsonValue(shelf.allowedCategories),
          photos: jsonValue(shelf.photos),
          status: shelf.status,
          verificationStatus: (shelf.verificationStatus || 'PENDING') as any,
          listingStatus: listingStatusForWrite(shelf),
          slug: shelf.slug,
          deletedAt: asDate(shelf.deletedAt),
          avgRating: shelf.avgRating,
          reviewCount: shelf.reviewCount || 0,
          createdAt: mustDate(shelf.createdAt),
          updatedAt: mustDate(shelf.updatedAt),
        },
        update: {
          name: shelf.name,
          availabilityStatus: shelf.availabilityStatus,
          status: shelf.status,
          verificationStatus: (shelf.verificationStatus || 'PENDING') as any,
          listingStatus: listingStatusForWrite(shelf),
          slug: shelf.slug,
          deletedAt: asDate(shelf.deletedAt),
          monthlyPriceTzs: shelf.monthlyPriceTzs,
          photos: jsonValue(shelf.photos),
          updatedAt: mustDate(shelf.updatedAt),
        },
      });
    }
    for (const product of data.products) {
      await tx.product.upsert({
        where: { id: product.id },
        create: {
          id: product.id,
          vendorId: product.vendorId,
          vendorName: product.vendorName,
          name: product.name,
          description: product.description,
          category: product.category,
          sku: product.sku,
          priceTzs: product.priceTzs,
          images: jsonValue(product.images),
          status: product.status,
          stockQuantity: product.stockQuantity,
          createdAt: mustDate(product.createdAt),
          updatedAt: mustDate(product.updatedAt),
        },
        update: {
          name: product.name,
          priceTzs: product.priceTzs,
          stockQuantity: product.stockQuantity,
          status: product.status,
          updatedAt: mustDate(product.updatedAt),
        },
      });
    }
    for (const item of data.shelfInventory) {
      await tx.inventoryItem.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          shelfId: item.shelfId,
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          vendorId: item.vendorId,
          quantity: item.quantity,
          minStockLevel: item.minStockLevel,
          stockStatus: item.stockStatus,
          lastUpdated: mustDate(item.lastUpdated),
        },
        update: {
          quantity: item.quantity,
          stockStatus: item.stockStatus,
          lastUpdated: mustDate(item.lastUpdated),
        },
      });
    }
    for (const booking of data.bookings) {
      await tx.booking.upsert({
        where: { id: booking.id },
        create: {
          id: booking.id,
          vendorId: booking.vendorId,
          vendorName: booking.vendorName,
          vendorBusinessName: booking.vendorBusinessName,
          shelfId: booking.shelfId,
          shelfName: booking.shelfName,
          shopName: booking.shopName,
          shopCity: booking.shopCity,
          hostId: booking.hostId,
          startDate: booking.startDate,
          endDate: booking.endDate,
          durationMonths: booking.durationMonths,
          monthlyPriceTzs: booking.monthlyPriceTzs,
          totalPriceTzs: booking.totalPriceTzs,
          platformFeeTzs: booking.platformFeeTzs,
          hostEarningsTzs: booking.hostEarningsTzs,
          status: booking.status as any,
          paymentStatus: booking.paymentStatus,
          notes: booking.notes,
          createdAt: mustDate(booking.createdAt),
          updatedAt: mustDate(booking.updatedAt),
        },
        update: {
          status: booking.status as any,
          paymentStatus: booking.paymentStatus,
          notes: booking.notes,
          updatedAt: mustDate(booking.updatedAt),
        },
      });
    }
    for (const history of data.bookingStatusHistory) {
      await tx.bookingStatusHistory.upsert({
        where: { id: history.id },
        create: {
          id: history.id,
          bookingId: history.bookingId,
          fromStatus: history.fromStatus as any,
          toStatus: history.toStatus as any,
          actorId: history.actorId,
          actorRole: history.actorRole,
          reason: history.reason,
          createdAt: mustDate(history.createdAt),
        },
        update: {},
      });
    }
    for (const payment of data.payments) {
      await tx.payment.upsert({
        where: { id: payment.id },
        create: {
          id: payment.id,
          bookingId: payment.bookingId,
          vendorId: payment.vendorId,
          amountTzs: payment.amountTzs,
          currency: payment.currency,
          provider: payment.provider,
          merchantReference: payment.transactionReference,
          transactionReference: payment.transactionReference,
          pesapalTrackingId: payment.pesapalTrackingId,
          status: payment.status,
          paidAt: asDate(payment.paidAt),
          createdAt: mustDate(payment.createdAt),
        },
        update: {
          status: payment.status,
          pesapalTrackingId: payment.pesapalTrackingId,
          paidAt: asDate(payment.paidAt),
        },
      });
    }
    for (const attempt of data.paymentAttempts) {
      await tx.paymentAttempt.upsert({
        where: { id: attempt.id },
        create: {
          id: attempt.id,
          paymentId: attempt.paymentId,
          status: attempt.status,
          payload: attempt.payload ? jsonValue(attempt.payload) : undefined,
          createdAt: mustDate(attempt.createdAt),
        },
        update: { status: attempt.status },
      });
    }
    for (const payout of data.payouts) {
      await tx.payout.upsert({
        where: { id: payout.id },
        create: {
          id: payout.id,
          hostId: payout.hostId,
          hostName: payout.hostName,
          hostBusinessName: payout.hostBusinessName,
          grossAmountTzs: payout.grossAmountTzs,
          commissionTzs: payout.commissionTzs,
          netAmountTzs: payout.netAmountTzs,
          status: payout.status,
          payoutReference: payout.payoutReference,
          paidAt: asDate(payout.paidAt),
          createdAt: mustDate(payout.createdAt),
        },
        update: {
          status: payout.status,
          payoutReference: payout.payoutReference,
          paidAt: asDate(payout.paidAt),
        },
      });
    }
    for (const visit of data.fieldVisits) {
      await tx.fieldVisit.upsert({
        where: { id: visit.id },
        create: {
          id: visit.id,
          agentId: visit.agentId,
          agentName: visit.agentName,
          shopId: visit.shopId,
          shopName: visit.shopName,
          shopAddress: visit.shopAddress,
          shopCity: visit.shopCity,
          shopLatitude: visit.shopLatitude,
          shopLongitude: visit.shopLongitude,
          shelfId: visit.shelfId,
          shelfName: visit.shelfName,
          scheduledAt: mustDate(visit.scheduledAt),
          startedAt: asDate(visit.startedAt),
          completedAt: asDate(visit.completedAt),
          checkedInAt: asDate(visit.checkedInAt),
          status: visit.status,
          latitude: visit.latitude,
          longitude: visit.longitude,
          notes: visit.notes,
          createdAt: mustDate(visit.createdAt),
        },
        update: {
          status: visit.status,
          startedAt: asDate(visit.startedAt),
          completedAt: asDate(visit.completedAt),
          checkedInAt: asDate(visit.checkedInAt),
          latitude: visit.latitude,
          longitude: visit.longitude,
          shopLatitude: visit.shopLatitude,
          shopLongitude: visit.shopLongitude,
        },
      });
    }
    for (const report of data.shelfReports) {
      await tx.fieldReport.upsert({
        where: { id: report.id },
        create: {
          id: report.id,
          visitId: report.visitId,
          agentId: report.agentId,
          agentName: report.agentName,
          shelfId: report.shelfId,
          shopId: report.shopId,
          stockLevelPercent: report.stockLevelPercent,
          shelfCondition: report.shelfCondition,
          notes: report.notes,
          photos: jsonValue(report.photos),
          aiAnalysis: report.aiAnalysis ? jsonValue(report.aiAnalysis) : undefined,
          createdAt: mustDate(report.createdAt),
        },
        update: { notes: report.notes, stockLevelPercent: report.stockLevelPercent },
      });
    }
    for (const notification of data.notifications) {
      await tx.notification.upsert({
        where: { id: notification.id },
        create: {
          id: notification.id,
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          readAt: asDate(notification.readAt),
          createdAt: mustDate(notification.createdAt),
        },
        update: { readAt: asDate(notification.readAt) },
      });
    }
    for (const message of data.messages) {
      await tx.message.upsert({
        where: { id: message.id },
        create: {
          id: message.id,
          senderId: message.senderId,
          senderName: message.senderName,
          senderRole: message.senderRole,
          receiverId: message.receiverId,
          bookingId: message.bookingId,
          content: message.content,
          readAt: asDate(message.readAt),
          createdAt: mustDate(message.createdAt),
        },
        update: { readAt: asDate(message.readAt) },
      });
    }
    for (const log of data.auditLogs) {
      await tx.auditLog.upsert({
        where: { id: log.id },
        create: {
          id: log.id,
          userId: log.userId,
          userName: log.userName,
          userRole: log.userRole,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          details: log.details,
          timestamp: mustDate(log.timestamp),
        },
        update: {},
      });
    }
    for (const review of data.reviews) {
      await tx.review.upsert({
        where: { id: review.id },
        create: {
          id: review.id,
          bookingId: review.bookingId,
          reviewerId: review.reviewerId,
          reviewerName: review.reviewerName,
          reviewerRole: review.reviewerRole,
          targetId: review.targetId,
          rating: review.rating,
          comment: review.comment,
          createdAt: mustDate(review.createdAt),
        },
        update: { rating: review.rating, comment: review.comment },
      });
    }
    for (const dispute of data.disputes) {
      await tx.dispute.upsert({
        where: { id: dispute.id },
        create: {
          id: dispute.id,
          bookingId: dispute.bookingId,
          raisedById: dispute.raisedById,
          raisedByName: dispute.raisedByName,
          againstId: dispute.againstId,
          againstName: dispute.againstName,
          reason: dispute.reason,
          status: dispute.status,
          resolutionDetails: dispute.resolutionDetails,
          resolvedById: dispute.resolvedById,
          createdAt: mustDate(dispute.createdAt),
          updatedAt: mustDate(dispute.updatedAt),
        },
        update: {
          status: dispute.status,
          resolutionDetails: dispute.resolutionDetails,
          updatedAt: mustDate(dispute.updatedAt),
        },
      });
    }
    for (const token of data.authTokens) {
      await tx.authToken.upsert({
        where: { id: token.id },
        create: {
          id: token.id,
          userId: token.userId,
          type: token.type,
          tokenHash: token.tokenHash,
          expiresAt: mustDate(token.expiresAt),
          usedAt: asDate(token.usedAt),
          createdAt: mustDate(token.createdAt),
        },
        update: { usedAt: asDate(token.usedAt) },
      });
    }
    for (const account of data.ledgerAccounts) {
      await tx.ledgerAccount.upsert({
        where: { id: account.id },
        create: {
          id: account.id,
          ownerType: account.ownerType,
          ownerId: account.ownerId,
          type: account.type,
        },
        update: {},
      });
    }
    for (const entry of data.ledgerEntries) {
      await tx.ledgerEntry.upsert({
        where: { id: entry.id },
        create: {
          id: entry.id,
          accountId: entry.accountId,
          amountTzs: entry.amountTzs,
          direction: entry.direction,
          type: entry.type,
          refType: entry.refType,
          refId: entry.refId,
          idempotencyKey: entry.idempotencyKey,
          memo: entry.memo,
          createdAt: mustDate(entry.createdAt),
        },
        update: {},
      });
    }
    for (const withdrawal of data.withdrawals || []) {
      await tx.withdrawal.upsert({
        where: { id: withdrawal.id },
        create: {
          id: withdrawal.id,
          hostId: withdrawal.hostId,
          amountTzs: withdrawal.amountTzs,
          method: withdrawal.method,
          status: withdrawal.status as any,
          payoutReference: withdrawal.payoutReference,
          failureReason: withdrawal.failureReason,
          createdAt: mustDate(withdrawal.createdAt),
          updatedAt: mustDate(withdrawal.updatedAt),
        },
        update: {
          status: withdrawal.status as any,
          payoutReference: withdrawal.payoutReference,
          failureReason: withdrawal.failureReason,
          updatedAt: mustDate(withdrawal.updatedAt),
        },
      });
    }
    for (const request of data.verificationRequests || []) {
      await tx.verificationRequest.upsert({
        where: { id: request.id },
        create: {
          id: request.id,
          subjectType: request.subjectType,
          subjectId: request.subjectId,
          requestedBy: request.requestedBy,
          status: request.status,
          notes: request.notes,
          reviewedBy: request.reviewedBy,
          createdAt: mustDate(request.createdAt),
          updatedAt: mustDate(request.updatedAt),
        },
        update: {
          status: request.status,
          notes: request.notes,
          reviewedBy: request.reviewedBy,
          updatedAt: mustDate(request.updatedAt),
        },
      });
    }
    await tx.platformSetting.upsert({
      where: { id: 'main' },
      create: { id: 'main', value: jsonValue(data.settings) },
      update: { value: jsonValue(data.settings) },
    });
  }, { timeout: 60000 });
}

function mapUserWrite(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    passwordHash: user.passwordHash,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    emailVerifiedAt: asDate(user.emailVerifiedAt),
    phoneVerifiedAt: asDate(user.phoneVerifiedAt),
    failedLoginCount: user.failedLoginCount || 0,
    lockedUntil: asDate(user.lockedUntil),
    lastLoginAt: asDate(user.lastLoginAt),
    createdAt: mustDate(user.createdAt),
    updatedAt: mustDate(user.updatedAt),
  };
}

function coerceShelfType(type: string): any {
  const allowed = [
    'EYE_LEVEL',
    'TOP_SHELF',
    'BOTTOM_SHELF',
    'COUNTER_DISPLAY',
    'ENTRANCE_DISPLAY',
    'REFRIGERATED',
    'END_CAP',
    'WINDOW_DISPLAY',
  ];
  return allowed.includes(type) ? type : 'EYE_LEVEL';
}
