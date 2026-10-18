import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Bot,
  Users,
  PlusCircle,
  ShieldCheck,
  Globe,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import {
  LuzEntity,
  BookingRecord,
  YouthCenterFamily,
  UserProfile,
  Language,
} from './types/luz';
import {
  INITIAL_ENTITIES,
  INITIAL_BOOKINGS,
  INITIAL_FAMILIES,
  INITIAL_USER_PROFILE,
} from './data/seedData';
import { ExploreView } from './components/ExploreView';
import { ProviderView } from './components/ProviderView';
import { BenBotView } from './components/BenBotView';
import { YouthCenterView } from './components/YouthCenterView';
import { AdminView } from './components/AdminView';
import { BookingModal } from './components/BookingModal';

type ActiveTab = 'explore' | 'ben' | 'youth_center' | 'provider' | 'admin';

export function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('luz_lang_v1');
    return (saved === 'en' || saved === 'he') ? saved : 'he';
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('explore');

  const [entities, setEntities] = useState<LuzEntity[]>(() => {
    const saved = localStorage.getItem('luz_entities_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_ENTITIES;
      }
    }
    return INITIAL_ENTITIES;
  });

  const [bookings, setBookings] = useState<BookingRecord[]>(() => {
    const saved = localStorage.getItem('luz_bookings_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_BOOKINGS;
      }
    }
    return INITIAL_BOOKINGS;
  });

  const [families, setFamilies] = useState<YouthCenterFamily[]>(() => {
    const saved = localStorage.getItem('luz_families_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_FAMILIES;
      }
    }
    return INITIAL_FAMILIES;
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('luz_profile_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_USER_PROFILE;
      }
    }
    return INITIAL_USER_PROFILE;
  });

  const [selectedEntity, setSelectedEntity] = useState<LuzEntity | null>(null);

  // Sync RTL/LTR direction & localStorage
  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('luz_lang_v1', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('luz_entities_v1', JSON.stringify(entities));
  }, [entities]);

  useEffect(() => {
    localStorage.setItem('luz_bookings_v1', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('luz_families_v1', JSON.stringify(families));
  }, [families]);

  useEffect(() => {
    localStorage.setItem('luz_profile_v1', JSON.stringify(userProfile));
  }, [userProfile]);

  const isHe = lang === 'he';

  const handleConfirmBooking = (
    newBk: Omit<BookingRecord, 'id' | 'createdAt' | 'status'>
  ) => {
    const record: BookingRecord = {
      ...newBk,
      id: `bk-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };
    setBookings((prev) => [record, ...prev]);

    // Update entity RSVP count, bookedSlots (for hourly services), or bookedRanges (for rentals)
    setEntities((prev) =>
      prev.map((ent) => {
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
      })
    );
  };

  const handleAddEntity = (newEntity: LuzEntity) => {
    setEntities((prev) => [newEntity, ...prev]);
  };

  const handleRegisterFamily = (fam: Omit<YouthCenterFamily, 'id' | 'createdAt'>) => {
    const newFam: YouthCenterFamily = {
      ...fam,
      id: `fam-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setFamilies((prev) => [newFam, ...prev]);
  };

  const handleToggleProviderSync = (entityId: string) => {
    setEntities((prev) =>
      prev.map((ent) => {
        if (ent.id !== entityId) return ent;
        return {
          ...ent,
          calendarSyncStatus:
            ent.calendarSyncStatus === 'connected' ? 'manual' : 'connected',
        };
      })
    );
  };

  const handleResetDemo = () => {
    localStorage.removeItem('luz_entities_v1');
    localStorage.removeItem('luz_bookings_v1');
    localStorage.removeItem('luz_families_v1');
    localStorage.removeItem('luz_profile_v1');
    setEntities(INITIAL_ENTITIES);
    setBookings(INITIAL_BOOKINGS);
    setFamilies(INITIAL_FAMILIES);
    setUserProfile(INITIAL_USER_PROFILE);
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
      labelHe: 'לוח אירועים, שירותים ובתים',
      labelEn: 'Schedule, Services & Homes',
      icon: Calendar,
      badge: entities.length,
    },
    {
      id: 'ben',
      labelHe: 'הבוט "בן" (WhatsApp)',
      labelEn: '"Ben" WhatsApp Bot',
      icon: Bot,
    },
    {
      id: 'youth_center',
      labelHe: 'מרכז הנוער (רישום משפחות)',
      labelEn: 'Youth Center Goa',
      icon: Users,
      badge: families.reduce((s, f) => s + f.children.length, 0),
    },
    {
      id: 'provider',
      labelHe: 'העלאת אירוע / ספק',
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
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Identity */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => setActiveTab('explore')}
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-terracotta-500 text-white font-display font-bold text-xl flex items-center justify-center shadow-sm">
                  L
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-xl font-bold tracking-tight text-sand-50">
                      LUZ GOA
                    </h1>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-canopy-800 text-ochre-400 border border-canopy-700">
                      Community OS
                    </span>
                  </div>
                  <p className="text-xs text-sand-300 hidden sm:block">
                    {isHe
                      ? 'קולום • פטנם • פאלולם — אירועים, מתנ"ס, שירותים שעתיים והשכרת בתים'
                      : 'Colomb • Patnem • Palolem — Events, Youth Center, Hourly Services & Homes'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Controls: Location Pill, Reset, Language Toggle */}
            <div className="flex items-center gap-2.5">
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-canopy-800 text-xs text-sand-200 border border-canopy-700">
                <MapPin className="w-3.5 h-3.5 text-terracotta-400" />
                <span>South Goa, India</span>
              </div>

              <button
                type="button"
                onClick={handleResetDemo}
                title={isHe ? 'איפוס נתוני הדגמה' : 'Reset Demo Data'}
                className="p-2 rounded-xl bg-canopy-800 hover:bg-canopy-700 text-sand-200 border border-canopy-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-ochre-500 text-canopy-950 font-bold text-xs hover:bg-ochre-400 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{lang === 'he' ? 'English (EN)' : 'עברית (HE)'}</span>
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
                      ? 'bg-terracotta-500 text-white shadow-sm'
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

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 md:py-8">
        {activeTab === 'explore' && (
          <ExploreView
            entities={entities}
            lang={lang}
            userProfile={userProfile}
            onSelectEntity={(ent) => setSelectedEntity(ent)}
            onOpenBenBot={() => setActiveTab('ben')}
          />
        )}

        {activeTab === 'ben' && (
          <BenBotView
            entities={entities}
            userProfile={userProfile}
            lang={lang}
            onUpdateProfile={setUserProfile}
            onSelectEntity={(ent) => setSelectedEntity(ent)}
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
            bookings={bookings}
            families={families}
            lang={lang}
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
