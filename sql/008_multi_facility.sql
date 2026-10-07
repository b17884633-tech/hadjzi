-- Allow one user to own multiple facilities (providers)
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_user_unique;
CREATE INDEX IF NOT EXISTS idx_providers_user_id ON providers (user_id);
