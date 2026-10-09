export type FacilityStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export type AccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
export type ComplaintStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
export type RecordStatus = 'ACTIVE' | 'INACTIVE';
export type BookingType = 'SLOT' | 'UNIT_DAY' | 'EVENT_DAY' | 'QUANTITY';
export type PaymentType = 'DEPOSIT' | 'REMAINING' | 'REFUND';
export type PaymentStatus = 'INITIATED' | 'SUCCESS' | 'FAILED';
export type NoticeAudience = 'ALL' | 'CUSTOMERS' | 'PROVIDERS' | 'USER';

export type FacilityService = {
  id: string;
  name: string;
  basePrice: number;
  depositPercentage: number;
  status: RecordStatus;
  images: string[];
};

export type Facility = {
  id: string;
  businessName: string;
  categoryId: number | null;
  categoryName: string | null;
  ownerId: string;
  ownerName: string | null;
  ownerPhone: string | null;
  cityId: number | null;
  city: string | null;
  regionId: number | null;
  region: string | null;
  address: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  cancellationPolicy: string | null;
  attributes: Record<string, unknown>;
  spaces: string[];
  amenities: string[];
  terms: string[];
  depositNote: string | null;
  tourUrl: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  majlis: number | null;
  insuranceAmount: number | null;
  insuranceMeta: string | null;
  insuranceNote: string | null;
  /** Who suspended the facility — ADMIN lock vs PROVIDER self-disable. */
  disabledBy?: 'ADMIN' | 'PROVIDER' | null;
  disableReason?: string | null;
  status: FacilityStatus;
  images: string[];
  services: FacilityService[];
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: UserRole;
  status: AccountStatus;
  phoneVerified: boolean;
  createdAt: string;
};

export type Complaint = {
  id: string;
  bookingId: string | null;
  bookingNumber: string | null;
  facilityName: string | null;
  userId: string | null;
  userName: string | null;
  subject: string;
  message: string;
  status: ComplaintStatus;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: number;
  name: string;
  iconUrl: string;
  parentId: number | null;
  bookingType: BookingType;
  sortOrder: number;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
};

export type Payment = {
  id: string;
  bookingId: string | null;
  bookingNumber: string | null;
  userId: string | null;
  userName: string | null;
  facilityName: string | null;
  amount: number;
  type: PaymentType;
  method: string;
  status: PaymentStatus;
  reference: string | null;
  relatedPaymentId: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type Notice = {
  id: string;
  title: string;
  message: string;
  audience: NoticeAudience;
  userId: string | null;
  userName: string | null;
  createdAt: string;
};

export type City = {
  id: number;
  name: string;
};

export type OverviewStats = {
  netCollected: number;
  collected: number;
  refunded: number;
  pendingAmount: number;
  facilitiesTotal: number;
  facilitiesPending: number;
  facilitiesApproved: number;
  facilitiesSuspended: number;
  usersTotal: number;
  usersActive: number;
  usersPending: number;
  usersSuspended: number;
  complaintsOpen: number;
  complaintsReview: number;
  complaintsResolved: number;
  paymentsInitiated: number;
  paymentsFailed: number;
  categoriesTotal: number;
  categoriesActive: number;
  categoriesBlocked: number;
  noticesTotal: number;
  depositPercentage: number;
};

export type OverviewResponse = {
  stats: OverviewStats;
  pending: {
    facilities: boolean;
    users: boolean;
    complaints: boolean;
    wallet: boolean;
  };
  monthlyCollections: Array<{ key: string; label: string; value: number }>;
  recentPayments: Payment[];
};

export type SessionUser = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  role: UserRole;
  status: AccountStatus;
};

export type PageId =
  | 'dashboard'
  | 'facilities'
  | 'users'
  | 'complaints'
  | 'settings'
  | 'wallet';
