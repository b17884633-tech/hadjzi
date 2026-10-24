-- Photographers book by day (one calendar day), not timed slots.
UPDATE categories
SET booking_type = 'EVENT_DAY'
WHERE name = 'جلسات التصوير'
   OR parent_id IN (
     SELECT id FROM categories WHERE name = 'جلسات التصوير'
   );

-- Clear leftover appointment metadata on photo packages.
UPDATE services s
SET
  duration_minutes = NULL,
  attributes = COALESCE(s.attributes, '{}'::jsonb)
    - 'slotMinutes'
    - 'durationMinutes'
    - 'pricePeriods'
    - 'fromTime'
    - 'toTime'
FROM providers p
JOIN categories c ON c.id = p.category_id
WHERE s.provider_id = p.id
  AND (
    c.name = 'جلسات التصوير'
    OR c.parent_id IN (SELECT id FROM categories WHERE name = 'جلسات التصوير')
  );
