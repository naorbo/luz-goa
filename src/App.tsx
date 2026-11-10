import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CalendarDays,
  Briefcase,
  Bot,
  Users,
  PlusCircle,
  ShieldCheck,
  ShieldAlert,
  FlaskConical,
  Globe,
  RotateCcw,
  Lock,
  LogOut,
  ExternalLink,
  Sparkles,
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
  ClickAnalyticsEvent,
} from './types/luz';
import {
  getStoredClickAnalytics,
  recordClickAnalyticsEvent,
  clearStoredClickAnalytics,
} from './utils/clickAnalytics';
import {
  detectInitialEnvironment,
  getStorageKeys,
  updateUrlForEnvironment,
  isAdminUnlockRequestedInUrl,
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
import {
  autoDiscoverFirebaseHostingConfig,
  subscribeToAdminAuth,
  signInAsLuzAdmin,
  signOutLuzAdmin,
  AUTHORIZED_ADMIN_EMAIL,
} from './config/firebase';
import {
  enforceRateLimit,
  sanitizeInputText,
  sanitizeAndValidatePhone,
} from './utils/securityGuard';
import {
  subscribeToEnvironmentFirestore,
  saveDocumentToFirestore,
  deleteDocumentFromFirestore,
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
import { CORE_YOUTH_CENTER_EVENTS } from './data/youthCenterEvents';
import { CORE_BEIT_BINA_EVENTS } from './data/beitBinaEvents';
import { ExploreView } from './components/ExploreView';
import { BusinessesView } from './components/BusinessesView';
import { ProviderView } from './components/ProviderView';
import { BenBotView } from './components/BenBotView';
import { YouthCenterView } from './components/YouthCenterView';
import { BeitBinaView } from './components/BeitBinaView';
import { AdminView } from './components/AdminView';
import { EventsManagerView } from './components/EventsManagerView';
import { BookingModal } from './components/BookingModal';

type ActiveTab =
  | 'explore'
  | 'businesses'
  | 'ben'
  | 'youth_center'
  | 'beit_bina'
  | 'events_admin'
  | 'provider'
  | 'admin';

interface EnvStore {
  env: AppEnvironment;
  entities: LuzEntity[];
  businesses: CommunityBusiness[];
  bookings: BookingRecord[];
  families: YouthCenterFamily[];
  referrals: LeadReferralEvent[];
  analytics: ClickAnalyticsEvent[];
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
      // Prefer seedItem phone and host numbers to eliminate stale cached group admin fallbacks
      hostPhone: (seedItem as any).hostPhone !== undefined ? (seedItem as any).hostPhone : (item as any).hostPhone,
      hostName: (seedItem as any).hostName !== undefined ? (seedItem as any).hostName : (item as any).hostName,
      phone: (seedItem as any).phone !== undefined ? (seedItem as any).phone : (item as any).phone,
      hostNameEn: (seedItem as any).hostNameEn ?? (item as any).hostNameEn,
      preferredContactLang:
        (seedItem as any).preferredContactLang ?? (item as any).preferredContactLang,
      websiteUrl: (item as any).websiteUrl ?? (seedItem as any).websiteUrl,
      whatsappGroupUrl: (item as any).whatsappGroupUrl ?? (seedItem as any).whatsappGroupUrl,
      mapUrl: (item as any).mapUrl ?? (seedItem as any).mapUrl,
      volunteers: (item as any).volunteers ?? (seedItem as any).volunteers,
      isBeitBina: (seedItem as any).isBeitBina ?? (item as any).isBeitBina,
      externalRegistrationUrl:
        (seedItem as any).externalRegistrationUrl ?? (item as any).externalRegistrationUrl,
    };
  });
  const savedIds = new Set(saved.map((item) => item.id));
  const missingSeeds = seed.filter((item) => !savedIds.has(item.id));
  return [...updatedSaved, ...missingSeeds];
}

function loadStoreForEnvironment(env: AppEnvironment): EnvStore {
  const keys = getStorageKeys(env);
  const storedAnalytics = getStoredClickAnalytics(env);
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
      analytics: storedAnalytics,
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
    analytics: storedAnalytics,
    userProfile: normalizedTestProfile,
  };
}

