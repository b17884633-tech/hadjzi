import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError } from './api';
import type {
  AccountStatus,
  AdminUser,
  Category,
  City,
  Complaint,
  ComplaintStatus,
  Facility,
  FacilityStatus,
  Notice,
  NoticeAudience,
  OverviewResponse,
  Payment,
  PaymentStatus,
} from './types';

type AdminState = {
  facilities: Facility[];
  users: AdminUser[];
  complaints: Complaint[];
  categories: Category[];
  payments: Payment[];
  notices: Notice[];
  cities: City[];
  depositPercentage: number;
  overview: OverviewResponse | null;
};

type AdminApi = {
  loading: boolean;
  error: string | null;
  state: AdminState;
  refresh: () => Promise<void>;
  updateFacility: (id: string, patch: Partial<Facility>) => Promise<void>;
  setFacilityStatus: (id: string, status: FacilityStatus) => Promise<void>;
  updateUser: (id: string, patch: Partial<AdminUser>) => Promise<void>;
  setUserStatus: (id: string, status: AccountStatus) => Promise<void>;
  setComplaint: (id: string, status: ComplaintStatus, resolution: string) => Promise<void>;
  addNotice: (notice: {
    title: string;
    message: string;
    audience: NoticeAudience;
    userId: string | null;
  }) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'iconUrl' | 'status'> & {
    status?: Category['status'];
  }) => Promise<void>;
  updateCategory: (id: number, patch: Partial<Category>) => Promise<void>;
  setDeposit: (value: number) => Promise<void>;
  setPaymentStatus: (id: string, status: PaymentStatus) => Promise<void>;
  refundPayment: (id: string) => Promise<void>;
  pending: {
    facilities: boolean;
    users: boolean;
    complaints: boolean;
    wallet: boolean;
  };
};

const empty: AdminState = {
  facilities: [],
  users: [],
  complaints: [],
  categories: [],
  payments: [],
  notices: [],
  cities: [],
  depositPercentage: 30,
  overview: null,
};

const AdminContext = createContext<AdminApi | null>(null);

function replaceById<T extends { id: string | number }>(items: T[], next: T): T[] {
  return items.map((item) => (item.id === next.id ? next : item));
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminState>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        overview,
        facilities,
        users,
        complaints,
        categories,
        payments,
        notices,
        cities,
        settings,
      ] = await Promise.all([
        api.overview(),
        api.facilities(),
        api.users(),
        api.complaints(),
        api.categories(),
        api.payments(),
        api.notices(),
        api.cities(),
        api.settings(),
      ]);
      setState({
        overview,
        facilities,
        users,
        complaints,
        categories,
        payments,
        notices,
        cities,
        depositPercentage: settings.depositPercentage,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load admin data';
      setError(message);
      if (err instanceof ApiError && err.status === 401) {
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh().catch(() => {
      /* handled in refresh */
    });
  }, [refresh]);

  const apiMethods = useMemo<AdminApi>(() => {
    return {
      loading,
      error,
      state,
      refresh,
      updateFacility: async (id, patch) => {
        const next = await api.updateFacility(id, patch);
        setState((current) => ({
          ...current,
          facilities: replaceById(current.facilities, next),
        }));
      },
      setFacilityStatus: async (id, status) => {
        const next = await api.setFacilityStatus(id, status);
        setState((current) => ({
          ...current,
          facilities: replaceById(current.facilities, next),
        }));
        await refresh();
      },
      updateUser: async (id, patch) => {
        const next = await api.updateUser(id, patch);
        setState((current) => ({
          ...current,
          users: replaceById(current.users, next),
        }));
      },
      setUserStatus: async (id, status) => {
        const next = await api.setUserStatus(id, status);
        setState((current) => ({
          ...current,
          users: replaceById(current.users, next),
        }));
        await refresh();
      },
      setComplaint: async (id, status, resolution) => {
        const next = await api.setComplaint(id, status, resolution);
        setState((current) => ({
          ...current,
          complaints: replaceById(current.complaints, next),
        }));
        await refresh();
      },
      addNotice: async (notice) => {
        const next = await api.addNotice(notice);
        setState((current) => ({
          ...current,
          notices: [next, ...current.notices],
        }));
        await refresh();
      },
      addCategory: async (category) => {
        await api.createCategory({
          name: category.name,
          parentId: category.parentId,
          bookingType: category.bookingType,
          sortOrder: category.sortOrder,
        });
        await refresh();
      },
      updateCategory: async (id, patch) => {
        await api.updateCategory(id, patch);
        await refresh();
      },
      setDeposit: async (value) => {
        const next = await api.setDeposit(value);
        setState((current) => ({
          ...current,
          depositPercentage: next.depositPercentage,
        }));
        await refresh();
      },
      setPaymentStatus: async (id, status) => {
        const next = await api.setPaymentStatus(id, status);
        setState((current) => ({
          ...current,
          payments: replaceById(current.payments, next),
        }));
        await refresh();
      },
      refundPayment: async (id) => {
        const next = await api.refundPayment(id);
        setState((current) => ({
          ...current,
          payments: [next, ...current.payments],
        }));
        await refresh();
      },
      pending: state.overview?.pending ?? {
        facilities: state.facilities.some((item) => item.status === 'PENDING_REVIEW'),
        users: state.users.some((item) => item.status === 'PENDING_VERIFICATION'),
        complaints: state.complaints.some((item) => item.status === 'OPEN'),
        wallet: state.payments.some((item) => item.status === 'INITIATED'),
      },
    };
  }, [loading, error, state, refresh]);

  return <AdminContext.Provider value={apiMethods}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminApi {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within StoreProvider');
  return ctx;
}
