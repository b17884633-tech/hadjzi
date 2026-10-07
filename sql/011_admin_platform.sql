-- Admin platform settings + push notifications from the admin desk.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO platform_settings (key, value)
VALUES ('default_deposit_percentage', '30'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    audience VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT notifications_audience_check CHECK (
        audience IN ('ALL', 'CUSTOMERS', 'PROVIDERS', 'USER')
    ),
    CONSTRAINT notifications_user_required CHECK (
        (audience = 'USER' AND user_id IS NOT NULL)
        OR (audience <> 'USER' AND user_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_audience ON notifications (audience);
