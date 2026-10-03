-- Test marketplace data for Hadjzi (users, providers, services, banners)
-- Password for all seeded users: Password123!
-- Requires sql/003_seed.sql (cities, regions, categories) to be applied first.

DO $$
DECLARE
  pwd CONSTANT TEXT := '$2b$10$RwNIBdM0hgtZtEhveGkY3uAm9NV/VTQWm6Dao6jOwVJx5xCtGhr7q';

  sanaa_id INT;
  aden_id INT;
  sanaa_hada_id INT;
  sanaa_sab_id INT;
  aden_crater_id INT;

  cat_halls INT;
  cat_chalets INT;
  cat_dental INT;
  cat_football INT;
  cat_apartments INT;

  u_admin UUID := '11111111-1111-1111-1111-111111111111';
  u_customer UUID := '22222222-2222-2222-2222-222222222222';
  u_prov1 UUID := '33333333-3333-3333-3333-333333333331';
  u_prov2 UUID := '33333333-3333-3333-3333-333333333332';
  u_prov3 UUID := '33333333-3333-3333-3333-333333333333';
  u_prov4 UUID := '33333333-3333-3333-3333-333333333334';
  u_prov5 UUID := '33333333-3333-3333-3333-333333333335';
  u_prov6 UUID := '33333333-3333-3333-3333-333333333336';

  p1 UUID := '44444444-4444-4444-4444-444444444441';
  p2 UUID := '44444444-4444-4444-4444-444444444442';
  p3 UUID := '44444444-4444-4444-4444-444444444443';
  p4 UUID := '44444444-4444-4444-4444-444444444444';
  p5 UUID := '44444444-4444-4444-4444-444444444445';
  p6 UUID := '44444444-4444-4444-4444-444444444446';

  s1 UUID := '55555555-5555-5555-5555-555555555551';
  s2 UUID := '55555555-5555-5555-5555-555555555552';
  s3 UUID := '55555555-5555-5555-5555-555555555553';
  s4 UUID := '55555555-5555-5555-5555-555555555554';
  s5 UUID := '55555555-5555-5555-5555-555555555555';
  s6 UUID := '55555555-5555-5555-5555-555555555556';
  s7 UUID := '55555555-5555-5555-5555-555555555557';
  s8 UUID := '55555555-5555-5555-5555-555555555558';
