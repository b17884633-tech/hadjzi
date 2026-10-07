-- Facility-level details (spaces, amenities, terms, policies) as JSON
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb;
