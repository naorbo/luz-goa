import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Briefcase,
  Bot,
  Users,
  PlusCircle,
  ShieldCheck,
  FlaskConical,
  Globe,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import {
  LuzEntity,
  CommunityBusiness,
  BookingRecord,
  YouthCenterFamily,
  UserProfile,
  Language,
  AppEnvironment,
  LeadReferralEvent,
  NotificationChannelsConfig,
} from './types/luz';
import {
  detectInitialEnvironment,
  getStorageKeys,
  updateUrlForEnvironment,
} from './config/environment';
import {
  loadNotificationConfig,
  saveNotificationConfig,
} from './config/notifications';
import {
  createBookingReferralCode,
  dispatchLeadReferralAlerts,
} from './utils/referralAndAlerts';
import { syncSeoAndStructuredData } from './utils/seoAndSchema';
import { autoDiscoverFirebaseHostingConfig } from './config/firebase';
import {
  enforceRateLimit,
  sanitizeInputText,
  sanitizeAndValidatePhone,
} from './utils/securityGuard';
import {
  subscribeToEnvironmentFirestore,
  saveDocumentToFirestore,
} from './services/firestoreService';
import {
  PROD_ENTITIES,
  PROD_BUSINESSES,
  PROD_BOOKINGS,
  PROD_FAMILIES,
  PROD_USER_PROFILE,
} from './data/prodData';
import {
  TEST_ENTITIES,
  TEST_BUSINESSES,
  TEST_BOOKINGS,
  TEST_FAMILIES,
  TEST_USER_PROFILE,
} from './data/testData';
import { ExploreView } from './components/ExploreView';
import { BusinessesView } from './components/BusinessesView';
import { ProviderView } from './components/ProviderView';
import { BenBotView } from './components/BenBotView';
import { YouthCenterView } from './components/YouthCenterView';
import { AdminView } from './components/AdminView';
import { BookingModal } from './components/BookingModal';

type ActiveTab =
  | 'explore'
  | 'businesses'
  | 'ben'
  | 'youth_center'
  | 'provider'
  | 'admin';

interface EnvStore {
  env: AppEnvironment;
  entities: LuzEntity[];
  businesses: CommunityBusiness[];
  bookings: BookingRecord[];
  families: YouthCenterFamily[];
  referrals: LeadReferralEvent[];
  userProfile: UserProfile;
}

function readJsonOrFallback<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mergeWithSeedById<T extends { id: string }>(saved: T[], seed: T[]): T[] {
  const seedMap = new Map(seed.map((s) => [s.id, s]));
  const updatedSaved = saved.map((item) => {
    const seedItem = seedMap.get(item.id);
    if (!seedItem) return item;
    return {
      ...seedItem,
      ...item,
      hostNameEn: (seedItem as any).hostNameEn ?? (item as any).hostNameEn,
      preferredContactLang:
        (seedItem as any).preferredContactLang ?? (item as any).preferredContactLang,
      websiteUrl: (item as any).websiteUrl ?? (seedItem as any).websiteUrl,
      whatsappGroupUrl: (item as any).whatsappGroupUrl ?? (seedItem as any).whatsappGroupUrl,
      mapUrl: (item as any).mapUrl ?? (seedItem as any).mapUrl,
    };
  });
  const savedIds = new Set(saved.map((item) => item.id));
  const missingSeeds = seed.filter((item) => !savedIds.has(item.id));
  return [...updatedSaved, ...missingSeeds];
}

