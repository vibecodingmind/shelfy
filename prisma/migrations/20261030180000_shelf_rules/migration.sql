-- Host-defined shelf rules (JSON array of strings)
ALTER TABLE "Shelf" ADD COLUMN IF NOT EXISTS "shelfRules" JSONB NOT NULL DEFAULT '[]';
