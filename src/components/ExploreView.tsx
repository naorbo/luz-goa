import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  LayoutGrid,
  Search,
  MapPin,
  Clock,
  Wifi,
  Zap,
  Home,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  ShieldCheck,
  FlaskConical,
  PlusCircle,
  Briefcase,
} from 'lucide-react';
import {
  LuzEntity,
  EntityType,
  GoaArea,
  AudienceGroup,
  Language,
  UserProfile,
  AppEnvironment,
} from '../types/luz';
import { ScrollCraftHero } from './ScrollCraftHero';

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
}

const WEEK_DAYS = [
  { dayIndex: 1, nameHe: 'יום שני', subHe: 'Game On מתנ"ס', nameEn: 'Monday', subEn: 'Game On' },
  { dayIndex: 2, nameHe: 'יום שלישי', subHe: 'Open Minds מתנ"ס', nameEn: 'Tuesday', subEn: 'Open Minds' },
  { dayIndex: 3, nameHe: 'יום רביעי', subHe: 'Screen / Scene', nameEn: 'Wednesday', subEn: 'Screen / Scene' },
  { dayIndex: 4, nameHe: 'יום חמישי', subHe: 'Noise / Makers', nameEn: 'Thursday', subEn: 'Makers Lab' },
  { dayIndex: 5, nameHe: 'יום שישי', subHe: 'קבלת שבת וקהילה', nameEn: 'Friday', subEn: 'Community Shabbat' },
];

