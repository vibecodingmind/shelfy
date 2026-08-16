-- Align persisted platform settings with approve-then-pay business rules.
UPDATE "PlatformSetting"
SET "value" = (("value"::jsonb) || '{"autoApproveBookings": false}'::jsonb)::json
WHERE "id" = 'main';
