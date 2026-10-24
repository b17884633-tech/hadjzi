-- Provider period discounts: % off for bookings whose stay date falls in [starts_on, ends_on].
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS provider_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    discount_percent NUMERIC(5, 2) NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_provider_offers_percent
        CHECK (discount_percent > 0 AND discount_percent <= 100),
    CONSTRAINT chk_provider_offers_range
        CHECK (ends_on >= starts_on)
);

CREATE INDEX IF NOT EXISTS idx_provider_offers_provider
    ON provider_offers (provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_offers_window
    ON provider_offers (starts_on, ends_on);

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) NULL;

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS original_total_amount NUMERIC(12, 2) NULL;
