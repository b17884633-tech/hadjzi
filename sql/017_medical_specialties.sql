-- Shared medical specialties for health facilities + category filters.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS medical_specialties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_key VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_medical_specialties_name_key UNIQUE (name_key)
);

CREATE INDEX IF NOT EXISTS idx_medical_specialties_name ON medical_specialties (name);

-- Seed common specialties (includes عام for hospitals / general practice).
INSERT INTO medical_specialties (name, name_key)
SELECT v.name, lower(v.name)
FROM (
    VALUES
        ('عام'),
        ('باطنية'),
        ('أطفال'),
        ('نساء وولادة'),
        ('جراحة عامة'),
        ('عظام'),
        ('قلب'),
        ('جلدية'),
        ('أنف وأذن وحنجرة'),
        ('عيون'),
        ('أسنان'),
        ('أعصاب'),
        ('مسالك بولية'),
        ('نفسية'),
        ('تغذية'),
        ('علاج طبيعي'),
        ('أشعة'),
        ('مختبر')
) AS v(name)
WHERE NOT EXISTS (
    SELECT 1 FROM medical_specialties s WHERE s.name_key = lower(v.name)
);

-- Backfill specialties already stored on health facilities.
INSERT INTO medical_specialties (name, name_key)
SELECT DISTINCT trim(p.attributes->>'specialty'), lower(trim(p.attributes->>'specialty'))
FROM providers p
WHERE p.attributes ? 'specialty'
  AND nullif(trim(p.attributes->>'specialty'), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM medical_specialties s
    WHERE s.name_key = lower(trim(p.attributes->>'specialty'))
  );
