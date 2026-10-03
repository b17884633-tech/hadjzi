-- Refill bookable availability for ALL active services (next 60 days).
-- Safe to re-run. Resets depleted future capacity and inserts missing days/slots.

-- 1) Reset capacity on future rows so previously sold-out test days reopen
UPDATE service_availabilities a
SET
  available_capacity = GREATEST(a.total_capacity, 1),
  total_capacity = GREATEST(a.total_capacity, 1),
  status = 'AVAILABLE'
WHERE a.date >= CURRENT_DATE
  AND a.status IN ('AVAILABLE', 'SOLD_OUT');

-- 2) Day-based services: UNIT_DAY / EVENT_DAY / QUANTITY → all-day rows
INSERT INTO service_availabilities (
  service_id, date, start_time, end_time, total_capacity, available_capacity, status
)
SELECT
  s.id,
  CURRENT_DATE + d,
  NULL,
  NULL,
  CASE
    WHEN c.booking_type = 'QUANTITY' THEN 50
    WHEN c.booking_type = 'EVENT_DAY' THEN 5
    ELSE 3
  END,
  CASE
    WHEN c.booking_type = 'QUANTITY' THEN 50
    WHEN c.booking_type = 'EVENT_DAY' THEN 5
    ELSE 3
  END,
  'AVAILABLE'
FROM services s
JOIN categories c ON c.id = s.category_id
CROSS JOIN generate_series(0, 60) AS d
WHERE s.status = 'ACTIVE'
  AND c.booking_type IN ('UNIT_DAY', 'EVENT_DAY', 'QUANTITY')
  AND NOT EXISTS (
    SELECT 1
    FROM service_availabilities a
    WHERE a.service_id = s.id
      AND a.date = CURRENT_DATE + d
      AND a.start_time IS NULL
  );

-- 3) SLOT services → timed appointments across the day
INSERT INTO service_availabilities (
  service_id, date, start_time, end_time, total_capacity, available_capacity, status
)
SELECT
  s.id,
  CURRENT_DATE + d,
  t.start_time::time,
  t.end_time::time,
  CASE
    WHEN c.name ILIKE '%ملعب%' OR c.name ILIKE '%مسبح%' OR c.name ILIKE '%نادي%' THEN 2
    WHEN c.name ILIKE '%نقل%' THEN 20
    ELSE 1
  END,
  CASE
    WHEN c.name ILIKE '%ملعب%' OR c.name ILIKE '%مسبح%' OR c.name ILIKE '%نادي%' THEN 2
    WHEN c.name ILIKE '%نقل%' THEN 20
    ELSE 1
  END,
  'AVAILABLE'
FROM services s
JOIN categories c ON c.id = s.category_id
CROSS JOIN generate_series(0, 45) AS d
CROSS JOIN (
  VALUES
    ('09:00', '10:00'),
    ('10:00', '11:00'),
    ('11:00', '12:00'),
    ('12:00', '13:00'),
    ('14:00', '15:00'),
    ('15:00', '16:00'),
    ('16:00', '17:00'),
    ('17:00', '18:00'),
    ('18:00', '19:00'),
    ('19:00', '20:00'),
    ('20:00', '21:00')
) AS t(start_time, end_time)
WHERE s.status = 'ACTIVE'
  AND c.booking_type = 'SLOT'
  AND NOT EXISTS (
    SELECT 1
    FROM service_availabilities a
    WHERE a.service_id = s.id
      AND a.date = CURRENT_DATE + d
      AND a.start_time = t.start_time::time
  );

-- 4) Also add morning/evening periods for EVENT_DAY halls/artists (timed)
INSERT INTO service_availabilities (
  service_id, date, start_time, end_time, total_capacity, available_capacity, status
)
SELECT
  s.id,
  CURRENT_DATE + d,
  t.start_time::time,
  t.end_time::time,
  1,
  1,
  'AVAILABLE'
FROM services s
JOIN categories c ON c.id = s.category_id
CROSS JOIN generate_series(0, 60) AS d
CROSS JOIN (
  VALUES
    ('08:00', '14:00'),  -- صباحية
    ('16:00', '23:00')   -- مسائية
) AS t(start_time, end_time)
WHERE s.status = 'ACTIVE'
  AND c.booking_type = 'EVENT_DAY'
  AND NOT EXISTS (
    SELECT 1
    FROM service_availabilities a
    WHERE a.service_id = s.id
      AND a.date = CURRENT_DATE + d
      AND a.start_time = t.start_time::time
  );
