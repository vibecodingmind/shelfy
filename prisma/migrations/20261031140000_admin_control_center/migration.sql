-- Super Admin Control Center (optional relational mirror; app also stores in PlatformSetting JSON sync)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "adminPermissions" JSONB;

CREATE TABLE IF NOT EXISTS "UserRoleAssignment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "grantedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE("userId", "role")
);

CREATE TABLE IF NOT EXISTS "UserAdminPermission" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "permission" TEXT NOT NULL,
  "grantedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "AdminNote" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "IntegrationCredential" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "tag" TEXT NOT NULL,
  "updatedBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE("provider", "environment", "key")
);

CREATE TABLE IF NOT EXISTS "IntegrationLog" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "durationMs" INTEGER,
  "errorMessage" TEXT,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "PaymentGatewayConfig" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL UNIQUE,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "environment" TEXT NOT NULL DEFAULT 'sandbox',
  "configJson" JSONB NOT NULL DEFAULT '{}',
  "lastTestAt" TIMESTAMP(3),
  "lastTestOk" BOOLEAN,
  "lastTestMessage" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT PRIMARY KEY,
  "provider" TEXT NOT NULL,
  "paymentId" TEXT,
  "verified" BOOLEAN NOT NULL,
  "status" TEXT NOT NULL,
  "payloadSummary" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "CommissionRule" (
  "id" TEXT PRIMARY KEY,
  "effectiveFrom" TEXT NOT NULL,
  "platformBps" INTEGER NOT NULL,
  "vendorBps" INTEGER,
  "hostBps" INTEGER,
  "category" TEXT,
  "planId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceTzs" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'TZS',
  "billingPeriod" TEXT NOT NULL,
  "trialDays" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "entitlements" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "trialEndsAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "ApiClient" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "scopes" JSONB NOT NULL DEFAULT '[]',
  "rateLimitPerHour" INTEGER NOT NULL DEFAULT 1000,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "ApiClientKey" (
  "id" TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "NotificationTemplate" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "channel" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "Shelf" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
