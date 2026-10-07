import { createApiClient } from '../core/network/apiClient';
import { getAccessToken } from '../data/local/tokenStorage';
import { AuthApi } from '../data/remote/authApi';
import { BannerApi } from '../data/remote/bannerApi';
import { BookingApi } from '../data/remote/bookingApi';
import { CategoryApi } from '../data/remote/categoryApi';
import { PaymentApi } from '../data/remote/paymentApi';
import { ProviderApi } from '../data/remote/providerApi';
import { SearchApi } from '../data/remote/searchApi';
import { ServiceApi } from '../data/remote/serviceApi';
import { UploadApi } from '../data/remote/uploadApi';
import { ReviewApi } from '../data/remote/reviewApi';
import { NotificationApi } from '../data/remote/notificationApi';
import { DisputeApi } from '../data/remote/disputeApi';
import { AuthRepositoryImpl } from '../data/repository/AuthRepositoryImpl';
import { BookingRepositoryImpl } from '../data/repository/BookingRepositoryImpl';
import { PaymentRepositoryImpl } from '../data/repository/PaymentRepositoryImpl';
import { SearchRepositoryImpl } from '../data/repository/SearchRepositoryImpl';
import { ConfirmPaymentUseCase } from '../domain/usecases/ConfirmPaymentUseCase';
import { LockBookingSlotUseCase } from '../domain/usecases/LockBookingSlotUseCase';
import { SearchDestinationsUseCase } from '../domain/usecases/SearchDestinationsUseCase';

const apiClient = createApiClient(getAccessToken);

const authApi = new AuthApi(apiClient);
const bookingApi = new BookingApi(apiClient);
const searchApi = new SearchApi(apiClient);
const bannerApi = new BannerApi(apiClient);
const categoryApi = new CategoryApi(apiClient);
const providerApi = new ProviderApi(apiClient);
const serviceApi = new ServiceApi(apiClient);
const paymentApi = new PaymentApi(apiClient);
const uploadApi = new UploadApi(apiClient);
const reviewApi = new ReviewApi(apiClient);
const notificationApi = new NotificationApi(apiClient);
const disputeApi = new DisputeApi(apiClient);

const authRepository = new AuthRepositoryImpl(authApi);
const bookingRepository = new BookingRepositoryImpl(bookingApi);
const searchRepository = new SearchRepositoryImpl(searchApi);
const paymentRepository = new PaymentRepositoryImpl(paymentApi);

export const container = {
  apiClient,
  authApi,
  bookingApi,
  searchApi,
  bannerApi,
  categoryApi,
  providerApi,
  serviceApi,
  paymentApi,
  uploadApi,
  reviewApi,
  notificationApi,
  disputeApi,
  authRepository,
  bookingRepository,
  searchRepository,
  paymentRepository,
  searchDestinationsUseCase: new SearchDestinationsUseCase(searchRepository),
  lockBookingSlotUseCase: new LockBookingSlotUseCase(bookingRepository),
  confirmPaymentUseCase: new ConfirmPaymentUseCase(paymentRepository),
} as const;

export type AppContainer = typeof container;
