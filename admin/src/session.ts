import type { SessionUser } from './types';

const TOKEN_KEY = 'hadjzi.admin.token';
const USER_KEY = 'hadjzi.admin.user';

export const DEMO_PHONE = '+967770000001';
export const DEMO_PASSWORD = 'Password123!';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSessionUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: SessionUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
  return Boolean(getToken() && getSessionUser()?.role === 'ADMIN');
}
