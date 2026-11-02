import { AppEnvironment } from '../types/luz';

export function detectInitialEnvironment(): AppEnvironment {
  // Public launch lockdown: all visitors start strictly in PROD.
  // Switching to TEST requires verified Admin authentication in the app.
  return 'prod';
}

export function isAdminUnlockRequestedInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('admin') === '1' || window.location.hash === '#admin';
}

export function getStorageKeys(env: AppEnvironment) {
  const prefix = env === 'prod' ? 'luz_prod_v3' : 'luz_test_v2';
  return {
    entities: `${prefix}_entities`,
    businesses: `${prefix}_businesses`,
    bookings: `${prefix}_bookings`,
    families: `${prefix}_families`,
    profile: `${prefix}_profile`,
    referrals: `${prefix}_referrals`,
  };
}

export function updateUrlForEnvironment(env: AppEnvironment) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (env === 'test') {
    url.searchParams.set('env', 'test');
  } else {
    // If on /test/ static sub-route, keep ?env=prod explicit so reload stays in prod,
    // otherwise clean query param on root prod URL
    if (url.pathname.toLowerCase().includes('/test')) {
      url.searchParams.set('env', 'prod');
    } else {
      url.searchParams.delete('env');
    }
  }
  window.history.replaceState({}, '', url.toString());
}
