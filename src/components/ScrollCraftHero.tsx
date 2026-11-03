import React from 'react';
import {
  Calendar,
  Compass,
  Home,
  ArrowDown,
  MessageCircle,
  MapPin,
} from 'lucide-react';
import { EntityType, Language } from '../types/luz';

interface ScrollCraftHeroProps {
  lang: Language;
  onSelectCategory: (type: EntityType | 'all') => void;
  onScrollToCatalog: () => void;
  onOpenBenBot?: () => void;
  showBenBot?: boolean;
  totalEntities: number;
  totalBusinesses?: number;
}

export const ScrollCraftHero: React.FC<ScrollCraftHeroProps> = ({
  lang,
  onSelectCategory,
  onScrollToCatalog,
  onOpenBenBot,
  showBenBot = false,
}) => {
  const isHe = lang === 'he';

  const visualCategories: Array<{
    id: EntityType;
    tagHe: string;
    tagEn: string;
    titleHe: string;
    titleEn: string;
    subtitleHe: string;
    subtitleEn: string;
    imageUrl: string;
    icon: React.ElementType;
  }> = [
    {
      id: 'event',
      tagHe: 'אירועים',
      tagEn: 'Events',
      titleHe: 'אירועים ומפגשים',
      titleEn: 'Events & Gatherings',
      subtitleHe: 'הופעות שקיעה, מעגלי שירה וארוחות קהילה',
      subtitleEn: 'Sunset acoustic jams, circles & dinners',
      imageUrl:
        'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
      icon: Calendar,
    },
    {
      id: 'service',
      tagHe: 'סדנאות ובריאות',
      tagEn: 'Wellness',
      titleHe: 'סדנאות, יוגה ומטפלים',
      titleEn: 'Yoga, Workshops & Wellness',
      subtitleHe: 'יוגה של בוקר, נשימות, אמבטיית קרח וטיפולים',
      subtitleEn: 'Morning yoga, breathwork & body therapy',
      imageUrl:
        'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80',
      icon: Compass,
    },
    {
      id: 'rental',
      tagHe: 'בתים ווילות',
      tagEn: 'Homes & Villas',
      titleHe: 'בתים ווילות להשכרה',
      titleEn: 'Homes & Villas for Rent',
      subtitleHe: 'בתים מאומתים ישירות מבעלי הנכסים בחופים',
      subtitleEn: 'Verified homes directly from local hosts',
      imageUrl:
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
      icon: Home,
    },
  ];

  return (
    <section
      aria-label={isHe ? 'ברוכים הבאים ל-LUZ גואה' : 'Welcome to LUZ Goa'}
      className="pt-4 pb-8 md:pt-6 md:pb-10"
    >
      <div className="hallmark-well-gold p-6 sm:p-8 lg:p-10">
        {/* Top Row: Clean, Friendly Welcome + Direct Action Buttons */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-paper-2 text-xs font-medium text-ink-2">
            <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              {isHe
                ? 'דרום גואה · פטנם, פאלולם, קולום ואגונדה'
                : 'South Goa · Patnem, Palolem, Colomb & Agonda'}
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.65rem] font-bold text-ink leading-tight">
            {isHe
              ? 'כל מה שקורה בדרום גואה, במקום אחד פשוט.'
              : 'Everything happening in South Goa, in one simple place.'}
          </h1>

          <p className="text-base sm:text-lg text-ink-2 leading-relaxed">
            {isHe
              ? 'בחרו מה אתם מחפשים היום — אירוע קהילתי, סדנת יוגה, בעל מקצוע או בית להשכרה — ותאמו ישירות בוואטסאפ בקליק אחד.'
              : 'Pick what you are looking for today — a community event, morning yoga, a local professional, or a home rental — and message the host directly on WhatsApp.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onScrollToCatalog}
              className="hallmark-btn-primary text-sm sm:text-base"
            >
              <span>{isHe ? 'לכל האירועים והבתים' : 'View All Listings'}</span>
              <ArrowDown className="w-4 h-4" />
            </button>

            {showBenBot && onOpenBenBot && (
              <button
                type="button"
                onClick={onOpenBenBot}
                className="hallmark-btn-secondary text-sm sm:text-base"
              >
                <MessageCircle className="w-4 h-4 text-accent" />
                <span>{isHe ? 'עזרה מהירה מ"בן" בוואטסאפ' : 'Ask "Ben" Helper'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: 3 Clean Visual Category Cards with Goa Atmosphere Photos & Crystal Clear Typography */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8 pt-8 border-t border-rule">
          {visualCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  onSelectCategory(cat.id);
                  onScrollToCatalog();
                }}
                className="group text-start rounded-2xl overflow-hidden border border-rule bg-plate hover:border-accent hover:shadow-lg transition-all duration-200 flex flex-col focus-visible:outline-accent"
              >
                {/* Photo with category badge */}
                <div className="relative h-44 w-full overflow-hidden bg-paper-2">
                  <img
                    src={cat.imageUrl}
                    alt={isHe ? cat.titleHe : cat.titleEn}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3.5 start-3.5">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-canopy-950/80 backdrop-blur-md text-sand-50 text-xs font-semibold shadow-sm border border-white/15">
                      <Icon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>{isHe ? cat.tagHe : cat.tagEn}</span>
                    </span>
                  </div>
                </div>

                {/* Card Content on Clean White Surface: 100% Readable */}
                <div className="p-5 flex flex-col justify-between flex-1 bg-plate">
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-ink group-hover:text-accent transition-colors flex items-center justify-between gap-2">
                      <span>{isHe ? cat.titleHe : cat.titleEn}</span>
                      <span className="text-accent text-sm font-bold group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                        {isHe ? '←' : '→'}
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-ink-2 mt-2 leading-relaxed font-normal">
                      {isHe ? cat.subtitleHe : cat.subtitleEn}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-rule flex items-center justify-between text-xs font-semibold text-accent">
                    <span>{isHe ? 'לכל הפעילויות בלוח' : 'View full schedule'}</span>
                    <span className="font-bold group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                      {isHe ? '←' : '→'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
