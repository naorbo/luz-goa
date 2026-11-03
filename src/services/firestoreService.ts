import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { getLuzFirestore } from '../config/firebase';
import {
  AppEnvironment,
  LuzEntity,
  CommunityBusiness,
  BookingRecord,
  YouthCenterFamily,
  LeadReferralEvent,
  ScrapedListingDraft,
  MarketplaceListing,
  RideshareOffer,
  CommunityAlert,
  CommunityEndorsement,
  ClickAnalyticsEvent,
} from '../types/luz';

export type FirestoreCollectionName =
  | 'entities'
  | 'businesses'
  | 'bookings'
  | 'families'
  | 'referrals'
  | 'analytics'
  | 'moderation_queue'
  | 'marketplace'
  | 'rideshares'
  | 'urgent_board'
  | 'endorsements';

export const ALL_LUZ_COLLECTIONS: Array<{
  id: FirestoreCollectionName;
  labelHe: string;
  labelEn: string;
  phase: 'active' | 'future_ready';
  descHe: string;
  descEn: string;
}> = [
  {
    id: 'entities',
    labelHe: 'לוח אירועים, חוגים, שירותים ובתים',
    labelEn: 'Events, Workshops, Services & Homes',
    phase: 'active',
    descHe: 'כל האירועים החד-פעמיים, חוגי המתנ"ס, ספקים לפי שעה ובתים להשכרה',
    descEn: 'One-time events, weekly workshops, hourly slots, and long/short term rentals',
  },
  {
    id: 'businesses',
    labelHe: 'אינדקס בעלי עסקים בקהילה',
    labelEn: 'Community Business Directory',
    phase: 'active',
    descHe: 'מטפלים, אוכל ביתי, קוסמטיקה, קעקועים, כושר, הסעות ושירותים מקצועיים',
    descEn: 'Therapists, home food, beauty, tattoos, fitness, transport, and pro services',
  },
  {
    id: 'bookings',
    labelHe: 'הזמנות, שריון תורים ו-RSVP',
    labelEn: 'Bookings, Slots & RSVPs',
    phase: 'active',
    descHe: 'שריון תורים לספקים, הרשמה לאירועים ובקשות תאריכים לבתים',
    descEn: 'Confirmed hourly appointments, event RSVPs, and rental date bookings',
  },
  {
    id: 'families',
    labelHe: 'משפחות וילדי מרכז הנוער',
    labelEn: 'Youth Center Families & Kids',
    phase: 'active',
    descHe: 'רישום משפחות, גילאי ילדים ותחומי עניין לתכנון חוגי המתנ"ס',
    descEn: 'Family signups, children age groups, and activity preferences',
  },
  {
    id: 'referrals',
    labelHe: 'מעקב לידים והפניות (#LUZ-XXXX)',
    labelEn: 'Lead Referral Tracking (#LUZ-XXXX)',
    phase: 'active',
    descHe: 'תיעוד כל הקלקה לוואטסאפ/טלפון/שריון תור של ספק בזמן אמת',
    descEn: 'Every WhatsApp click, call, and booking lead attributed to LUZ',
  },
  {
    id: 'analytics',
    labelHe: 'אנליטיקת קליקים, עניין וחשיפת ספקים',
    labelEn: 'Click Analytics & Provider Exposure',
    phase: 'active',
    descHe: 'מעקב קליקים, פתיחות כרטיסים, פניות וואטסאפ וחיפושים להפקת דוחות חשיפה לספקים',
    descEn: 'Real-time user clicks, card opens, WhatsApp inquiries, and provider exposure metrics',
  },
  {
    id: 'moderation_queue',
    labelHe: 'תור אישור אוטומטי מוואטסאפ (Scraper Queue)',
    labelEn: 'WhatsApp Scraper Moderation Queue',
    phase: 'future_ready',
    descHe: 'הודעות שנקלטו מהקבוצות בגואה ע"י ה-Listener ב-Fly.io וממתינות לאישור בלחיצה',
    descEn: 'Raw WhatsApp group messages parsed by the Fly.io listener awaiting 1-click publish',
  },
  {
    id: 'marketplace',
    labelHe: 'לוח יד-2, קטנועים וציוד (Marketplace)',
    labelEn: 'Scooters & Second-Hand Marketplace',
    phase: 'future_ready',
    descHe: 'השכרת/מכירת קטנועים, גלשנים, ציוד לתינוקות ומכשירי חשמל בין משפחות העונה',
    descEn: 'Scooters, surfboards, baby gear, and seasonal family hand-offs',
  },
  {
    id: 'rideshares',
    labelHe: 'מוניות שדה (MOPA/GOI) ומשלוחים מישראל',
    labelEn: 'Airport Taxi Shares & Israel-Goa Courier',
    phase: 'future_ready',
    descHe: 'שיתוף מוניות משדה התעופה לפאלולם/פטנם והעברת חבילות/תרופות עם טסים מישראל',
    descEn: 'Shared airport taxis to South Goa and luggage space / document mule from Israel',
  },
  {
    id: 'urgent_board',
    labelHe: 'עדכוני חירום ותשתיות (חשמל / סיבים / רפואה)',
    labelEn: 'Urgent Community & Utility Alerts',
    phase: 'future_ready',
    descHe: 'הפסקות חשמל, תקלות אינטרנט, מפגשים עם נחשים/בעלי חיים ועזרה רפואית דחופה',
    descEn: 'Power cuts, fiber outages, wildlife rescues, and medical/community alerts',
  },
  {
    id: 'endorsements',
    labelHe: 'המלצות ואימות קהילתי (Community Vouches)',
    labelEn: 'Community Endorsements & Vouches',
    phase: 'future_ready',
    descHe: 'המלצות מאומתות של חברי קהילה על ספקים, בתים ובעלי מקצוע בגואה',
    descEn: 'Verified community member vouches and ratings for providers and homes',
  },
];

function stripUndefinedDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

export async function saveDocumentToFirestore<T extends { id: string }>(
  env: AppEnvironment,
  collectionName: FirestoreCollectionName,
  item: T
): Promise<boolean> {
  const conn = getLuzFirestore();
  if (!conn) return false;

  try {
    const ref = doc(conn.db, 'envs', env, collectionName, item.id);
    await setDoc(
      ref,
      {
        ...stripUndefinedDeep(item),
        _updatedAt: new Date().toISOString(),
        _env: env,
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn(`[LUZ Firestore] Failed saving to /envs/${env}/${collectionName}/${item.id}:`, err);
    return false;
  }
}

export async function deleteDocumentFromFirestore(
  env: AppEnvironment,
  collectionName: FirestoreCollectionName,
  id: string
): Promise<boolean> {
  const conn = getLuzFirestore();
  if (!conn) return false;

  try {
    const ref = doc(conn.db, 'envs', env, collectionName, id);
    await deleteDoc(ref);
    return true;
  } catch (err) {
    console.warn(`[LUZ Firestore] Failed deleting /envs/${env}/${collectionName}/${id}:`, err);
    return false;
  }
}

export interface SeedSyncReport {
  ok: boolean;
  projectId: string;
  env: AppEnvironment;
  counts: {
    entities: number;
    businesses: number;
    bookings: number;
    families: number;
    referrals: number;
  };
  errorMessage?: string;
}

/**
 * Uploads all active environment records (entities, businesses, bookings, families, referrals)
 * into `/envs/{env}/{collection}/{docId}` using atomic Firestore batches.
 */
export async function seedEnvironmentToFirestore(
  env: AppEnvironment,
  payload: {
    entities: LuzEntity[];
    businesses: CommunityBusiness[];
    bookings: BookingRecord[];
    families: YouthCenterFamily[];
    referrals: LeadReferralEvent[];
  }
): Promise<SeedSyncReport> {
  const conn = getLuzFirestore();
  if (!conn) {
    return {
      ok: false,
      projectId: 'not-configured',
      env,
      counts: { entities: 0, businesses: 0, bookings: 0, families: 0, referrals: 0 },
      errorMessage: 'Firebase Web Config is not configured yet.',
    };
  }

  try {
    const batch = writeBatch(conn.db);
    const nowIso = new Date().toISOString();

    for (const item of payload.entities) {
      const ref = doc(conn.db, 'envs', env, 'entities', item.id);
      batch.set(ref, { ...stripUndefinedDeep(item), _updatedAt: nowIso, _env: env }, { merge: true });
    }

    for (const biz of payload.businesses) {
      const ref = doc(conn.db, 'envs', env, 'businesses', biz.id);
      batch.set(ref, { ...stripUndefinedDeep(biz), _updatedAt: nowIso, _env: env }, { merge: true });
    }

    for (const bk of payload.bookings) {
      const ref = doc(conn.db, 'envs', env, 'bookings', bk.id);
      batch.set(ref, { ...stripUndefinedDeep(bk), _updatedAt: nowIso, _env: env }, { merge: true });
    }

    for (const fam of payload.families) {
      const ref = doc(conn.db, 'envs', env, 'families', fam.id);
      batch.set(ref, { ...stripUndefinedDeep(fam), _updatedAt: nowIso, _env: env }, { merge: true });
    }

    for (const refEvent of payload.referrals) {
      const ref = doc(conn.db, 'envs', env, 'referrals', refEvent.id);
      batch.set(ref, { ...stripUndefinedDeep(refEvent), _updatedAt: nowIso, _env: env }, { merge: true });
    }

    // Also write an environment metadata heartbeat document
    const metaRef = doc(conn.db, 'envs', env);
    batch.set(
      metaRef,
      {
        environment: env,
        lastSeededAt: nowIso,
        collectionsReady: ALL_LUZ_COLLECTIONS.map((c) => c.id),
      },
      { merge: true }
    );

    await batch.commit();

    return {
      ok: true,
      projectId: conn.config.projectId,
      env,
      counts: {
        entities: payload.entities.length,
        businesses: payload.businesses.length,
        bookings: payload.bookings.length,
        families: payload.families.length,
        referrals: payload.referrals.length,
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      projectId: conn.config.projectId,
      env,
      counts: { entities: 0, businesses: 0, bookings: 0, families: 0, referrals: 0 },
      errorMessage: err?.message || String(err),
    };
  }
}

export interface EnvRealtimeCallbacks {
  onEntities?: (items: LuzEntity[]) => void;
  onBusinesses?: (items: CommunityBusiness[]) => void;
  onBookings?: (items: BookingRecord[]) => void;
  onFamilies?: (items: YouthCenterFamily[]) => void;
  onReferrals?: (items: LeadReferralEvent[]) => void;
  onModerationQueue?: (items: ScrapedListingDraft[]) => void;
  onMarketplace?: (items: MarketplaceListing[]) => void;
  onRideshares?: (items: RideshareOffer[]) => void;
  onUrgentBoard?: (items: CommunityAlert[]) => void;
  onEndorsements?: (items: CommunityEndorsement[]) => void;
  onAnalytics?: (items: ClickAnalyticsEvent[]) => void;
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'live' | 'error', detail?: string) => void;
}

/**
 * Subscribes in real-time (`onSnapshot`) to `/envs/{env}/*` collections in Cloud Firestore.
 * Only replaces local state when the cloud collection is non-empty, preventing accidental wipe before initial seed.
 */
export function subscribeToEnvironmentFirestore(
  env: AppEnvironment,
  callbacks: EnvRealtimeCallbacks
): () => void {
  const conn = getLuzFirestore();
  if (!conn) {
    callbacks.onStatusChange?.('disconnected');
    return () => {};
  }

  callbacks.onStatusChange?.('connecting', conn.config.projectId);
  const unsubs: Unsubscribe[] = [];

  const watchCol = <T>(
    colName: FirestoreCollectionName,
    handler?: (items: T[]) => void,
    triggerLiveStatus = false
  ) => {
    if (!handler) return;
    const colRef = collection(conn.db, 'envs', env, colName);
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        if (triggerLiveStatus) {
          callbacks.onStatusChange?.('live', conn.config.projectId);
        }
        if (!snap.empty) {
          const docs = snap.docs.map((d) => d.data() as T);
          handler(docs);
        }
      },
      (err) => {
        console.warn(`[LUZ Firestore] Snapshot error on /envs/${env}/${colName}:`, err);
        callbacks.onStatusChange?.('error', err.message);
      }
    );
    unsubs.push(unsub);
  };

  watchCol('entities', callbacks.onEntities, true);
  watchCol('businesses', callbacks.onBusinesses);
  watchCol('bookings', callbacks.onBookings);
  watchCol('families', callbacks.onFamilies);
  watchCol('referrals', callbacks.onReferrals);
  watchCol('analytics', callbacks.onAnalytics);
  watchCol('moderation_queue', callbacks.onModerationQueue);
  watchCol('marketplace', callbacks.onMarketplace);
  watchCol('rideshares', callbacks.onRideshares);
  watchCol('urgent_board', callbacks.onUrgentBoard);
  watchCol('endorsements', callbacks.onEndorsements);

  return () => {
    unsubs.forEach((u) => u());
  };
}
