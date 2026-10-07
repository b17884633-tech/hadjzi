-- Keep payment-submitted bookings in PENDING_PAYMENT (do not auto-expire).
UPDATE bookings
SET temporary_lock_until = NULL
WHERE status = 'PENDING_PAYMENT'
  AND temporary_lock_until IS NOT NULL
  AND (
    customer_notes ILIKE '%رقم الحوالة%'
    OR customer_notes ILIKE '%حجز مكتبي%'
  );
