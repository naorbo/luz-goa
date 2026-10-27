import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Calendar,
  Users,
  Compass,
  ArrowDown,
  Home,
  Clock,
  Music,
  CheckCircle2,
  ChevronDown,
  Eye,
  SlidersHorizontal,
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
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });
  const [hasScrolledIntoCounters, setHasScrolledIntoCounters] = useState(false);
  const countersRef = useRef<HTMLDivElement>(null);

  // Animated Numbers State (ease-out tick)
  const [displayCounts, setDisplayCounts] = useState({
    events: 0,
    pros: 0,
    youthDays: 0,
    community: 0,
  });

  // Track scroll position for smooth parallax planes
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (heroRef.current) {
            const rect = heroRef.current.getBoundingClientRect();
            // Normalized scroll offset relative to hero
            const offset = Math.max(0, -rect.top);
            setScrollY(offset);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Subtle pointer depth (perspective shift)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMouseOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  // Intersection observer for community counters
  useEffect(() => {
    const el = countersRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasScrolledIntoCounters) {
          setHasScrolledIntoCounters(true);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasScrolledIntoCounters]);

  // Cubic ease-out counter animation when in view
  useEffect(() => {
    if (!hasScrolledIntoCounters) return;

    const targetEvents = Math.max(18, totalEntities);
    const targetPros = totalBusinesses;
    const targetDays = 4;
    const targetCommunity = 100;

    const duration = 1600; // 1.6s ease-out as prescribed in scroll-craft
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Cubic ease-out: 1 - pow(1 - p, 3)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setDisplayCounts({
        events: Math.round(targetEvents * easeOut),
        pros: Math.round(targetPros * easeOut),
        youthDays: Math.round(targetDays * easeOut),
        community: Math.round(targetCommunity * easeOut),
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [hasScrolledIntoCounters, totalEntities, totalBusinesses]);

  // Compute restrained parallax rates back to front
  // Far sky: -0.16x | Mid coast: -0.08x | Foreground flora: +0.06x
  const farParallax = scrollY * -0.16;
  const midParallax = scrollY * -0.08;
  const foreParallax = scrollY * 0.06;

  // Pointer tilt offsets
  const tiltX = mouseOffset.x * 12;
  const tiltY = mouseOffset.y * 8;

  const categories = [
    {
      type: 'event' as EntityType,
      titleHe: 'אירועים והופעות',
      titleEn: 'Live Events & Music',
      descHe: 'הופעות שקיעה, ג׳אמים, סדנאות נשימה ומפגשי תוכן',
      descEn: 'Sunset concerts, acoustic jams, breathwork & gatherings',
      badgeHe: 'חד-פעמי',
      badgeEn: 'One-Time',
      icon: Music,
      gradient: 'from-terracotta-500/15 via-terracotta-500/5 to-transparent',
      border: 'hover:border-terracotta-500/60',
      tagColor: 'bg-terracotta-100 text-terracotta-600',
    },
    {
      type: 'workshop' as EntityType,
      titleHe: 'מתנ"ס וחוגי נוער',
      titleEn: 'Youth Center & Classes',
      descHe: 'תכנית 4 ימים בשבוע בקולום לנוער (11–15) והורים',
      descEn: '4-day weekly afterschool program in Colomb for teens',
      badgeHe: 'קבוע שבועי',
      badgeEn: 'Weekly',
      icon: Users,
      gradient: 'from-canopy-600/15 via-canopy-600/5 to-transparent',
      border: 'hover:border-canopy-600/60',
      tagColor: 'bg-canopy-100 text-canopy-800',
    },
    {
      type: 'service' as EntityType,
      titleHe: 'מטפלים ומשאבים שעתיים',
      titleEn: 'Therapists & Hourly Slots',
      descHe: 'שיאצו, אקופונקטורה, אולפן הקלטות ומאמנים פרטיים',
      descEn: 'Shiatsu, acupuncture, sound studios & private coaches',
      badgeHe: 'תורים ביומן',
      badgeEn: 'Time Slots',
      icon: Clock,
      gradient: 'from-ochre-500/15 via-ochre-500/5 to-transparent',
      border: 'hover:border-ochre-500/60',
      tagColor: 'bg-ochre-100 text-ochre-700',
    },
    {
      type: 'rental' as EntityType,
      titleHe: 'השכרת בתים וסאבלטים',
      titleEn: 'Home Rentals & Sublets',
      descHe: 'וילות ודירות עם אינטרנט סיבים ואינוורטר גיבוי מלא',
      descEn: 'Villas & apartments with verified fiber wifi & power backup',
      badgeHe: 'טווח תאריכים',
      badgeEn: 'Date Ranges',
      icon: Home,
      gradient: 'from-lagoon-600/15 via-lagoon-600/5 to-transparent',
      border: 'hover:border-lagoon-600/60',
      tagColor: 'bg-lagoon-100 text-lagoon-800',
    },
  ];

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative rounded-3xl overflow-hidden bg-canopy-950 text-sand-50 shadow-elevated border border-canopy-800/80 mb-8 transition-all"
    >
      {/* ============================================================
          DIMENSIONAL LAYER 1: Far Plane (Sky, Twilight Sun Glow)
          Moves at -0.16x
          ============================================================ */}
      <div
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{
          transform: `translate3d(0, ${farParallax}px, 0)`,
          transition: 'transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#102318] via-[#1B3224] to-[#121E17]" />
        {/* Soft Golden Sunset Radial Light */}
        <div
          className="absolute top-0 end-1/4 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-ochre-400/25 via-terracotta-500/15 to-transparent blur-3xl opacity-80"
          style={{
            transform: `translate3d(${tiltX * -1.5}px, ${tiltY * -1.5}px, 0)`,
          }}
        />
        {/* Subtle Constellation / Star Dust Texture */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#FAF8F5_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* ============================================================
          DIMENSIONAL LAYER 2: Midground Plane (South Goa Coastal Silhouette)
          Moves at -0.08x
          ============================================================ */}
      <div
        className="absolute inset-0 pointer-events-none will-change-transform opacity-30"
        style={{
          transform: `translate3d(${tiltX * 0.8}px, ${midParallax + tiltY * 0.8}px, 0)`,
        }}
      >
        {/* Soft wave and hill curves */}
        <svg
          className="absolute bottom-0 inset-x-0 w-full h-44 text-canopy-900"
          viewBox="0 0 1440 220"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0,120 C240,60 480,180 720,110 C960,40 1200,160 1440,90 L1440,220 L0,220 Z"
            fill="currentColor"
            opacity="0.6"
          />
          <path
            d="M0,160 C320,110 640,200 960,130 C1200,80 1360,150 1440,140 L1440,220 L0,220 Z"
            fill="#0F1A14"
          />
        </svg>
      </div>

      {/* ============================================================
          DIMENSIONAL LAYER 3: Foreground Tropical Silhouettes
          Moves at +0.06x (gentle foreground overtake)
          ============================================================ */}
      <div
        className="absolute top-0 start-0 w-56 h-56 pointer-events-none opacity-20 will-change-transform"
        style={{
          transform: `translate3d(${tiltX * -2}px, ${foreParallax + tiltY * -2}px, 0)`,
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full text-ochre-400 fill-current">
          {/* Stylized tropical palm frond leaves */}
          <path d="M10,0 C30,25 35,65 10,95 C45,70 50,30 25,0 Z" />
          <path d="M25,0 C50,20 60,60 40,85 C65,55 60,20 35,0 Z" opacity="0.6" />
        </svg>
      </div>

      {/* ============================================================
          HERO SUBJECT CONTENT (1.0x Core Plane)
          ============================================================ */}
      <div className="relative z-10 px-6 py-10 md:px-12 md:py-16 flex flex-col justify-between min-h-[480px]">
        {/* Top Eyebrow Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-canopy-800/90 border border-ochre-400/40 text-xs text-ochre-300 font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-ochre-400 animate-pulse" />
            <span>
              {isHe
                ? 'פלטפורמת הקהילה של דרום גואה • קולום, פטנם ופאלולם'
                : 'South Goa Community Operating System • Colomb, Patnem & Palolem'}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-200/10 border border-sand-200/20 text-[11px] text-sand-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>{isHe ? 'סביבת בדיקות (Scroll-Craft הדגמה)' : 'TEST Sandbox (Scroll-Craft Motion)'}</span>
          </div>
        </div>

        {/* Main Headline & Lead Text */}
        <div className="max-w-3xl space-y-4">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.15] text-sand-50 tracking-tight">
            {isHe ? (
              <>
                איפה שקצב הקהילה פוגש את חופי{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-ochre-400 via-ochre-300 to-terracotta-400">
                  דרום גואה.
                </span>
              </>
            ) : (
              <>
                Where community rhythms meet{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-ochre-400 via-ochre-300 to-terracotta-400">
                  South Goa shores.
                </span>
              </>
            )}
          </h1>

          <p className="text-sm md:text-base lg:text-lg text-sand-200/90 max-w-2xl leading-relaxed font-sans font-normal">
            {isHe
              ? 'אירועים חד-פעמיים, מפגשי מתנ"ס קבועים, מטפלים ובעלי עסקים אמינים, ובתים להשכרה — מרוכז, מסונכרן ומאומת ע״י התושבים.'
              : 'One-time events, weekly youth center sessions, verified therapists, and homes with fiber wifi — curated and coordinated in one community OS.'}
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              type="button"
              onClick={onScrollToCatalog}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-terracotta-500 to-terracotta-600 text-white text-xs md:text-sm font-bold shadow-elevated hover:from-terracotta-600 hover:to-terracotta-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Compass className="w-4 h-4" />
              <span>{isHe ? 'ללוח השבועי והקטלוג' : 'Explore Weekly Timetable'}</span>
              <ArrowDown className="w-3.5 h-3.5 opacity-80" />
            </button>

            <button
              type="button"
              onClick={onOpenBenBot}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-canopy-800/80 hover:bg-canopy-700/80 border border-sand-300/20 text-sand-100 text-xs md:text-sm font-semibold transition-colors"
            >
              <Sparkles className="w-4 h-4 text-ochre-400" />
              <span>{isHe ? 'שאל את "בן" בוואטסאפ' : 'Chat with "Ben" Bot'}</span>
            </button>
          </div>
        </div>

        {/* ============================================================
            COMMUNITY PULSE: Animated Live Counters (scroll-craft count)
            ============================================================ */}
        <div
          ref={countersRef}
          className="mt-10 pt-6 border-t border-canopy-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          <div className="space-y-1">
            <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-ochre-400 tabular-nums">
              {displayCounts.events}+
            </div>
            <div className="text-xs text-sand-300 font-medium">
              {isHe ? 'פעילויות ואירועים בלוח' : 'Live Activities & Events'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-terracotta-400 tabular-nums">
              {displayCounts.pros}
            </div>
            <div className="text-xs text-sand-300 font-medium">
              {isHe ? 'בעלי עסקים ומטפלים' : 'Verified Local Pros'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-sand-100 tabular-nums">
              {displayCounts.youthDays}
            </div>
            <div className="text-xs text-sand-300 font-medium">
              {isHe ? 'ימי מתנ"ס בשבוע (קולום)' : 'Youth Days / Week (Colomb)'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-400 tabular-nums">
              {displayCounts.community}%
            </div>
            <div className="text-xs text-sand-300 font-medium">
              {isHe ? 'קהילתי, שקוף וללא עמלות' : 'Community Owned & Free'}
            </div>
          </div>
        </div>

        {/* ============================================================
            CATEGORY GATEWAY CARDS: Lateral Breadth (scroll-craft rail)
            ============================================================ */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sand-300/80">
              {isHe ? 'בחר קטגוריה לקפיצה ישירה ביומן:' : 'Jump straight into a category:'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.type}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat.type);
                    onScrollToCatalog();
                  }}
                  className={`group relative p-4 rounded-2xl bg-gradient-to-b ${cat.gradient} bg-canopy-900/60 border border-canopy-700/60 ${cat.border} text-start transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated flex flex-col justify-between`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-canopy-800 text-ochre-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${cat.tagColor}`}>
                        {isHe ? cat.badgeHe : cat.badgeEn}
                      </span>
                    </div>

                    <h3 className="font-bold text-sand-50 text-sm group-hover:text-ochre-300 transition-colors">
                      {isHe ? cat.titleHe : cat.titleEn}
                    </h3>

                    <p className="text-[11px] text-sand-300/80 leading-snug line-clamp-2">
                      {isHe ? cat.descHe : cat.descEn}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-canopy-800/60 flex items-center justify-between text-[11px] text-ochre-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>{isHe ? 'צפה ברשימה ←' : 'View Listings →'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ============================================================
          FLOOR FADE: Gradient blend to the page background (#FAF8F5 / sand-50)
          ============================================================ */}
      <div className="h-6 bg-gradient-to-b from-transparent to-canopy-950/80" />
    </section>
  );
};