function loadStoreForEnvironment(env: AppEnvironment): EnvStore {
  const keys = getStorageKeys(env);
  if (env === 'prod') {
    const savedEntities = readJsonOrFallback(keys.entities, PROD_ENTITIES);
    const savedBusinesses = readJsonOrFallback(keys.businesses, PROD_BUSINESSES);
    return {
      env: 'prod',
      entities: mergeWithSeedById(savedEntities, PROD_ENTITIES),
      businesses: mergeWithSeedById(savedBusinesses, PROD_BUSINESSES),
      bookings: readJsonOrFallback(keys.bookings, PROD_BOOKINGS),
      families: readJsonOrFallback(keys.families, PROD_FAMILIES),
      referrals: readJsonOrFallback(keys.referrals, []),
      userProfile: readJsonOrFallback(keys.profile, PROD_USER_PROFILE),
    };
  }
  const savedEntities = readJsonOrFallback(keys.entities, TEST_ENTITIES);
  const savedBusinesses = readJsonOrFallback(keys.businesses, TEST_BUSINESSES);
  const savedTestProfile = readJsonOrFallback(keys.profile, TEST_USER_PROFILE);
  const normalizedTestProfile =
    savedTestProfile.name === 'נאור (חבר קהילה)' ? TEST_USER_PROFILE : savedTestProfile;

  return {
    env: 'test',
    entities: mergeWithSeedById(savedEntities, TEST_ENTITIES),
    businesses: mergeWithSeedById(savedBusinesses, TEST_BUSINESSES),
    bookings: readJsonOrFallback(keys.bookings, TEST_BOOKINGS),
    families: readJsonOrFallback(keys.families, TEST_FAMILIES),
    referrals: readJsonOrFallback(keys.referrals, []),
    userProfile: normalizedTestProfile,
  };
}

