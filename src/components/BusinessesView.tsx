import React, { useState, useMemo } from 'react';
import {
  Search,
  MapPin,
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  HeartPulse,
  Sparkles,
  Palette,
  Dumbbell,
  UtensilsCrossed,
  GraduationCap,
  Car,
  Briefcase,
  Home,
  X,
  Download,
  ExternalLink,
  FlaskConical,
  Globe,
  Users,
} from 'lucide-react';
import {
  CommunityBusiness,
  BusinessCategory,
  BusinessServiceOffer,
  GoaArea,
  Language,
  AppEnvironment,
  BookingRecord,
} from '../types/luz';
import { downloadIcsFile, buildGoogleCalendarUrl } from '../utils/calendarAndParser';

interface BusinessesViewProps {
  businesses: CommunityBusiness[];
  lang: Language;
  appEnv: AppEnvironment;
  defaultUserName: string;
  defaultUserPhone: string;
  onAddBusiness: (biz: CommunityBusiness) => void;
  onBookBusinessSlot: (
    businessId: string,
    booking: Omit<BookingRecord, 'id' | 'createdAt' | 'status'>
  ) => void;
  onSwitchToTest: () => void;
}

export const BUSINESS_CATEGORIES: Array<{
  id: BusinessCategory;
  labelHe: string;
  labelEn: string;
  examplesHe: string;
  examplesEn: string;
  icon: React.ElementType;
}> = [
  {
    id: 'body_therapy',
    labelHe: 'טיפולי גוף, מים ונשימה',
    labelEn: 'Bodywork & Healing',
    examplesHe: 'ריברסינג, טיפול במים, עיסוי, סאונד',
    examplesEn: 'Rebirthing, Water Therapy, Massage',
    icon: HeartPulse,
  },
  {
    id: 'beauty_cosmetics',
    labelHe: 'קוסמטיקה, שיער ורוקחות',
    labelEn: 'Beauty, Hair & Botanicals',
    examplesHe: 'תספורות טבעיות, ראסטות, ארומתרפיה',
    examplesEn: 'Natural Haircuts, Dreadlocks, Cosmetics',
    icon: Sparkles,
  },
  {
    id: 'tattoo_art',
    labelHe: 'אומנות, יצירה וקעקועים',
    labelEn: 'Art, Therapy & Tattoo',
    examplesHe: 'טיפול באומנות, הדפס בוטני, איור',
    examplesEn: 'Art Therapy, Botanical Print, Tattoo',
    icon: Palette,
  },
  {
    id: 'fitness_martial',
    labelHe: 'ספורט, פילאטיס ושחייה',
    labelEn: 'Fitness, Pilates & Swim',
    examplesHe: 'פילאטיס, פלדנקרייז, שחייה, כוח',
    examplesEn: 'Pilates, Feldenkrais, Swim, Boxing',
    icon: Dumbbell,
  },
  {
    id: 'food_culinary',
    labelHe: 'אוכל ביתי, מאפים ומשלוחים',
    labelEn: 'Home Food & Delivery',
    examplesHe: 'טאלי, חלות לשבת, ג׳חנון, ירקן',
    examplesEn: 'Mama Thali, Challah, Jachnun, Produce',
    icon: UtensilsCrossed,
  },
  {
    id: 'kids_education',
    labelHe: 'חינוך, ילדים והוראה',
    labelEn: 'Kids, Dance & Tutoring',
    examplesHe: 'נאראניה, מחול, ליווי הורים, מורה פרטי',
    examplesEn: 'Narania, Kids Dance, Parenting, Tutor',
    icon: GraduationCap,
  },
  {
    id: 'transport_local',
    labelHe: 'מוניות וריקשות מקומיות',
    labelEn: 'Taxis & Auto-Rickshaws',
    examplesHe: 'טאנווי מונית, דאיה, אניל, גורו',
    examplesEn: 'Tanvi Taxi, Daya, Anil, Guru',
    icon: Car,
  },
  {
    id: 'pro_services',
    labelHe: 'ויזות, עיצוב ושירותים',
    labelEn: 'Visas, Design & Pro',
    examplesHe: 'ליאת ויזות וטיסות, עיצוב ספרים',
    examplesEn: 'Visas & Flights, Book & Digital Design',
    icon: Briefcase,
  },
];

