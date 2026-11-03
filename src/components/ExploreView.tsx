import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  MapPin,
  Clock,
  Wifi,
  Zap,
  PlusCircle,
  MessageCircle,
  Calendar,
  Compass,
  Home,
  LayoutGrid,
  CalendarDays,
} from 'lucide-react';
import {
  LuzEntity,
  EntityType,
  GoaArea,
  Language,
  UserProfile,
  AppEnvironment,
  ClickAnalyticsEvent,
} from '../types/luz';
import { ScrollCraftHero } from './ScrollCraftHero';
import {
  buildGoogleCalendarUrl,
  buildChronologicalDateGroups,
} from '../utils/calendarAndParser';

interface ExploreViewProps {
  entities: LuzEntity[];
  lang: Language;
  appEnv: AppEnvironment;
  isAdmin?: boolean;
  userProfile: UserProfile;
  onSelectEntity: (entity: LuzEntity) => void;
  onOpenBenBot: () => void;
  onSwitchToTest: () => void;
  onGoToProvider: () => void;
  onGoToBusinesses: () => void;
  onTrackClick?: (
    event: Omit<ClickAnalyticsEvent, 'id' | 'sessionId' | 'timestamp' | 'environment'>
  ) => void;
}

const DAY_NAMES_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
const DAY_SHORT_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ExploreView: React.FC<ExploreViewProps> = ({
  entities,
  lang,
  appEnv,
  isAdmin = false,
  onSelectEntity,
  onOpenBenBot,
  onGoToProvider,
  onGoToBusinesses,
  onTrackClick,
}) => {
  const isHe = lang === 'he';

  const [displayMode, setDisplayMode] = useState<'cards' | 'calendar'>('cards');
  const [selectedType, setSelectedType] = useState<EntityType | 'all'>('all');
  const [selectedArea, setSelectedArea] = useState<GoaArea | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const catalogSectionRef = useRef<HTMLDivElement>(null);

  const handleScrollToCatalog = () => {
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEntityClick = (item: LuzEntity) => {
    onSelectEntity(item);
    onTrackClick?.({
      eventType: 'event_card_click',
      targetId: item.id,
      targetTitleHe: item.titleHe,
      targetTitleEn: item.titleEn,
      targetType: item.type === 'service' ? 'business' : 'event',
      categoryOrType: item.type,
      area: item.area,
      providerOrHostName: isHe ? item.hostName : item.hostNameEn || item.hostName,
      providerPhone: item.hostPhone,
      path: '/explore',
    });
  };

  const filteredEntities = useMemo(() => {
    return entities.filter((item) => {
      if (selectedType !== 'all') {
        if (selectedType === 'service') {
          if (item.type !== 'service' && item.type !== 'workshop') return false;
        } else if (item.type !== selectedType) {
          return false;
        }
      }
      if (selectedArea !== 'all' && item.area !== selectedArea) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle =
          item.titleHe.toLowerCase().includes(q) || item.titleEn.toLowerCase().includes(q);
        const inDesc =
          item.descriptionHe.toLowerCase().includes(q) ||
          item.descriptionEn.toLowerCase().includes(q);
        const inHost =
          item.hostName.toLowerCase().includes(q) ||
          Boolean(item.hostNameEn && item.hostNameEn.toLowerCase().includes(q));
        const inArea = item.area.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inHost && !inArea) return false;
      }
      return true;
    });
  }, [entities, selectedType, selectedArea, searchQuery]);

  // Helper to resolve which day(s) of week (0..6) an event/workshop/service occurs on
  const getEntityDaysOfWeek = (item: LuzEntity): number[] => {
    if (item.type === 'rental') return [];
    if (typeof item.dayOfWeek === 'number') return [item.dayOfWeek];
    if (item.date) {
      const parsed = new Date(item.date);
      if (!isNaN(parsed.getTime())) {
        return [parsed.getDay()];
      }
    }
    if (item.availableDays && item.availableDays.length > 0) {
      return item.availableDays;
    }
    return [1];
  };

  // Group all non-rental events chronologically by exact date
  const chronologicalDayGroups = useMemo(() => {
    return buildChronologicalDateGroups(filteredEntities);
  }, [filteredEntities]);

  const displayDayGroups = useMemo(() => {
    if (selectedDate === 'all') return chronologicalDayGroups;
    return chronologicalDayGroups.filter((g) => g.dateStr === selectedDate);
  }, [chronologicalDayGroups, selectedDate]);

  const entityBadge = (type: EntityType) => {
    switch (type) {
      case 'event':
        return {
          label: isHe ? 'אירוע קהילתי' : 'Event',
          classes: 'bg-accent text-white',
        };
      case 'workshop':
        return {
          label: isHe ? 'חוג / סדנה' : 'Workshop',
          classes: 'bg-emerald-700 text-white',
        };
      case 'service':
        return {
          label: isHe ? 'סדנה / אימון' : 'Session',
          classes: 'bg-emerald-700 text-white',
        };
      case 'rental':
        return {
          label: isHe ? 'בית להשכרה' : 'Home Stay',
          classes: 'bg-ink text-paper',
        };
    }
  };

  const formatPrice = (e: LuzEntity) => {
    if (e.priceCurrency === 'CONTACT') {
      return isHe ? 'לתיאום מול המארח' : 'Contact host';
    }
    if (e.priceCurrency === 'FREE' || e.priceAmount === 0) {
      return isHe ? 'כניסה חופשית' : 'Free';
    }
    if (e.type === 'rental') {
      if (e.pricePerMonth && e.priceAmount === e.pricePerMonth) {
        return `₹${e.pricePerMonth.toLocaleString()} / ${isHe ? 'חודש' : 'mo'}`;
      }
      return `₹${(e.pricePerNight || e.priceAmount).toLocaleString()} / ${isHe ? 'לילה' : 'night'}`;
    }
    if (e.isYouthCenter) {
      return `₪${e.priceAmount} / ${isHe ? 'חודש' : 'mo'}`;
    }
    const sym = e.priceCurrency === 'INR' ? '₹' : e.priceCurrency === 'ILS' ? '₪' : '$';
    return `${sym}${e.priceAmount.toLocaleString()}`;
  };

  const formatWhen = (e: LuzEntity) => {
    if (e.type === 'rental') {
      return isHe
        ? `זמין מ-${e.availableFrom || 'מיידי'} (${e.bedrooms || 1} חדרי שינה)`
        : `Available from ${e.availableFrom || 'Now'} (${e.bedrooms || 1} BR)`;
    }
    if (typeof e.dayOfWeek === 'number') {
      const dayLabel = isHe ? DAY_NAMES_HE[e.dayOfWeek] : DAY_NAMES_EN[e.dayOfWeek];
      return `${dayLabel} · ${e.startTime || '16:00'}`;
    }
    if (e.date) {
      return `${e.date} · ${e.startTime || '18:00'}`;
    }
    return `${e.startTime || '10:00'}${e.endTime ? ` – ${e.endTime}` : ''}`;
  };

  const areaLabel = (area: GoaArea) => {
    const mapHe: Record<GoaArea, string> = {
      Patnem: 'פטנם',
      Palolem: 'פאלולם',
      Colomb: 'קולום',
      Agonda: 'אגונדה',
      Galgibaga: 'גלגיבגה',
    };
    return isHe ? mapHe[area] || area : area;
  };

  const categoryTabs: Array<{
    id: EntityType | 'all';
    labelHe: string;
    labelEn: string;
    icon: React.ElementType;
  }> = [
    { id: 'all', labelHe: 'הכל', labelEn: 'All', icon: LayoutGrid },
    { id: 'event', labelHe: 'אירועים ומפגשים', labelEn: 'Events', icon: Calendar },
    { id: 'service', labelHe: 'סדנאות ויוגה', labelEn: 'Workshops & Yoga', icon: Compass },
    { id: 'rental', labelHe: 'בתים להשכרה', labelEn: 'Homes for Rent', icon: Home },
  ];

  const areas: Array<{ id: GoaArea | 'all'; labelHe: string; labelEn: string }> = [
    { id: 'all', labelHe: 'כל החופים', labelEn: 'All Beaches' },
    { id: 'Patnem', labelHe: 'פטנם', labelEn: 'Patnem' },
    { id: 'Palolem', labelHe: 'פאלולם', labelEn: 'Palolem' },
    { id: 'Colomb', labelHe: 'קולום', labelEn: 'Colomb' },
    { id: 'Agonda', labelHe: 'אגונדה', labelEn: 'Agonda' },
  ];

  // Ordered days: Monday (1) to Sunday (0) or Sunday (0) to Saturday (6)
  const orderedDays = [0, 1, 2, 3, 4, 5, 6];

  return (
    <div className="space-y-8">
      {/* Clean Modern Hero with 3 Visual Goa Category Cards */}
      <ScrollCraftHero
        lang={lang}
        onSelectCategory={(type) => setSelectedType(type)}
        onScrollToCatalog={handleScrollToCatalog}
        onOpenBenBot={onOpenBenBot}
        showBenBot={appEnv === 'test'}
        totalEntities={entities.length}
      />

      {/* Simple, Non-Technical Filter Bar + Cards/Calendar Toggle */}
      <section
        ref={catalogSectionRef}
        aria-label={isHe ? 'סינון אירועים ובתים' : 'Filter Listings'}
        className="hallmark-plate p-5 sm:p-6 space-y-4"
      >
        {/* Row 1: Big Category Buttons + View Switcher (Cards vs Calendar) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {categoryTabs.map((tab) => {
              const Icon = tab.icon;
              const active = selectedType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedType(tab.id);
                    if (tab.id === 'rental' && displayMode === 'calendar') {
                      setDisplayMode('cards');
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    active
                      ? 'bg-ink text-paper shadow-sm'
                      : 'bg-paper-2 text-ink hover:bg-paper-3'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{isHe ? tab.labelHe : tab.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Cards vs Calendar View Switcher */}
          <div
            className="inline-flex items-center bg-paper-2 p-1 rounded-full border border-rule self-start lg:self-auto"
            role="group"
            aria-label={isHe ? 'בחירת תצוגה' : 'Display mode'}
          >
            <button
              type="button"
              onClick={() => setDisplayMode('cards')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                displayMode === 'cards'
                  ? 'bg-ink text-paper shadow-sm'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{isHe ? 'כרטיסים' : 'Cards'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDisplayMode('calendar');
                if (selectedType === 'rental') setSelectedType('all');
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                displayMode === 'calendar'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>{isHe ? 'לוח שנה כרונולוגי' : 'Calendar View'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Beach Filter Pills + Search Input */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-rule">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted me-1">
              {isHe ? 'חוף:' : 'Beach:'}
            </span>
            {areas.map((a) => {
              const active = selectedArea === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedArea(a.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-accent text-white'
                      : 'bg-paper text-ink-2 border border-rule hover:bg-paper-2'
                  }`}
                >
                  {isHe ? a.labelHe : a.labelEn}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-muted absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isHe ? 'חיפוש לפי שם, חוף או מארח...' : 'Search by name, beach or host...'}
              className="w-full ps-10 pe-4 py-2 rounded-full bg-paper border border-rule-strong text-sm text-ink placeholder:text-muted"
            />
          </div>
        </div>
      </section>

      {/* =====================================================================
          MODE A: CHRONOLOGICAL CALENDAR VIEW
         ===================================================================== */}
      {displayMode === 'calendar' ? (
        <section className="space-y-6" aria-label={isHe ? 'לוח שנה כרונולוגי' : 'Chronological Calendar'}>
          {/* Date Selector Strip */}
          <div className="hallmark-plate p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">
                  {isHe ? 'לוח אירועים וסדנאות כרונולוגי' : 'Chronological Events & Sessions Calendar'}
                </h2>
                <p className="text-xs sm:text-sm text-muted">
                  {isHe
                    ? 'אירועים ומפגשים מסודרים לפי תאריכים ושעות לאורך החודש. לחצו על תאריך לסינון או על אירוע להרשמה.'
                    : 'Events and sessions ordered chronologically date by date throughout the month.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate('all')}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                  selectedDate === 'all'
                    ? 'bg-ink text-paper'
                    : 'bg-paper-2 text-ink hover:bg-paper-3'
                }`}
              >
                {isHe ? 'הצג את כל החודש' : 'Show Full Month'}
              </button>
            </div>

            {/* Chronological Date Cards Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar sm:grid sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {chronologicalDayGroups.map((dayGroup) => {
                const isSelected = selectedDate === dayGroup.dateStr;
                return (
                  <button
                    key={dayGroup.dateStr}
                    type="button"
                    onClick={() =>
                      setSelectedDate(selectedDate === dayGroup.dateStr ? 'all' : dayGroup.dateStr)
                    }
                    className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-w-[76px] sm:min-w-0 ${
                      isSelected
                        ? 'bg-accent text-white border-accent shadow-sm'
                        : 'bg-paper hover:bg-paper-2 border-rule text-ink'
                    }`}
                  >
                    <span className={`text-[11px] font-medium uppercase ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                      {isHe ? dayGroup.dayShortHe : dayGroup.dayShortEn}
                    </span>
                    <span className="text-xl font-bold font-display my-0.5">
                      {dayGroup.dayOfMonth}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-paper-2 text-accent'
                      }`}
                    >
                      {dayGroup.events.length} {isHe ? 'פעילויות' : 'events'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chronological Day-by-Day Timeline */}
          <div className="space-y-6">
            {displayDayGroups.map((dayGroup) => {
              if (dayGroup.events.length === 0 && selectedDate === 'all') return null;

              return (
                <div key={dayGroup.dateStr} className="hallmark-plate overflow-hidden">
                  {/* Day Banner */}
                  <div className="px-5 py-4 bg-paper-2 border-b border-rule flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-ink text-paper flex flex-col items-center justify-center font-display shadow-sm shrink-0">
                        <span className="text-[10px] font-semibold uppercase text-accent tracking-wider">
                          {isHe ? dayGroup.dayShortHe : dayGroup.dayShortEn}
                        </span>
                        <span className="text-lg font-bold leading-none mt-0.5">
                          {dayGroup.dayOfMonth}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg sm:text-xl font-bold text-ink">
                            {isHe ? dayGroup.formattedDateHe : dayGroup.formattedDateEn}
                          </h3>
                          {dayGroup.isToday && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent text-white shadow-xs">
                              {isHe ? 'היום' : 'Today'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {dayGroup.events.length} {isHe ? 'פעילויות מתוכננות בתאריך זה' : 'scheduled activities for this date'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-ink-2 bg-plate px-3 py-1.5 rounded-full border border-rule">
                      {dayGroup.dateStr}
                    </span>
                  </div>

                  {dayGroup.events.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted">
                      {isHe
                        ? 'אין אירועים משובצים ליום זה כרגע.'
                        : 'No events scheduled for this day yet.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-rule">
                      {dayGroup.events.map((ev) => {
                        const badge = entityBadge(ev.type);
                        const title = isHe ? ev.titleHe : ev.titleEn;
                        const desc = isHe ? ev.descriptionHe : ev.descriptionEn;
                        const loc = isHe ? ev.locationDetailsHe : ev.locationDetailsEn;
                        const host = isHe ? ev.hostName : ev.hostNameEn || ev.hostName;
                        const gcalLink = buildGoogleCalendarUrl({
                          title,
                          description: `${desc}\nHost: ${host} (${ev.hostPhone})`,
                          location: `${loc}, ${ev.area}, South Goa`,
                          startDate: ev.date || dayGroup.dateStr,
                          startTime: ev.startTime || '16:00',
                          endTime: ev.endTime || '18:00',
                        });

                        return (
                          <div
                            key={`${dayGroup.dateStr}-${ev.id}`}
                            onClick={() => handleEntityClick(ev)}
                            className="p-4 sm:p-5 hover:bg-paper-2/50 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                              {/* Left/Start: Time Column + Event Details */}
                              <div className="flex items-start gap-4 min-w-0">
                                {/* Chronological Time Badge */}
                                <div className="w-24 sm:w-28 shrink-0 rounded-2xl bg-paper-2 border border-rule p-2.5 text-center">
                                  <div className="hallmark-code text-sm sm:text-base font-bold text-ink">
                                    {ev.startTime || '10:00'}
                                  </div>
                                  {ev.endTime && (
                                    <div className="hallmark-code text-[11px] text-muted">
                                      {isHe ? `עד ${ev.endTime}` : `to ${ev.endTime}`}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1.5 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.classes}`}
                                    >
                                      {badge.label}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2">
                                      <MapPin className="w-3 h-3 text-accent" />
                                      {areaLabel(ev.area)} · {loc}
                                    </span>
                                    {ev.date && (
                                      <span className="text-xs font-medium text-accent">
                                        ({ev.date})
                                      </span>
                                    )}
                                  </div>

                                  <h4 className="font-display text-lg font-bold text-ink">
                                    {title}
                                  </h4>

                                  <p className="text-xs sm:text-sm text-ink-2 line-clamp-2">
                                    {desc}
                                  </p>

                                  <div className="text-xs text-muted">
                                    {isHe ? `מארח/ת: ${host}` : `Host: ${host}`}
                                  </div>
                                </div>
                              </div>

                              {/* Right/End: Price + Quick Actions */}
                              <div className="flex sm:flex-row md:flex-col items-center md:items-end justify-between gap-2.5 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-rule">
                                <div className="font-display text-sm sm:text-base font-bold text-ink">
                                  {formatPrice(ev)}
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={gcalLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-3 py-1.5 rounded-full border border-rule-strong bg-plate text-xs font-semibold text-ink hover:bg-paper-2 transition-colors"
                                  >
                                    {isHe ? '+ ליומן שלי' : '+ Google Cal'}
                                  </a>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEntityClick(ev);
                                    }}
                                    className="hallmark-btn-primary text-xs !py-1.5 !px-3.5"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>{isHe ? 'פרטים והרשמה' : 'Book'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ) : (
        /* =====================================================================
           MODE B: CLEAN MODERN CARDS GRID
           ===================================================================== */
        <>
          {filteredEntities.length === 0 ? (
            <div className="hallmark-plate p-10 text-center space-y-4">
              <h3 className="font-display text-xl font-bold text-ink">
                {isHe ? 'לא נמצאו תוצאות לחיפוש זה' : 'No matching listings found'}
              </h3>
              <p className="text-sm text-muted max-w-md mx-auto">
                {isHe
                  ? 'נסו לבחור "הכל" או לעבור בין החופים כדי לראות את כל האירועים והבתים הפעילים.'
                  : 'Try selecting "All" or clearing the search box to see all active listings.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('all');
                  setSelectedArea('all');
                  setSearchQuery('');
                }}
                className="hallmark-btn-secondary text-sm"
              >
                {isHe ? 'הצג את כל הלוח' : 'Show All Listings'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEntities.map((item) => {
                const badge = entityBadge(item.type);
                const title = isHe ? item.titleHe : item.titleEn;
                const desc = isHe ? item.descriptionHe : item.descriptionEn;
                const locationName = isHe ? item.locationDetailsHe : item.locationDetailsEn;
                const hostName = isHe ? item.hostName : item.hostNameEn || item.hostName;

                return (
                  <article
                    key={item.id}
                    onClick={() => handleEntityClick(item)}
                    className="hallmark-plate overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-lg hover:border-rule-strong transition-all group"
                  >
                    <div>
                      {/* Atmospheric Image Header */}
                      {item.imageUrl ? (
                        <div className="relative h-44 w-full overflow-hidden bg-paper-2">
                          <img
                            src={item.imageUrl}
                            alt={title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                          <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${badge.classes}`}
                            >
                              {badge.label}
                            </span>
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-ink shadow-sm inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-accent" />
                              {areaLabel(item.area)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 pb-0 flex items-center justify-between gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.classes}`}
                          >
                            {badge.label}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-paper-2 text-ink inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-accent" />
                            {areaLabel(item.area)}
                          </span>
                        </div>
                      )}

                      {/* Card Main Content */}
                      <div className="p-5 space-y-3">
                        <h3 className="font-display text-xl font-bold text-ink group-hover:text-accent transition-colors leading-snug">
                          {title}
                        </h3>

                        <p className="text-sm text-ink-2 line-clamp-2 leading-relaxed">{desc}</p>

                        {/* Simple, Clear Details Box */}
                        <div className="pt-2 space-y-1.5 text-xs sm:text-sm text-ink-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-accent shrink-0" />
                            <span className="font-medium text-ink">{formatWhen(item)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted shrink-0" />
                            <span className="truncate">
                              {locationName} · {isHe ? `מארח/ת: ${hostName}` : `Host: ${hostName}`}
                            </span>
                          </div>
                          {item.type === 'rental' && (item.hasFiberWifi || item.hasPowerBackup) && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {item.hasFiberWifi && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-paper-2 text-xs font-medium text-ink">
                                  <Wifi className="w-3 h-3 text-accent" />
                                  {isHe ? 'סיבים אופטיים' : 'Fiber WiFi'}
                                </span>
                              )}
                              {item.hasPowerBackup && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-paper-2 text-xs font-medium text-ink">
                                  <Zap className="w-3 h-3 text-accent" />
                                  {isHe ? 'גיבוי חשמל' : 'Power Backup'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Single Clear Action Bar */}
                    <div className="px-5 py-4 bg-paper/60 border-t border-rule flex items-center justify-between gap-3">
                      <div className="font-display text-base font-bold text-ink">
                        {formatPrice(item)}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEntityClick(item);
                        }}
                        className="hallmark-btn-primary text-xs sm:text-sm !py-2 !px-4"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{isHe ? 'פרטים והרשמה' : 'Details & Book'}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Bottom Banner for Providers */}
      <section className="hallmark-band-ink p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-paper">
            {isHe
              ? 'מארגנים אירוע, מעבירים סדנה או משכירים בית בגואה?'
              : 'Hosting an event, teaching a class, or renting a home in Goa?'}
          </h2>
          <p className="text-sm text-paper/80">
            {isHe
              ? 'פרסום אירועים מתבצע באישור מנהלי הקהילה כדי לשמור על איכות ודיוק הלוח.'
              : 'Event publishing is moderated by community admins to maintain quality.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isAdmin ? (
            <button
              type="button"
              onClick={onGoToProvider}
              className="hallmark-btn-primary text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isHe ? 'הוספת אירוע או בית (אדמין)' : 'Add Listing (Admin)'}</span>
            </button>
          ) : (
            <a
              href={`https://wa.me/972524780033?text=${encodeURIComponent(
                isHe
                  ? 'היי! אשמח לפרסם אירוע / סדנה בלוח הקהילה של LUZ גואה.'
                  : 'Hi! I would like to submit an event to LUZ Goa schedule.'
              )}`}
              target="_blank"
              rel="noreferrer"
              className="hallmark-btn-primary text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isHe ? 'פנייה לפרסום אירוע בוואטסאפ' : 'Contact Admin to List'}</span>
            </a>
          )}
          <button
            type="button"
            onClick={onGoToBusinesses}
            className="px-4 py-2.5 rounded-full border border-paper/40 text-paper text-sm font-semibold hover:bg-paper hover:text-ink transition-colors"
          >
            {isHe ? 'לכל בעלי המקצוע' : 'Community Professionals'}
          </button>
        </div>
      </section>
    </div>
  );
};
