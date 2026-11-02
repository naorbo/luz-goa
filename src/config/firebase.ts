import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  Firestore,
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

export interface LuzFirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

const RUNTIME_FIREBASE_CONFIG_KEY = 'luz_firebase_config_v1';

/**
 * Parses either a raw JSON object or a pasted Firebase Console JS snippet (`const firebaseConfig = { ... };`)
 */
export function parseFirebaseConfigSnippet(input: string): LuzFirebaseWebConfig | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && parsed.apiKey && parsed.projectId) {
      return parsed as LuzFirebaseWebConfig;
    }
  } catch {
    // Fallback regex extraction for JS object literal pasted from Firebase Console
  }

  const extractField = (key: string): string => {
    const match = trimmed.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
    return match ? match[1].trim() : '';
  };

  const apiKey = extractField('apiKey');
  const projectId = extractField('projectId');
  const appId = extractField('appId');
  if (!apiKey || !projectId) return null;

  return {
    apiKey,
    authDomain: extractField('authDomain') || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: extractField('storageBucket') || `${projectId}.firebasestorage.app`,
    messagingSenderId: extractField('messagingSenderId'),
    appId: appId || '1:000000000000:web:000000000000',
    measurementId: extractField('measurementId'),
  };
}

export function loadActiveFirebaseConfig(): LuzFirebaseWebConfig | null {
  try {
    const raw = localStorage.getItem(RUNTIME_FIREBASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LuzFirebaseWebConfig;
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse error
  }

  return null;
}

export function saveRuntimeFirebaseConfig(config: LuzFirebaseWebConfig | null): void {
  if (!config) {
    localStorage.removeItem(RUNTIME_FIREBASE_CONFIG_KEY);
    return;
  }
  localStorage.setItem(RUNTIME_FIREBASE_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Zero-Secret Auto-Discovery when hosted on Firebase Hosting (`/__/firebase/init.json`).
 * Avoids embedding any keys in source code or Git bundles.
 */
export async function autoDiscoverFirebaseHostingConfig(): Promise<LuzFirebaseWebConfig | null> {
  const existing = loadActiveFirebaseConfig();
  if (existing) return existing;

  if (typeof window === 'undefined') return null;

  try {
    const res = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as LuzFirebaseWebConfig;
    if (data && data.apiKey && data.projectId) {
      saveRuntimeFirebaseConfig(data);
      return data;
    }
  } catch {
    // Not running on Firebase Hosting or offline
  }
  return null;
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedProjectId: string | null = null;

export function getLuzFirestore(): { app: FirebaseApp; db: Firestore; config: LuzFirebaseWebConfig } | null {
  const config = loadActiveFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  if (cachedApp && cachedDb && cachedProjectId === config.projectId) {
    return { app: cachedApp, db: cachedDb, config };
  }

  try {
    const existingApps = getApps();
    const appName = `luz-goa-${config.projectId}`;
    const existing = existingApps.find((a) => a.name === appName);

    const app = existing || initializeApp(config, appName);
    let db: Firestore;
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      db = getFirestore(app);
    }

    cachedApp = app;
    cachedDb = db;
    cachedProjectId = config.projectId;
    return { app, db, config };
  } catch (err) {
    console.warn('[LUZ Firestore] Failed to initialize Firebase client:', err);
    return null;
  }
}
