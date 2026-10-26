import { AppEnvironment } from '../types/luz';

export function detectInitialEnvironment(): AppEnvironment {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const queryEnv = params.get('env');
    if (queryEnv === 'test') return 'test';
    if (queryEnv === 'prod') return 'prod';

    const path = window.location.pathname.toLowerCase();
    if (path.endsWith('/test') || path.endsWith('/test/') || path.includes('/test/index.html')) {
      return 'test';
    }
  }

  const buildEnv = (import.meta as any).env?.VITE_APP_ENV;
  if (buildEnv === 'test') return 'test';

  return 'prod';
}

export function getStorageKeys(env: AppEnvironment) {
  const prefix = env === 'prod' ? 'luz_prod_v2' : 'luz_test_v2';
  return {
    entities: `${prefix}_entities`,
    businesses: `${prefix}_businesses`,
    bookings: `${prefix}_bookings`,
    families: `${prefix}_families`,
    profile: `${prefix}_profile`,
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
