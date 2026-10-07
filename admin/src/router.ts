import { useEffect, useState } from 'react';
import type { PageId } from './types';

const pages: PageId[] = ['dashboard', 'facilities', 'users', 'complaints', 'settings', 'wallet'];

export function pageFromHash(hash: string): PageId {
  const path = hash.replace(/^#/, '').replace(/^\//, '').split('?')[0].split('/')[0];
  return pages.includes(path as PageId) ? (path as PageId) : 'dashboard';
}

export function useHashLocation() {
  const [hash, setHash] = useState(() => window.location.hash || '#/dashboard');

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/dashboard');
    }
    const sync = () => setHash(window.location.hash || '#/dashboard');
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const queryString = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  return {
    page: pageFromHash(hash),
    query: new URLSearchParams(queryString),
  };
}

export function navigate(page: PageId, params?: Record<string, string>) {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
  }
  const qs = search.toString();
  window.location.hash = `#/${page}${qs ? `?${qs}` : ''}`;
}
