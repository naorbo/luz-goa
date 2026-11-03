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
} from 'lucide-react';
import {
  LuzEntity,
  EntityType,
  GoaArea,
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

const DAY_NAMES_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ExploreView: React.FC<ExploreViewProps> = ({
  entities,
  lang,
  onSelectEntity,
  onOpenBenBot,
  onGoToProvider,
  onGoToBusinesses,
}) => {
  const isHe = lang === 'he';

  const [selectedType, setSelectedType] = useState<EntityType | 'all'>('all');
  const [selectedArea, setSelectedArea] = useState<GoaArea | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const catalogSectionRef = useRef<HTMLDivElement>(null);

  const handleScrollToCatalog = () => {
    catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      const dayLabel = isHe ? `יום ${DAY_NAMES_HE[e.dayOfWeek]}` : DAY_NAMES_EN[e.dayOfWeek];
      return `${dayLabel} · ${e.startTime}`;
    }
    if (e.date) {
      return `${e.date} · ${e.startTime}`;
    }
    return `${e.startTime}${e.endTime ? ` – ${e.endTime}` : ''}`;
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

  return (
    <div className="space-y-8">
      {/* Clean Modern Hero with 3 Visual Goa Category Cards */}
      <ScrollCraftHero
        lang={lang}
        onSelectCategory={(type) => setSelectedType(type)}
        onScrollToCatalog={handleScrollToCatalog}
        onOpenBenBot={onOpenBenBot}
        totalEntities={entities.length}
      />

      {/* Simple, Non-Technical Filter Bar */}
      <section
        ref={catalogSectionRef}
        aria-label={isHe ? 'סינון אירועים ובתים' : 'Filter Listings'}
        className="hallmark-plate p-5 sm:p-6 space-y-4"
      >
        {/* Row 1: Big Category Buttons + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {categoryTabs.map((tab) => {
              const Icon = tab.icon;
              const active = selectedType === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedType(tab.id)}
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

          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-muted absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isHe ? 'חיפוש לפי שם, חוף או מארח...' : 'Search by name, beach or host...'}
              className="w-full ps-10 pe-4 py-2.5 rounded-full bg-paper border border-rule-strong text-sm text-ink placeholder:text-muted"
            />
          </div>
        </div>

        {/* Row 2: Simple Beach Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-rule">
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
      </section>

      {/* Clean Modern Cards Grid */}
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
                onClick={() => onSelectEntity(item)}
                className="hallmark-plate overflow-hidden flex flex-col justify-between cursor-pointer hover:shadow-lg hover:border-rule-strong transition-all group"
              >
                <div>
                  {/* Optional Atmospheric Image Header */}
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
                      onSelectEntity(item);
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

      {/* Simple Bottom Banner for Providers */}
      <section className="hallmark-band-ink p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-paper">
            {isHe
              ? 'מארגנים אירוע, מעבירים סדנה או משכירים בית בגואה?'
              : 'Hosting an event, teaching a class, or renting a home in Goa?'}
          </h2>
          <p className="text-sm text-paper/80">
            {isHe
              ? 'העלו את הפרסום שלכם בלוח הקהילה בחינם וקבלו פניות ישירות לוואטסאפ.'
              : 'Add your listing to the community board for free and get direct WhatsApp inquiries.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onGoToProvider}
            className="hallmark-btn-primary text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isHe ? 'הוספת אירוע או בית' : 'Add Listing'}</span>
          </button>
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
