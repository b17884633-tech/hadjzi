-- Multi-night stays: exclusive check-out date (YYYY-MM-DD)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS check_out_date DATE NULL;
