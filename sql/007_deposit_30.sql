-- Set commission / deposit to 30% for every service
UPDATE services
SET deposit_percentage = 30.00
WHERE deposit_percentage IS DISTINCT FROM 30.00;
