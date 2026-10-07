-- Extra fields so providers can receive facility-status notifications.
-- Safe to re-run.

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS kind VARCHAR(40) NOT NULL DEFAULT 'GENERAL';

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES providers(id) ON DELETE SET NULL;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_provider_id ON notifications (provider_id);
CREATE INDEX IF NOT EXISTS idx_notifications_kind ON notifications (kind);
