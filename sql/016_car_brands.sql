-- Shared car brands for provider picklists + category filters.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS car_brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_key VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_car_brands_name_key UNIQUE (name_key)
);

CREATE INDEX IF NOT EXISTS idx_car_brands_name ON car_brands (name);

-- Seed common brands (no-op if already present).
INSERT INTO car_brands (name, name_key)
SELECT v.name, lower(v.name)
FROM (
    VALUES
        ('تويوتا'),
        ('هيونداي'),
        ('كيا'),
        ('نيسان'),
        ('هوندا'),
        ('مرسيدس'),
        ('بي إم دبليو'),
        ('شيفروليه'),
        ('فورد'),
        ('مازدا'),
        ('ميتسوبيشي'),
        ('جيب')
) AS v(name)
WHERE NOT EXISTS (
    SELECT 1 FROM car_brands b WHERE b.name_key = lower(v.name)
);

-- Backfill brands already stored on car products.
INSERT INTO car_brands (name, name_key)
SELECT DISTINCT trim(s.attributes->>'brand'), lower(trim(s.attributes->>'brand'))
FROM services s
WHERE s.attributes ? 'brand'
  AND nullif(trim(s.attributes->>'brand'), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM car_brands b
    WHERE b.name_key = lower(trim(s.attributes->>'brand'))
  );
