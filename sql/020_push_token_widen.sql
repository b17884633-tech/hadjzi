-- Widen token column for long FCM device tokens
ALTER TABLE device_push_tokens
  ALTER COLUMN token TYPE VARCHAR(512);
