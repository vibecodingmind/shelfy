-- AlterTable
ALTER TABLE "public"."Withdrawal" ADD COLUMN "payoutReference" TEXT;
ALTER TABLE "public"."Withdrawal" ADD COLUMN "failureReason" TEXT;

-- AlterTable
ALTER TABLE "public"."FieldVisit" ADD COLUMN "shopLatitude" DOUBLE PRECISION;
ALTER TABLE "public"."FieldVisit" ADD COLUMN "shopLongitude" DOUBLE PRECISION;
ALTER TABLE "public"."FieldVisit" ADD COLUMN "checkedInAt" TIMESTAMP(3);