BEGIN
  SELECT id INTO sanaa_id FROM cities WHERE name = 'صنعاء';
  SELECT id INTO aden_id FROM cities WHERE name = 'عدن';
  SELECT id INTO sanaa_hada_id FROM regions WHERE city_id = sanaa_id AND name = 'حي حدة';
  SELECT id INTO sanaa_sab_id FROM regions WHERE city_id = sanaa_id AND name = 'السبعين';
  SELECT id INTO aden_crater_id FROM regions WHERE city_id = aden_id AND name = 'كريتر';

  -- Prefer new taxonomy roots; fall back to legacy child names
  SELECT id INTO cat_halls FROM categories
  WHERE status = 'ACTIVE' AND name IN ('الصالات', 'قاعات أفراح')
  ORDER BY CASE WHEN name = 'الصالات' THEN 0 ELSE 1 END
  LIMIT 1;
  SELECT id INTO cat_chalets FROM categories
  WHERE status = 'ACTIVE' AND name IN ('الشاليهات', 'شاليهات')
  ORDER BY CASE WHEN name = 'الشاليهات' THEN 0 ELSE 1 END
  LIMIT 1;
  SELECT id INTO cat_dental FROM categories
  WHERE status = 'ACTIVE' AND name IN ('عيادات', 'أسنان', 'صحة')
  ORDER BY CASE WHEN name = 'عيادات' THEN 0 WHEN name = 'صحة' THEN 1 ELSE 2 END
  LIMIT 1;
  SELECT id INTO cat_football FROM categories
  WHERE status = 'ACTIVE' AND name IN ('الملاعب', 'كرة قدم')
  ORDER BY CASE WHEN name = 'الملاعب' THEN 0 ELSE 1 END
  LIMIT 1;
  SELECT id INTO cat_apartments FROM categories
  WHERE status = 'ACTIVE' AND name IN ('الطيرمانات', 'شقق يومية')
  ORDER BY CASE WHEN name = 'الطيرمانات' THEN 0 ELSE 1 END
  LIMIT 1;

  IF sanaa_id IS NULL OR cat_halls IS NULL OR cat_chalets IS NULL THEN
    RAISE EXCEPTION 'Base seed missing. Run sql/003_seed.sql and sql/005_category_taxonomy.sql first.';
  END IF;

  -- Users
  INSERT INTO users (id, first_name, last_name, phone, email, password_hash, role, phone_verified, email_verified, status)
  VALUES
    (u_admin, 'أحمد', 'الإدارة', '+967770000001', 'admin@hadjzi.test', pwd, 'ADMIN', TRUE, TRUE, 'ACTIVE'),
    (u_customer, 'سارة', 'العميل', '+967770000010', 'customer@hadjzi.test', pwd, 'CUSTOMER', TRUE, TRUE, 'ACTIVE'),
    (u_prov1, 'خالد', 'القاعات', '+967770000101', 'halls@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u_prov2, 'نورة', 'الشاليهات', '+967770000102', 'chalets@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u_prov3, 'ياسر', 'الأسنان', '+967770000103', 'dental@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u_prov4, 'فهد', 'الملاعب', '+967770000104', 'fields@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u_prov5, 'ليلى', 'الشقق', '+967770000105', 'stays@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u_prov6, 'عمر', 'الفعاليات', '+967770000106', 'events@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE')
  ON CONFLICT (id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = 'ACTIVE',
    phone_verified = TRUE,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name;

  -- Providers (APPROVED so they appear in search)
  INSERT INTO providers (
    id, user_id, business_name, category_id, description,
    city_id, region_id, address_details, latitude, longitude,
    images, cancellation_policy, status
  )
  VALUES
    (
      p1, u_prov1, 'قصر الملكة للأفراح', cat_halls,
      'قاعة فاخرة تتسع لـ 800 ضيف مع إضاءة وتكييف كامل.',
      sanaa_id, sanaa_hada_id, 'حي حدة — شارع الستين',
      15.35470000, 44.20660000,
      ARRAY[
        'https://images.unsplash.com/photo-1519167758481-83f550bb49b8?w=900&q=80',
        'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=900&q=80'
      ],
      'إلغاء مجاني قبل 7 أيام',
      'APPROVED'
    ),
    (
      p2, u_prov2, 'فيلا الياسمين — مسبح خاص', cat_chalets,
      'شاليه عائلي مع مسبح خاص ومنطقة شواء.',
      sanaa_id, sanaa_sab_id, 'السبعين — قرب دوار الخمسين',
      15.34010000, 44.18520000,
      ARRAY[
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80'
      ],
      'عربون غير مسترد خلال 48 ساعة',
      'APPROVED'
    ),
    (
      p3, u_prov3, 'عيادة ابتسامة — تجميل', cat_dental,
      'عيادة أسنان وتجميل بتقنيات حديثة ومواعيد مرنة.',
      sanaa_id, sanaa_hada_id, 'حدة — مجمع النور الطبي',
      15.35120000, 44.21000000,
      ARRAY[
        'https://images.unsplash.com/photo-1629909613654-28e377c037b6?w=900&q=80'
      ],
      'يمكن إعادة الجدولة قبل 24 ساعة',
      'APPROVED'
    ),
    (
      p4, u_prov4, 'ملعب النجوم', cat_football,
      'ملعب عشبي صناعي بإضاءة ليلية وغرف تبديل.',
      sanaa_id, sanaa_sab_id, 'السبعين — جوار النادي',
      15.33500000, 44.19000000,
      ARRAY[
        'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=900&q=80'
      ],
      'الحجز ملزم عند التأكيد',
      'APPROVED'
    ),
    (
      p5, u_prov5, 'شقق الضيافة اليومية', cat_apartments,
      'شقق مفروشة يومية للعائلات والمسافرين.',
      aden_id, aden_crater_id, 'كريتر — قرب الكورنيش',
      12.77940000, 45.03650000,
      ARRAY[
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80'
      ],
      'إلغاء قبل 3 أيام لاسترداد العربون',
      'APPROVED'
    ),
    (
      p6, u_prov6, 'صالة VIP — استراحة', cat_halls,
      'استراحة VIP للمناسبات والاجتماعات الخاصة.',
      sanaa_id, sanaa_hada_id, 'حدة — برج الأعمال',
      15.35600000, 44.20800000,
      ARRAY[
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80'
      ],
      'سياسة مرنة حسب الباقة',
      'APPROVED'
    )
  ON CONFLICT (id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    description = EXCLUDED.description,
    images = EXCLUDED.images,
    status = 'APPROVED',
    category_id = EXCLUDED.category_id,
    city_id = EXCLUDED.city_id,
    region_id = EXCLUDED.region_id;

  -- Services
  INSERT INTO services (
    id, provider_id, category_id, name, description,
    base_price, deposit_percentage, duration_minutes, attributes, images, status
  )
  VALUES
    (
      s1, p1, cat_halls, 'حجز القاعة الكامل',
      'باقة قاعة + تكييف + إضاءة للمناسبة.',
      480000, 30, NULL,
      '{"capacity":800,"includes":["sound","lighting"]}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1519167758481-83f550bb49b8?w=900&q=80'],
      'ACTIVE'
    ),
    (
      s2, p2, cat_chalets, 'ليلة في الشاليه',
      'إقامة لليلة واحدة مع مسبح خاص.',
      320000, 30, NULL,
      '{"guests":8,"pool":true}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80'],
      'ACTIVE'
    ),
    (
      s3, p2, cat_chalets, 'يومين في الشاليه',
      'إقامة ليلتين مع شواء.',
      580000, 30, NULL,
      '{"guests":8,"bbq":true}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80'],
      'ACTIVE'
    ),
    (
      s4, p3, cat_dental, 'جلسة كشف وتجميل',
      'كشف أسنان + استشارة تجميل.',
      45000, 30, 45,
      '{"slotMinutes":45}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1629909613654-28e377c037b6?w=900&q=80'],
      'ACTIVE'
    ),
    (
      s5, p4, cat_football, 'ساعة ملعب',
      'حجز ساعة على الملعب مع كرات.',
      25000, 30, 60,
      '{"players":14}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1459865264687-595d652de67e?w=900&q=80'],
      'ACTIVE'
    ),
    (
      s6, p5, cat_apartments, 'شقة يومية — غرفتين',
      'شقة مفروشة غرفتين وصالة.',
      80000, 30, NULL,
      '{"rooms":2}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80'],
      'ACTIVE'
    ),
    (
      s7, p6, cat_halls, 'استراحة VIP نصف يوم',
      'حجز الاستراحة لنصف يوم.',
      120000, 30, NULL,
      '{"hours":6}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80'],
      'ACTIVE'
    ),
    (
      s8, p1, cat_halls, 'باقة قاعة + ضيافة',
      'قاعة مع ضيافة خفيفة لـ 200 ضيف.',
      620000, 35, NULL,
      '{"capacity":200,"catering":true}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=900&q=80'],
      'ACTIVE'
    )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    base_price = EXCLUDED.base_price,
    images = EXCLUDED.images,
    status = 'ACTIVE',
    description = EXCLUDED.description;

  -- Availability samples (next 14 days)
  INSERT INTO service_availabilities (service_id, date, start_time, end_time, total_capacity, available_capacity, status)
  SELECT s1, CURRENT_DATE + d, NULL, NULL, 1, 1, 'AVAILABLE'
  FROM generate_series(1, 14) AS d
  WHERE NOT EXISTS (
    SELECT 1 FROM service_availabilities a
    WHERE a.service_id = s1 AND a.date = CURRENT_DATE + d AND a.start_time IS NULL
  );

  INSERT INTO service_availabilities (service_id, date, start_time, end_time, total_capacity, available_capacity, status)
  SELECT s2, CURRENT_DATE + d, NULL, NULL, 1, 1, 'AVAILABLE'
  FROM generate_series(1, 14) AS d
  WHERE NOT EXISTS (
    SELECT 1 FROM service_availabilities a
    WHERE a.service_id = s2 AND a.date = CURRENT_DATE + d AND a.start_time IS NULL
  );

  INSERT INTO service_availabilities (service_id, date, start_time, end_time, total_capacity, available_capacity, status)
  SELECT s4, CURRENT_DATE + d, t.start_time::time, t.end_time::time, 1, 1, 'AVAILABLE'
  FROM generate_series(1, 7) AS d
  CROSS JOIN (
    VALUES ('09:00', '09:45'), ('10:00', '10:45'), ('11:00', '11:45'), ('17:00', '17:45')
  ) AS t(start_time, end_time)
  WHERE NOT EXISTS (
    SELECT 1 FROM service_availabilities a
    WHERE a.service_id = s4
      AND a.date = CURRENT_DATE + d
      AND a.start_time = t.start_time::time
  );

  INSERT INTO service_availabilities (service_id, date, start_time, end_time, total_capacity, available_capacity, status)
  SELECT s5, CURRENT_DATE + d, t.start_time::time, t.end_time::time, 1, 1, 'AVAILABLE'
  FROM generate_series(1, 7) AS d
  CROSS JOIN (
    VALUES ('16:00', '17:00'), ('17:00', '18:00'), ('18:00', '19:00'), ('20:00', '21:00')
  ) AS t(start_time, end_time)
  WHERE NOT EXISTS (
    SELECT 1 FROM service_availabilities a
    WHERE a.service_id = s5
      AND a.date = CURRENT_DATE + d
      AND a.start_time = t.start_time::time
  );

  -- Banners
  INSERT INTO banners (title, image_url, action_type, action_target, is_active, sort_order)
  SELECT v.title, v.image_url, v.action_type::banner_action_type, v.action_target, TRUE, v.sort_order
  FROM (
    VALUES
      (
        'شاليهات ومنتجعات خاصة',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
        'CATEGORY',
        cat_chalets::text,
        1
      ),
      (
        'قاعات أفراح فاخرة',
        'https://images.unsplash.com/photo-1519167758481-83f550bb49b8?w=1200&q=80',
        'PROVIDER',
        p1::text,
        2
      ),
      (
        'احجز عيادتك بسهولة',
        'https://images.unsplash.com/photo-1629909613654-28e377c037b6?w=1200&q=80',
        'CATEGORY',
        cat_dental::text,
        3
      )
  ) AS v(title, image_url, action_type, action_target, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM banners b WHERE b.title = v.title
  );
END $$;
