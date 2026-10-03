import { SearchFilters } from '../../domain/model/Search';
import { CreateBookingPayload } from '../../domain/model/Booking';
import { NavigatorScreenParams } from '@react-navigation/native';
import {
  BookingCheckoutParams,
  BookingDraftParams,
} from '../booking/bookingFlow';

export type AuthStackParamList = {
  Login: undefined;
  Register: {
    phone: string;
    channel: 'SMS' | 'WHATSAPP';
  };
  Otp: { phone: string; channel?: 'SMS' | 'WHATSAPP' };
};

export type HomeStackParamList = {
  HomeMain: undefined;
  Category: { categoryId: number; title?: string };
};

export type MainTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Explore: { filters?: SearchFilters } | undefined;
  MyBookings: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ProviderProfile: { providerId: string };
  ServiceList: { providerId: string };
  SearchResults: { filters?: SearchFilters };
  BookingDate: BookingDraftParams;
  BookingCheckout: BookingCheckoutParams;
  BookingSummary: { bookingId: string; draft?: CreateBookingPayload };
  PaymentWebview: { checkoutUrl: string; bookingId: string };
  BookingVoucher: { bookingId: string };
  Favorites: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
