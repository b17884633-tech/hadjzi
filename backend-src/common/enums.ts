export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export enum AccountStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum RecordStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum BookingType {
  SLOT = 'SLOT',
  UNIT_DAY = 'UNIT_DAY',
  EVENT_DAY = 'EVENT_DAY',
  QUANTITY = 'QUANTITY',
}

export enum ProviderStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum AvailabilityStatus {
  AVAILABLE = 'AVAILABLE',
  BLOCKED = 'BLOCKED',
  SOLD_OUT = 'SOLD_OUT',
}

export enum BookingStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentType {
  DEPOSIT = 'DEPOSIT',
  REMAINING = 'REMAINING',
  REFUND = 'REFUND',
}

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum BannerActionType {
  PROVIDER = 'PROVIDER',
  SERVICE = 'SERVICE',
  CATEGORY = 'CATEGORY',
  URL = 'URL',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum OtpChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

export enum OtpPurpose {
  REGISTER = 'REGISTER',
  LOGIN = 'LOGIN',
  VERIFY_PHONE = 'VERIFY_PHONE',
}
