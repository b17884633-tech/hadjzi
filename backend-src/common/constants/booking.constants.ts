/** Soft hold while the customer is still in the booking/checkout flow (minutes).
 * Cleared once payment proof is submitted — those stay PENDING_PAYMENT until confirmed. */
export const BOOKING_LOCK_MINUTES = 15;

/** Default deposit percentage when service has no override. */
export const DEFAULT_DEPOSIT_PERCENTAGE = 30;

/** Platform commission percentage applied on confirmed bookings. */
export const DEFAULT_COMMISSION_PERCENTAGE = 10;
