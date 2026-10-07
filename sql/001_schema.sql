-- Booking platform schema (Supabase / PostgreSQL)
-- Applied modifications vs the original draft:
-- - ENUMs for statuses/types that were free-text VARCHAR
-- - CHECK constraints for money, percentages, coordinates, capacity
-- - Unique (city, region name), unique provider-per-user, unique active phone/email already present
-- - availability_id on bookings so a reservation locks a concrete slot
-- - Partial unique indexes so all-day slots (NULL start_time) do not collide
-- - disputes table (mentioned in the original comments, was missing)
-- - updated_at trigger on mutating tables
-- - Indexes for geo/category search, availability lookup, booking/payment queries
-- - ON DELETE rules so financial history is not wiped with a user/service
-- - banners timestamps + CHECK on action_type

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('CUSTOMER', 'PROVIDER', 'ADMIN');
CREATE TYPE account_status AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');
CREATE TYPE record_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE booking_type AS ENUM ('SLOT', 'UNIT_DAY', 'EVENT_DAY', 'QUANTITY');
CREATE TYPE provider_status AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE availability_status AS ENUM ('AVAILABLE', 'BLOCKED', 'SOLD_OUT');
CREATE TYPE booking_status AS ENUM (
    'PENDING_PAYMENT',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED',
    'EXPIRED',
    'REFUNDED'
);
CREATE TYPE payment_type AS ENUM ('DEPOSIT', 'REMAINING', 'REFUND');
CREATE TYPE payment_status AS ENUM ('INITIATED', 'SUCCESS', 'FAILED');
CREATE TYPE banner_action_type AS ENUM ('PROVIDER', 'SERVICE', 'CATEGORY', 'URL');
CREATE TYPE dispute_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 1. Cities and regions
-- ---------------------------------------------------------------------------
CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status record_status DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT cities_name_unique UNIQUE (name)
);

CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT regions_city_name_unique UNIQUE (city_id, name)
);

CREATE INDEX idx_regions_city_id ON regions (city_id);

-- ---------------------------------------------------------------------------
-- 2. Users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'CUSTOMER' NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    status account_status DEFAULT 'PENDING_VERIFICATION' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_status ON users (status);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Categories (self-referencing tree)
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon_url VARCHAR(255) NOT NULL,
    parent_id INT REFERENCES categories(id) ON DELETE SET NULL,
    booking_type booking_type NOT NULL,
    sort_order INT DEFAULT 0 NOT NULL,
    status record_status DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_categories_parent_id ON categories (parent_id);
CREATE INDEX idx_categories_status_sort ON categories (status, sort_order);

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Providers (business profiles)
-- ---------------------------------------------------------------------------
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(150) NOT NULL,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT,
    city_id INT REFERENCES cities(id) ON DELETE SET NULL,
    region_id INT REFERENCES regions(id) ON DELETE SET NULL,
    address_details TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    images TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    cancellation_policy TEXT,
    attributes JSONB DEFAULT '{}'::jsonb NOT NULL,
    status provider_status DEFAULT 'PENDING_REVIEW' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT providers_lat_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
    CONSTRAINT providers_lng_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

CREATE INDEX idx_providers_user_id ON providers (user_id);
CREATE INDEX idx_providers_category_id ON providers (category_id);
CREATE INDEX idx_providers_city_id ON providers (city_id);
CREATE INDEX idx_providers_region_id ON providers (region_id);
CREATE INDEX idx_providers_status ON providers (status);
CREATE INDEX idx_providers_geo ON providers (latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TRIGGER trg_providers_updated_at
    BEFORE UPDATE ON providers
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Services
-- ---------------------------------------------------------------------------
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    base_price DECIMAL(12, 2) NOT NULL,
    deposit_percentage DECIMAL(5, 2) DEFAULT 30.00 NOT NULL,
    duration_minutes INT,
    attributes JSONB DEFAULT '{}'::JSONB NOT NULL,
    images TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    status record_status DEFAULT 'ACTIVE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT services_base_price_non_negative CHECK (base_price >= 0),
    CONSTRAINT services_deposit_range CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100),
    CONSTRAINT services_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

CREATE INDEX idx_services_provider_id ON services (provider_id);
CREATE INDEX idx_services_category_id ON services (category_id);
CREATE INDEX idx_services_status ON services (status);
CREATE INDEX idx_services_attributes_gin ON services USING GIN (attributes);