const UPCOMING_DATES = [
  { date: '2026-10-26', labelHe: 'ב׳ 26/10', labelEn: 'Mon Oct 26' },
  { date: '2026-10-27', labelHe: 'ג׳ 27/10', labelEn: 'Tue Oct 27' },
  { date: '2026-10-28', labelHe: 'ד׳ 28/10', labelEn: 'Wed Oct 28' },
  { date: '2026-10-29', labelHe: 'ה׳ 29/10', labelEn: 'Thu Oct 29' },
  { date: '2026-10-30', labelHe: 'ו׳ 30/10', labelEn: 'Fri Oct 30' },
  { date: '2026-10-31', labelHe: 'ש׳ 31/10', labelEn: 'Sat Oct 31' },
];

export const BusinessesView: React.FC<BusinessesViewProps> = ({
  businesses,
  lang,
  appEnv,
  defaultUserName,
  defaultUserPhone,
  onAddBusiness,
  onBookBusinessSlot,
  onSwitchToTest,
}) => {
  const isHe = lang === 'he';

  const [selectedCategory, setSelectedCategory] = useState<BusinessCategory | 'all'>('all');
  const [selectedArea, setSelectedArea] = useState<GoaArea | 'all'>('all');
  const [onlyHomeVisit, setOnlyHomeVisit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [activeBusiness, setActiveBusiness] = useState<CommunityBusiness | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Booking inside Business Modal
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(UPCOMING_DATES[0].date);
  const [selectedSlot, setSelectedSlot] = useState('10:00');
  const [customerName, setCustomerName] = useState(defaultUserName);
  const [customerPhone, setCustomerPhone] = useState(defaultUserPhone);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // New Business Form State
  const [newCategory, setNewCategory] = useState<BusinessCategory>('body_therapy');
  const [newSpecialtyHe, setNewSpecialtyHe] = useState('');
  const [newBusinessNameHe, setNewBusinessNameHe] = useState('');
  const [newOwnerNameHe, setNewOwnerNameHe] = useState('');
  const [newBioHe, setNewBioHe] = useState('');
  const [newArea, setNewArea] = useState<GoaArea>('Colomb');
  const [newLocationHe, setNewLocationHe] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newInstagram, setNewInstagram] = useState('');
  const [newHomeVisit, setNewHomeVisit] = useState(false);
  const [newServiceTitle, setNewServiceTitle] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number>(1500);
  const [newServiceDuration, setNewServiceDuration] = useState<number>(60);
  const [newSlotsText, setNewSlotsText] = useState('09:00, 11:00, 15:00, 17:00');

  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;
      if (selectedArea !== 'all' && b.area !== selectedArea) return false;
      if (onlyHomeVisit && !b.homeVisitAvailable) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [
          b.businessNameHe,
          b.businessNameEn,
          b.ownerNameHe,
          b.ownerNameEn,
          b.specialtyHe,
          b.specialtyEn,
          b.bioHe,
          b.bioEn,
          ...b.tags,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [businesses, selectedCategory, selectedArea, onlyHomeVisit, searchQuery]);

  const openBookingForBusiness = (biz: CommunityBusiness) => {
    setActiveBusiness(biz);
    setSelectedOfferId(biz.servicesMenu[0]?.id || '');
    setSelectedSlot(biz.timeSlots[0] || '10:00');
    setBookingConfirmed(false);
  };

  const handleConfirmBusinessBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;

    const offer: BusinessServiceOffer | undefined = activeBusiness.servicesMenu.find(
      (s) => s.id === selectedOfferId
    );
    const titleHe = `${activeBusiness.businessNameHe}${offer ? ` — ${offer.nameHe}` : ''}`;
    const titleEn = `${activeBusiness.businessNameEn}${offer ? ` — ${offer.nameEn}` : ''}`;

    onBookBusinessSlot(activeBusiness.id, {
      entityId: activeBusiness.id,
      entityTitleHe: titleHe,
      entityTitleEn: titleEn,
      entityType: 'business',
      customerName,
      customerPhone,
      participantsCount: 1,
      selectedDate,
      selectedSlot,
      selectedServiceOffer: isHe ? offer?.nameHe : offer?.nameEn,
      totalPrice: offer?.priceAmount || 0,
      currency: offer?.priceCurrency || 'INR',
      reminderChannel: 'both',
    });

    setBookingConfirmed(true);
  };

  const handleCreateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultCategoryImages: Record<BusinessCategory, string> = {
      body_therapy: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=1000',
      beauty_cosmetics: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1000',
      tattoo_art: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&q=80&w=1000',
      fitness_martial: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=1000',
      food_culinary: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1000',
      kids_education: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000',
      transport_local: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1000',
      pro_services: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000',
    };

    const created: CommunityBusiness = {
      id: `biz-${Date.now()}`,
      category: newCategory,
      specialtyHe: newSpecialtyHe || 'בעל/ת עסק בקהילה',
      specialtyEn: newSpecialtyHe || 'Community Practitioner',
      businessNameHe: newBusinessNameHe,
      businessNameEn: newBusinessNameHe,
      ownerNameHe: newOwnerNameHe,
      ownerNameEn: newOwnerNameHe,
      bioHe: newBioHe,
      bioEn: newBioHe,
      area: newArea,
      locationDetailsHe: newLocationHe || newArea,
      locationDetailsEn: newLocationHe || newArea,
      homeVisitAvailable: newHomeVisit,
      phone: newPhone,
      instagramHandle: newInstagram || undefined,
      imageUrl: defaultCategoryImages[newCategory],
      availableDays: [1, 2, 3, 4, 5],
      timeSlots: newSlotsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      bookedSlots: {},
      servicesMenu: [
        {
          id: `srv-${Date.now()}`,
          nameHe: newServiceTitle || newSpecialtyHe || 'מפגש / שירות מלא',
          nameEn: newServiceTitle || newSpecialtyHe || 'Standard Session',
          durationMinutes: newServiceDuration,
          priceAmount: newServicePrice,
          priceCurrency: 'INR',
        },
      ],
      tags: [newSpecialtyHe, newArea],
      verifiedCommunityMember: true,
    };

    onAddBusiness(created);
    setShowAddModal(false);
    setNewSpecialtyHe('');
    setNewBusinessNameHe('');
    setNewOwnerNameHe('');
    setNewBioHe('');
    setNewServiceTitle('');
  };

  const getCategoryMeta = (catId: BusinessCategory) =>
    BUSINESS_CATEGORIES.find((c) => c.id === catId) || BUSINESS_CATEGORIES[0];

  const formatServiceOfferPrice = (srv: BusinessServiceOffer) => {
    if (srv.priceCurrency === 'CONTACT') {
      return isHe ? 'בתיאום בפרטי' : 'Contact via WA';
    }
    if (srv.priceCurrency === 'FREE' || srv.priceAmount === 0) {
      return isHe ? 'ללא עלות' : 'Free';
    }
    const sym = srv.priceCurrency === 'ILS' ? '₪' : srv.priceCurrency === 'USD' ? '$' : '₹';
    return `${sym}${srv.priceAmount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 animate-reveal">
      {/* Header & Add Business Action */}
      <div className="bg-canopy-900 text-sand-50 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <h2 className="font-display text-2xl md:text-3xl font-bold">
            {isHe
              ? 'אינדקס בעלי עסקים, מטפלים ונותני שירות בקהילת גואה'
              : 'Goa Community Businesses & Local Services Directory'}
          </h2>
          <p className="text-xs md:text-sm text-sand-200 leading-relaxed">
            {isHe
              ? 'כל נותני השירות בקהילה לפי קטגוריות — טיפולי גוף ומים, תספורות ורוקחות, אומנות, פילאטיס ושחייה, אוכל ביתי, חינוך, מוניות וריקשות, וויזות — כולל פנייה ישירה ותיאום תור.'
              : 'Verified community practitioners and trusted local contacts across South Goa — Bodywork, Beauty, Art, Fitness, Home Food, Kids, Taxis/Rickshaws, and Visas.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-terracotta-500 text-white font-semibold text-sm hover:bg-terracotta-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isHe ? 'רישום עסק / מטפל חדש' : 'Add Business Profile'}
        </button>
      </div>

      {/* Category Filter Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2.5">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`p-3 rounded-xl border text-start transition-colors flex flex-col justify-between ${
            selectedCategory === 'all'
              ? 'bg-canopy-800 text-sand-50 border-canopy-800'
              : 'bg-sand-50 text-canopy-800 border-sand-300 hover:border-canopy-600'
          }`}
        >
          <Briefcase
            className={`w-4 h-4 mb-2 ${
              selectedCategory === 'all' ? 'text-ochre-400' : 'text-terracotta-500'
            }`}
          />
          <div>
            <div className="font-bold text-xs">{isHe ? 'כל הקטגוריות' : 'All Categories'}</div>
            <div
              className={`text-[11px] tabular-nums ${
                selectedCategory === 'all' ? 'text-sand-200' : 'text-canopy-600'
              }`}
            >
              {businesses.length} {isHe ? 'עסקים' : 'listed'}
            </div>
          </div>
        </button>

        {BUSINESS_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = selectedCategory === cat.id;
          const count = businesses.filter((b) => b.category === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`p-3 rounded-xl border text-start transition-colors flex flex-col justify-between ${
                active
                  ? 'bg-canopy-800 text-sand-50 border-canopy-800'
                  : 'bg-sand-50 text-canopy-800 border-sand-300 hover:border-canopy-600'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <Icon
                  className={`w-4 h-4 ${active ? 'text-ochre-400' : 'text-terracotta-500'}`}
                />
                <span
                  className={`text-[11px] font-mono tabular-nums ${
                    active ? 'text-ochre-400' : 'text-canopy-600'
                  }`}
                >
                  {count}
                </span>
              </div>
              <div>
                <div className="font-bold text-xs leading-tight">
                  {isHe ? cat.labelHe : cat.labelEn}
                </div>
                <div
                  className={`text-[10px] mt-0.5 line-clamp-1 ${
                    active ? 'text-sand-300' : 'text-canopy-600'
                  }`}
                >
                  {isHe ? cat.examplesHe : cat.examplesEn}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Secondary Filters */}
      <div className="bg-sand-50 rounded-2xl p-4 border border-sand-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-canopy-600 absolute top-1/2 -translate-y-1/2 start-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isHe
                ? 'חיפוש לפי מקצוע או שם (שיאצו, קוסמטיקאית, מקעקעת, מאמן איגרוף, מאמנת ספורט...)'
                : 'Search by specialty or name (Shiatsu, Cosmetician, Tattoo, Boxing, Fitness...)'
            }
            className="w-full ps-10 pe-4 py-2 rounded-xl bg-white border border-sand-300 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOnlyHomeVisit(!onlyHomeVisit)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              onlyHomeVisit
                ? 'bg-canopy-800 text-sand-50 border-canopy-800'
                : 'bg-white text-canopy-800 border-sand-300'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            {isHe ? 'מגיע/ה לבית הלקוח' : 'Home Visits Available'}
          </button>

          <div className="inline-flex items-center gap-1.5 bg-white border border-sand-300 rounded-xl px-3 py-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-terracotta-500" />
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value as any)}
              className="bg-transparent font-medium text-canopy-800 focus:outline-none"
            >
              <option value="all">{isHe ? 'כל האזורים בגואה' : 'All Areas'}</option>
              <option value="Colomb">Colomb (קולום)</option>
              <option value="Patnem">Patnem (פטנם)</option>
              <option value="Palolem">Palolem (פאלולם)</option>
              <option value="Agonda">Agonda (אגונדה)</option>
            </select>
          </div>
        </div>
      </div>

      {/* CLEAN PROD EMPTY STATE vs BUSINESS DIRECTORY CARDS */}
      {businesses.length === 0 && appEnv === 'prod' ? (
        <div className="bg-sand-50 rounded-2xl border border-sand-300 p-10 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-canopy-100 text-canopy-800 flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="font-display text-2xl font-bold text-canopy-900">
            {isHe
              ? 'סביבת PROD נקייה ומוכנה לבעלי העסקים האמיתיים של הקהילה'
              : 'PROD Environment Ready for Verified Community Businesses'}
          </h3>
          <p className="text-sm text-canopy-700 leading-relaxed">
            {isHe
              ? 'כפי שהגדרת, בסביבת הפרודקשן מופיע אך ורק מידע אמיתי ומאומת שתספק (ללא נתוני דמו). ניתן להוסיף כעת בעל עסק אמיתי ראשון או לעבור לסביבת TEST כדי לראות הדגמה מלאה של הקטגוריות (שיאצו, קוסמטיקאית, מקעקעת, מאמן איגרוף ומאמנת ספורט).'
              : 'PROD strictly holds verified real community listings only. Add your first real business below, or switch to the TEST environment to preview the populated demo directory.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta-500 text-white text-xs font-semibold hover:bg-terracotta-600"
            >
              <Plus className="w-4 h-4" />
              {isHe ? 'הוספת בעל עסק אמיתי ראשון ב-PROD' : 'Add First Real Business'}
            </button>
            <button
              type="button"
              onClick={onSwitchToTest}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-canopy-800 text-sand-50 text-xs font-semibold hover:bg-canopy-700"
            >
              <FlaskConical className="w-4 h-4 text-ochre-400" />
              {isHe ? 'מעבר לסביבת TEST (צפייה בדמו)' : 'Preview Demo in TEST Env'}
            </button>
          </div>
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="bg-sand-50 rounded-2xl border border-sand-300 p-8 text-center text-sm text-canopy-600">
          {isHe
            ? 'לא נמצאו בעלי עסקים התואמים את הסינון הנוכחי.'
            : 'No businesses match the selected filters.'}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBusinesses.map((biz) => {
            const catMeta = getCategoryMeta(biz.category);
            const CatIcon = catMeta.icon;
            return (
              <div
                key={biz.id}
                className="bg-sand-50 rounded-2xl border border-sand-300 hover:border-canopy-700 transition-colors overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Cover Image */}
                  <div className="relative h-44 bg-canopy-900 overflow-hidden">
                    <img
                      src={biz.imageUrl}
                      alt={isHe ? biz.businessNameHe : biz.businessNameEn}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-canopy-950/85 via-canopy-950/20 to-transparent" />
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sand-50 text-canopy-900 text-xs font-semibold">
                        <CatIcon className="w-3.5 h-3.5 text-terracotta-500" />
                        {isHe ? catMeta.labelHe : catMeta.labelEn}
                      </span>
                      {biz.homeVisitAvailable && (
                        <span className="px-2.5 py-1 rounded-lg bg-canopy-900/85 text-ochre-400 text-[11px] font-semibold">
                          {isHe ? 'כולל הגעה לבית' : 'Home Visit'}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 inset-x-4 text-sand-50">
                      <div className="text-xs text-ochre-400 font-semibold">
                        {isHe ? biz.specialtyHe : biz.specialtyEn}
                      </div>
                      <h3 className="font-display text-xl font-bold leading-snug">
                        {isHe ? biz.businessNameHe : biz.businessNameEn}
                      </h3>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between text-xs text-canopy-700">
                      <span className="font-semibold text-canopy-900">
                        {isHe ? biz.ownerNameHe : biz.ownerNameEn}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-terracotta-500" />
                        {biz.area}
                      </span>
                    </div>

                    <p className="text-xs text-canopy-700 leading-relaxed line-clamp-3">
                      {isHe ? biz.bioHe : biz.bioEn}
                    </p>

                    {(biz.websiteUrl || biz.whatsappGroupUrl || biz.instagramHandle) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {biz.websiteUrl && (
                          <a
                            href={biz.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-sand-300 text-[11px] font-semibold text-canopy-800 hover:border-canopy-700 transition-colors"
                          >
                            <Globe className="w-3 h-3 text-terracotta-500" />
                            <span>{isHe ? 'אתר / מידע' : 'Website'}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        )}
                        {biz.whatsappGroupUrl && (
                          <a
                            href={biz.whatsappGroupUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-sand-300 text-[11px] font-semibold text-canopy-800 hover:border-canopy-700 transition-colors"
                          >
                            <Users className="w-3 h-3 text-canopy-600" />
                            <span>{isHe ? 'קבוצת עדכונים' : 'WA Group'}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        )}
                        {biz.instagramHandle && (
                          <a
                            href={`https://instagram.com/${biz.instagramHandle.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-sand-300 text-[11px] font-medium text-canopy-700 hover:border-canopy-700 transition-colors"
                          >
                            <span>{biz.instagramHandle}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Services Menu Preview */}
                    <div className="space-y-1.5 pt-2 border-t border-sand-200">
                      {biz.servicesMenu.map((srv) => (
                        <div
                          key={srv.id}
                          className="flex items-center justify-between gap-2 text-xs bg-white px-3 py-2 rounded-lg border border-sand-200"
                        >
                          <span className="font-medium text-canopy-900 truncate">
                            {isHe ? srv.nameHe : srv.nameEn}
                          </span>
                          <span className="font-bold text-canopy-900 shrink-0 tabular-nums">
                            {formatServiceOfferPrice(srv)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="px-5 py-3.5 bg-sand-100 border-t border-sand-200 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openBookingForBusiness(biz)}
                    className="flex-1 py-2 px-3 rounded-xl bg-canopy-800 text-sand-50 text-xs font-semibold hover:bg-canopy-700 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5 text-ochre-400" />
                    {isHe ? 'תיאום תור ביומן' : 'Book Slot'}
                  </button>

                  <a
                    href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      isHe
                        ? `היי ${biz.ownerNameHe}, הגעתי דרך אינדקס העסקים של LUZ גואה ואשמח לתאם תור ל-${biz.specialtyHe}.`
                        : `Hi ${biz.ownerNameEn}, reaching out via LUZ Goa Directory to book a session.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-xl bg-terracotta-500 text-white text-xs font-semibold hover:bg-terracotta-600 transition-colors inline-flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* APPOINTMENT BOOKING MODAL FOR BUSINESS */}
      {activeBusiness && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-canopy-950/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setActiveBusiness(null)}
        >
          <div
            className="w-full max-w-xl bg-sand-50 rounded-2xl border border-sand-300 overflow-hidden my-8 animate-reveal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-canopy-900 text-sand-50 p-5 flex items-center justify-between">
              <div>
                <div className="text-xs text-ochre-400 font-semibold">
                  {isHe ? activeBusiness.specialtyHe : activeBusiness.specialtyEn}
                </div>
                <h3 className="font-display text-xl font-bold">
                  {isHe ? activeBusiness.businessNameHe : activeBusiness.businessNameEn}
                </h3>
              </div>
              <button
                onClick={() => setActiveBusiness(null)}
                className="w-8 h-8 rounded-full bg-canopy-800 text-sand-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {bookingConfirmed ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-canopy-100 text-canopy-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-display text-2xl font-bold text-canopy-900">
                    {isHe ? 'התור שוריין בהצלחה!' : 'Appointment Confirmed!'}
                  </h4>
                  <p className="text-xs text-canopy-700">
                    {isHe
                      ? `נקבע עם ${activeBusiness.ownerNameHe} בתאריך ${selectedDate} בשעה ${selectedSlot}.`
                      : `Booked with ${activeBusiness.ownerNameEn} on ${selectedDate} at ${selectedSlot}.`}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                    <a
                      href={buildGoogleCalendarUrl({
                        title: `${isHe ? activeBusiness.businessNameHe : activeBusiness.businessNameEn}`,
                        description: isHe ? activeBusiness.bioHe : activeBusiness.bioEn,
                        location: isHe
                          ? activeBusiness.locationDetailsHe
                          : activeBusiness.locationDetailsEn,
                        startDate: selectedDate,
                        startTime: selectedSlot,
                      })}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-canopy-800 text-sand-50 text-xs font-semibold"
                    >
                      <Calendar className="w-3.5 h-3.5 text-ochre-400" />
                      Google Calendar
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        downloadIcsFile({
                          title: isHe
                            ? activeBusiness.businessNameHe
                            : activeBusiness.businessNameEn,
                          description: isHe ? activeBusiness.bioHe : activeBusiness.bioEn,
                          location: isHe
                            ? activeBusiness.locationDetailsHe
                            : activeBusiness.locationDetailsEn,
                          startDate: selectedDate,
                          startTime: selectedSlot,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-sand-300 text-canopy-800 text-xs font-semibold"
                    >
                      <Download className="w-3.5 h-3.5 text-terracotta-500" />
                      .ics
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConfirmBusinessBooking} className="space-y-4">
                  {/* Select Service from Menu */}
                  <div>
                    <label className="block text-xs font-semibold text-canopy-800 mb-1.5">
                      {isHe ? 'בחירת טיפול / שירות:' : 'Select Service:'}
                    </label>
                    <div className="space-y-2">
                      {activeBusiness.servicesMenu.map((offer) => (
                        <label
                          key={offer.id}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs ${
                            selectedOfferId === offer.id
                              ? 'bg-canopy-50 border-canopy-700'
                              : 'bg-white border-sand-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="offer"
                              checked={selectedOfferId === offer.id}
                              onChange={() => setSelectedOfferId(offer.id)}
                            />
                            <span className="font-semibold text-canopy-900">
                              {isHe ? offer.nameHe : offer.nameEn}
                            </span>
                          </div>
                          <span className="font-bold tabular-nums">
                            {formatServiceOfferPrice(offer)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Date & Slot */}
                  <div>
                    <label className="block text-xs font-semibold text-canopy-800 mb-1.5">
                      {isHe ? 'בחירת יום:' : 'Select Day:'}
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {UPCOMING_DATES.map((d) => (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => setSelectedDate(d.date)}
                          className={`py-2 px-1.5 rounded-lg text-xs font-medium tabular-nums ${
                            selectedDate === d.date
                              ? 'bg-canopy-800 text-sand-50'
                              : 'bg-white border border-sand-300 text-canopy-800'
                          }`}
                        >
                          {isHe ? d.labelHe : d.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-canopy-800 mb-1.5">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-terracotta-500" />
                        {isHe ? 'שעה פנויה:' : 'Available Time:'}
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {activeBusiness.timeSlots.map((slot) => {
                        const taken = (activeBusiness.bookedSlots[selectedDate] || []).includes(
                          slot
                        );
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={taken}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tabular-nums ${
                              taken
                                ? 'bg-sand-200 text-canopy-500/50 line-through cursor-not-allowed'
                                : selectedSlot === slot
                                ? 'bg-terracotta-500 text-white'
                                : 'bg-white border border-sand-300 text-canopy-800'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-canopy-700 mb-1">
                        {isHe ? 'השם שלך' : 'Your Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-canopy-700 mb-1">
                        {isHe ? 'וואטסאפ לתזכורת' : 'WhatsApp Phone'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveBusiness(null)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-canopy-700"
                    >
                      {isHe ? 'ביטול' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-terracotta-500 text-white text-xs font-semibold hover:bg-terracotta-600"
                    >
                      {isHe ? 'אישור תור וקבלת תזכורת' : 'Confirm Appointment'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW BUSINESS MODAL */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-canopy-950/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-sand-50 rounded-2xl border border-sand-300 overflow-hidden my-8 animate-reveal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-canopy-900 text-sand-50 px-6 py-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">
                {isHe
                  ? `רישום בעל/ת עסק חדש לקהילה (${appEnv.toUpperCase()})`
                  : `Register Community Business (${appEnv.toUpperCase()})`}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-canopy-800 text-sand-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'קטגוריית עסק' : 'Category'}
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as BusinessCategory)}
                    className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm"
                  >
                    {BUSINESS_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isHe ? `${c.labelHe} (${c.examplesHe})` : c.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe
                      ? 'התמחות / טייטל מקצועי (למשל: מטפל שיאצו / מקעקעת)'
                      : 'Specialty Title'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newSpecialtyHe}
                    onChange={(e) => setNewSpecialtyHe(e.target.value)}
                    placeholder={
                      isHe ? 'לדוגמה: מאמן איגרוף / קוסמטיקאית' : 'e.g., Shiatsu Therapist'
                    }
                    className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'שם העסק / הסטודיו' : 'Business / Studio Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newBusinessNameHe}
                    onChange={(e) => setNewBusinessNameHe(e.target.value)}
                    className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'שם בעל/ת העסק' : 'Owner Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newOwnerNameHe}
                    onChange={(e) => setNewOwnerNameHe(e.target.value)}
                    className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'אזור בגואה' : 'Area in Goa'}
                  </label>
                  <select
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value as GoaArea)}
                    className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="Colomb">Colomb (קולום)</option>
                    <option value="Patnem">Patnem (פטנם)</option>
                    <option value="Palolem">Palolem (פאלולם)</option>
                    <option value="Agonda">Agonda (אגונדה)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'טלפון וואטסאפ' : 'WhatsApp Phone'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+972-..."
                    className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-sand-100 border border-sand-300">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'שירות מרכזי במחירון' : 'Primary Service Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newServiceTitle}
                    onChange={(e) => setNewServiceTitle(e.target.value)}
                    placeholder={isHe ? 'לדוגמה: טיפול שיאצו 60 דק׳' : 'e.g., 60m Session'}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'מחיר (₹ רופי)' : 'Price (₹ INR)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-canopy-800 mb-1">
                  {isHe ? 'תיאור קצר וניסיון מקצועי' : 'Bio & Experience'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={newBioHe}
                  onChange={(e) => setNewBioHe(e.target.value)}
                  className="w-full rounded-xl border border-sand-300 bg-white p-3 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-canopy-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newHomeVisit}
                    onChange={(e) => setNewHomeVisit(e.target.checked)}
                    className="rounded"
                  />
                  {isHe
                    ? 'אפשרות להגעה עד בית הלקוח בגואה'
                    : 'Available for home visits in Goa'}
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-canopy-700"
                  >
                    {isHe ? 'ביטול' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-terracotta-500 text-white text-xs font-semibold hover:bg-terracotta-600"
                  >
                    {isHe ? 'שמירה ופרסום באינדקס העסקים' : 'Publish Business'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
