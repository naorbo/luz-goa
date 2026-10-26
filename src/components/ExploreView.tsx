import React, { useState, useMemo } from 'react';
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

interface ExploreViewProps {
  entities: LuzEntity[];
  lang: Language;
  appEnv: AppEnvironment;
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
  userProfile,
  onSelectEntity,
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
        const inHost = item.hostName.toLowerCase().includes(q);
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
          label: isHe ? 'אירוע חד-פעמי' : 'One-Time Event',
          classes: 'bg-terracotta-100 text-terracotta-600',
        };
      case 'workshop':
        return {
          label: isHe ? 'חוג / מתנ"ס קבוע' : 'Recurring / Youth Center',
          classes: 'bg-canopy-100 text-canopy-800',
        };
      case 'service':
        return {
          label: isHe ? 'שירות שעתי / משאב' : 'Hourly / Space Slot',
          classes: 'bg-ochre-100 text-ochre-600',
        };
      case 'rental':
        return {
          label: isHe ? 'השכרת בית (טווח תאריכים)' : 'Home Rental (Date Range)',
          classes: 'bg-lagoon-100 text-lagoon-700',
        };
    }
  };

  const formatPrice = (e: LuzEntity) => {
    if (e.priceCurrency === 'CONTACT') {
      return isHe ? 'פרטים בהרשמה' : 'Contact for details';
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
    <div className="space-y-6">
      {/* Top Filter & Control Bar */}
      <div className="bg-sand-50 rounded-2xl p-4 md:p-5 border border-sand-300 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-canopy-600 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isHe
                  ? 'חיפוש אירוע, סדנת מתנ"ס, אולפן הקלטות או בית להשכרה בקולום...'
                  : 'Search events, Youth Center sessions, hourly spaces, or homes in Colomb...'
              }
              className="w-full ps-10 pe-4 py-2.5 rounded-xl bg-white border border-sand-300 text-sm text-canopy-900 placeholder:text-canopy-600/60"
            />
          </div>

          {/* Right Controls: Personal Filter + View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOnlyRecommended(!onlyRecommended)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                onlyRecommended
                  ? 'bg-ochre-500 text-canopy-950 border-ochre-500'
                  : 'bg-white text-canopy-800 border-sand-300 hover:border-canopy-600'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isHe ? 'מותאם לפרופיל שלי ("בן")' : 'Matched to My Profile ("Ben")'}
            </button>

            <div className="inline-flex rounded-xl bg-sand-200 p-1">
              <button
                type="button"
                onClick={() => setViewMode('timetable')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'timetable'
                    ? 'bg-canopy-800 text-sand-50'
                    : 'text-canopy-700 hover:text-canopy-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                {isHe ? 'לוח שבועי (Timetable)' : 'Weekly Timetable'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('catalog')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'catalog'
                    ? 'bg-canopy-800 text-sand-50'
                    : 'text-canopy-700 hover:text-canopy-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                {isHe ? 'תצוגת קטלוג ורשימה' : 'Catalog & Cards'}
              </button>
            </div>
          </div>
        </div>

        {/* Entity Type & Area Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-sand-200">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', labelHe: 'כל הישויות', labelEn: 'All Entities', dot: 'bg-canopy-600' },
              { id: 'event', labelHe: 'אירועים חד-פעמיים', labelEn: 'One-Time Events', dot: 'bg-terracotta-500' },
              { id: 'workshop', labelHe: 'חוגים ומתנ"ס (4 ימים)', labelEn: 'Youth Center & Classes', dot: 'bg-canopy-600' },
              { id: 'service', labelHe: 'משאבים ושירותים שעתיים', labelEn: 'Hourly & Spaces', dot: 'bg-ochre-500' },
              { id: 'rental', labelHe: 'השכרת בתים (טווח תאריכים)', labelEn: 'Home Rentals (Dates)', dot: 'bg-lagoon-600' },
            ].map((tab) => {
              const active = selectedType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedType(tab.id as any)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-canopy-800 text-sand-50'
                      : 'bg-white text-canopy-700 border border-sand-300 hover:bg-sand-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${tab.dot}`} />
                  {isHe ? tab.labelHe : tab.labelEn}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 bg-white border border-sand-300 rounded-lg px-2.5 py-1 text-xs">
              <MapPin className="w-3.5 h-3.5 text-terracotta-500" />
              <select
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value as any)}
                className="bg-transparent text-canopy-800 font-medium focus:outline-none"
              >
                <option value="all">{isHe ? 'כל אזורי דרום גואה' : 'All South Goa Areas'}</option>
                <option value="Colomb">Colomb (קולום)</option>
                <option value="Patnem">Patnem (פטנם)</option>
                <option value="Palolem">Palolem (פאלולם)</option>
                <option value="Agonda">Agonda (אגונדה)</option>
              </select>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-white border border-sand-300 rounded-lg px-2.5 py-1 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-canopy-600" />
              <select
                value={selectedAudience}
                onChange={(e) => setSelectedAudience(e.target.value as any)}
                className="bg-transparent text-canopy-800 font-medium focus:outline-none"
              >
                <option value="all">{isHe ? 'כל הגילאים' : 'All Ages'}</option>
                <option value="youth_11_15">{isHe ? 'נוער מתנ"ס (11–15)' : 'Youth (11–15)'}</option>
                <option value="families">{isHe ? 'משפחות וילדים' : 'Families & Kids'}</option>
                <option value="adults">{isHe ? 'מבוגרים ויזמים' : 'Adults'}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* CLEAN PROD EMPTY STATE (Strict Zero Fake Data in PROD) */}
      {entities.length === 0 && appEnv === 'prod' ? (
        <div className="bg-sand-50 rounded-2xl border border-sand-300 p-8 md:p-12 text-center space-y-5 animate-reveal">
          <div className="w-12 h-12 rounded-2xl bg-canopy-900 text-ochre-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-canopy-900">
              {isHe
                ? 'סביבת PROD נקייה — ממתינה לנתוני אמת בלבד'
                : 'PROD Environment Ready — Verified Real Data Only'}
            </h2>
            <p className="text-sm text-canopy-700 leading-relaxed">
              {isHe
                ? 'לבקשתך, סביבת הפרודקשן מכילה אך ורק אירועים, מפגשי מתנ"ס, בתים ובעלי עסקים אמיתיים שתספק. לצפייה בלוח מלא עם נתוני הדגמה (כולל שיאצו, קוסמטיקאית, מקעקעת, מאמן איגרוף ועוד), עבור לסביבת ה-TEST.'
                : 'Production holds strictly verified Goa community listings. Switch to the TEST environment to explore full demo data, or publish your first verified listing now.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onGoToProvider}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta-500 text-white text-xs md:text-sm font-semibold hover:bg-terracotta-600 transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              {isHe ? 'העלאת אירוע / בית אמיתי ראשון' : 'Publish First Real Listing'}
            </button>

            <button
              type="button"
              onClick={onGoToBusinesses}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-canopy-800 text-sand-50 text-xs md:text-sm font-semibold hover:bg-canopy-700 transition-colors"
            >
              <Briefcase className="w-4 h-4 text-ochre-400" />
              {isHe ? 'למתחם בעלי עסקים בקהילה' : 'Community Business Directory'}
            </button>

            <button
              type="button"
              onClick={onSwitchToTest}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-sand-300 text-canopy-900 text-xs md:text-sm font-semibold hover:bg-sand-100 transition-colors"
            >
              <FlaskConical className="w-4 h-4 text-ochre-600" />
              {isHe ? 'מעבר לסביבת TEST (הדגמה מלאה)' : 'Switch to TEST (Demo Data)'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* VIEW MODE 1: WEEKLY TIMETABLE RHYTHM */}
          {viewMode === 'timetable' && (
            <div className="space-y-6 animate-reveal">
              {selectedType !== 'rental' && (
                <div className="bg-sand-50 rounded-2xl border border-sand-300 overflow-hidden">
                  <div className="bg-canopy-900 text-sand-50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display text-lg font-bold">
                        {isHe
                          ? 'לוח השבוע של הקהילה ומרכז הנוער (ב׳–ו׳)'
                          : 'Goa Community & Youth Center Weekly Timetable (Mon–Fri)'}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-sand-200">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-terracotta-500" />
                        {isHe ? 'אירוע חד-פעמי' : 'Event'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-canopy-500" />
                        {isHe ? 'מתנ"ס / חוג קבוע' : 'Youth Center / Class'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-ochre-500" />
                        {isHe ? 'משאב שעתי (לפי משבצת)' : 'Hourly Slot'}
                      </span>
                    </div>
                  </div>

                  {/* 5-Column Timetable Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x md:rtl:divide-x-reverse divide-sand-300">
                    {WEEK_DAYS.map((day) => {
                      const dayItems = getEntitiesForDay(day.dayIndex);
                      return (
                        <div key={day.dayIndex} className="flex flex-col min-h-[340px]">
                          <div className="p-3.5 bg-sand-100 border-b border-sand-300 flex items-center justify-between">
                            <div>
                              <div className="font-bold text-sm text-canopy-900">
                                {isHe ? day.nameHe : day.nameEn}
                              </div>
                              <div className="text-xs text-canopy-600 font-medium">
                                {isHe ? day.subHe : day.subEn}
                              </div>
                            </div>
                            <span className="text-xs font-mono px-2 py-0.5 rounded bg-sand-200 text-canopy-800 tabular-nums">
                              {dayItems.length}
                            </span>
                          </div>

                          <div className="p-3 space-y-2.5 flex-1">
                            {dayItems.length === 0 ? (
                              <div className="text-xs text-canopy-500/60 py-8 text-center">
                                {isHe ? 'אין פעילויות מסוננות ליום זה' : 'No matching items'}
                              </div>
                            ) : (
                              dayItems.map((item) => {
                                const badge = entityBadge(item.type);
                                return (
                                  <div
                                    key={`${day.dayIndex}-${item.id}`}
                                    onClick={() => onSelectEntity(item)}
                                    className="group p-3 rounded-xl bg-white border border-sand-300 hover:border-canopy-700 transition-all cursor-pointer space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span
                                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${badge.classes}`}
                                      >
                                        {badge.label}
                                      </span>
                                      <span className="text-xs font-mono font-semibold text-canopy-700 tabular-nums">
                                        {item.type === 'service'
                                          ? `${item.timeSlots?.[0] || '09:00'}+`
                                          : item.startTime || '17:00'}
                                      </span>
                                    </div>

                                    <h3 className="font-semibold text-sm text-canopy-900 group-hover:text-terracotta-600 transition-colors leading-snug">
                                      {isHe ? item.titleHe : item.titleEn}
                                    </h3>

                                    {item.weekCycle && item.weekCycle !== 'all' && (
                                      <div className="text-[11px] font-medium text-canopy-700 bg-sand-100 px-2 py-0.5 rounded inline-block">
                                        {item.weekCycle === 'week_a'
                                          ? isHe
                                            ? 'לסירוגין: שבוע א׳ / שבוע ב׳'
                                            : 'Alternating Week A / B'
                                          : isHe
                                          ? 'שבוע א׳: ג׳אם / שבוע ב׳: מייקרים'
                                          : 'Week A: Jam / Week B: Makers'}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-canopy-600 pt-1 border-t border-sand-100">
                                      <span className="inline-flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-terracotta-500" />
                                        {item.area}
                                      </span>
                                      <span className="font-semibold text-canopy-800 tabular-nums">
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
                </div>
              )}

              {/* Property Rentals Strip (Date Range Entities) */}
              {(selectedType === 'all' || selectedType === 'rental') && rentalsList.length > 0 && (
                <div className="bg-sand-50 rounded-2xl border border-sand-300 p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-lagoon-100 text-lagoon-700 flex items-center justify-center">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-bold text-canopy-900">
                          {isHe
                            ? 'בתים וסאבלטים להשכרה בקהילה (שריון לפי טווח תאריכים)'
                            : 'Community Homes & Sublets (Date-Range Booking)'}
                        </h2>
                        <p className="text-xs text-canopy-600">
                          {isHe
                            ? 'בתים מאומתים עם סיבים אופטיים וגיבוי חשמל בקולום ופטנם'
                            : 'Verified homes with Fiber Wi-Fi and power backup in Colomb & Patnem'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {rentalsList.map((rental) => (
                      <div
                        key={rental.id}
                        onClick={() => onSelectEntity(rental)}
                        className="group bg-white rounded-xl border border-sand-300 overflow-hidden hover:border-lagoon-600 transition-all cursor-pointer flex flex-col sm:flex-row"
                      >
                        <div className="sm:w-48 h-44 sm:h-auto relative shrink-0 overflow-hidden">
                          <img
                            src={rental.imageUrl}
                            alt={isHe ? rental.titleHe : rental.titleEn}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <span className="absolute top-2.5 start-2.5 px-2.5 py-1 rounded-md bg-canopy-950/80 text-sand-50 text-xs font-semibold tabular-nums">
                            {rental.bedrooms} {isHe ? 'חדרי שינה' : 'BHK'}
                          </span>
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between gap-2 text-xs text-lagoon-700 font-semibold mb-1">
                              <span>{rental.area}</span>
                              <span className="tabular-nums">
                                {rental.availableFrom} → {rental.availableTo}
                              </span>
                            </div>
                            <h3 className="font-display text-lg font-bold text-canopy-900 group-hover:text-lagoon-700 transition-colors">
                              {isHe ? rental.titleHe : rental.titleEn}
                            </h3>
                            <p className="text-xs text-canopy-600 line-clamp-2 mt-1">
                              {isHe ? rental.descriptionHe : rental.descriptionEn}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-sand-200">
                            <div className="flex items-center gap-3 text-xs text-canopy-700">
                              {rental.hasFiberWifi && (
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <Wifi className="w-3.5 h-3.5 text-lagoon-600" />
                                  {rental.wifiSpeedMbps}Mbps
                                </span>
                              )}
                              {rental.hasPowerBackup && (
                                <span className="inline-flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5 text-ochre-600" />
                                  {isHe ? 'אינוורטר/גנרטור' : 'Backup'}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-bold text-canopy-900 tabular-nums">
                              {formatPrice(rental)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW MODE 2: CATALOG & DETAILED CARDS */}
          {viewMode === 'catalog' && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 animate-reveal">
              {filteredEntities.map((entity) => {
                const badge = entityBadge(entity.type);
                return (
                  <div
                    key={entity.id}
                    onClick={() => onSelectEntity(entity)}
                    className="group bg-sand-50 rounded-2xl border border-sand-300 hover:border-canopy-700 overflow-hidden flex flex-col justify-between transition-all cursor-pointer"
                  >
                    <div>
                      <div className="relative h-44 overflow-hidden bg-canopy-900">
                        <img
                          src={entity.imageUrl}
                          alt={isHe ? entity.titleHe : entity.titleEn}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-canopy-950/80 via-transparent to-transparent" />
                        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${badge.classes}`}
                          >
                            {badge.label}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-canopy-950/75 text-sand-50 text-xs font-semibold tabular-nums">
                            {formatPrice(entity)}
                          </span>
                        </div>
                        <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between text-xs text-sand-100">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-ochre-400" />
                            {isHe ? entity.locationDetailsHe : entity.locationDetailsEn}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <h3 className="font-display text-xl font-bold text-canopy-900 group-hover:text-terracotta-600 transition-colors leading-snug">
                          {isHe ? entity.titleHe : entity.titleEn}
                        </h3>
                        <p className="text-xs text-canopy-700 leading-relaxed line-clamp-3">
                          {isHe ? entity.descriptionHe : entity.descriptionEn}
                        </p>

                        <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-canopy-700">
                          {entity.type === 'event' && (
                            <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                              <Clock className="w-3.5 h-3.5 text-terracotta-500" />
                              {entity.date} | {entity.startTime}–{entity.endTime}
                            </span>
                          )}
                          {entity.type === 'workshop' && (
                            <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                              <Clock className="w-3.5 h-3.5 text-canopy-600" />
                              {isHe ? 'קבוע שבועי' : 'Weekly'} | {entity.startTime}–{entity.endTime}
                            </span>
                          )}
                          {entity.type === 'service' && (
                            <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                              <CheckCircle2 className="w-3.5 h-3.5 text-ochre-600" />
                              {entity.timeSlots?.length || 4}{' '}
                              {isHe ? 'משבצות יומן פנויות' : 'slots available'}
                            </span>
                          )}
                          {entity.type === 'rental' && (
                            <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                              <Home className="w-3.5 h-3.5 text-lagoon-600" />
                              {entity.availableFrom} → {entity.availableTo}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3.5 bg-sand-100 border-t border-sand-200 flex items-center justify-between">
                      <div className="text-xs text-canopy-600 truncate max-w-[60%]">
                        {entity.hostName}
                      </div>
                      <span className="text-xs font-semibold text-terracotta-600 group-hover:underline">
                        {entity.type === 'rental'
                          ? isHe
                            ? 'בדיקת תאריכים ושריון ←'
                            : 'Check Dates →'
                          : entity.type === 'service'
                          ? isHe
                            ? 'בחירת משבצת ביומן ←'
                            : 'Pick Time Slot →'
                          : isHe
                          ? 'הרשמה + תזכורת ←'
                          : 'RSVP & Reminder →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
