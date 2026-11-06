import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Phone,
  MapPin,
  Instagram,
  Globe,
  Calendar,
  Clock,
  CheckCircle2,
  Share2,
  Sparkles,
  TreePine,
  Wifi,
  Car,
  UtensilsCrossed,
  ShieldCheck,
  ExternalLink,
  Tag,
  Heart,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  CommunityBusiness,
  Language,
  LuzEntity,
  BusinessServiceOffer,
} from '../types/luz';
import {
  buildBusinessWhatsAppReferralUrl,
  generateLuzReferralCode,
} from '../utils/referralAndAlerts';

interface BusinessProfileModalProps {
  business: CommunityBusiness;
  lang: Language;
  onClose: () => void;
  onBookSlot: (business: CommunityBusiness, offerId?: string) => void;
  defaultUserName?: string;
  relatedEvents?: LuzEntity[];
  onSelectEvent?: (entity: LuzEntity) => void;
}

export const BusinessProfileModal: React.FC<BusinessProfileModalProps> = ({
  business,
  lang,
  onClose,
  onBookSlot,
  defaultUserName = '',
  relatedEvents = [],
  onSelectEvent,
}) => {
  const isHe = lang === 'he';
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null);

  const refCode = generateLuzReferralCode(business.id, Math.floor(Math.random() * 9000) + 1000);
  const whatsappUrl = buildBusinessWhatsAppReferralUrl(business, refCode, defaultUserName);

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}?tab=businesses&biz=${business.id}`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const formatPrice = (srv: BusinessServiceOffer) => {
    if (srv.priceCurrency === 'FREE' || srv.priceAmount === 0) {
      return isHe ? 'כניסה חופשית' : 'Free Entry';
    }
    if (srv.priceCurrency === 'CONTACT') {
      return isHe ? 'בתיאום אישי' : 'Contact for price';
    }
    if (srv.priceCurrency === 'INR') {
      return `₹${srv.priceAmount.toLocaleString()}`;
    }
    if (srv.priceCurrency === 'ILS') {
      return `₪${srv.priceAmount.toLocaleString()}`;
    }
    return `$${srv.priceAmount.toLocaleString()}`;
  };

  // Google Maps search query
  const mapsSearchQuery = encodeURIComponent(
    `${business.businessNameEn}, ${business.locationDetailsEn || business.area}, Goa`
  );
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsSearchQuery}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-sand-50 rounded-3xl border border-sand-300 shadow-2xl overflow-hidden my-6 animate-reveal max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Top Bar */}
        <div className="bg-canopy-900 text-sand-50 px-5 py-3.5 flex items-center justify-between border-b border-canopy-800 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-sand-100">
              {isHe ? 'דף עסק רשמי ב-LUZ Goa' : 'Official LUZ Goa Business Page'}
            </span>
            <span className="hidden sm:inline text-canopy-400">•</span>
            <span className="hidden sm:inline text-ochre-400 font-mono">
              #{business.id.replace('prod-biz-', '').toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-full bg-canopy-800 text-sand-200 hover:bg-canopy-700 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title={isHe ? 'העתק קישור לדף העסק' : 'Copy link'}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? (isHe ? 'הקישור הועתק!' : 'Copied!') : isHe ? 'שיתוף' : 'Share'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-canopy-800 text-sand-100 hover:bg-canopy-700 flex items-center justify-center transition-colors"
              aria-label={isHe ? 'סגירה' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 space-y-6">
          {/* Hero Banner with Atmospheric Photo */}
          <div className="relative h-64 sm:h-80 bg-paper-2 overflow-hidden">
            <img
              src={business.imageUrl}
              alt={isHe ? business.businessNameHe : business.businessNameEn}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-canopy-950 via-canopy-950/40 to-transparent" />

            {/* Badges on Top of Photo */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2">
              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/95 text-canopy-950 shadow-md backdrop-blur-sm flex items-center gap-1.5">
                <TreePine className="w-3.5 h-3.5 text-accent" />
                <span>{isHe ? 'מתחם אירוח, קפה ויוגה' : 'Eco-Resort, Cafe & Shala'}</span>
              </span>

              <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/95 text-canopy-950 shadow-md backdrop-blur-sm flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                <span>{business.area}</span>
              </span>
            </div>

            {/* Hero Title & Subtitle in Photo */}
            <div className="absolute bottom-5 inset-x-5 text-sand-50 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ochre-500/20 text-ochre-300 border border-ochre-500/30 text-xs font-semibold backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5 text-ochre-400" />
                <span>{isHe ? 'ספק מאומת בקהילת דרום גואה' : 'Verified South Goa Partner'}</span>
              </div>
              <h1 className="font-display text-2xl sm:text-4xl font-bold text-white drop-shadow-md leading-tight">
                {isHe ? business.businessNameHe : business.businessNameEn}
              </h1>
              <p className="text-sand-200 text-xs sm:text-sm font-medium drop-shadow">
                {isHe ? business.specialtyHe : business.specialtyEn}
              </p>
            </div>
          </div>

          {/* Quick Action Bar (Direct Contact on Mobile) */}
          <div className="px-5">
            <div className="bg-white rounded-2xl border border-sand-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hallmark-btn-primary !py-2.5 !px-5 text-sm font-bold flex items-center gap-2 shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{isHe ? 'הודעת וואטסאפ ישירה' : 'WhatsApp Us Directly'}</span>
                </a>

                <button
                  type="button"
                  onClick={() => onBookSlot(business)}
                  className="hallmark-btn-secondary !py-2.5 !px-4 text-sm font-semibold flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-accent" />
                  <span>{isHe ? 'תיאום תור / מקום' : 'Book a Slot'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-ink-2">
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="p-2.5 rounded-xl border border-sand-300 bg-sand-50 text-ink hover:text-accent hover:border-accent transition-colors"
                    title={isHe ? 'שיחה טלפונית' : 'Call'}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl border border-sand-300 bg-sand-50 text-ink hover:text-accent hover:border-accent transition-colors"
                  title={isHe ? 'פתיחת מיקום ב-Google Maps' : 'Open in Google Maps'}
                >
                  <MapPin className="w-4 h-4" />
                </a>
                {business.instagramHandle && (
                  <a
                    href={`https://instagram.com/${business.instagramHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl border border-sand-300 bg-sand-50 text-ink hover:text-accent hover:border-accent transition-colors"
                    title={isHe ? 'אינסטגרם' : 'Instagram'}
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {business.websiteUrl && (
                  <a
                    href={business.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl border border-sand-300 bg-sand-50 text-ink hover:text-accent hover:border-accent transition-colors"
                    title={isHe ? 'אתר רשמי' : 'Official Website'}
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="px-5 space-y-3">
            <h2 className="font-display text-xl font-bold text-canopy-950 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <span>{isHe ? 'על המקום והחוויה' : 'About the Experience'}</span>
            </h2>
            <div className="bg-white rounded-2xl border border-sand-200 p-5 space-y-3 text-sm text-ink-2 leading-relaxed">
              <p>{isHe ? business.bioHe : business.bioEn}</p>
              {business.homeVisitAvailable && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isHe ? 'שירות עד הבית / מקום האירוח שלכם זמין' : 'Home visits and on-site delivery available'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Services Menu & Experiences */}
          <div className="px-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-canopy-950 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-accent" />
                <span>{isHe ? 'תפריט, חוויות ושירותים' : 'Menu, Experiences & Rates'}</span>
              </h2>
              <span className="text-xs text-muted">
                {business.servicesMenu.length} {isHe ? 'שירותים פעילים' : 'services'}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {business.servicesMenu.map((srv) => (
                <div
                  key={srv.id}
                  className="bg-white rounded-2xl border border-sand-200 p-4 hover:border-accent hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-canopy-950 text-sm leading-snug">
                        {isHe ? srv.nameHe : srv.nameEn}
                      </h3>
                      <span className="px-2.5 py-1 rounded-lg bg-sand-100 text-canopy-900 font-bold text-xs shrink-0 tabular-nums">
                        {formatPrice(srv)}
                      </span>
                    </div>
                    {srv.durationMinutes && (
                      <div className="text-xs text-muted flex items-center gap-1">
                        <Clock className="w-3 h-3 text-accent" />
                        <span>
                          {srv.durationMinutes >= 60
                            ? `${Math.floor(srv.durationMinutes / 60)} ${isHe ? 'שעות' : 'hrs'}`
                            : `${srv.durationMinutes} ${isHe ? 'דקות' : 'min'}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <a
                    href={buildBusinessWhatsAppReferralUrl(
                      business,
                      refCode,
                      defaultUserName,
                      isHe ? srv.nameHe : srv.nameEn
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="hallmark-btn-secondary !py-2 !px-3 text-xs font-semibold flex items-center justify-center gap-1.5 w-full mt-auto"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-accent" />
                    <span>{isHe ? 'בירור או הזמנה בוואטסאפ' : 'Inquire on WhatsApp'}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Location & Opening Hours Card */}
          <div className="px-5 space-y-3">
            <h2 className="font-display text-xl font-bold text-canopy-950 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-accent" />
              <span>{isHe ? 'מיקום ושעות פתיחה' : 'Location & Hours'}</span>
            </h2>

            <div className="bg-white rounded-2xl border border-sand-200 p-5 grid gap-4 sm:grid-cols-2 text-xs sm:text-sm">
              <div className="space-y-2">
                <div className="font-semibold text-canopy-950 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-accent" />
                  <span>{isHe ? 'שעות פעילות' : 'Operating Hours'}</span>
                </div>
                <p className="text-ink-2">
                  {isHe ? 'פתוח מדי יום: 08:00 בבוקר עד 23:00 בלילה' : 'Open Daily: 08:00 AM – 11:00 PM'}
                </p>
                <div className="text-xs text-muted">
                  {isHe ? 'סופי שבוע: ג׳אמים והופעות שקיעה משעה 17:30' : 'Weekends: Sunset sessions & live jams from 17:30'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-canopy-950 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-accent" />
                  <span>{isHe ? 'כתובת מדויקת' : 'Physical Address'}</span>
                </div>
                <p className="text-ink-2">
                  {isHe ? business.locationDetailsHe : business.locationDetailsEn}
                </p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline pt-1"
                >
                  <span>{isHe ? 'פתיחת ניווט ישיר ב-Google Maps' : 'Get Directions in Google Maps'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Amenities & Space Features */}
          <div className="px-5 space-y-3">
            <h2 className="font-display text-lg font-bold text-canopy-950 flex items-center gap-2">
              <TreePine className="w-4 h-4 text-accent" />
              <span>{isHe ? 'מאפייני המרחב והשירותים' : 'Space Features & Amenities'}</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-sand-100 rounded-xl p-3 text-center space-y-1">
                <Wifi className="w-4 h-4 text-accent mx-auto" />
                <div className="text-xs font-semibold text-canopy-950">{isHe ? 'אינטרנט סיבים מהיר' : 'Fiber High-Speed WiFi'}</div>
              </div>
              <div className="bg-sand-100 rounded-xl p-3 text-center space-y-1">
                <UtensilsCrossed className="w-4 h-4 text-accent mx-auto" />
                <div className="text-xs font-semibold text-canopy-950">{isHe ? 'מטבח אורגני וטאבון' : 'Organic Farm-to-Table'}</div>
              </div>
              <div className="bg-sand-100 rounded-xl p-3 text-center space-y-1">
                <TreePine className="w-4 h-4 text-accent mx-auto" />
                <div className="text-xs font-semibold text-canopy-950">{isHe ? 'שאלה פתוחה בטבע' : 'Open-Air Yoga Shala'}</div>
              </div>
              <div className="bg-sand-100 rounded-xl p-3 text-center space-y-1">
                <Car className="w-4 h-4 text-accent mx-auto" />
                <div className="text-xs font-semibold text-canopy-950">{isHe ? 'חניה מסודרת' : 'Parking Available'}</div>
              </div>
            </div>
          </div>

          {/* Related Events Hosted Here */}
          {relatedEvents.length > 0 && (
            <div className="px-5 space-y-3">
              <h2 className="font-display text-xl font-bold text-canopy-950 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                <span>{isHe ? 'אירועים קרובים במתחם זה' : 'Upcoming Events at this Space'}</span>
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {relatedEvents.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent?.(evt)}
                    className="bg-white rounded-2xl border border-sand-200 p-4 hover:border-accent hover:shadow-md transition-all cursor-pointer flex gap-3.5 items-center"
                  >
                    <img
                      src={evt.imageUrl}
                      alt={isHe ? evt.titleHe : evt.titleEn}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-accent">
                        {evt.date || (isHe ? 'אירוע קבוע' : 'Weekly')} • {evt.startTime}
                      </div>
                      <div className="font-bold text-canopy-950 text-sm truncate">
                        {isHe ? evt.titleHe : evt.titleEn}
                      </div>
                      <div className="text-xs text-muted truncate">
                        {evt.priceAmount === 0 ? (isHe ? 'חינם' : 'Free') : `₹${evt.priceAmount}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Showcase Pitch Banner for Tomorrow's Meeting */}
          <div className="px-5 pb-6">
            <div className="rounded-2xl bg-gradient-to-r from-canopy-950 via-canopy-900 to-canopy-950 p-6 text-sand-50 border border-ochre-500/30 shadow-lg space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ochre-400 text-canopy-950 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isHe ? 'היתרון של LUZ לעסקים מקומיים בגואה' : 'Why Local Businesses Love LUZ'}</span>
              </div>
              <h3 className="font-display text-xl font-bold text-white">
                {isHe
                  ? 'אין צורך באתר אינטרנט יקר — דף עסק חי ב-5 דקות'
                  : 'No expensive website needed — Live business presence in 5 minutes'}
              </h3>
              <p className="text-sand-200 text-xs sm:text-sm leading-relaxed">
                {isHe
                  ? 'כל עסק, מטפל, מתחם אירוח או מסעדה בדרום גואה מקבלים נוכחות דיגיטלית מלאה: תפריט שירותים, מחירים, תמונות, מיקום ב-Google Maps ופניות ישירות לוואטסאפ ללא עמלות הקמה.'
                  : 'Every venue, practitioner, and cafe in South Goa gets a complete digital profile: services, menu, rates, Google Maps directions, and direct WhatsApp leads without any setup hassle.'}
              </p>
              <div className="pt-1 text-xs text-ochre-300 font-semibold">
                {isHe
                  ? '👉 דוגמה חיה שהוכנה עבור The Mount Canacona לקראת הצגת הפרויקט'
                  : '👉 Live showcase example prepared for The Mount Canacona'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
