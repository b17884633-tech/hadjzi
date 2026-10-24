-- Per-device Expo push tokens so each user only receives their own pushes.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS device_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    platform VARCHAR(20) NOT NULL DEFAULT 'unknown',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_device_push_tokens_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user
    ON device_push_tokens (user_id);
