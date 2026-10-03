-- Extra demo providers/services across the 5.1–5.13 taxonomy
-- Password for new users: Password123!
-- Requires: sql/003_seed.sql + sql/005_category_taxonomy.sql (+ preferably 004_test_data.sql)

DO $$
DECLARE
  pwd CONSTANT TEXT := '$2b$10$RwNIBdM0hgtZtEhveGkY3uAm9NV/VTQWm6Dao6jOwVJx5xCtGhr7q';

  sanaa_id INT;
  aden_id INT;
  taiz_id INT;
  sanaa_hada_id INT;
  sanaa_sab_id INT;
  aden_crater_id INT;

  c_halls INT;
  c_chalets INT;
  c_hotels INT;
  c_rooms INT;
  c_apartments INT;
  c_health INT;
  c_clinics INT;
  c_hospitals INT;
  c_wedding INT;
  c_water INT;
  c_decor INT;
  c_salon INT;
  c_salon_w INT;
  c_barber INT;
  c_pools INT;
  c_fields INT;
  c_transport INT;
  c_cars INT;
  c_artists INT;
  c_photo INT;

  u7 UUID := '33333333-3333-3333-3333-333333333337';
  u8 UUID := '33333333-3333-3333-3333-333333333338';
  u9 UUID := '33333333-3333-3333-3333-333333333339';
  u10 UUID := '33333333-3333-3333-3333-33333333333a';
  u11 UUID := '33333333-3333-3333-3333-33333333333b';
  u12 UUID := '33333333-3333-3333-3333-33333333333c';
  u13 UUID := '33333333-3333-3333-3333-33333333333d';
  u14 UUID := '33333333-3333-3333-3333-33333333333e';
  u15 UUID := '33333333-3333-3333-3333-33333333333f';
  u16 UUID := '33333333-3333-3333-3333-333333333340';
  u17 UUID := '33333333-3333-3333-3333-333333333341';
  u18 UUID := '33333333-3333-3333-3333-333333333342';
  u19 UUID := '33333333-3333-3333-3333-333333333343';

  p7 UUID := '44444444-4444-4444-4444-444444444447';
  p8 UUID := '44444444-4444-4444-4444-444444444448';
  p9 UUID := '44444444-4444-4444-4444-444444444449';
  p10 UUID := '44444444-4444-4444-4444-44444444444a';
  p11 UUID := '44444444-4444-4444-4444-44444444444b';
  p12 UUID := '44444444-4444-4444-4444-44444444444c';
  p13 UUID := '44444444-4444-4444-4444-44444444444d';
  p14 UUID := '44444444-4444-4444-4444-44444444444e';
  p15 UUID := '44444444-4444-4444-4444-44444444444f';
  p16 UUID := '44444444-4444-4444-4444-444444444450';
  p17 UUID := '44444444-4444-4444-4444-444444444451';
  p18 UUID := '44444444-4444-4444-4444-444444444452';
  p19 UUID := '44444444-4444-4444-4444-444444444453';

  s9 UUID := '55555555-5555-5555-5555-555555555559';
  s10 UUID := '55555555-5555-5555-5555-55555555555a';
  s11 UUID := '55555555-5555-5555-5555-55555555555b';
  s12 UUID := '55555555-5555-5555-5555-55555555555c';
  s13 UUID := '55555555-5555-5555-5555-55555555555d';
  s14 UUID := '55555555-5555-5555-5555-55555555555e';
  s15 UUID := '55555555-5555-5555-5555-55555555555f';
  s16 UUID := '55555555-5555-5555-5555-555555555560';
  s17 UUID := '55555555-5555-5555-5555-555555555561';
  s18 UUID := '55555555-5555-5555-5555-555555555562';
  s19 UUID := '55555555-5555-5555-5555-555555555563';
  s20 UUID := '55555555-5555-5555-5555-555555555564';
  s21 UUID := '55555555-5555-5555-5555-555555555565';
  s22 UUID := '55555555-5555-5555-5555-555555555566';
  s23 UUID := '55555555-5555-5555-5555-555555555567';
  s24 UUID := '55555555-5555-5555-5555-555555555568';
  s25 UUID := '55555555-5555-5555-5555-55555555556c';
