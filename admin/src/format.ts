import type {
  AccountStatus,
  BookingType,
  ComplaintStatus,
  FacilityStatus,
  NoticeAudience,
  PaymentStatus,
  PaymentType,
  RecordStatus,
  UserRole,
} from './types';

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatMoney(amount: number): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)} YER`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim();
}

export function includesQuery(query: string, values: Array<string | number | null | undefined>): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => String(value ?? '').toLowerCase().includes(needle));
}

export const facilityStatusLabel: Record<FacilityStatus, string> = {
  PENDING_REVIEW: 'Pending review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUSPENDED: 'Blocked',
};

export const accountStatusLabel: Record<AccountStatus, string> = {
  PENDING_VERIFICATION: 'Pending verification',
  ACTIVE: 'Active',
  SUSPENDED: 'Blocked',
};

export const complaintStatusLabel: Record<ComplaintStatus, string> = {
  OPEN: 'Open',
  UNDER_REVIEW: 'In review',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
};

export const recordStatusLabel: Record<RecordStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Blocked',
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  INITIATED: 'Pending',
  SUCCESS: 'Paid',
  FAILED: 'Failed',
};

export const paymentTypeLabel: Record<PaymentType, string> = {
  DEPOSIT: 'Deposit',
  REMAINING: 'Remaining',
  REFUND: 'Refund',
};

export const roleLabel: Record<UserRole, string> = {
  CUSTOMER: 'Customer',
  PROVIDER: 'Provider',
  ADMIN: 'Admin',
};

export const bookingTypeLabel: Record<BookingType, string> = {
  SLOT: 'Time slot',
  UNIT_DAY: 'Per night',
  EVENT_DAY: 'Event day',
  QUANTITY: 'Quantity',
};

export const audienceLabel: Record<NoticeAudience, string> = {
  ALL: 'All users',
  CUSTOMERS: 'Customers',
  PROVIDERS: 'Providers',
  USER: 'One user',
};

export function toneFor(status: string): 'pending' | 'ok' | 'bad' | 'muted' | 'info' {
  if (
    status === 'PENDING_REVIEW' ||
    status === 'PENDING_VERIFICATION' ||
    status === 'OPEN' ||
    status === 'INITIATED' ||
    status === 'UNDER_REVIEW'
  ) {
    return 'pending';
  }
  if (status === 'APPROVED' || status === 'ACTIVE' || status === 'RESOLVED' || status === 'SUCCESS') {
    return 'ok';
  }
  if (status === 'REJECTED' || status === 'SUSPENDED' || status === 'FAILED' || status === 'INACTIVE') {
    return 'bad';
  }
  return 'muted';
}
