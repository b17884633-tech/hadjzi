-- Seed destinations and category tree (Yemen marketplace)

INSERT INTO cities (name, status)
VALUES
    ('صنعاء', 'ACTIVE'),
    ('عدن', 'ACTIVE'),
    ('تعز', 'ACTIVE'),
    ('الحديدة', 'ACTIVE'),
    ('إب', 'ACTIVE'),
    ('المكلا', 'ACTIVE')
ON CONFLICT (name) DO NOTHING;

INSERT INTO regions (city_id, name)
SELECT c.id, r.name
FROM cities c
JOIN (
    VALUES
        ('صنعاء', 'حي حدة'),
        ('صنعاء', 'السبعين'),
        ('صنعاء', 'التحرير'),
        ('عدن', 'كريتر'),
        ('عدن', 'الشيخ عثمان'),
        ('عدن', 'المنصورة'),
        ('تعز', 'صالة'),
        ('تعز', 'القاهرة'),
        ('الحديدة', 'الميناء'),
        ('إب', 'المدينة'),
        ('المكلا', 'المدينة')
) AS r(city_name, name) ON r.city_name = c.name
ON CONFLICT (city_id, name) DO NOTHING;

-- Full taxonomy lives in 005_category_taxonomy.sql (run after this file).
-- Keep a minimal bootstrap so older scripts that expect some categories still work.
INSERT INTO categories (name, icon_url, parent_id, booking_type, sort_order, status)
SELECT v.name, v.icon_url, NULL, v.booking_type::booking_type, v.sort_order, 'ACTIVE'
FROM (
    VALUES
        ('الصالات', '/icons/halls.png', 'EVENT_DAY', 1),
        ('الشاليهات', '/icons/chalets.png', 'UNIT_DAY', 2),
        ('الفنادق', '/icons/hotels.png', 'UNIT_DAY', 3),
        ('الطيرمانات', '/icons/apartments.png', 'UNIT_DAY', 4),
        ('صحة', '/icons/health.png', 'SLOT', 5),
        ('مستلزمات الأعراس', '/icons/wedding-supplies.png', 'QUANTITY', 6),
        ('كوافير', '/icons/salon.png', 'SLOT', 7),
        ('المسابح والنوادي', '/icons/pools.png', 'SLOT', 8),
        ('الملاعب', '/icons/fields.png', 'SLOT', 9),
        ('النقليات', '/icons/transport.png', 'SLOT', 10),
        ('السيارات', '/icons/cars.png', 'UNIT_DAY', 11),
        ('الزفافين والفنانين', '/icons/artists.png', 'EVENT_DAY', 12),
        ('جلسات التصوير', '/icons/photo.png', 'SLOT', 13)
) AS v(name, icon_url, booking_type, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.name = v.name AND c.parent_id IS NULL
);
