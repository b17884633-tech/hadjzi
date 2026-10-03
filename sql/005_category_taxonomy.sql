-- Full marketplace category taxonomy (specs 5.1–5.13)
-- Safe to re-run: inserts missing roots/children by name.

-- Hide legacy roots from the old seed so the home grid shows only 5.1–5.13
UPDATE categories
SET status = 'INACTIVE'
WHERE parent_id IS NULL
  AND name IN (
    'العيادات',
    'الشقق والشاليهات',
    'الفعاليات',
    'التأجير بالكمية'
  );

-- Roots
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

-- Level-2 children
INSERT INTO categories (name, icon_url, parent_id, booking_type, sort_order, status)
SELECT v.name, v.icon_url, p.id, v.booking_type::booking_type, v.sort_order, 'ACTIVE'
FROM (
    VALUES
        -- فنادق
        ('الفنادق', 'الغرف', '/icons/rooms.png', 'UNIT_DAY', 1),
        -- صحة
        ('صحة', 'عيادات', '/icons/clinics.png', 'SLOT', 1),
        ('صحة', 'مستشفيات', '/icons/hospitals.png', 'SLOT', 2),
        ('صحة', 'مراكز طبية', '/icons/medical-centers.png', 'SLOT', 3),
        ('صحة', 'مراكز الأشعة', '/icons/radiology.png', 'SLOT', 4),
        ('صحة', 'العلاج الطبيعي', '/icons/physio.png', 'SLOT', 5),
        -- مستلزمات الأعراس
        ('مستلزمات الأعراس', 'الماء', '/icons/water.png', 'QUANTITY', 1),
        ('مستلزمات الأعراس', 'الزينة', '/icons/decor.png', 'QUANTITY', 2),
        ('مستلزمات الأعراس', 'الوجبات', '/icons/meals.png', 'QUANTITY', 3),
        ('مستلزمات الأعراس', 'الكوش', '/icons/kosha.png', 'QUANTITY', 4),
        ('مستلزمات الأعراس', 'الحلويات', '/icons/sweets.png', 'QUANTITY', 5),
        ('مستلزمات الأعراس', 'الكيك والتورت', '/icons/cake.png', 'QUANTITY', 6),
        ('مستلزمات الأعراس', 'الهدايا', '/icons/gifts.png', 'QUANTITY', 7),
        ('مستلزمات الأعراس', 'الباقات والفل', '/icons/flowers.png', 'QUANTITY', 8),
        ('مستلزمات الأعراس', 'الثلاجات', '/icons/fridge.png', 'QUANTITY', 9),
        ('مستلزمات الأعراس', 'خيام', '/icons/tents.png', 'QUANTITY', 10),
        ('مستلزمات الأعراس', 'طباخين', '/icons/chefs.png', 'QUANTITY', 11),
        -- كوافير
        ('كوافير', 'قسم النساء', '/icons/women.png', 'SLOT', 1),
        ('كوافير', 'قسم الرجال', '/icons/men.png', 'SLOT', 2),
        -- مسابح ونوادي
        ('المسابح والنوادي', 'المسابح', '/icons/pool.png', 'SLOT', 1),
        ('المسابح والنوادي', 'النوادي الرياضية', '/icons/gym.png', 'SLOT', 2),
        -- زفافين وفنانين
        ('الزفافين والفنانين', 'قسم النساء', '/icons/women-artists.png', 'EVENT_DAY', 1),
        ('الزفافين والفنانين', 'قسم الرجال', '/icons/men-artists.png', 'EVENT_DAY', 2),
        -- جلسات تصوير
        ('جلسات التصوير', 'قسم النساء', '/icons/photo-women.png', 'SLOT', 1),
        ('جلسات التصوير', 'قسم الرجال', '/icons/photo-men.png', 'SLOT', 2)
) AS v(parent_name, name, icon_url, booking_type, sort_order)
JOIN categories p ON p.name = v.parent_name AND p.parent_id IS NULL AND p.status = 'ACTIVE'
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.name = v.name AND c.parent_id = p.id
);

-- Level-3 under كوافير / زفافين
INSERT INTO categories (name, icon_url, parent_id, booking_type, sort_order, status)
SELECT v.name, v.icon_url, child.id, v.booking_type::booking_type, v.sort_order, 'ACTIVE'
FROM (
    VALUES
        ('كوافير', 'قسم النساء', 'الكوافير', '/icons/hair-women.png', 'SLOT', 1),
        ('كوافير', 'قسم النساء', 'جلسات التجميل', '/icons/beauty.png', 'SLOT', 2),
        ('كوافير', 'قسم الرجال', 'الحلاقين', '/icons/barber.png', 'SLOT', 1),
        ('الزفافين والفنانين', 'قسم النساء', 'مغنيين', '/icons/singers-w.png', 'EVENT_DAY', 1),
        ('الزفافين والفنانين', 'قسم النساء', 'زفافين', '/icons/zaffa-w.png', 'EVENT_DAY', 2),
        ('الزفافين والفنانين', 'قسم النساء', 'فرق', '/icons/bands-w.png', 'EVENT_DAY', 3),
        ('الزفافين والفنانين', 'قسم الرجال', 'مغنين', '/icons/singers-m.png', 'EVENT_DAY', 1),
        ('الزفافين والفنانين', 'قسم الرجال', 'زفافين', '/icons/zaffa-m.png', 'EVENT_DAY', 2),
        ('الزفافين والفنانين', 'قسم الرجال', 'فرق', '/icons/bands-m.png', 'EVENT_DAY', 3),
        ('الزفافين والفنانين', 'قسم الرجال', 'مبرعين', '/icons/mubarra.png', 'EVENT_DAY', 4),
        ('الزفافين والفنانين', 'قسم الرجال', 'رقاصين', '/icons/dancers.png', 'EVENT_DAY', 5)
) AS v(root_name, section_name, name, icon_url, booking_type, sort_order)
JOIN categories root ON root.name = v.root_name AND root.parent_id IS NULL AND root.status = 'ACTIVE'
JOIN categories child ON child.name = v.section_name AND child.parent_id = root.id AND child.status = 'ACTIVE'
WHERE NOT EXISTS (
    SELECT 1 FROM categories c WHERE c.name = v.name AND c.parent_id = child.id
);
