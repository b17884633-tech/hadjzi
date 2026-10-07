-- Allow general client feedback / complaints without a booking.
ALTER TABLE disputes
  ALTER COLUMN booking_id DROP NOT NULL;
