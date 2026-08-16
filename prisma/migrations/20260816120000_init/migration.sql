-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('ADMIN', 'VENDOR', 'HOST', 'FIELD_AGENT');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."ShopStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."ShopType" AS ENUM ('SUPERMARKET', 'MINI_MARKET', 'CONVENIENCE', 'BOUTIQUE', 'PHARMACY', 'SPECIALTY');

-- CreateEnum
CREATE TYPE "public"."ShelfType" AS ENUM ('EYE_LEVEL', 'TOP_SHELF', 'BOTTOM_SHELF', 'COUNTER_DISPLAY', 'ENTRANCE_DISPLAY', 'REFRIGERATED', 'END_CAP', 'WINDOW_DISPLAY');

-- CreateEnum
CREATE TYPE "public"."ShelfAvailability" AS ENUM ('AVAILABLE', 'BOOKED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."ListingStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'PUBLISHED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'PAID', 'ACTIVE', 'EXPIRING', 'COMPLETED', 'CANCELLED', 'REJECTED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'PENDING',
    "avatarUrl" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VendorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessRegistration" TEXT,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Tanzania',
    "verificationStatus" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HostProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessRegistration" TEXT,
    "description" TEXT,
    "phone" TEXT NOT NULL DEFAULT '',
    "verificationStatus" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "HostProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FieldAgentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "region" TEXT,
    "verificationStatus" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "FieldAgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shop" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "hostName" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "photos" JSONB NOT NULL,
    "status" "public"."ShopStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "listingStatus" "public"."ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "footTrafficScore" INTEGER,
    "shopType" "public"."ShopType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShopImage" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShopImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shelf" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "shopName" TEXT,
    "shopCity" TEXT,
    "shopAddress" TEXT,
    "shopLatitude" DOUBLE PRECISION,
    "shopLongitude" DOUBLE PRECISION,
    "hostVerificationStatus" "public"."VerificationStatus",
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT NOT NULL,
    "widthCm" INTEGER NOT NULL,
    "heightCm" INTEGER NOT NULL,
    "depthCm" INTEGER NOT NULL,
    "shelfType" "public"."ShelfType" NOT NULL,
    "locationInsideShop" TEXT NOT NULL,
    "monthlyPriceTzs" INTEGER NOT NULL,
    "availabilityStatus" "public"."ShelfAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "allowedCategories" JSONB NOT NULL,
    "photos" JSONB NOT NULL,
    "status" "public"."ShopStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "public"."VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "listingStatus" "public"."ListingStatus" NOT NULL DEFAULT 'DRAFT',
    "avgRating" DOUBLE PRECISION,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Shelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShelfImage" (
    "id" TEXT NOT NULL,
    "shelfId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storageKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShelfImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "priceTzs" INTEGER NOT NULL,
    "images" JSONB NOT NULL,
    "status" "public"."ShopStatus" NOT NULL DEFAULT 'ACTIVE',
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryItem" (
    "id" TEXT NOT NULL,
    "shelfId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT,
    "productSku" TEXT,
    "vendorId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "minStockLevel" INTEGER NOT NULL,
    "stockStatus" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Booking" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorName" TEXT,
    "vendorBusinessName" TEXT,
    "shelfId" TEXT NOT NULL,
    "shelfName" TEXT,
    "shopName" TEXT,
    "shopCity" TEXT,
    "hostId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "monthlyPriceTzs" INTEGER NOT NULL,
    "totalPriceTzs" INTEGER NOT NULL,
    "platformFeeTzs" INTEGER NOT NULL,
    "hostEarningsTzs" INTEGER NOT NULL,
    "status" "public"."BookingStatus" NOT NULL,
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookingStatusHistory" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fromStatus" "public"."BookingStatus",
    "toStatus" "public"."BookingStatus" NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amountTzs" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "provider" TEXT NOT NULL DEFAULT 'PESAPAL',
    "merchantReference" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "pesapalTrackingId" TEXT,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PaymentAttempt" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Commission" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "amountTzs" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACCRUED',

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LedgerAccount" (
    "id" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LedgerEntry" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amountTzs" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Withdrawal" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "amountTzs" INTEGER NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'MOBILE_MONEY',
    "status" "public"."WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payout" (
    "id" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "hostName" TEXT,
    "hostBusinessName" TEXT,
    "withdrawalId" TEXT,
    "grossAmountTzs" INTEGER NOT NULL,
    "commissionTzs" INTEGER NOT NULL,
    "netAmountTzs" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "payoutReference" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FieldVisit" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT,
    "shopId" TEXT NOT NULL,
    "shopName" TEXT,
    "shopAddress" TEXT,
    "shopCity" TEXT,
    "shelfId" TEXT NOT NULL,
    "shelfName" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FieldReport" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT,
    "shelfId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "stockLevelPercent" INTEGER NOT NULL,
    "shelfCondition" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "photos" JSONB NOT NULL,
    "aiAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "bookingId" TEXT,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "reviewerRole" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Dispute" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "raisedByName" TEXT NOT NULL,
    "againstId" TEXT NOT NULL,
    "againstName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resolutionDetails" TEXT,
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationRequest" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlatformSetting" (
    "id" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Location" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Tanzania',

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "public"."User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_userId_key" ON "public"."VendorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HostProfile_userId_key" ON "public"."HostProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldAgentProfile_userId_key" ON "public"."FieldAgentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "public"."Shop"("slug");

-- CreateIndex
CREATE INDEX "Shop_hostId_idx" ON "public"."Shop"("hostId");

-- CreateIndex
CREATE INDEX "Shop_city_status_idx" ON "public"."Shop"("city", "status");

-- CreateIndex
CREATE INDEX "Shop_verificationStatus_listingStatus_idx" ON "public"."Shop"("verificationStatus", "listingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_slug_key" ON "public"."Shelf"("slug");

-- CreateIndex
CREATE INDEX "Shelf_shopId_idx" ON "public"."Shelf"("shopId");

-- CreateIndex
CREATE INDEX "Shelf_availabilityStatus_status_idx" ON "public"."Shelf"("availabilityStatus", "status");

-- CreateIndex
CREATE INDEX "Shelf_monthlyPriceTzs_idx" ON "public"."Shelf"("monthlyPriceTzs");

-- CreateIndex
CREATE INDEX "Product_vendorId_idx" ON "public"."Product"("vendorId");

-- CreateIndex
CREATE INDEX "InventoryItem_vendorId_shelfId_idx" ON "public"."InventoryItem"("vendorId", "shelfId");

-- CreateIndex
CREATE INDEX "Booking_shelfId_startDate_endDate_idx" ON "public"."Booking"("shelfId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Booking_vendorId_status_idx" ON "public"."Booking"("vendorId", "status");

-- CreateIndex
CREATE INDEX "Booking_hostId_status_idx" ON "public"."Booking"("hostId", "status");

-- CreateIndex
CREATE INDEX "BookingStatusHistory_bookingId_createdAt_idx" ON "public"."BookingStatusHistory"("bookingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_merchantReference_key" ON "public"."Payment"("merchantReference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionReference_key" ON "public"."Payment"("transactionReference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_pesapalTrackingId_key" ON "public"."Payment"("pesapalTrackingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "public"."Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_bookingId_status_idx" ON "public"."Payment"("bookingId", "status");

-- CreateIndex
CREATE INDEX "PaymentAttempt_paymentId_createdAt_idx" ON "public"."PaymentAttempt"("paymentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_bookingId_key" ON "public"."Commission"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_ownerType_ownerId_type_key" ON "public"."LedgerAccount"("ownerType", "ownerId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_idempotencyKey_key" ON "public"."LedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "LedgerEntry_accountId_createdAt_idx" ON "public"."LedgerEntry"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "LedgerEntry_refType_refId_idx" ON "public"."LedgerEntry"("refType", "refId");

-- CreateIndex
CREATE INDEX "Withdrawal_hostId_status_idx" ON "public"."Withdrawal"("hostId", "status");

-- CreateIndex
CREATE INDEX "Payout_hostId_status_idx" ON "public"."Payout"("hostId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "public"."Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_senderId_receiverId_idx" ON "public"."Message"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "Message_bookingId_idx" ON "public"."Message"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_reviewerId_key" ON "public"."Review"("bookingId", "reviewerId");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_subjectType_idx" ON "public"."VerificationRequest"("status", "subjectType");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "public"."AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_userId_type_idx" ON "public"."AuthToken"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_city_region_key" ON "public"."Location"("city", "region");

-- AddForeignKey
ALTER TABLE "public"."VendorProfile" ADD CONSTRAINT "VendorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HostProfile" ADD CONSTRAINT "HostProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FieldAgentProfile" ADD CONSTRAINT "FieldAgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shop" ADD CONSTRAINT "Shop_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShopImage" ADD CONSTRAINT "ShopImage_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shelf" ADD CONSTRAINT "Shelf_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "public"."Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShelfImage" ADD CONSTRAINT "ShelfImage_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "public"."Shelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "public"."Shelf"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Booking" ADD CONSTRAINT "Booking_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BookingStatusHistory" ADD CONSTRAINT "BookingStatusHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Commission" ADD CONSTRAINT "Commission_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Withdrawal" ADD CONSTRAINT "Withdrawal_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payout" ADD CONSTRAINT "Payout_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "public"."Withdrawal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FieldVisit" ADD CONSTRAINT "FieldVisit_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FieldReport" ADD CONSTRAINT "FieldReport_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "public"."FieldVisit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

