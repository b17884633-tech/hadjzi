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

INSERT INTO categories (name, icon_url, parent_id, booking_type, sort_order, status)
SELECT v.name, v.icon_url, NULL, v.booking_type::booking_type, v.sort_order, 'ACTIVE'
FROM (
    VALUES
        ('العيادات', '/icons/clinics.png', 'SLOT', 1),
        ('الملاعب', '/icons/fields.png', 'SLOT', 2),
        ('الشقق والشاليهات', '/icons/stays.png', 'UNIT_DAY', 3),
        ('الفعاليات', '/icons/events.png', 'EVENT_DAY', 4),
        ('التأجير بالكمية', '/icons/quantity.png', 'QUANTITY', 5)
) AS v(name, icon_url, booking_type, sort_order)
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.name = v.name AND c.parent_id IS NULL
);

INSERT INTO categories (name, icon_url, parent_id, booking_type, sort_order, status)
SELECT v.name, v.icon_url, p.id, v.booking_type::booking_type, v.sort_order, 'ACTIVE'
FROM (
    VALUES
        ('العيادات', 'أسنان', '/icons/dental.png', 'SLOT', 1),
        ('العيادات', 'جلدية', '/icons/derm.png', 'SLOT', 2),
        ('الملاعب', 'كرة قدم', '/icons/football.png', 'SLOT', 1),
        ('الملاعب', 'بادل', '/icons/padel.png', 'SLOT', 2),
        ('الشقق والشاليهات', 'شقق يومية', '/icons/apartment.png', 'UNIT_DAY', 1),
        ('الشقق والشاليهات', 'شاليهات', '/icons/chalet.png', 'UNIT_DAY', 2),
        ('الفعاليات', 'قاعات أفراح', '/icons/hall.png', 'EVENT_DAY', 1),
        ('التأجير بالكمية', 'كراسي وطاولات', '/icons/chairs.png', 'QUANTITY', 1)
) AS v(parent_name, name, icon_url, booking_type, sort_order)
JOIN categories p ON p.name = v.parent_name AND p.parent_id IS NULL
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.name = v.name AND c.parent_id = p.id
);