export function App() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get('lang');
      if (urlLang === 'he' || urlLang === 'en') return urlLang;
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem('luz_lang_v2') : null;
    return saved === 'en' || saved === 'he' ? saved : 'en';
  });

  const [store, setStore] = useState<EnvStore>(() =>
    loadStoreForEnvironment(detectInitialEnvironment())
  );

  const [notificationConfig, setNotificationConfig] = useState<NotificationChannelsConfig>(() =>
    loadNotificationConfig()
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'youth_center' || tab === 'beit_bina' || tab === 'businesses' || tab === 'explore')
        return tab;
      if (params.get('biz') || params.get('business') || window.location.hash.startsWith('#biz')) return 'businesses';
      if (params.get('bina_gate') || window.location.hash === '#beit-bina' || window.location.hash === '#bina')
        return 'beit_bina';
      if (params.get('gate') || params.get('checkin')) return 'youth_center';
      if (window.location.hash === '#youth-center' || window.location.hash === '#youth' || window.location.hash === '#gate') return 'youth_center';
    }
    return 'explore';
  });
  const [selectedEntity, setSelectedEntity] = useState<LuzEntity | null>(null);
  const [initialYouthEventId, setInitialYouthEventId] = useState<string | null>(null);
  const [initialBeitBinaEventId, setInitialBeitBinaEventId] = useState<string | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<
    'disconnected' | 'connecting' | 'live' | 'error'
  >('disconnected');
  const [firestoreProjectId, setFirestoreProjectId] = useState<string>('');
  const [firebaseEpoch, setFirebaseEpoch] = useState<number>(0);

  // Strict Admin Authentication State (only luzschedu@gmail.com unlocks Admin & TEST)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(() =>
    isAdminUnlockRequestedInUrl()
  );
  const [adminAuthError, setAdminAuthError] = useState<string>('');
  const [adminSigningIn, setAdminSigningIn] = useState<boolean>(false);

  const { env: appEnv, entities, businesses, bookings, families, referrals, analytics, userProfile } = store;

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

  // Deep-linking: auto-open modal or gate if URL contains ?event=EVENT_ID or ?gate=EVENT_ID
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const binaGateId = params.get('bina_gate');
    if (binaGateId) {
      setActiveTab('beit_bina');
      setInitialBeitBinaEventId(binaGateId);
      setSelectedEntity(null);
      return;
    }
    const gateId = params.get('gate') || params.get('checkin');
    if (gateId) {
      setActiveTab('youth_center');
      setInitialYouthEventId(gateId);
      setSelectedEntity(null);
      return;
    }
    const bizId = params.get('biz') || params.get('business');
    if (bizId) {
      setActiveTab('businesses');
      setSelectedEntity(null);
      return;
    }
    const eventId = params.get('event');
    if (eventId) {
      const match =
        entities.find((e) => e.id === eventId) ||
        CORE_YOUTH_CENTER_EVENTS.find((e) => e.id === eventId) ||
        CORE_BEIT_BINA_EVENTS.find((e) => e.id === eventId);
      if (match) {
        if (match.isBeitBina || match.id.startsWith('bina-')) {
          setActiveTab('beit_bina');
          setInitialBeitBinaEventId(match.id);
          setSelectedEntity(null);
        } else if (match.isYouthCenter || match.id.startsWith('yc-')) {
          setActiveTab('youth_center');
          setInitialYouthEventId(match.id);
          setSelectedEntity(null);
        } else {
          setSelectedEntity(match);
        }
      }
    }
  }, [entities]);

  // Zero-Secret Auto-Discovery when hosted on Firebase Hosting (/__/firebase/init.json)
  useEffect(() => {
    void autoDiscoverFirebaseHostingConfig().then((discovered) => {
      if (discovered) {
        setFirebaseEpoch((n) => n + 1);
      }
    });
  }, []);

  // Subscribe to Firebase Auth & strictly lock non-admins to PROD and non-Admin tabs
  useEffect(() => {
    const unsubscribeAuth = subscribeToAdminAuth((authState) => {
      setIsAdminAuthenticated(authState.isAdmin);
      setAdminEmail(authState.email);
      if (!authState.isAdmin) {
        setActiveTab((prev) => (prev === 'admin' ? 'explore' : prev));
        setStore((prev) => (prev.env === 'test' ? loadStoreForEnvironment('prod') : prev));
      }
    });
    return () => unsubscribeAuth();
  }, [firebaseEpoch]);

  // Real-time Cloud Firestore Subscription for active environment (/envs/{prod|test}/*)
  useEffect(() => {
    const safeEnv: AppEnvironment = isAdminAuthenticated ? appEnv : 'prod';
    const unsubscribe = subscribeToEnvironmentFirestore(safeEnv, {
      onEntities: (cloudEntities) => {
        setStore((prev) =>
          prev.env === safeEnv
            ? { ...prev, entities: mergeWithSeedById(cloudEntities, prev.entities) }
            : prev
        );
      },
      onBusinesses: (cloudBusinesses) => {
        setStore((prev) =>
          prev.env === safeEnv
            ? { ...prev, businesses: mergeWithSeedById(cloudBusinesses, prev.businesses) }
            : prev
        );
      },
      onBookings: (cloudBookings) => {
        setStore((prev) =>
          prev.env === safeEnv ? { ...prev, bookings: cloudBookings } : prev
        );
      },
      onFamilies: (cloudFamilies) => {
        setStore((prev) =>
          prev.env === safeEnv ? { ...prev, families: cloudFamilies } : prev
        );
      },
      onReferrals: (cloudReferrals) => {
        setStore((prev) =>
          prev.env === safeEnv ? { ...prev, referrals: cloudReferrals } : prev
        );
      },
      onAnalytics: (cloudAnalytics) => {
        setStore((prev) =>
          prev.env === safeEnv ? { ...prev, analytics: cloudAnalytics } : prev
        );
      },
      onStatusChange: (status, detail) => {
        setFirestoreStatus(status);
        if (detail) setFirestoreProjectId(detail);
      },
    });
    return () => unsubscribe();
  }, [appEnv, firebaseEpoch, isAdminAuthenticated]);

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

  useEffect(() => {
    if (appEnv !== 'test' && activeTab === 'ben') {
      setActiveTab('explore');
    }
  }, [appEnv, activeTab]);

  const handleSwitchEnvironment = (nextEnv: AppEnvironment) => {
    if (nextEnv === 'test' && !isAdminAuthenticated) return;
    if (nextEnv === appEnv) return;
    setSelectedEntity(null);
    if (nextEnv !== 'test' && activeTab === 'ben') {
      setActiveTab('explore');
    }
    updateUrlForEnvironment(nextEnv);
    setStore(loadStoreForEnvironment(nextEnv));
  };

  const handleAdminSignIn = async () => {
    setAdminAuthError('');
    setAdminSigningIn(true);
    const res = await signInAsLuzAdmin();
    setAdminSigningIn(false);
    if (res.ok) {
      setIsAdminAuthenticated(true);
      setAdminEmail(res.email || AUTHORIZED_ADMIN_EMAIL);
      setShowAdminLoginModal(false);
      setActiveTab('admin');
    } else {
      setAdminAuthError((isHe ? res.errorHe : res.errorEn) || 'Sign-in failed');
    }
  };

  const handleAdminSignOut = async () => {
    await signOutLuzAdmin();
    setIsAdminAuthenticated(false);
    setAdminEmail(null);
    if (activeTab === 'admin') setActiveTab('explore');
    if (appEnv === 'test') {
      updateUrlForEnvironment('prod');
      setStore(loadStoreForEnvironment('prod'));
    }
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

  const handleUpdateEntity = (updatedEntity: LuzEntity) => {
    const phoneCheck = sanitizeAndValidatePhone(updatedEntity.hostPhone);
    const sanitized: LuzEntity = {
      ...updatedEntity,
      titleHe: sanitizeInputText(updatedEntity.titleHe, 200),
      titleEn: sanitizeInputText(updatedEntity.titleEn || updatedEntity.titleHe, 200),
      descriptionHe: sanitizeInputText(updatedEntity.descriptionHe, 5000),
      descriptionEn: sanitizeInputText(updatedEntity.descriptionEn || updatedEntity.descriptionHe, 5000),
      hostName: sanitizeInputText(updatedEntity.hostName, 100),
      hostPhone: phoneCheck.valid ? phoneCheck.cleaned : updatedEntity.hostPhone,
      priceAmount: Math.max(0, Math.min(500000, Number(updatedEntity.priceAmount) || 0)),
    };

    setStore((prev) => {
      const exists = prev.entities.some((e) => e.id === sanitized.id);
      return {
        ...prev,
        entities: exists
          ? prev.entities.map((e) => (e.id === sanitized.id ? sanitized : e))
          : [sanitized, ...prev.entities],
      };
    });
    void saveDocumentToFirestore(appEnv, 'entities', sanitized);
  };

  const handleDeleteEntity = (entityId: string) => {
    setStore((prev) => ({
      ...prev,
      entities: prev.entities.filter((e) => e.id !== entityId),
    }));
    void deleteDocumentFromFirestore(appEnv, 'entities', entityId);
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

  const handleTrackClick = (
    eventData: Omit<ClickAnalyticsEvent, 'id' | 'sessionId' | 'timestamp' | 'environment'>
  ) => {
    const fullEvent = recordClickAnalyticsEvent(appEnv, eventData);
    setStore((prev) => ({
      ...prev,
      analytics: [fullEvent, ...prev.analytics.filter((e) => e.id !== fullEvent.id)],
    }));
    void saveDocumentToFirestore(appEnv, 'analytics', fullEvent);
  };

  const handleClearAnalytics = () => {
    clearStoredClickAnalytics(appEnv);
    setStore((prev) => ({
      ...prev,
      analytics: [],
    }));
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
        analytics: [],
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
        analytics: [],
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
    ...(appEnv === 'test'
      ? [
          {
            id: 'ben' as ActiveTab,
            labelHe: 'הבוט "בן" (WhatsApp)',
            labelEn: '"Ben" WhatsApp Bot',
            icon: Bot,
          },
        ]
      : []),
    {
      id: 'youth_center',
      labelHe: 'מרכז הנוער',
      labelEn: 'Youth Center Goa',
      icon: Users,
      badge: families.reduce((s, f) => s + f.children.length, 0),
    },
    {
      id: 'beit_bina',
      labelHe: 'בית בינ"ה בגואה',
      labelEn: 'Beit BINA Goa',
      icon: Sparkles,
      badge: CORE_BEIT_BINA_EVENTS.length,
    },
    ...(isAdminAuthenticated
      ? [
          {
            id: 'events_admin' as ActiveTab,
            labelHe: 'ניהול אירועים',
            labelEn: 'Events Manager',
            icon: CalendarDays,
            badge: entities.length,
          },
          {
            id: 'provider' as ActiveTab,
            labelHe: 'העלאת אירוע / בית',
            labelEn: 'Provider Studio',
            icon: PlusCircle,
          },
          {
            id: 'admin' as ActiveTab,
            labelHe: 'אדמין ולידים',
            labelEn: 'Admin & Leads',
            icon: ShieldCheck,
            badge: Math.max(referrals.length, bookings.length),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink overflow-x-hidden w-full max-w-full">
      {/* Clean Modern Header */}
      <header className="bg-plate/95 backdrop-blur-md border-b border-rule sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            {/* Brand Logo & Friendly Subtitle */}
            <button
              type="button"
              onClick={() => setActiveTab('explore')}
              aria-label="LUZ Goa Home"
              className="flex items-center gap-3 text-start group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-accent text-white font-display font-bold text-lg flex items-center justify-center shadow-sm">
                L
              </div>
              <div>
                <div className="font-display text-xl font-bold text-ink group-hover:text-accent transition-colors leading-tight">
                  LUZ Goa
                </div>
                <div className="text-xs text-muted hidden sm:block">
                  {isHe
                    ? 'אירועים, בעלי מקצוע ובתים בדרום גואה'
                    : 'South Goa Events, Pros & Homes'}
                </div>
              </div>
            </button>

            {/* Right Controls: Admin Controls (only if signed in) + Language Button */}
            <div className="flex items-center gap-2">
              {isAdminAuthenticated && (
                <>
                  <div
                    className="inline-flex items-center bg-paper-2 p-1 rounded-full border border-rule"
                    role="group"
                    aria-label="Environment Switcher"
                  >
                    <button
                      type="button"
                      onClick={() => handleSwitchEnvironment('prod')}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        appEnv === 'prod'
                          ? 'bg-ink text-paper'
                          : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>PROD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchEnvironment('test')}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        appEnv === 'test'
                          ? 'bg-accent text-white'
                          : 'text-ink-2 hover:text-ink'
                      }`}
                    >
                      <FlaskConical className="w-3.5 h-3.5" />
                      <span>TEST</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetEnvironment}
                    title={isHe ? 'איפוס נתונים' : 'Reset Data'}
                    className="p-2 rounded-full bg-paper-2 hover:bg-paper-3 text-ink transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleAdminSignOut}
                    title={isHe ? 'התנתקות ממצב אדמין' : 'Sign out Admin'}
                    className="p-2 rounded-full bg-paper-2 hover:bg-accent hover:text-white text-ink transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-paper-2 hover:bg-paper-3 text-ink font-semibold text-xs transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-accent" />
                <span>{lang === 'he' ? 'English' : 'עברית'}</span>
              </button>
            </div>
          </div>

          {/* Clean Pill Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5"
          >
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-ink text-paper shadow-sm'
                      : 'bg-paper text-ink-2 hover:bg-paper-2 hover:text-ink border border-rule'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-amber-300' : 'text-accent'}`} />
                  <span>{isHe ? tab.labelHe : tab.labelEn}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Sandbox Banner when viewing TEST environment (Admin Only) */}
      {isAdminAuthenticated && appEnv === 'test' && (
        <div className="bg-paper-2 border-b border-rule text-ink">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-medium">
              <FlaskConical className="w-4 h-4 text-accent shrink-0" />
              <span>
                {isHe
                  ? 'סביבת TEST (הדגמה ובדיקות למנהל בלבד): הנתונים המוצגים כאן הם דוגמאות להמחשה בלבד.'
                  : 'TEST Environment (Admin Sandbox): Displaying illustrative demo data only.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSwitchEnvironment('prod')}
              className="font-semibold underline hover:text-accent shrink-0"
            >
              {isHe ? 'חזרה לסביבת PROD (אמת)' : 'Switch to PROD (Live)'}
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full max-w-full min-w-0 mx-auto px-4 md:px-8 py-6 md:py-10">
        {activeTab === 'explore' && (
          <ExploreView
            entities={entities}
            lang={lang}
            appEnv={isAdminAuthenticated ? appEnv : 'prod'}
            isAdmin={isAdminAuthenticated}
            userProfile={userProfile}
            onSelectEntity={(ent) => setSelectedEntity(ent)}
            onOpenBenBot={() => setActiveTab('ben')}
            onSwitchToTest={() => handleSwitchEnvironment('test')}
            onGoToProvider={() => setActiveTab('provider')}
            onGoToBusinesses={() => setActiveTab('businesses')}
            onNavigateToYouthEvent={(eventId) => {
              setActiveTab('youth_center');
              setInitialYouthEventId(eventId);
            }}
            onNavigateToBeitBinaEvent={(eventId) => {
              setActiveTab('beit_bina');
              setInitialBeitBinaEventId(eventId);
            }}
            onTrackClick={handleTrackClick}
          />
        )}

        {activeTab === 'businesses' && (
          <BusinessesView
            businesses={businesses}
            entities={entities}
            lang={lang}
            appEnv={isAdminAuthenticated ? appEnv : 'prod'}
            isAdmin={isAdminAuthenticated}
            defaultUserName={userProfile.name}
            defaultUserPhone={userProfile.phone}
            onAddBusiness={handleAddBusiness}
            onBookBusinessSlot={handleBookBusinessSlot}
            onTrackReferral={handleTrackReferral}
            onSwitchToTest={() => handleSwitchEnvironment('test')}
            onTrackClick={handleTrackClick}
            onSelectEntity={(ent) => setSelectedEntity(ent)}
          />
        )}

        {activeTab === 'ben' && appEnv === 'test' && (
          <BenBotView
            entities={entities}
            businesses={businesses}
            userProfile={userProfile}
            lang={lang}
            appEnv={isAdminAuthenticated ? appEnv : 'prod'}
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
            isAdmin={isAdminAuthenticated}
            onRegisterFamily={handleRegisterFamily}
            entities={entities}
            bookings={bookings}
            onAddEntity={handleAddEntity}
            onUpdateEntity={handleUpdateEntity}
            onDeleteEntity={handleDeleteEntity}
            onConfirmBooking={handleConfirmBooking}
            initialEventId={initialYouthEventId}
            onClearInitialEvent={() => setInitialYouthEventId(null)}
          />
        )}

        {activeTab === 'beit_bina' && (
          <BeitBinaView
            lang={lang}
            isAdmin={isAdminAuthenticated}
            entities={entities}
            bookings={bookings}
            onAddEntity={handleAddEntity}
            onUpdateEntity={handleUpdateEntity}
            onDeleteEntity={handleDeleteEntity}
            onConfirmBooking={handleConfirmBooking}
            initialEventId={initialBeitBinaEventId}
            onClearInitialEvent={() => setInitialBeitBinaEventId(null)}
          />
        )}

        {isAdminAuthenticated && activeTab === 'events_admin' && (
          <EventsManagerView
            entities={entities}
            lang={lang}
            appEnv={isAdminAuthenticated ? appEnv : 'prod'}
            onAddEntity={handleAddEntity}
            onUpdateEntity={handleUpdateEntity}
            onDeleteEntity={handleDeleteEntity}
          />
        )}

        {isAdminAuthenticated && activeTab === 'provider' && (
          <ProviderView
            lang={lang}
            onAddEntity={(newEnt) => {
              handleAddEntity(newEnt);
            }}
          />
        )}

        {isAdminAuthenticated && activeTab === 'admin' && (
          <AdminView
            entities={entities}
            businesses={businesses}
            bookings={bookings}
            families={families}
            referrals={referrals}
            analytics={analytics}
            onClearAnalytics={handleClearAnalytics}
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

      {/* Clean Minimal Footer */}
      <footer className="bg-plate border-t border-rule text-ink-2 py-8 px-4 md:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-display text-lg font-bold text-ink">LUZ Goa</div>
            <p className="text-xs text-muted">
              {isHe
                ? 'קהילת דרום גואה · פטנם, פאלולם, קולום ואגונדה'
                : 'South Goa Community · Patnem, Palolem, Colomb & Agonda'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
            {navTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className="hover:text-ink transition-colors"
              >
                {isHe ? t.labelHe : t.labelEn}
              </button>
            ))}

            <span className="text-rule">|</span>

            {isAdminAuthenticated ? (
              <span className="inline-flex items-center gap-1.5 text-ink font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                <span>{adminEmail || AUTHORIZED_ADMIN_EMAIL}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAdminAuthError('');
                  setShowAdminLoginModal(true);
                }}
                className="inline-flex items-center gap-1 text-muted hover:text-ink transition-colors"
                title={isHe ? 'כניסת הנהלה בלבד' : 'Admin Sign-In'}
              >
                <Lock className="w-3 h-3" />
                <span>{isHe ? 'ניהול' : 'Admin'}</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Discreet Admin Google Sign-In Modal (Restricted to luzschedu@gmail.com) */}
      {showAdminLoginModal && !isAdminAuthenticated && (
        <div className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center p-4">
          <div className="hallmark-plate max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-ink text-paper flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-ink">
                    {isHe ? 'אימות מנהל מערכת (LUZ Admin)' : 'LUZ Admin Authentication'}
                  </h3>
                  <p className="text-xs text-muted">
                    {isHe
                      ? 'הגישה לממשק הניהול ולסביבת ה-TEST מוגבלת לחשבון המורשה בלבד'
                      : 'Access to Admin & TEST environment is restricted to the authorized owner'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminLoginModal(false)}
                className="text-xs font-semibold text-muted hover:text-ink px-2 py-1"
              >
                {isHe ? 'סגור' : 'Close'}
              </button>
            </div>

            {adminAuthError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 text-xs text-red-900 dark:text-red-200 font-medium leading-relaxed rounded-lg space-y-1.5">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">{adminAuthError}</div>
                </div>
                {adminAuthError.includes('Firebase Console') && (
                  <div className="pt-1 ps-6">
                    <a
                      href="https://console.firebase.google.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-bold underline text-red-800 dark:text-red-300 hover:opacity-80"
                    >
                      <span>{isHe ? 'מעבר ישיר ל-Firebase Console' : 'Open Firebase Console'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Google Sign-in */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={adminSigningIn}
                onClick={handleAdminSignIn}
                className="w-full hallmark-btn-ink text-xs sm:text-sm !py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-gold" />
                <span>
                  {adminSigningIn
                    ? isHe
                      ? 'מתחבר דרך Google...'
                      : 'Signing in with Google...'
                    : isHe
                    ? 'התחברות עם חשבון Google מורשה'
                    : 'Sign in with Authorized Google Account'}
                </span>
              </button>
              <div className="text-[11px] text-muted text-center">
                {isHe
                  ? `התחברות רשמית עבור: ${AUTHORIZED_ADMIN_EMAIL}`
                  : `Authorized account: ${AUTHORIZED_ADMIN_EMAIL}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking & Smart Reminder Modal */}
      <BookingModal
        entity={selectedEntity}
        lang={lang}
        defaultUserName={userProfile.name}
        defaultUserPhone={userProfile.phone}
        onClose={() => setSelectedEntity(null)}
        onConfirmBooking={handleConfirmBooking}
        onTrackReferral={handleTrackReferral}
        onTrackClick={handleTrackClick}
      />
    </div>
  );
}
export default App;
