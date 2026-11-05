import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  Firestore,
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';

export const AUTHORIZED_ADMIN_EMAIL = 'luzschedu@gmail.com';

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
let cachedAuth: Auth | null = null;
let cachedProjectId: string | null = null;

export function getLuzFirestore(): { app: FirebaseApp; db: Firestore; auth: Auth; config: LuzFirebaseWebConfig } | null {
  const config = loadActiveFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  if (cachedApp && cachedDb && cachedAuth && cachedProjectId === config.projectId) {
    return { app: cachedApp, db: cachedDb, auth: cachedAuth, config };
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

    const auth = getAuth(app);

    cachedApp = app;
    cachedDb = db;
    cachedAuth = auth;
    cachedProjectId = config.projectId;
    return { app, db, auth, config };
  } catch (err) {
    console.warn('[LUZ Firestore] Failed to initialize Firebase client:', err);
    return null;
  }
}

export function isAuthorizedAdminUser(user: User | null): boolean {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL && user.emailVerified !== false;
}

export function subscribeToAdminAuth(
  onChange: (state: { isAdmin: boolean; email: string | null; loading: boolean }) => void
): () => void {
  const ctx = getLuzFirestore();
  if (!ctx) {
    onChange({ isAdmin: false, email: null, loading: false });
    return () => {};
  }

  return onAuthStateChanged(ctx.auth, (user) => {
    const isAdmin = isAuthorizedAdminUser(user);
    onChange({
      isAdmin,
      email: user?.email || null,
      loading: false,
    });
  });
}

export async function signInAsLuzAdmin(): Promise<{
  ok: boolean;
  email?: string;
  errorHe?: string;
  errorEn?: string;
}> {
  let ctx = getLuzFirestore();
  if (!ctx) {
    await autoDiscoverFirebaseHostingConfig();
    ctx = getLuzFirestore();
  }
  if (!ctx) {
    return {
      ok: false,
      errorHe: 'תצורת Firebase טרם נטענה בדפדפן זה.',
      errorEn: 'Firebase configuration is not loaded in this browser.',
    };
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(ctx.auth, provider);
    const email = result.user?.email?.trim().toLowerCase() || '';

    if (!isAuthorizedAdminUser(result.user)) {
      await signOut(ctx.auth);
      return {
        ok: false,
        email,
        errorHe: `גישה נדחתה (${email}). רק החשבון המורשה (${AUTHORIZED_ADMIN_EMAIL}) רשאי להיכנס לממשק הניהול ולסביבת הטסט.`,
        errorEn: `Access denied (${email}). Only ${AUTHORIZED_ADMIN_EMAIL} is authorized to access Admin & TEST.`,
      };
    }

    return { ok: true, email };
  } catch (err: any) {
    const code = err?.code || '';
    const rawMsg = err?.message || '';
    let errorHe = 'ההתחברות לחשבון האדמין בוטלה או נכשלה.';
    let errorEn = 'Admin sign-in was cancelled or failed.';

    if (code === 'auth/configuration-not-found' || rawMsg.includes('configuration-not-found')) {
      errorHe = `ספק ההתחברות של Google אינו מופעל בפרויקט Firebase שלך (${ctx.config.projectId}). יש להיכנס ל-Firebase Console -> Authentication -> Sign-in method, ללחוץ על Google ולהפעיל אותו (Enable).`;
      errorEn = `Google Sign-in provider is not enabled in Firebase project (${ctx.config.projectId}). In Firebase Console, go to Authentication -> Sign-in method -> Google and toggle Enable to ON.`;
    } else if (code === 'auth/unauthorized-domain' || rawMsg.includes('unauthorized-domain')) {
      errorHe = `הדומיין הנוכחי אינו מורשה ב-Firebase. יש להוסיף אותו ב-Firebase Console -> Authentication -> Settings -> Authorized domains.`;
      errorEn = `Current domain is not authorized. Add it in Firebase Console -> Authentication -> Settings -> Authorized domains.`;
    } else if (code === 'auth/popup-closed-by-user') {
      errorHe = 'חלון ההתחברות נסגר ע״י המשתמש.';
      errorEn = 'Sign-in popup was closed by user.';
    } else if (code === 'auth/popup-blocked') {
      errorHe = 'החלון הקופץ נחסם ע״י הדפדפן. יש לאשר חלונות קופצים (Popups) בדפדפן ולנסות שוב.';
      errorEn = 'Popup was blocked by the browser. Please allow popups and try again.';
    } else if (rawMsg) {
      errorHe = rawMsg;
      errorEn = rawMsg;
    }

    return {
      ok: false,
      errorHe,
      errorEn,
    };
  }
}

export async function signOutLuzAdmin(): Promise<void> {
  const ctx = getLuzFirestore();
  if (!ctx) return;
  try {
    await signOut(ctx.auth);
  } catch {
    // Ignore sign-out error
  }
}
