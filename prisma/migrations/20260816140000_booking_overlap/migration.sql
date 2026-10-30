-- Prevent overlapping bookings on the same shelf for blocking statuses.
-- Uses half-open date ranges [start, end) to match application overlap logic.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE OR REPLACE FUNCTION shelfy_booking_daterange(start_ts text, end_ts text)
RETURNS daterange
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT daterange(start_ts::date, end_ts::date, '[)');
$$;

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_shelfId_dates_no_overlap"
EXCLUDE USING gist (
  "shelfId" WITH =,
  shelfy_booking_daterange("startDate", "endDate") WITH &&
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
