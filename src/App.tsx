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
} from './types/luz';
import {
  detectInitialEnvironment,
  getStorageKeys,
  updateUrlForEnvironment,
} from './config/environment';
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
  const savedIds = new Set(saved.map((item) => item.id));
  const missingSeeds = seed.filter((item) => !savedIds.has(item.id));
  return [...saved, ...missingSeeds];
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
      userProfile: readJsonOrFallback(keys.profile, PROD_USER_PROFILE),
    };
  }
  const savedEntities = readJsonOrFallback(keys.entities, TEST_ENTITIES);
  const savedBusinesses = readJsonOrFallback(keys.businesses, TEST_BUSINESSES);
  return {
    env: 'test',
    entities: mergeWithSeedById(savedEntities, TEST_ENTITIES),
    businesses: mergeWithSeedById(savedBusinesses, TEST_BUSINESSES),
    bookings: readJsonOrFallback(keys.bookings, TEST_BOOKINGS),
    families: readJsonOrFallback(keys.families, TEST_FAMILIES),
    userProfile: readJsonOrFallback(keys.profile, TEST_USER_PROFILE),
  };
}

export function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('luz_lang_v1');
    return saved === 'en' || saved === 'he' ? saved : 'he';
  });

  const [store, setStore] = useState<EnvStore>(() =>
    loadStoreForEnvironment(detectInitialEnvironment())
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');
  const [selectedEntity, setSelectedEntity] = useState<LuzEntity | null>(null);

  const { env: appEnv, entities, businesses, bookings, families, userProfile } = store;

  // Sync RTL/LTR direction & language preference
  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('luz_lang_v1', lang);
  }, [lang]);

  // Persist strictly to the active environment's isolated storage namespace
  useEffect(() => {
    const keys = getStorageKeys(store.env);
    localStorage.setItem(keys.entities, JSON.stringify(store.entities));
    localStorage.setItem(keys.businesses, JSON.stringify(store.businesses));
    localStorage.setItem(keys.bookings, JSON.stringify(store.bookings));
    localStorage.setItem(keys.families, JSON.stringify(store.families));
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
    const record: BookingRecord = {
      ...newBk,
      id: `bk-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };

    setStore((prev) => ({
      ...prev,
      bookings: [record, ...prev.bookings],
      entities: prev.entities.map((ent) => {
        if (ent.id !== newBk.entityId) return ent;
        const updated = { ...ent, rsvpCount: ent.rsvpCount + newBk.participantsCount };

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
              guestName: newBk.customerName,
            },
          ];
        }

        return updated;
      }),
    }));
  };

  const handleAddEntity = (newEntity: LuzEntity) => {
    setStore((prev) => ({
      ...prev,
      entities: [newEntity, ...prev.entities],
    }));
  };

  const handleAddBusiness = (newBiz: CommunityBusiness) => {
    setStore((prev) => ({
      ...prev,
      businesses: [newBiz, ...prev.businesses],
    }));
  };

  const handleBookBusinessSlot = (
    businessId: string,
    newBk: Omit<BookingRecord, 'id' | 'createdAt' | 'status'>
  ) => {
    const record: BookingRecord = {
      ...newBk,
      id: `bk-biz-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };

    setStore((prev) => ({
      ...prev,
      bookings: [record, ...prev.bookings],
      businesses: prev.businesses.map((biz) => {
        if (biz.id !== businessId) return biz;
        if (!newBk.selectedDate || !newBk.selectedSlot) return biz;
        const existing = biz.bookedSlots[newBk.selectedDate] || [];
        return {
          ...biz,
          bookedSlots: {
            ...biz.bookedSlots,
            [newBk.selectedDate]: [...existing, newBk.selectedSlot],
          },
        };
      }),
    }));
  };

  const handleRegisterFamily = (fam: Omit<YouthCenterFamily, 'id' | 'createdAt'>) => {
    const newFam: YouthCenterFamily = {
      ...fam,
      id: `fam-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setStore((prev) => ({
      ...prev,
      families: [newFam, ...prev.families],
    }));
  };

  const handleUpdateProfile = (profile: UserProfile) => {
    setStore((prev) => ({
      ...prev,
      userProfile: profile,
    }));
  };

  const handleToggleProviderSync = (entityId: string) => {
    setStore((prev) => ({
      ...prev,
      entities: prev.entities.map((ent) => {
        if (ent.id !== entityId) return ent;
        return {
          ...ent,
          calendarSyncStatus:
            ent.calendarSyncStatus === 'connected' ? 'manual' : 'connected',
        };
      }),
    }));
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
        userProfile: PROD_USER_PROFILE,
      });
    } else {
      setStore({
        env: 'test',
        entities: TEST_ENTITIES,
        businesses: TEST_BUSINESSES,
        bookings: TEST_BOOKINGS,
        families: TEST_FAMILIES,
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
      labelHe: 'אדמין ו-Digest',
      labelEn: 'Admin & Digest',
      icon: ShieldCheck,
      badge: bookings.length,
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
            lang={lang}
            appEnv={appEnv}
            onToggleProviderSync={handleToggleProviderSync}
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
      />
    </div>
  );
}
export default App;