BEGIN
  SELECT id INTO sanaa_id FROM cities WHERE name = 'صنعاء';
  SELECT id INTO aden_id FROM cities WHERE name = 'عدن';
  SELECT id INTO taiz_id FROM cities WHERE name = 'تعز';
  SELECT id INTO sanaa_hada_id FROM regions WHERE city_id = sanaa_id AND name = 'حي حدة';
  SELECT id INTO sanaa_sab_id FROM regions WHERE city_id = sanaa_id AND name = 'السبعين';
  SELECT id INTO aden_crater_id FROM regions WHERE city_id = aden_id AND name = 'كريتر';

  SELECT id INTO c_halls FROM categories WHERE name = 'الصالات' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_chalets FROM categories WHERE name = 'الشاليهات' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_hotels FROM categories WHERE name = 'الفنادق' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_rooms FROM categories WHERE name = 'الغرف' AND parent_id = c_hotels AND status = 'ACTIVE';
  SELECT id INTO c_apartments FROM categories WHERE name = 'الطيرمانات' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_health FROM categories WHERE name = 'صحة' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_clinics FROM categories WHERE name = 'عيادات' AND parent_id = c_health AND status = 'ACTIVE';
  SELECT id INTO c_hospitals FROM categories WHERE name = 'مستشفيات' AND parent_id = c_health AND status = 'ACTIVE';
  SELECT id INTO c_wedding FROM categories WHERE name = 'مستلزمات الأعراس' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_water FROM categories WHERE name = 'الماء' AND parent_id = c_wedding AND status = 'ACTIVE';
  SELECT id INTO c_decor FROM categories WHERE name = 'الزينة' AND parent_id = c_wedding AND status = 'ACTIVE';
  SELECT id INTO c_salon FROM categories WHERE name = 'كوافير' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_salon_w FROM categories WHERE name = 'قسم النساء' AND parent_id = c_salon AND status = 'ACTIVE';
  SELECT c.id INTO c_barber FROM categories c
    JOIN categories p ON c.parent_id = p.id
    WHERE c.name = 'الحلاقين' AND p.name = 'قسم الرجال' AND c.status = 'ACTIVE'
    LIMIT 1;
  SELECT id INTO c_pools FROM categories WHERE name = 'المسابح والنوادي' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_fields FROM categories WHERE name = 'الملاعب' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_transport FROM categories WHERE name = 'النقليات' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_cars FROM categories WHERE name = 'السيارات' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_artists FROM categories WHERE name = 'الزفافين والفنانين' AND parent_id IS NULL AND status = 'ACTIVE';
  SELECT id INTO c_photo FROM categories WHERE name = 'جلسات التصوير' AND parent_id IS NULL AND status = 'ACTIVE';

  IF sanaa_id IS NULL OR c_chalets IS NULL OR c_halls IS NULL THEN
    RAISE EXCEPTION 'Category taxonomy missing. Run sql/005_category_taxonomy.sql first.';
  END IF;

  -- Fallback if nested cats missing
  c_rooms := COALESCE(c_rooms, c_hotels);
  c_clinics := COALESCE(c_clinics, c_health);
  c_hospitals := COALESCE(c_hospitals, c_health);
  c_water := COALESCE(c_water, c_wedding);
  c_decor := COALESCE(c_decor, c_wedding);
  c_salon_w := COALESCE(c_salon_w, c_salon);
  c_barber := COALESCE(c_barber, c_salon);

  INSERT INTO users (id, first_name, last_name, phone, email, password_hash, role, phone_verified, email_verified, status)
  VALUES
    (u7, 'ريم', 'الصالات', '+967770000107', 'halls2@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u8, 'سامي', 'الفنادق', '+967770000108', 'hotels@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u9, 'هند', 'الطيرمانات', '+967770000109', 'apt@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u10, 'ماجد', 'الصحة', '+967770000110', 'health@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u11, 'داليا', 'الأعراس', '+967770000111', 'wedding@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u12, 'لينا', 'كوافير', '+967770000112', 'salon@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u13, 'بدر', 'حلاقة', '+967770000113', 'barber@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u14, 'وليد', 'المسابح', '+967770000114', 'pools@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u15, 'تامر', 'النقل', '+967770000115', 'cars@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u16, 'أمل', 'تصوير', '+967770000116', 'photo@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u17, 'سمية', 'العيادات', '+967770000117', 'clinic@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u18, 'فهد', 'الملاعب', '+967770000118', 'fields2@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE'),
    (u19, 'ياسر', 'الزفة', '+967770000119', 'artists@hadjzi.test', pwd, 'PROVIDER', TRUE, TRUE, 'ACTIVE')
  ON CONFLICT (id) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    status = 'ACTIVE',
    role = EXCLUDED.role,
    phone_verified = TRUE;

  INSERT INTO providers (
    id, user_id, business_name, category_id, description,
    city_id, region_id, address_details, latitude, longitude,
    images, cancellation_policy, status
  )
  VALUES
    (
      p7, u7, 'صالة الأحلام الكبرى', c_halls,
      'صالة أفراح حديثة بسعة كبيرة وتجهيزات صوت وإضاءة كاملة.',
      sanaa_id, sanaa_hada_id, 'صنعاء، شارع إيران',
      15.35710000, 44.20950000,
      ARRAY[
        'https://images.unsplash.com/photo-1519167758481-83f550bb49b8?w=1200&q=80',
        'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80',
        'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80'
      ],
      'إلغاء قبل أسبوع لاسترداد 50%',
      'APPROVED'
    ),
    (
      p8, u8, 'فندق سبأ سوفتيل', c_hotels,
      'غرف وأجنحة فاخرة مع إطلالة وخدمات ضيافة.',
      sanaa_id, sanaa_hada_id, 'صنعاء، شارع الستين',
      15.35200000, 44.20700000,
      ARRAY[
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80',
        'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80'
      ],
      'إلغاء مجاني قبل 48 ساعة',
      'APPROVED'
    ),
    (
      p9, u9, 'طيرمانات النسيم', c_apartments,
      'طيرمانات مفروشة يومية للعائلات مع موقف خاص.',
      sanaa_id, sanaa_sab_id, 'السبعين — جوار دوار الستين',
      15.33800000, 44.18800000,
      ARRAY[
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80'
      ],
      'عربون مسترد قبل 3 أيام',
      'APPROVED'
    ),
    (
      p10, u10, 'مستشفى النور التخصصي', c_hospitals,
      'مواعيد كشف ومتابعة مع أطباء اختصاصيين.',
      sanaa_id, sanaa_hada_id, 'حدة — مجمع النور',
      15.35050000, 44.21100000,
      ARRAY[
        'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80'
      ],
      'إعادة جدولة قبل 12 ساعة',
      'APPROVED'
    ),
    (
      p11, u17, 'عيادة الشفاء العامة', c_clinics,
      'عيادات متعددة التخصصات وحجز مواعيد سريع.',
      aden_id, aden_crater_id, 'كريتر — الشارع الرئيسي',
      12.78000000, 45.03700000,
      ARRAY[
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80'
      ],
      'إلغاء قبل 6 ساعات',
      'APPROVED'
    ),
    (
      p12, u11, 'مؤسسة فرح للمستلزمات', c_wedding,
      'ماء وزينة وكوش وحلويات لكل مناسبات الأعراس.',
      sanaa_id, sanaa_hada_id, 'حدة — سوق الأفراح',
      15.35300000, 44.20500000,
      ARRAY[
        'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80',
        'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=80'
      ],
      'الدفع عند التأكيد',
      'APPROVED'
    ),
    (
      p13, u12, 'صالون لمسة أنوثة', c_salon_w,
      'كوافير وجلسات تجميل للعروس والمناسبات.',
      sanaa_id, sanaa_sab_id, 'السبعين — برج الجمال',
      15.34100000, 44.18600000,
      ARRAY[
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80'
      ],
      'عربون 20% غير مسترد خلال 24 ساعة',
      'APPROVED'
    ),
    (
      p14, u13, 'حلاقة الملوك', c_barber,
      'حلاقة رجالية فاخرة ومواعيد سريعة.',
      sanaa_id, sanaa_hada_id, 'حدة — شارع الستين',
      15.35500000, 44.20400000,
      ARRAY[
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80'
      ],
      'يمكن التأجيل مرة واحدة',
      'APPROVED'
    ),
    (
      p15, u14, 'نادي الموج الأزرق', c_pools,
      'مسابح ونوادي رياضية مع حجوزات بالساعة.',
      sanaa_id, sanaa_sab_id, 'السبعين — المجمع الرياضي',
      15.33650000, 44.19200000,
      ARRAY[
        'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&q=80'
      ],
      'الحجز ملزم',
      'APPROVED'
    ),
    (
      p16, u18, 'ملاعب الأبطال', c_fields,
      'ملاعب كرة قدم وبادل بإضاءة ليلية.',
      taiz_id, NULL, 'تعز — المدينة',
      13.57700000, 44.01700000,
      ARRAY[
        'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1200&q=80'
      ],
      'تأكيد فوري',
      'APPROVED'
    ),
    (
      p17, u15, 'نقليات الأمانة + تأجير سيارات', c_cars,
      'باصات نقل وحجز سيارات مع سائق أو بدون.',
      sanaa_id, sanaa_hada_id, 'صنعاء — موقف الأمانة',
      15.34900000, 44.20000000,
      ARRAY[
        'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80',
        'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200&q=80'
      ],
      'عربون 30%',
      'APPROVED'
    ),
    (
      p18, u16, 'استوديو لقطة الذهبية', c_photo,
      'جلسات تصوير واستوديوهات للرجال والنساء.',
      sanaa_id, sanaa_hada_id, 'حدة — مجمع الإبداع',
      15.35400000, 44.21200000,
      ARRAY[
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80',
        'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&q=80'
      ],
      'إعادة جدولة قبل يوم',
      'APPROVED'
    ),
    (
      p19, u19, 'فرقة أنغام الزفاف', c_artists,
      'زفة وفرقة غنائية حية للمناسبات والأعراس.',
      sanaa_id, sanaa_sab_id, 'السبعين — استديو الأنغام',
      15.34000000, 44.19000000,
      ARRAY[
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80',
        'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&q=80'
      ],
      'عربون 40% غير مسترد خلال 48 ساعة',
      'APPROVED'
    )
  ON CONFLICT (id) DO UPDATE SET
    business_name = EXCLUDED.business_name,
    description = EXCLUDED.description,
    images = EXCLUDED.images,
    status = 'APPROVED',
    category_id = EXCLUDED.category_id,
    city_id = EXCLUDED.city_id,
    region_id = EXCLUDED.region_id,
    address_details = EXCLUDED.address_details;

  -- Also remap an existing chalet provider onto new الشاليهات root if present
  UPDATE providers
  SET category_id = c_chalets,
      business_name = 'شالية رقم 1 (VIP), سبأ سوفتيل',
      description = 'شاليه فاخر مع مسبح ومجالس وحمامات متعددة لإقامة عائلية مميزة.',
      address_details = 'صنعاء، شارع إيران',
      images = ARRAY[
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80'
      ]
  WHERE id = '44444444-4444-4444-4444-444444444442';

  INSERT INTO services (
    id, provider_id, category_id, name, description,
    base_price, deposit_percentage, duration_minutes, attributes, images, status
  )
  VALUES
    (
      s9, p7, c_halls, 'الفترة الصباحية',
      'حجز الصالة من الصباح حتى المساء مع إضاءة وصوتيات.',
      301850, 30, NULL,
      '{"capacity":30,"hours":12,"bathrooms":4,"bedrooms":2,"majlis":1,"spaces":["استيم","ساونا","سينما","مسبح كبار"],"amenities":["مطبخ","موقف سيارات خارجي","فلترة ونظام تدفئة","شاشات"]}'::jsonb,
      ARRAY[
        'https://images.unsplash.com/photo-1519167758481-83f550bb49b8?w=1200&q=80',
        'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80'
      ],
      'ACTIVE'
    ),
    (
      s10, p7, c_halls, 'الفترة المسائية',
      'باقة مسائية فاخرة حتى منتصف الليل.',
      420000, 30, NULL,
      '{"capacity":50,"hours":8,"bathrooms":4,"bedrooms":2,"majlis":2}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s11, '44444444-4444-4444-4444-444444444442', c_chalets, 'الفترة الصباحية',
      'إقامة نهارية في الشاليه مع مسبح ومجالس.',
      301850, 30, NULL,
      '{"capacity":30,"guests":30,"hours":12,"bathrooms":4,"bedrooms":2,"majlis":1,"pool":true,"bbq":true,"spaces":["استيم","ساونا","سينما","مسبح كبار"],"amenities":["مطبخ","موقف سيارات خارجي","فلترة ونظام تدفئة","شاشات"]}'::jsonb,
      ARRAY[
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80'
      ],
      'ACTIVE'
    ),
    (
      s12, '44444444-4444-4444-4444-444444444442', c_chalets, 'ليلة كاملة',
      'إقامة ليلية مع شواء ومسبح خاص.',
      450000, 30, NULL,
      '{"guests":12,"bathrooms":4,"bedrooms":3,"majlis":1,"pool":true,"bbq":true}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s13, p8, c_rooms, 'غرفة ديلوكس',
      'غرفة مزدوجة مع إفطار.',
      95000, 30, NULL,
      '{"rooms":1,"bedrooms":1,"bathrooms":1,"guests":2}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s14, p8, c_rooms, 'جناح عائلي',
      'جناح بغرفتين وصالة.',
      180000, 30, NULL,
      '{"rooms":2,"bedrooms":2,"bathrooms":2,"guests":5,"majlis":1}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s15, p9, c_apartments, 'طيرمان يومي — 3 غرف',
      'طيرمان مفروش كامل مع مطبخ وموقف.',
      110000, 30, NULL,
      '{"rooms":3,"bedrooms":3,"bathrooms":2,"majlis":1,"guests":7,"amenities":["مطبخ","موقف سيارات خارجي","شاشات"]}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s16, p10, c_hospitals, 'كشف عام',
      'موعد كشف مع طبيب عام.',
      15000, 30, 30,
      '{"slotMinutes":30}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s17, p11, c_clinics, 'كشف تخصصي',
      'موعد مع طبيب اختصاص.',
      25000, 30, 45,
      '{"slotMinutes":45}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s18, p12, c_water, 'توصيل ماء مناسبات',
      'كمية ماء حسب عدد الضيوف.',
      35000, 30, NULL,
      '{"capacity":200}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s19, p12, c_decor, 'باقة زينة كاملة',
      'زينة قاعة مع كوش وإضاءة.',
      250000, 30, NULL,
      '{"includes":["lighting"]}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s20, p13, c_salon_w, 'جلسة عروس',
      'كوافير وتجميل كامل للعروس.',
      80000, 30, 120,
      '{"slotMinutes":120}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s21, p14, c_barber, 'حلاقة + عناية',
      'حلاقة رجالية مع عناية بالبشرة.',
      12000, 30, 40,
      '{"slotMinutes":40}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s22, p15, c_pools, 'ساعة مسبح كبار',
      'حجز مسبح لكبار السن/الرجال بالساعة.',
      18000, 30, 60,
      '{"players":20,"slotMinutes":60}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s23, p16, c_fields, 'ساعة ملعب بادل',
      'ملعب بادل مجهز بالكامل.',
      22000, 30, 60,
      '{"players":4,"slotMinutes":60}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s24, p17, c_cars, 'تأجير سيارة يومي',
      'سيارة عائلية مع أو بدون سائق.',
      45000, 30, NULL,
      '{"guests":5}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      '55555555-5555-5555-5555-555555555569'::uuid, p17, c_transport, 'باص نقل مناسبات',
      'نقل ضيوف المناسبة ذهاباً وإياباً.',
      90000, 30, NULL,
      '{"capacity":30}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      '55555555-5555-5555-5555-55555555556a'::uuid, p18, c_photo, 'جلسة تصوير خارجية',
      'جلسة تصوير في موقع خارجي مع تعديل صور.',
      60000, 30, 90,
      '{"slotMinutes":90}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      '55555555-5555-5555-5555-55555555556b'::uuid, p18, c_photo, 'استوديو داخلي',
      'جلسة استوديو للإعلانات والمناسبات.',
      75000, 30, 120,
      '{"slotMinutes":120}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1200&q=80'],
      'ACTIVE'
    ),
    (
      s25, p19, c_artists, 'زفة عريس كاملة',
      'زفة مع فرقة غنائية ومكبرات صوت لمدة ساعة.',
      150000, 30, 60,
      '{"slotMinutes":60,"includes":["band","sound"]}'::jsonb,
      ARRAY['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80'],
      'ACTIVE'
    )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_price = EXCLUDED.base_price,
    deposit_percentage = EXCLUDED.deposit_percentage,
    attributes = EXCLUDED.attributes,
    images = EXCLUDED.images,
    category_id = EXCLUDED.category_id,
    status = 'ACTIVE';

  -- Availability for new stay/slot services
  INSERT INTO service_availabilities (service_id, date, start_time, end_time, total_capacity, available_capacity, status)
  SELECT s11, CURRENT_DATE + d, NULL, NULL, 1, 1, 'AVAILABLE'
  FROM generate_series(1, 21) AS d
  WHERE NOT EXISTS (
    SELECT 1 FROM service_availabilities a
    WHERE a.service_id = s11 AND a.date = CURRENT_DATE + d AND a.start_time IS NULL
  );

  INSERT INTO service_availabilities (service_id, date, start_time, end_time, total_capacity, available_capacity, status)
  SELECT s9, CURRENT_DATE + d, NULL, NULL, 1, 1, 'AVAILABLE'
  FROM generate_series(1, 21) AS d
  WHERE NOT EXISTS (
    SELECT 1 FROM service_availabilities a
    WHERE a.service_id = s9 AND a.date = CURRENT_DATE + d AND a.start_time IS NULL
  );

  INSERT INTO service_availabilities (service_id, date, start_time, end_time, total_capacity, available_capacity, status)
  SELECT s16, CURRENT_DATE + d, t.start_time::time, t.end_time::time, 1, 1, 'AVAILABLE'
  FROM generate_series(1, 10) AS d
  CROSS JOIN (VALUES ('09:00','09:30'), ('10:00','10:30'), ('11:00','11:30'), ('16:00','16:30')) AS t(start_time, end_time)
  WHERE NOT EXISTS (
    SELECT 1 FROM service_availabilities a
    WHERE a.service_id = s16 AND a.date = CURRENT_DATE + d AND a.start_time = t.start_time::time
  );

  INSERT INTO service_availabilities (service_id, date, start_time, end_time, total_capacity, available_capacity, status)
  SELECT s22, CURRENT_DATE + d, t.start_time::time, t.end_time::time, 1, 1, 'AVAILABLE'
  FROM generate_series(1, 10) AS d
  CROSS JOIN (VALUES ('15:00','16:00'), ('16:00','17:00'), ('17:00','18:00'), ('19:00','20:00')) AS t(start_time, end_time)
  WHERE NOT EXISTS (
    SELECT 1 FROM service_availabilities a
    WHERE a.service_id = s22 AND a.date = CURRENT_DATE + d AND a.start_time = t.start_time::time
  );

  INSERT INTO banners (title, image_url, action_type, action_target, is_active, sort_order)
  SELECT v.title, v.image_url, v.action_type::banner_action_type, v.action_target, TRUE, v.sort_order
  FROM (
    VALUES
      ('فنادق وغرف فاخرة', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80', 'CATEGORY', c_hotels::text, 10),
      ('مستلزمات أعراس متكاملة', 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80', 'CATEGORY', c_wedding::text, 11),
      ('جلسات تصوير احترافية', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80', 'CATEGORY', c_photo::text, 12)
  ) AS v(title, image_url, action_type, action_target, sort_order)
  WHERE NOT EXISTS (SELECT 1 FROM banners b WHERE b.title = v.title);
END $$;