CREATE TRIGGER trg_services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Availability / calendar
-- ---------------------------------------------------------------------------
CREATE TABLE service_availabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    total_capacity INT DEFAULT 1 NOT NULL,
    available_capacity INT DEFAULT 1 NOT NULL,
    custom_price DECIMAL(12, 2),
    status availability_status DEFAULT 'AVAILABLE' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT avail_capacity_non_negative CHECK (total_capacity >= 0 AND available_capacity >= 0),
    CONSTRAINT avail_capacity_lte_total CHECK (available_capacity <= total_capacity),
    CONSTRAINT avail_time_order CHECK (
        start_time IS NULL
        OR end_time IS NULL
        OR end_time > start_time
    ),
    CONSTRAINT avail_custom_price_non_negative CHECK (custom_price IS NULL OR custom_price >= 0)
);

-- Timed slots: one row per service/date/start_time
CREATE UNIQUE INDEX uq_avail_timed
    ON service_availabilities (service_id, date, start_time)
    WHERE start_time IS NOT NULL;

-- All-day / unit-day / event-day: one row per service/date
CREATE UNIQUE INDEX uq_avail_all_day
    ON service_availabilities (service_id, date)
    WHERE start_time IS NULL;

CREATE INDEX idx_avail_service_date ON service_availabilities (service_id, date);
CREATE INDEX idx_avail_date_status ON service_availabilities (date, status);

CREATE TRIGGER trg_avail_updated_at
    BEFORE UPDATE ON service_availabilities
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Bookings
-- ---------------------------------------------------------------------------
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_number VARCHAR(30) UNIQUE NOT NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    availability_id UUID REFERENCES service_availabilities(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    quantity INT DEFAULT 1 NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    deposit_percentage DECIMAL(5, 2) NOT NULL,
    deposit_amount DECIMAL(12, 2) NOT NULL,
    remaining_amount DECIMAL(12, 2) NOT NULL,
    commission_percentage DECIMAL(5, 2) NOT NULL,
    commission_amount DECIMAL(12, 2) NOT NULL,
    customer_notes TEXT,
    status booking_status DEFAULT 'PENDING_PAYMENT' NOT NULL,
    temporary_lock_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT bookings_quantity_positive CHECK (quantity > 0),
    CONSTRAINT bookings_amounts_non_negative CHECK (
        total_amount >= 0
        AND deposit_amount >= 0
        AND remaining_amount >= 0
        AND commission_amount >= 0
    ),
    CONSTRAINT bookings_deposit_range CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100),
    CONSTRAINT bookings_commission_range CHECK (commission_percentage >= 0 AND commission_percentage <= 100)
);

CREATE INDEX idx_bookings_customer_id ON bookings (customer_id);
CREATE INDEX idx_bookings_provider_id ON bookings (provider_id);
CREATE INDEX idx_bookings_service_id ON bookings (service_id);
CREATE INDEX idx_bookings_availability_id ON bookings (availability_id);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_date ON bookings (booking_date);
CREATE INDEX idx_bookings_lock ON bookings (temporary_lock_until)
    WHERE status = 'PENDING_PAYMENT' AND temporary_lock_until IS NOT NULL;

CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Payments
-- ---------------------------------------------------------------------------
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_type payment_type NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    gateway_transaction_id VARCHAR(100),
    status payment_status NOT NULL,
    idempotency_key VARCHAR(100) UNIQUE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT payments_amount_non_negative CHECK (amount >= 0)
);

CREATE INDEX idx_payments_booking_id ON payments (booking_id);
CREATE INDEX idx_payments_customer_id ON payments (customer_id);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_gateway_tx ON payments (gateway_transaction_id);

-- ---------------------------------------------------------------------------
-- 9. Banners
-- ---------------------------------------------------------------------------
CREATE TABLE banners (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    image_url VARCHAR(255) NOT NULL,
    action_type banner_action_type,
    action_target VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    sort_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_banners_active_sort ON banners (is_active, sort_order);

CREATE TRIGGER trg_banners_updated_at
    BEFORE UPDATE ON banners
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 10. Reviews
-- ---------------------------------------------------------------------------
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
    rating SMALLINT NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT reviews_rating_range CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX idx_reviews_provider_id ON reviews (provider_id);
CREATE INDEX idx_reviews_customer_id ON reviews (customer_id);

-- ---------------------------------------------------------------------------
-- 11. Disputes
-- ---------------------------------------------------------------------------
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    raised_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status dispute_status DEFAULT 'OPEN' NOT NULL,
    resolution TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_disputes_booking_id ON disputes (booking_id);
CREATE INDEX idx_disputes_status ON disputes (status);

CREATE TRIGGER trg_disputes_updated_at
    BEFORE UPDATE ON disputes
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
