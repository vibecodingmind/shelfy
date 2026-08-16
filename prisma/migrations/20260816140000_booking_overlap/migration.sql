-- Prevent overlapping bookings on the same shelf for blocking statuses.
-- Uses half-open date ranges [start, end) to match application overlap logic.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_shelfId_dates_no_overlap"
EXCLUDE USING gist (
  "shelfId" WITH =,
  daterange("startDate"::date, "endDate"::date, '[)') WITH &&
)
WHERE (
  "status" IN (
    'PENDING_APPROVAL',
    'APPROVED',
    'PAYMENT_PENDING',
    'PAYMENT_FAILED',
    'PAID',
    'ACTIVE',
    'EXPIRING',
    'DISPUTED'
  )
);
