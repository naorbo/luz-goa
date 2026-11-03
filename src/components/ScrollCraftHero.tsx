import React from 'react';
import {
  Calendar,
  Compass,
  Home,
  ArrowDown,
  MessageCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { EntityType, Language } from '../types/luz';

interface ScrollCraftHeroProps {
  lang: Language;
  onSelectCategory: (type: EntityType | 'all') => void;
  onScrollToCatalog: () => void;
  onOpenBenBot: () => void;
  totalEntities: number;
  totalBusinesses?: number;
}

export const ScrollCraftHero: React.FC<ScrollCraftHeroProps> = ({
  lang,
  onSelectCategory,
  onScrollToCatalog,
  onOpenBenBot,
  totalEntities,
  totalBusinesses = 12,
}) => {
  const isHe = lang === 'he';

  const channels: Array<{
    id: EntityType | 'all';
    titleEn: string;
    titleHe: string;
    detailEn: string;
    detailHe: string;
    icon: React.ElementType;
  }> = [
    {
      id: 'event',
      titleEn: 'Events & Gatherings',
      titleHe: 'אירועים ומפגשי קהילה',
      detailEn: 'Acoustic sunset jams, cacao circles, communal dinners',
      detailHe: 'ג׳אם שקיעה אקוסטי, מעגלי קקאו, ארוחות שישי ומפגשים',
      icon: Calendar,
    },
    {
      id: 'service',
      titleEn: 'Workshops & Practitioners',
      titleHe: 'סדנאות, יוגה ומטפלים',
      detailEn: 'Morning vinyasa, breathwork, ice bath, bodyworkers',
      detailHe: 'ויניאסה של בוקר, נשימה מעגלית, אמבטיית קרח וטיפולים',
      icon: Compass,
    },
    {
      id: 'rental',
      titleEn: 'Long-Stay Homes & Villas',
      titleHe: 'בתים ווילות להשכרה',
      detailEn: 'Direct host listings in Patnem, Colomb, Palolem & Agonda',
      detailHe: 'בתים מאומתים ישירות מבעלי הנכסים בפטנם, קולום ופאלולם',
      icon: Home,
    },
  ];

  const dailyTides = [
    {
      time: '08:00',
      placeEn: 'North Patnem Shala',
      placeHe: 'שאלה צפון פטנם',
      titleEn: 'Morning Vinyasa, Ice Bath & Breathwork',
      titleHe: 'יוגה של בוקר, אמבטיית קרח ונשימות',
      category: 'service' as EntityType,
    },
    {
      time: '16:30',
      placeEn: 'Patnem Community Center',
      placeHe: 'מתנ"ס הקהילה בפטנם',
      titleEn: 'Youth Center Tracks & Parents Coffee',
      titleHe: 'פעילויות ילדים ונוער ומפגש הורים',
      category: 'event' as EntityType,
    },
    {
      time: '18:00',
      placeEn: 'Colomb Cliff & Palolem South',
      placeHe: 'מצוק קולום ודרום פאלולם',
      titleEn: 'Sunset Acoustic Jam & Night Market',
      titleHe: 'ג׳אם שקיעה אקוסטי ושוק אוכל לילי',
      category: 'event' as EntityType,
    },
  ];

  return (
    <section
      aria-label={isHe ? 'אלמנך דרום גואה' : 'South Goa Almanac Stage'}
      className="hallmark-rule-top pt-8 pb-12 md:pt-12 md:pb-16 border-b border-rule"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left 5 Columns: Editorial Headline, Lead, Action Pair & Ruled Index */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center gap-2 text-xs text-muted">
            <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              {isHe
                ? 'מהדורת החוף הדרומי · קולום, פטנם, פאלולם ואגונדה'
                : 'South Coast Edition · Colomb, Patnem, Palolem & Agonda'}
            </span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold text-ink leading-[1.03] tracking-tight">
            {isHe ? 'השולחן היומי של דרום גואה.' : 'The daily table for South Goa.'}
          </h1>

          <p className="lead text-ink-2">
            {isHe
              ? 'לוח האירועים, הסדנאות, הבתים להשכרה ובעלי המקצוע של הקהילה, עם הזמנה ישירה בוואטסאפ מול כל מארח.'
              : 'Community happenings, morning shalas, family tracks and long-stay homes, booked directly with each host on WhatsApp.'}
          </p>

          {/* Hallmark Control Pair: One filled primary pill, one typographic underlined secondary */}
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <button
              type="button"
              onClick={onScrollToCatalog}
              className="hallmark-btn-primary text-sm"
            >
              <span>{isHe ? 'ללוח האירועים והבתים' : 'Browse the Schedule'}</span>
              <ArrowDown className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenBenBot}
              className="hallmark-btn-secondary text-sm"
            >
              <MessageCircle className="w-4 h-4 text-accent" />
              <span>{isHe ? 'שאלו את "בן" בוואטסאפ' : 'Ask "Ben" Concierge'}</span>
            </button>
          </div>

          {/* Ruled Index Channels (Hallmark Rows Composition) */}
          <div className="pt-4 border-t border-ink">
            <div className="divide-y divide-rule">
              {channels.map((ch) => {
                const Icon = ch.icon;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory(ch.id);
                      onScrollToCatalog();
                    }}
                    className="w-full py-3.5 flex items-start justify-between gap-4 text-start group hover:bg-paper-2/70 px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Icon className="w-4 h-4 text-accent mt-1 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-serif text-lg font-semibold text-ink group-hover:text-accent transition-colors">
                          {isHe ? ch.titleHe : ch.titleEn}
                        </div>
                        <p className="text-xs text-muted">
                          {isHe ? ch.detailHe : ch.detailEn}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-ink-2 group-hover:text-accent shrink-0 mt-1">
                      {isHe ? 'סינון' : 'Filter'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 7 Columns: Signature Object — The South Goa Almanac & Dispatch Plate */}
        <div className="lg:col-span-7">
          <div className="hallmark-well-gold p-6 sm:p-8 space-y-6">
            {/* Almanac Plate Header */}
            <div className="pb-4 border-b border-ink">
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-ink">
                {isHe ? 'מקצב היום בחוף הדרומי' : 'Daily Rhythm Along the Coast'}
              </h2>
              <p className="text-xs text-muted mt-1">
                {isHe
                  ? 'לחצו על כל משבצת זמן כדי לסנן את הלוח למטה'
                  : 'Select any tide slot below to filter the live schedule'}
              </p>
            </div>

            {/* Three Tides Timetable (Schedule Composition) */}
            <ol className="divide-y divide-rule border-b border-rule">
              {dailyTides.map((slot) => (
                <li key={slot.time}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(slot.category);
                      onScrollToCatalog();
                    }}
                    className="w-full py-4 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-baseline text-start hover:bg-plate/80 px-3 -mx-3 transition-colors group"
                  >
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                      <time className="hallmark-code text-sm font-semibold text-ink">
                        {slot.time}
                      </time>
                    </div>
                    <div className="sm:col-span-6">
                      <div className="font-serif text-lg font-semibold text-ink group-hover:text-accent transition-colors">
                        {isHe ? slot.titleHe : slot.titleEn}
                      </div>
                    </div>
                    <div className="sm:col-span-3 sm:text-end text-xs text-muted">
                      {isHe ? slot.placeHe : slot.placeEn}
                    </div>
                  </button>
                </li>
              ))}
            </ol>

            {/* Real Figures (Hallmark Figures Row) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="border-s-2 border-ink ps-4">
                <div className="font-serif text-3xl font-semibold text-ink tabular-nums">
                  {totalEntities}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {isHe ? 'אירועים, סדנאות ובתים פעילים' : 'Active events, sessions & homes'}
                </div>
              </div>

              <div className="border-s-2 border-ink ps-4">
                <div className="font-serif text-3xl font-semibold text-ink tabular-nums">
                  {totalBusinesses}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {isHe ? 'עסקים ונותני שירות בקהילה' : 'Trusted local community businesses'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