export function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('luz_lang_v2');
    return saved === 'en' || saved === 'he' ? saved : 'en';
  });

  const [store, setStore] = useState<EnvStore>(() =>
    loadStoreForEnvironment(detectInitialEnvironment())
  );

  const [notificationConfig, setNotificationConfig] = useState<NotificationChannelsConfig>(() =>
    loadNotificationConfig()
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [selectedEntity, setSelectedEntity] = useState<LuzEntity | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<
    'disconnected' | 'connecting' | 'live' | 'error'
  >('disconnected');
  const [firestoreProjectId, setFirestoreProjectId] = useState<string>('');
  const [firebaseEpoch, setFirebaseEpoch] = useState<number>(0);

  const { env: appEnv, entities, businesses, bookings, families, referrals, userProfile } = store;

  // Sync RTL/LTR direction & language preference (English LTR is default across PROD, TEST & Dev)
  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('luz_lang_v2', lang);
  }, [lang]);

  // Dynamic SEO Meta Tags & Schema.org JSON-LD Structured Data
  useEffect(() => {
    syncSeoAndStructuredData({
      activeTab,
      lang,
      entities,
      businesses,
      selectedEntity,
    });
  }, [activeTab, lang, entities, businesses, selectedEntity]);

  // Zero-Secret Auto-Discovery when hosted on Firebase Hosting (/__/firebase/init.json)
  useEffect(() => {
    void autoDiscoverFirebaseHostingConfig().then((discovered) => {
      if (discovered) {
        setFirebaseEpoch((n) => n + 1);
      }
    });
  }, []);

  // Real-time Cloud Firestore Subscription for active environment (/envs/{prod|test}/*)
  useEffect(() => {
    const unsubscribe = subscribeToEnvironmentFirestore(appEnv, {
      onEntities: (cloudEntities) => {
        setStore((prev) =>
          prev.env === appEnv
            ? { ...prev, entities: mergeWithSeedById(cloudEntities, prev.entities) }
            : prev
        );
      },
      onBusinesses: (cloudBusinesses) => {
        setStore((prev) =>
          prev.env === appEnv
            ? { ...prev, businesses: mergeWithSeedById(cloudBusinesses, prev.businesses) }
            : prev
        );
      },
      onBookings: (cloudBookings) => {
        setStore((prev) =>
          prev.env === appEnv ? { ...prev, bookings: cloudBookings } : prev
        );
      },
      onFamilies: (cloudFamilies) => {
        setStore((prev) =>
          prev.env === appEnv ? { ...prev, families: cloudFamilies } : prev
        );
      },
      onReferrals: (cloudReferrals) => {
        setStore((prev) =>
          prev.env === appEnv ? { ...prev, referrals: cloudReferrals } : prev
        );
      },
      onStatusChange: (status, detail) => {
        setFirestoreStatus(status);
        if (detail) setFirestoreProjectId(detail);
      },
    });
    return () => unsubscribe();
  }, [appEnv, firebaseEpoch]);

  // Persist strictly to the active environment's isolated storage namespace
  useEffect(() => {
    const keys = getStorageKeys(store.env);
    localStorage.setItem(keys.entities, JSON.stringify(store.entities));
    localStorage.setItem(keys.businesses, JSON.stringify(store.businesses));
    localStorage.setItem(keys.bookings, JSON.stringify(store.bookings));
    localStorage.setItem(keys.families, JSON.stringify(store.families));
    localStorage.setItem(keys.referrals, JSON.stringify(store.referrals));
    localStorage.setItem(keys.profile, JSON.stringify(store.userProfile));
  }, [store]);

  const isHe = lang === 'he';

  const handleSwitchEnvironment = (nextEnv: AppEnvironment) => {
    if (nextEnv === appEnv) return;
    setSelectedEntity(null);
    updateUrlForEnvironment(nextEnv);
    setStore(loadStoreForEnvironment(nextEnv));
  };

  const handleConfirmBooking = (
    newBk: Omit<BookingRecord, 'id' | 'createdAt' | 'status'>
  ) => {
    const rl = enforceRateLimit('booking_submit');
    if (!rl.allowed) {
      alert(isHe ? rl.errorHe : rl.errorEn);
      return;
    }

    const phoneCheck = sanitizeAndValidatePhone(newBk.customerPhone);
    if (!phoneCheck.valid) {
      alert(isHe ? 'מספר טלפון לא תקין.' : 'Invalid phone number.');
      return;
    }

    const record: BookingRecord = {
      ...newBk,
      customerName: sanitizeInputText(newBk.customerName, 100),
      customerPhone: phoneCheck.cleaned,
      participantsCount: Math.max(1, Math.min(20, Number(newBk.participantsCount) || 1)),
      id: `bk-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };

    let updatedEntityToSync: LuzEntity | null = null;

    setStore((prev) => ({
      ...prev,
      bookings: [record, ...prev.bookings],
      entities: prev.entities.map((ent) => {
        if (ent.id !== newBk.entityId) return ent;
        const updated = { ...ent, rsvpCount: ent.rsvpCount + record.participantsCount };

        if (ent.type === 'service' && newBk.selectedDate && newBk.selectedSlot) {
          const prevSlots = ent.bookedSlots?.[newBk.selectedDate] || [];
          updated.bookedSlots = {
            ...(ent.bookedSlots || {}),
            [newBk.selectedDate]: [...prevSlots, newBk.selectedSlot],
          };
        }

        if (ent.type === 'rental' && newBk.rentalFrom && newBk.rentalTo) {
          updated.bookedRanges = [
            ...(ent.bookedRanges || []),
            {
              from: newBk.rentalFrom,
              to: newBk.rentalTo,
              guestName: record.customerName,
            },
          ];
        }

        updatedEntityToSync = updated;
        return updated;
      }),
    }));

    void saveDocumentToFirestore(appEnv, 'bookings', record);
    if (updatedEntityToSync) {
      void saveDocumentToFirestore(appEnv, 'entities', updatedEntityToSync);
    }
  };

  const handleAddEntity = (newEntity: LuzEntity) => {
    const rl = enforceRateLimit('entity_create');
    if (!rl.allowed) {
      alert(isHe ? rl.errorHe : rl.errorEn);
      return;
    }

    const phoneCheck = sanitizeAndValidatePhone(newEntity.hostPhone);
    const sanitizedEntity: LuzEntity = {
      ...newEntity,
      titleHe: sanitizeInputText(newEntity.titleHe, 180),
      titleEn: sanitizeInputText(newEntity.titleEn || newEntity.titleHe, 180),
      descriptionHe: sanitizeInputText(newEntity.descriptionHe, 1500),
      descriptionEn: sanitizeInputText(newEntity.descriptionEn || newEntity.descriptionHe, 1500),
      hostName: sanitizeInputText(newEntity.hostName, 100),
      hostPhone: phoneCheck.valid ? phoneCheck.cleaned : '+972-50-000-0000',
      priceAmount: Math.max(0, Math.min(500000, Number(newEntity.priceAmount) || 0)),
    };

    setStore((prev) => ({
      ...prev,
      entities: [sanitizedEntity, ...prev.entities],
    }));
    void saveDocumentToFirestore(appEnv, 'entities', sanitizedEntity);
  };

  const handleAddBusiness = (newBiz: CommunityBusiness) => {
    const rl = enforceRateLimit('business_create');
    if (!rl.allowed) {
      alert(isHe ? rl.errorHe : rl.errorEn);
      return;
    }

    const phoneCheck = sanitizeAndValidatePhone(newBiz.phone);
    const sanitizedBiz: CommunityBusiness = {
      ...newBiz,
      businessNameHe: sanitizeInputText(newBiz.businessNameHe, 160),
      businessNameEn: sanitizeInputText(newBiz.businessNameEn || newBiz.businessNameHe, 160),
      ownerNameHe: sanitizeInputText(newBiz.ownerNameHe, 100),
      ownerNameEn: sanitizeInputText(newBiz.ownerNameEn || newBiz.ownerNameHe, 100),
      bioHe: sanitizeInputText(newBiz.bioHe, 1500),
      bioEn: sanitizeInputText(newBiz.bioEn || newBiz.bioHe, 1500),
      phone: phoneCheck.valid ? phoneCheck.cleaned : newBiz.phone,
    };

    setStore((prev) => ({
      ...prev,
      businesses: [sanitizedBiz, ...prev.businesses],
    }));
    void saveDocumentToFirestore(appEnv, 'businesses', sanitizedBiz);
  };

  const handleBookBusinessSlot = (
    businessId: string,
    newBk: Omit<BookingRecord, 'id' | 'createdAt' | 'status'>
  ) => {
    const rl = enforceRateLimit('booking_submit');
    if (!rl.allowed) {
      alert(isHe ? rl.errorHe : rl.errorEn);
      return;
    }

    const phoneCheck = sanitizeAndValidatePhone(newBk.customerPhone);
    const record: BookingRecord = {
      ...newBk,
      customerName: sanitizeInputText(newBk.customerName, 100),
      customerPhone: phoneCheck.valid ? phoneCheck.cleaned : newBk.customerPhone,
      id: `bk-biz-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };

    let updatedBizToSync: CommunityBusiness | null = null;

    setStore((prev) => ({
      ...prev,
      bookings: [record, ...prev.bookings],
      businesses: prev.businesses.map((biz) => {
        if (biz.id !== businessId) return biz;
        if (!newBk.selectedDate || !newBk.selectedSlot) return biz;
        const existing = biz.bookedSlots[newBk.selectedDate] || [];
        const updatedBiz = {
          ...biz,
          bookedSlots: {
            ...biz.bookedSlots,
            [newBk.selectedDate]: [...existing, newBk.selectedSlot],
          },
        };
        updatedBizToSync = updatedBiz;
        return updatedBiz;
      }),
    }));

    void saveDocumentToFirestore(appEnv, 'bookings', record);
    if (updatedBizToSync) {
      void saveDocumentToFirestore(appEnv, 'businesses', updatedBizToSync);
    }
  };

  const handleUpdateNotificationConfig = (next: NotificationChannelsConfig) => {
    setNotificationConfig(next);
    saveNotificationConfig(next);
  };

  const handleTrackReferral = (
    partial: Omit<LeadReferralEvent, 'id' | 'createdAt' | 'channelsDispatched' | 'environment'>
  ) => {
    const rl = enforceRateLimit('referral_dispatch');
    if (!rl.allowed) return;

    const shouldSendReal =
      appEnv === 'prod' || notificationConfig.sendRealAlertsInTestEnv;

    const activeChannels: Array<'webhook' | 'telegram' | 'email'> = [];
    if (shouldSendReal) {
      if (notificationConfig.enableEmail && notificationConfig.adminEmail.trim()) {
        activeChannels.push('email');
      }
      if (notificationConfig.enableWebhook && notificationConfig.webhookUrl.trim()) {
        activeChannels.push('webhook');
      }
      if (
        notificationConfig.enableTelegram &&
        notificationConfig.telegramBotToken.trim() &&
        notificationConfig.telegramChatId.trim()
      ) {
        activeChannels.push('telegram');
      }
    }

    const fullEvent: LeadReferralEvent = {
      ...partial,
      providerNameHe: sanitizeInputText(partial.providerNameHe, 160),
      providerNameEn: sanitizeInputText(partial.providerNameEn, 160),
      ownerOrHostName: sanitizeInputText(partial.ownerOrHostName, 100),
      customerName: partial.customerName ? sanitizeInputText(partial.customerName, 100) : undefined,
      id: `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      environment: appEnv,
      channelsDispatched: activeChannels,
      createdAt: new Date().toISOString(),
    };

    setStore((prev) => ({
      ...prev,
      referrals: [fullEvent, ...prev.referrals],
    }));

    void saveDocumentToFirestore(appEnv, 'referrals', fullEvent);
    void dispatchLeadReferralAlerts(fullEvent, notificationConfig);
  };

  const handleRegisterFamily = (fam: Omit<YouthCenterFamily, 'id' | 'createdAt'>) => {
    const rl = enforceRateLimit('signup_registration');
    if (!rl.allowed) {
      alert(isHe ? rl.errorHe : rl.errorEn);
      return;
    }

    const phoneCheck = sanitizeAndValidatePhone(fam.parentPhone);
    if (!phoneCheck.valid) {
      alert(isHe ? 'מספר טלפון הורה לא תקין.' : 'Invalid parent phone number.');
      return;
    }

    const newFam: YouthCenterFamily = {
      ...fam,
      parentName: sanitizeInputText(fam.parentName, 100),
      parentPhone: phoneCheck.cleaned,
      children: fam.children.slice(0, 10).map((c) => ({
        ...c,
        name: sanitizeInputText(c.name, 60),
        age: Math.max(0, Math.min(18, Number(c.age) || 5)),
        grade: sanitizeInputText(c.grade, 40),
        interests: sanitizeInputText(c.interests, 200),
      })),
      id: `fam-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setStore((prev) => ({
      ...prev,
      families: [newFam, ...prev.families],
    }));

    void saveDocumentToFirestore(appEnv, 'families', newFam);

    const refCode = createBookingReferralCode();
    handleTrackReferral({
      referralCode: refCode,
      actionType: 'youth_center_signup',
      providerId: 'youth-center-goa',
      providerNameHe: 'מרכז הנוער והילדים — קהילת גואה',
      providerNameEn: 'Goa Community Youth Center',
      ownerOrHostName: 'צוות המתנ"ס',
      providerPhone: fam.parentPhone,
      providerCategoryOrType: 'מרכז הנוער (רישום משפחה)',
      area: fam.area,
      providerContactLang: 'he',
      customerName: fam.parentName,
      customerPhone: fam.parentPhone,
      serviceOrDateSummary: `${fam.children.length} ילדים (${fam.children
        .map((c) => `${c.name} גיל ${c.age}`)
        .join(', ')})`,
    });
  };

  const handleUpdateProfile = (profile: UserProfile) => {
    setStore((prev) => ({
      ...prev,
      userProfile: profile,
    }));
  };

  const handleToggleProviderSync = (entityId: string) => {
    let toggledEntity: LuzEntity | null = null;
    setStore((prev) => ({
      ...prev,
      entities: prev.entities.map((ent) => {
        if (ent.id !== entityId) return ent;
        const next: LuzEntity = {
          ...ent,
          calendarSyncStatus:
            ent.calendarSyncStatus === 'connected' ? 'manual' : 'connected',
        };
        toggledEntity = next;
        return next;
      }),
    }));
    if (toggledEntity) {
      void saveDocumentToFirestore(appEnv, 'entities', toggledEntity);
    }
  };

  const handleResetEnvironment = () => {
    const keys = getStorageKeys(appEnv);
    Object.values(keys).forEach((k) => localStorage.removeItem(k));
    if (appEnv === 'prod') {
      setStore({
        env: 'prod',
        entities: PROD_ENTITIES,
        businesses: PROD_BUSINESSES,
        bookings: PROD_BOOKINGS,
        families: PROD_FAMILIES,
        referrals: [],
        userProfile: PROD_USER_PROFILE,
      });
    } else {
      setStore({
        env: 'test',
        entities: TEST_ENTITIES,
        businesses: TEST_BUSINESSES,
        bookings: TEST_BOOKINGS,
        families: TEST_FAMILIES,
        referrals: [],
        userProfile: TEST_USER_PROFILE,
      });
    }
  };

  const navTabs: Array<{
    id: ActiveTab;
    labelHe: string;
    labelEn: string;
    icon: React.ElementType;
    badge?: string | number;
  }> = [
    {
      id: 'explore',
      labelHe: 'לוח אירועים ובתים',
      labelEn: 'Schedule & Homes',
      icon: Calendar,
      badge: entities.length,
    },
    {
      id: 'businesses',
      labelHe: 'בעלי עסקים בקהילה',
      labelEn: 'Community Businesses',
      icon: Briefcase,
      badge: businesses.length,
    },
    {
      id: 'ben',
      labelHe: 'הבוט "בן" (WhatsApp)',
      labelEn: '"Ben" WhatsApp Bot',
      icon: Bot,
    },
    {
      id: 'youth_center',
      labelHe: 'מרכז הנוער',
      labelEn: 'Youth Center Goa',
      icon: Users,
      badge: families.reduce((s, f) => s + f.children.length, 0),
    },
    {
      id: 'provider',
      labelHe: 'העלאת אירוע / בית',
      labelEn: 'Provider Studio',
      icon: PlusCircle,
    },
    {
      id: 'admin',
      labelHe: 'אדמין ולידים',
      labelEn: 'Admin & Leads',
      icon: ShieldCheck,
      badge: Math.max(referrals.length, bookings.length),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-sand-100 text-canopy-800">
      {/* Committed Deep Tropical Canopy Header Shell */}
      <header className="bg-canopy-900 text-sand-50 border-b border-canopy-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Brand Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                onClick={() => setActiveTab('explore')}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-terracotta-500 text-white font-display font-bold text-xl flex items-center justify-center shrink-0">
                  L
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-xl font-bold tracking-tight text-sand-50 truncate">
                      LUZ GOA
                    </h1>
                    <span className="hidden sm:inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-canopy-800 text-ochre-400 border border-canopy-700">
                      Community OS
                    </span>
                  </div>
                  <p className="text-xs text-sand-300 hidden lg:block truncate">
                    {isHe
                      ? 'קולום • פטנם • פאלולם — אירועים, בעלי עסקים בקהילה, מתנ"ס והשכרת בתים'
                      : 'Colomb • Patnem • Palolem — Events, Community Businesses, Youth Center & Homes'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Controls: Environment Switcher (PROD / TEST), Reset, Language */}
            <div className="flex items-center gap-2">
              <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canopy-800 text-xs text-sand-200 border border-canopy-700">
                <MapPin className="w-3.5 h-3.5 text-terracotta-400" />
                <span>South Goa</span>
              </div>

              {/* Dual Environment Switcher: PROD vs TEST */}
              <div
                className="inline-flex items-center rounded-xl bg-canopy-950 p-1 border border-canopy-700"
                role="group"
                aria-label="Environment Switcher"
              >
                <button
                  type="button"
                  onClick={() => handleSwitchEnvironment('prod')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    appEnv === 'prod'
                      ? 'bg-canopy-700 text-green-300'
                      : 'text-sand-300 hover:text-white'
                  }`}
                  title={isHe ? 'סביבת פרודקשן — מידע אמיתי בלבד' : 'PROD — Verified Real Data Only'}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>PROD</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchEnvironment('test')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    appEnv === 'test'
                      ? 'bg-ochre-500 text-canopy-950'
                      : 'text-sand-300 hover:text-white'
                  }`}
                  title={isHe ? 'סביבת טסט — נתוני דמו להדגמות ובדיקות' : 'TEST — Demo & Sandbox Data'}
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>TEST</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetEnvironment}
                title={
                  appEnv === 'test'
                    ? isHe
                      ? 'איפוס נתוני ההדגמה ב-TEST'
                      : 'Reset TEST Demo Data'
                    : isHe
                    ? 'איפוס אחסון מקומי לנתוני PROD המאומתים'
                    : 'Reset local storage to verified PROD data'
                }
                className="p-2 rounded-xl bg-canopy-800 hover:bg-canopy-700 text-sand-200 border border-canopy-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-ochre-500 text-canopy-950 font-bold text-xs hover:bg-ochre-400 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === 'he' ? 'EN' : 'עב'}</span>
              </button>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-2.5 pt-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    active
                      ? 'bg-terracotta-500 text-white'
                      : 'text-sand-200 hover:bg-canopy-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{isHe ? tab.labelHe : tab.labelEn}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-canopy-800 text-ochre-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Unmistakable Sandbox Banner when viewing TEST environment */}
      {appEnv === 'test' && (
        <div className="bg-ochre-100 border-b border-ochre-500/40 text-canopy-950">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <FlaskConical className="w-4 h-4 text-ochre-600 shrink-0" />
              <span>
                {isHe
                  ? 'סביבת TEST (הדגמה ובדיקות): הנתונים המוצגים כאן הם דוגמאות להמחשה בלבד. סביבת PROD מופרדת לחלוטין ומכילה רק מידע אמיתי.'
                  : 'TEST Environment (Sandbox): Displaying illustrative demo data only. PROD is strictly isolated for verified real data.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSwitchEnvironment('prod')}
              className="font-bold underline hover:text-terracotta-600 shrink-0"
            >
              {isHe ? 'מעבר לסביבת PROD (אמת) ←' : 'Switch to PROD (Live) →'}
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:py-8">
        {activeTab === 'explore' && (
          <ExploreView
            entities={entities}
            lang={lang}
            appEnv={appEnv}
            userProfile={userProfile}
            onSelectEntity={(ent) => setSelectedEntity(ent)}
            onOpenBenBot={() => setActiveTab('ben')}
            onSwitchToTest={() => handleSwitchEnvironment('test')}
            onGoToProvider={() => setActiveTab('provider')}
            onGoToBusinesses={() => setActiveTab('businesses')}
          />
        )}

        {activeTab === 'businesses' && (
          <BusinessesView
            businesses={businesses}
            lang={lang}
            appEnv={appEnv}
            defaultUserName={userProfile.name}
            defaultUserPhone={userProfile.phone}
            onAddBusiness={handleAddBusiness}
            onBookBusinessSlot={handleBookBusinessSlot}
            onTrackReferral={handleTrackReferral}
            onSwitchToTest={() => handleSwitchEnvironment('test')}
          />
        )}

        {activeTab === 'ben' && (
          <BenBotView
            entities={entities}
            businesses={businesses}
            userProfile={userProfile}
            lang={lang}
            appEnv={appEnv}
            onUpdateProfile={handleUpdateProfile}
            onSelectEntity={(ent) => setSelectedEntity(ent)}
            onNavigateToBusinesses={() => setActiveTab('businesses')}
            onAddEntityFromDM={(newEnt) => {
              handleAddEntity(newEnt);
            }}
          />
        )}

        {activeTab === 'youth_center' && (
          <YouthCenterView
            families={families}
            lang={lang}
            onRegisterFamily={handleRegisterFamily}
          />
        )}

        {activeTab === 'provider' && (
          <ProviderView
            lang={lang}
            onAddEntity={(newEnt) => {
              handleAddEntity(newEnt);
            }}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView
            entities={entities}
            businesses={businesses}
            bookings={bookings}
            families={families}
            referrals={referrals}
            notificationConfig={notificationConfig}
            lang={lang}
            appEnv={appEnv}
            firestoreStatus={firestoreStatus}
            firestoreProjectId={firestoreProjectId}
            onFirebaseConfigChanged={() => setFirebaseEpoch((n) => n + 1)}
            onToggleProviderSync={handleToggleProviderSync}
            onUpdateNotificationConfig={handleUpdateNotificationConfig}
          />
        )}
      </main>

      {/* Booking & Smart Reminder Modal */}
      <BookingModal
        entity={selectedEntity}
        lang={lang}
        defaultUserName={userProfile.name}
        defaultUserPhone={userProfile.phone}
        onClose={() => setSelectedEntity(null)}
        onConfirmBooking={handleConfirmBooking}
        onTrackReferral={handleTrackReferral}
      />
    </div>
  );
}
export default App;
