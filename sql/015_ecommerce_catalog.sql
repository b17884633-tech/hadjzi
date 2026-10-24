-- E-commerce catalog categories: day rent for cars / transport / apparel.
-- Safe to re-run.

-- النقليات: rent by day (same model as cars), not trip slots.
UPDATE categories
SET booking_type = 'UNIT_DAY'
WHERE name = 'النقليات'
  AND parent_id IS NULL
  AND booking_type IS DISTINCT FROM 'UNIT_DAY';

-- الملبوسات: under مستلزمات الأعراس (not a home-grid root).
UPDATE categories c
SET parent_id = p.id,
    booking_type = 'UNIT_DAY',
    sort_order = 12,
    status = 'ACTIVE',
    icon_url = COALESCE(NULLIF(c.icon_url, ''), '/icons/apparel.png')
FROM categories p
WHERE c.name = 'الملبوسات'
  AND p.name = 'مستلزمات الأعراس'
  AND p.parent_id IS NULL
  AND (c.parent_id IS DISTINCT FROM p.id OR c.booking_type IS DISTINCT FROM 'UNIT_DAY');

INSERT INTO categories (name, icon_url, parent_id, booking_type, sort_order, status)
SELECT 'الملبوسات', '/icons/apparel.png', p.id, 'UNIT_DAY'::booking_type, 12, 'ACTIVE'
FROM categories p
WHERE p.name = 'مستلزمات الأعراس'
  AND p.parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.name = 'الملبوسات' AND c.parent_id = p.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.name = 'الملبوسات'
  );