export const ExploreView: React.FC<ExploreViewProps> = ({
  entities,
  lang,
  appEnv,
  isAdmin = false,
  userProfile,
  onSelectEntity,
  onOpenBenBot,
  onSwitchToTest,
  onGoToProvider,
  onGoToBusinesses,
}) => {
  const isHe = lang === 'he';

  const [viewMode, setViewMode] = useState<'timetable' | 'catalog'>('timetable');
  const [selectedType, setSelectedType] = useState<EntityType | 'all'>('all');
  const [selectedArea, setSelectedArea] = useState<GoaArea | 'all'>('all');
  const [selectedAudience, setSelectedAudience] = useState<AudienceGroup | 'all'>('all');
  const [onlyRecommended, setOnlyRecommended] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const catalogSectionRef = useRef<HTMLDivElement>(null);

  const handleScrollToCatalog = () => {
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredEntities = useMemo(() => {
    return entities.filter((item) => {
      if (selectedType !== 'all' && item.type !== selectedType) return false;
      if (selectedArea !== 'all' && item.area !== selectedArea) return false;
      if (selectedAudience !== 'all' && item.audience !== selectedAudience && item.audience !== 'all') {
        return false;
      }
      if (onlyRecommended) {
        const matchesArea =
          userProfile.preferredArea === 'All' || item.area === userProfile.preferredArea;
        const matchesTag = item.tags.some((t) =>
          userProfile.interests.some((int) => t.toLowerCase().includes(int.toLowerCase()))
        );
        const matchesYouth =
          userProfile.kidsAges.some((a) => a >= 10 && a <= 16) && item.audience === 'youth_11_15';
        if (!matchesArea && !matchesTag && !matchesYouth) return false;
      }
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
  }, [
    entities,
    selectedType,
    selectedArea,
    selectedAudience,
    onlyRecommended,
    searchQuery,
    userProfile,
  ]);

  const entityBadge = (type: EntityType) => {
    switch (type) {
      case 'event':
        return {
          label: isHe ? 'אירוע' : 'Event',
          classes: 'bg-accent-soft text-ink border border-accent/40',
        };
      case 'workshop':
        return {
          label: isHe ? 'חוג / מתנ"ס' : 'Youth Center',
          classes: 'bg-paper-2 text-ink border border-rule',
        };
      case 'service':
        return {
          label: isHe ? 'משבצת שעתית' : 'Hourly Slot',
          classes: 'bg-paper-2 text-ink-2 border border-rule',
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
      return isHe ? 'פרטים בהרשמה' : 'Contact host';
    }
    if (e.priceCurrency === 'FREE' || e.priceAmount === 0) {
      return isHe ? 'כניסה חופשית' : 'Free Entry';
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

  const getEntitiesForDay = (dayIdx: number) => {
    return filteredEntities.filter((e) => {
      if (e.type === 'rental') return false;
      if (e.type === 'workshop' && e.dayOfWeek === dayIdx) return true;
      if (e.type === 'event' && e.date) {
        const d = new Date(e.date).getDay();
        return d === dayIdx;
      }
      if (e.type === 'service' && e.availableDays?.includes(dayIdx)) return true;
      return false;
    });
  };

  const rentalsList = useMemo(
    () => filteredEntities.filter((e) => e.type === 'rental'),
    [filteredEntities]
  );

  return (
    <div className="space-y-12">
      {/* Hallmark Stage Hero */}
      <ScrollCraftHero
        lang={lang}
        onSelectCategory={(type) => setSelectedType(type)}
        onScrollToCatalog={handleScrollToCatalog}
        onOpenBenBot={onOpenBenBot}
        totalEntities={entities.length}
      />

      {/* Hallmark Editorial Filter & Index Ledger Bar */}
      <section
        ref={catalogSectionRef}
        aria-label={isHe ? 'סינון וחיפוש בלוח' : 'Schedule Filter Controls'}
        className="bg-paper-2 border-y-2 border-ink p-5 md:p-6 space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-muted absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="search"
              name="schedule-search"
              aria-label={isHe ? 'חיפוש בלוח הקהילה' : 'Search schedule'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isHe
                  ? 'חיפוש אירוע, סדנה, אולפן הקלטות או בית להשכרה בקולום ופטנם...'
                  : 'Search events, Youth Center sessions, hourly spaces, or homes in Patnem...'
              }
              className="w-full ps-10 pe-4 py-2.5 bg-plate border border-ink text-sm text-ink placeholder:text-muted"
            />
          </div>

          {/* Right Controls: Personal Filter + View Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setOnlyRecommended(!onlyRecommended)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold border transition-colors ${
                onlyRecommended
                  ? 'bg-accent text-accent-ink border-ink'
                  : 'bg-plate text-ink border-ink hover:bg-paper'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isHe ? 'מותאם לפרופיל שלי ("בן")' : 'Matched to My Profile'}</span>
            </button>

            <div
              className="inline-flex bg-plate border border-ink p-0.5"
              role="group"
              aria-label="View Mode Switcher"
            >
              <button
                type="button"
                onClick={() => setViewMode('timetable')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'timetable'
                    ? 'bg-ink text-paper'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>{isHe ? 'לוח שבועי' : 'Weekly Timetable'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('catalog')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  viewMode === 'catalog'
                    ? 'bg-ink text-paper'
                    : 'text-ink-2 hover:text-ink'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{isHe ? 'קטלוג מלא' : 'Catalog Cards'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Entity Type & Area Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-rule">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', labelHe: 'כל הלוח', labelEn: 'All Listings' },
              { id: 'event', labelHe: 'אירועים ומפגשים', labelEn: 'Events & Gatherings' },
              { id: 'workshop', labelHe: 'חוגים ומתנ"ס', labelEn: 'Youth Center & Classes' },
              { id: 'service', labelHe: 'סדנאות ומשאבים שעתיים', labelEn: 'Hourly & Practitioners' },
              { id: 'rental', labelHe: 'בתים ווילות להשכרה', labelEn: 'Homes & Villas' },
            ].map((tab) => {
              const active = selectedType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedType(tab.id as any)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-plate text-ink-2 border-rule hover:border-ink hover:text-ink'
                  }`}
                >
                  <span>{isHe ? tab.labelHe : tab.labelEn}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-plate border border-ink px-2.5 py-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              <select
                aria-label={isHe ? 'סינון לפי אזור' : 'Filter by area'}
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value as any)}
                className="bg-transparent text-ink font-medium focus:outline-none"
              >
                <option value="all">{isHe ? 'כל אזורי דרום גואה' : 'All South Goa Areas'}</option>
                <option value="Colomb">{isHe ? 'קולום (Colomb)' : 'Colomb'}</option>
                <option value="Patnem">{isHe ? 'פטנם (Patnem)' : 'Patnem'}</option>
                <option value="Palolem">{isHe ? 'פאלולם (Palolem)' : 'Palolem'}</option>
                <option value="Agonda">{isHe ? 'אגונדה (Agonda)' : 'Agonda'}</option>
              </select>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-plate border border-ink px-2.5 py-1.5 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted" />
              <select
                aria-label={isHe ? 'סינון לפי קהל יעד' : 'Filter by audience'}
                value={selectedAudience}
                onChange={(e) => setSelectedAudience(e.target.value as any)}
                className="bg-transparent text-ink font-medium focus:outline-none"
              >
                <option value="all">{isHe ? 'כל הגילאים' : 'All Ages'}</option>
                <option value="youth_11_15">{isHe ? 'נוער מתנ"ס (11 עד 15)' : 'Youth (11 to 15)'}</option>
                <option value="families">{isHe ? 'משפחות וילדים' : 'Families & Kids'}</option>
                <option value="adults">{isHe ? 'מבוגרים ויזמים' : 'Adults'}</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* CLEAN PROD EMPTY STATE */}
      {entities.length === 0 && appEnv === 'prod' ? (
        <div className="hallmark-plate p-8 md:p-12 text-center space-y-5">
          <div className="w-12 h-12 bg-ink text-gold flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-ink">
              {isHe
                ? 'לוח הקהילה של דרום גואה מתעדכן'
                : 'South Goa Community Board Ready'}
            </h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              {isHe
                ? 'לוח הקהילה מציג אירועים, מפגשי מתנ"ס, בתים ובעלי עסקים מאומתים בדרום גואה. ניתן להעלות אירוע או בית חדש כבר עכשיו.'
                : 'Discover verified Goa community events, Youth Center sessions, homes, and local businesses. Publish a new listing below.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={onGoToProvider}
              className="hallmark-btn-primary text-xs md:text-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isHe ? 'העלאת אירוע / בית חדש' : 'Publish New Listing'}</span>
            </button>

            <button
              type="button"
              onClick={onGoToBusinesses}
              className="hallmark-btn-ink text-xs md:text-sm"
            >
              <Briefcase className="w-4 h-4 text-gold" />
              <span>{isHe ? 'למתחם בעלי עסקים בקהילה' : 'Community Business Directory'}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={onSwitchToTest}
                className="px-4 py-2 bg-plate border border-ink text-ink text-xs md:text-sm font-semibold hover:bg-paper-2 transition-colors inline-flex items-center gap-2"
              >
                <FlaskConical className="w-4 h-4 text-accent" />
                <span>{isHe ? 'מעבר לסביבת TEST (אדמין)' : 'Switch to TEST (Admin)'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* VIEW MODE 1: WEEKLY TIMETABLE RHYTHM (Hallmark Schedule Composition) */}
          {viewMode === 'timetable' && (
            <div className="space-y-12">
              {selectedType !== 'rental' && (
                <section className="space-y-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-2xl md:text-3xl font-semibold text-ink">
                        {isHe
                          ? 'לוח השבוע של הקהילה ומרכז הנוער'
                          : 'Weekly Community & Youth Center Schedule'}
                      </h2>
                      <p className="text-sm text-muted mt-1">
                        {isHe
                          ? 'ימים שני עד שישי לאורך החוף הדרומי. לחצו על כל משבצת לפרטים והרשמה בוואטסאפ.'
                          : 'Monday through Friday across the South Coast. Select any slot for details and direct WhatsApp RSVP.'}
                      </p>
                    </div>
                  </div>

                  {/* 5-Column Ruled Almanac Timetable */}
                  <div className="border-2 border-ink bg-plate shadow-card grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x md:rtl:divide-x-reverse divide-rule">
                    {WEEK_DAYS.map((day) => {
                      const dayItems = getEntitiesForDay(day.dayIndex);
                      return (
                        <div key={day.dayIndex} className="flex flex-col min-h-[340px]">
                          <div className="p-3.5 bg-paper-2 border-b-2 border-ink flex items-center justify-between">
                            <div>
                              <div className="font-serif font-semibold text-base text-ink">
                                {isHe ? day.nameHe : day.nameEn}
                              </div>
                              <div className="text-xs text-muted">
                                {isHe ? day.subHe : day.subEn}
                              </div>
                            </div>
                            <span className="text-xs hallmark-code px-2 py-0.5 bg-plate border border-rule text-ink">
                              {dayItems.length}
                            </span>
                          </div>

                          <div className="p-3 space-y-3 flex-1">
                            {dayItems.length === 0 ? (
                              <div className="text-xs text-muted py-8 text-center">
                                {isHe ? 'אין פעילויות מסוננות ליום זה' : 'No matching items'}
                              </div>
                            ) : (
                              dayItems.map((item) => {
                                const badge = entityBadge(item.type);
                                return (
                                  <div
                                    key={`${day.dayIndex}-${item.id}`}
                                    onClick={() => onSelectEntity(item)}
                                    className="group p-3.5 bg-paper border border-rule hover:border-ink transition-colors cursor-pointer space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span
                                        className={`text-[11px] font-medium px-2 py-0.5 ${badge.classes}`}
                                      >
                                        {badge.label}
                                      </span>
                                      <span className="text-xs hallmark-code font-semibold text-ink">
                                        {item.type === 'service'
                                          ? `${item.timeSlots?.[0] || '09:00'}+`
                                          : item.startTime || '17:00'}
                                      </span>
                                    </div>

                                    <h3 className="font-serif font-semibold text-base text-ink group-hover:text-accent transition-colors leading-snug">
                                      {isHe ? item.titleHe : item.titleEn}
                                    </h3>

                                    {item.weekCycle && item.weekCycle !== 'all' && (
                                      <div className="text-[11px] font-medium text-ink-2 bg-paper-2 px-2 py-0.5 border border-rule inline-block">
                                        {item.weekCycle === 'week_a'
                                          ? isHe
                                            ? 'לסירוגין: שבוע א׳ / שבוע ב׳'
                                            : 'Alternating Week A / B'
                                          : isHe
                                          ? 'שבוע א׳: ג׳אם / שבוע ב׳: מייקרים'
                                          : 'Week A: Jam / Week B: Makers'}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-rule">
                                      <span className="inline-flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-accent" />
                                        {item.area}
                                      </span>
                                      <span className="font-semibold text-ink hallmark-code">
                                        {formatPrice(item)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Property Rentals Section (Hallmark Grid Composition on Plates) */}
              {(selectedType === 'all' || selectedType === 'rental') && rentalsList.length > 0 && (
                <section className="hallmark-rule-top pt-10 space-y-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-2xl md:text-3xl font-semibold text-ink">
                        {isHe
                          ? 'בתים וסאבלטים להשכרה בקהילה'
                          : 'Verified Community Homes & Sublets'}
                      </h2>
                      <p className="text-sm text-muted mt-1">
                        {isHe
                          ? 'בתים מאומתים עם סיבים אופטיים וגיבוי חשמל בקולום, פטנם ופאלולם'
                          : 'Long-stay homes with fiber Wi-Fi and power backup in Colomb, Patnem and Palolem'}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {rentalsList.map((rental) => (
                      <article
                        key={rental.id}
                        onClick={() => onSelectEntity(rental)}
                        className="group hallmark-plate hallmark-plate-interactive cursor-pointer flex flex-col sm:flex-row overflow-hidden"
                      >
                        <div className="sm:w-52 h-48 sm:h-auto relative shrink-0 border-b sm:border-b-0 sm:border-e border-ink bg-paper-2">
                          <img
                            src={rental.imageUrl}
                            alt={isHe ? rental.titleHe : rental.titleEn}
                            width={400}
                            height={300}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2.5 start-2.5 px-2.5 py-0.5 bg-ink text-paper text-xs font-medium hallmark-code">
                            {rental.bedrooms} {isHe ? 'חדרי שינה' : 'BHK'}
                          </span>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex items-center justify-between gap-2 text-xs text-muted mb-1.5">
                              <span className="font-semibold text-ink">{rental.area}</span>
                              <span className="hallmark-code">
                                {rental.availableFrom} · {rental.availableTo}
                              </span>
                            </div>
                            <h3 className="font-serif text-xl font-semibold text-ink group-hover:text-accent transition-colors">
                              {isHe ? rental.titleHe : rental.titleEn}
                            </h3>
                            <p className="text-xs text-ink-2 line-clamp-2 mt-1.5 leading-relaxed">
                              {isHe ? rental.descriptionHe : rental.descriptionEn}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-rule">
                            <div className="flex items-center gap-3 text-xs text-ink-2">
                              {rental.hasFiberWifi && (
                                <span className="inline-flex items-center gap-1 hallmark-code">
                                  <Wifi className="w-3.5 h-3.5 text-forest" />
                                  {rental.wifiSpeedMbps}Mbps
                                </span>
                              )}
                              {rental.hasPowerBackup && (
                                <span className="inline-flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5 text-accent" />
                                  {isHe ? 'גיבוי חשמל' : 'Power Backup'}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-ink hallmark-code">
                              {formatPrice(rental)}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* VIEW MODE 2: CATALOG & DETAILED CARDS (Hallmark Plate Grid, No Type Over Photo) */}
          {viewMode === 'catalog' && (
            <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEntities.map((entity) => {
                const badge = entityBadge(entity.type);
                return (
                  <article
                    key={entity.id}
                    onClick={() => onSelectEntity(entity)}
                    className="group hallmark-plate hallmark-plate-interactive flex flex-col justify-between cursor-pointer overflow-hidden"
                  >
                    <div>
                      {/* Framed Photograph without text overlay (per Hallmark Terrazzo/Solstice rules) */}
                      <div className="h-48 overflow-hidden border-b border-ink bg-paper-2">
                        <img
                          src={entity.imageUrl}
                          alt={isHe ? entity.titleHe : entity.titleEn}
                          width={480}
                          height={320}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Caption & Metadata Strip below the frame */}
                      <div className="px-5 py-2.5 bg-paper-2 border-b border-rule flex items-center justify-between gap-2 text-xs">
                        <span className={`px-2 py-0.5 font-medium ${badge.classes}`}>
                          {badge.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-muted truncate">
                          <MapPin className="w-3 h-3 text-accent shrink-0" />
                          <span>{isHe ? entity.locationDetailsHe : entity.locationDetailsEn}</span>
                        </span>
                      </div>

                      <div className="p-5 space-y-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="font-serif text-xl font-semibold text-ink group-hover:text-accent transition-colors leading-snug">
                            {isHe ? entity.titleHe : entity.titleEn}
                          </h3>
                          <span className="text-sm font-semibold text-ink hallmark-code shrink-0">
                            {formatPrice(entity)}
                          </span>
                        </div>

                        <p className="text-xs text-ink-2 leading-relaxed line-clamp-3">
                          {isHe ? entity.descriptionHe : entity.descriptionEn}
                        </p>

                        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                          {entity.type === 'event' && (
                            <span className="inline-flex items-center gap-1 font-medium hallmark-code text-ink-2">
                              <Clock className="w-3.5 h-3.5 text-accent" />
                              {entity.date} · {entity.startTime} to {entity.endTime}
                            </span>
                          )}
                          {entity.type === 'workshop' && (
                            <span className="inline-flex items-center gap-1 font-medium hallmark-code text-ink-2">
                              <Clock className="w-3.5 h-3.5 text-forest" />
                              {isHe ? 'קבוע שבועי' : 'Weekly'} · {entity.startTime} to {entity.endTime}
                            </span>
                          )}
                          {entity.type === 'service' && (
                            <span className="inline-flex items-center gap-1 font-medium hallmark-code text-ink-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                              {entity.timeSlots?.length || 4}{' '}
                              {isHe ? 'משבצות יומן פנויות' : 'slots available'}
                            </span>
                          )}
                          {entity.type === 'rental' && (
                            <span className="inline-flex items-center gap-1 font-medium hallmark-code text-ink-2">
                              <Home className="w-3.5 h-3.5 text-ink" />
                              {entity.availableFrom} · {entity.availableTo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3.5 bg-paper border-t border-rule flex items-center justify-between">
                      <div className="text-xs text-muted truncate max-w-[60%]">
                        {isHe ? entity.hostName : entity.hostNameEn || entity.hostName}
                      </div>
                      <span className="text-xs font-semibold text-ink group-hover:text-accent underline decoration-rule group-hover:decoration-accent transition-colors">
                        {entity.type === 'rental'
                          ? isHe
                            ? 'בדיקת תאריכים ושריון'
                            : 'Check Dates'
                          : entity.type === 'service'
                          ? isHe
                            ? 'בחירת משבצת ביומן'
                            : 'Pick Time Slot'
                          : isHe
                          ? 'הרשמה ותזכורת'
                          : 'RSVP & Reminder'}
                      </span>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      )}

      {/* Hallmark Closing Ink Band (layout.md § 5.10 Band) */}
      <section className="hallmark-band-ink p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-paper">
            {isHe
              ? 'מארחים סדנה, משכירים וילה או מציעים שירות בדרום גואה?'
              : 'Hosting a workshop, subletting a home or offering a local service?'}
          </h2>
          <p className="text-sm text-paper/80">
            {isHe
              ? 'העלו את המודעה שלכם ללוח הקהילה וקבלו פניות ישירות לוואטסאפ עם קוד אסמכתא #LUZ-XXXX.'
              : 'List your session or property on the South Goa Almanac and receive direct WhatsApp bookings with a #LUZ-XXXX dispatch code.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <button
            type="button"
            onClick={onGoToProvider}
            className="hallmark-btn-primary text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isHe ? 'העלאת אירוע או בית' : 'Publish a Listing'}</span>
          </button>
          <button
            type="button"
            onClick={onGoToBusinesses}
            className="px-4 py-2.5 border border-paper text-paper text-sm font-semibold hover:bg-paper hover:text-ink transition-colors"
          >
            {isHe ? 'אינדקס בעלי המקצוע' : 'Local Business Index'}
          </button>
        </div>
      </section>
    </div>
  );
};
