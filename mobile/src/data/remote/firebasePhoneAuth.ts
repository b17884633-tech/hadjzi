import type { FirebaseAuthTypes } from '@react-native-firebase/auth';

export type FirebaseConfirmation =
  FirebaseAuthTypes.ConfirmationResult;

function authModule() {
  // Lazy require so Expo Go / web do not crash at import time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const auth = require('@react-native-firebase/auth').default as typeof import('@react-native-firebase/auth').default;
  return auth();
}

export function isFirebasePhoneAuthAvailable(): boolean {
  try {
    const mod = authModule();
    return typeof mod?.signInWithPhoneNumber === 'function';
  } catch {
    return false;
  }
}

export async function sendFirebasePhoneOtp(
  phoneE164: string,
): Promise<FirebaseConfirmation> {
  if (!isFirebasePhoneAuthAvailable()) {
    throw new Error(
      'تحقق Firebase غير متاح في هذا البناء — استخدم Development Build بعد prebuild',
    );
  }
  return authModule().signInWithPhoneNumber(phoneE164);
}

export async function confirmFirebasePhoneOtp(
  confirmation: FirebaseConfirmation,
  code: string,
): Promise<string> {
  const credential = await confirmation.confirm(code.trim());
  const user = credential?.user ?? authModule().currentUser;
  if (!user) {
    throw new Error('تعذر تأكيد رمز التحقق');
  }
  return user.getIdToken(true);
}

export function mapFirebaseAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : '';
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'رقم الهاتف غير صالح';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة — حاول لاحقاً';
    case 'auth/quota-exceeded':
      return 'تم تجاوز حد الرسائل — حاول لاحقاً';
    case 'auth/invalid-verification-code':
      return 'رمز التحقق غير صحيح';
    case 'auth/session-expired':
      return 'انتهت صلاحية الرمز — أعد الإرسال';
    case 'auth/missing-client-identifier':
    case 'auth/captcha-check-failed':
      return 'فشل التحقق الأمني — أعد المحاولة';
    default:
      return error instanceof Error ? error.message : 'تعذر إرسال رمز التحقق';
  }
}
