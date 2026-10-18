import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  Home,
  Wrench,
  CheckCircle2,
  MessageSquare,
  Plus,
  Wifi,
  Zap,
  Link2,
} from 'lucide-react';
import {
  LuzEntity,
  EntityType,
  GoaArea,
  AudienceGroup,
  Language,
  ServiceSubtype,
} from '../types/luz';
import { parseWhatsAppMessageToDraft } from '../utils/calendarAndParser';

interface ProviderViewProps {
  lang: Language;
  onAddEntity: (entity: LuzEntity) => void;
}

const SAMPLE_WHATSAPP_MESSAGES = [
  {
    labelHe: 'דוגמה 1: הופעה חד-פעמית ברביעי',
    labelEn: 'Sample 1: Wed Live Concert',
    text: 'הופעה אקוסטית חיה לשקיעה בגג של אילן בקולום!\nיום רביעי הקרוב ב-20:00, כניסה 400 רופי. מוזמנים להביא כלי נגינה וילדים. לפרטים: +972-52-478-0033',
  },
  {
    labelHe: 'דוגמה 2: השכרת בית בקולום (טווח תאריכים)',
    labelEn: 'Sample 2: House Sublet in Colomb',
    text: 'וילה מהממת להשכרה בקולום ליד שייליש! 3 חדרי שינה ממוזגים, אינטרנט סיבים אופטיים 150 מגה ואינוורטר גיבוי מלא לחשמל. פנויה מ-01/11 עד 25/11. 4500 רופי ללילה. דברו איתי: +972-54-778-9900',
  },
  {
    labelHe: 'דוגמה 3: שירות שעתי / טיפול בתיאום יומן',
    labelEn: 'Sample 3: Hourly Therapy Session',
    text: 'פותחת יומן לטיפולי דיקור ושיאצו לפי שעה בקליניקה השקטה בפטנם. עלות מפגש 1200 רופי, בתיאום משבצת מראש ביומן. טלפון: +972-50-334-5566',
  },
];

export const ProviderView: React.FC<ProviderViewProps> = ({ lang, onAddEntity }) => {
  const isHe = lang === 'he';

  // WhatsApp Parser State
  const [rawWhatsApp, setRawWhatsApp] = useState('');
  const [parsedNotes, setParsedNotes] = useState<string[]>([]);
  const [ingestionSource, setIngestionSource] = useState<'web' | 'whatsapp_dm' | 'scraper'>('web');

  // Entity Form State
  const [type, setType] = useState<EntityType>('event');
  const [titleHe, setTitleHe] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [descriptionHe, setDescriptionHe] = useState('');
  const [area, setArea] = useState<GoaArea>('Colomb');
  const [locationDetailsHe, setLocationDetailsHe] = useState('קולום, ליד החנות של שייליש');
  const [hostName, setHostName] = useState('');
  const [hostPhone, setHostPhone] = useState('+972-52-478-0033');
  const [priceAmount, setPriceAmount] = useState<number>(0);
  const [priceCurrency, setPriceCurrency] = useState<'INR' | 'ILS' | 'USD' | 'FREE'>('INR');
  const [audience, setAudience] = useState<AudienceGroup>('all');

  // Event & Workshop specific
  const [date, setDate] = useState('2026-10-22');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');
  const [dayOfWeek, setDayOfWeek] = useState<number>(3);
  const [weekCycle, setWeekCycle] = useState<'all' | 'week_a' | 'week_b'>('all');
  const [maxCapacity, setMaxCapacity] = useState<number>(25);

  // Hourly Service specific
  const [serviceSubtype, setServiceSubtype] = useState<ServiceSubtype>('provider');
  const [slotDurationMinutes, setSlotDurationMinutes] = useState<number>(60);
  const [timeSlotsText, setTimeSlotsText] = useState('09:00, 10:30, 14:00, 16:30');
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<'connected' | 'manual'>('connected');

  // Property Rental specific (Naor's spec!)
  const [availableFrom, setAvailableFrom] = useState('2026-11-01');
  const [availableTo, setAvailableTo] = useState('2026-11-25');
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [hasFiberWifi, setHasFiberWifi] = useState<boolean>(true);
  const [wifiSpeedMbps, setWifiSpeedMbps] = useState<number>(150);
  const [hasPowerBackup, setHasPowerBackup] = useState<boolean>(true);
  const [pricePerMonth, setPricePerMonth] = useState<number>(90000);

  const [createdSuccess, setCreatedSuccess] = useState(false);

  const handleParseWhatsApp = () => {
    if (!rawWhatsApp.trim()) return;
    const draft = parseWhatsAppMessageToDraft(rawWhatsApp);
    setType(draft.type);
    setTitleHe(draft.titleHe);
    setTitleEn(draft.titleEn);
    setDescriptionHe(draft.descriptionHe);
    setArea(draft.area);
    setLocationDetailsHe(draft.locationDetailsHe);
    setHostPhone(draft.hostPhone);
    setPriceAmount(draft.priceAmount);
    setPriceCurrency(draft.priceCurrency);
    setDate(draft.date);
    setStartTime(draft.startTime);
    setEndTime(draft.endTime);
    setAvailableFrom(draft.availableFrom);
    setAvailableTo(draft.availableTo);
    setBedrooms(draft.bedrooms);
    setHasFiberWifi(draft.hasFiberWifi);
    setHasPowerBackup(draft.hasPowerBackup);
    setParsedNotes(draft.confidenceNotes);
    setIngestionSource('whatsapp_dm');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultImages: Record<EntityType, string> = {
      event: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1000',
      workshop: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
      service: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1000',
      rental: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1000',
    };

    const newEntity: LuzEntity = {
      id: `luz-${Date.now()}`,
      type,
      titleHe: titleHe || 'פריט קהילה חדש',
      titleEn: titleEn || titleHe || 'New Community Item',
      descriptionHe: descriptionHe || titleHe,
      descriptionEn: descriptionHe || titleEn || titleHe,
      area,
      locationDetailsHe,
      locationDetailsEn: `${area}, Goa`,
      hostName: hostName || (isHe ? 'חבר קהילה בגואה' : 'Goa Community Member'),
      hostPhone,
      priceAmount: priceCurrency === 'FREE' ? 0 : priceAmount,
      priceCurrency,
      audience,
      ingestionSource,
      imageUrl: defaultImages[type],
      tags: [area, type],
      rsvpCount: 1,
      maxCapacity,
      date: type === 'event' ? date : undefined,
      startTime: type === 'event' || type === 'workshop' ? startTime : undefined,
      endTime: type === 'event' || type === 'workshop' ? endTime : undefined,
      dayOfWeek: type === 'workshop' ? dayOfWeek : undefined,
      weekCycle: type === 'workshop' ? weekCycle : undefined,
      serviceSubtype: type === 'service' ? serviceSubtype : undefined,
      slotDurationMinutes: type === 'service' ? slotDurationMinutes : undefined,
      availableDays: type === 'service' ? [1, 2, 3, 4, 5] : undefined,
      timeSlots:
        type === 'service'
          ? timeSlotsText
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
      bookedSlots: type === 'service' ? {} : undefined,
      calendarSyncStatus: type === 'service' ? calendarSyncStatus : undefined,
      bookingMode: 'instant',
      availableFrom: type === 'rental' ? availableFrom : undefined,
      availableTo: type === 'rental' ? availableTo : undefined,
      bedrooms: type === 'rental' ? bedrooms : undefined,
      hasFiberWifi: type === 'rental' ? hasFiberWifi : undefined,
      wifiSpeedMbps: type === 'rental' ? wifiSpeedMbps : undefined,
      hasPowerBackup: type === 'rental' ? hasPowerBackup : undefined,
      pricePerNight: type === 'rental' ? priceAmount : undefined,
      pricePerMonth: type === 'rental' ? pricePerMonth : undefined,
      bookedRanges: type === 'rental' ? [] : undefined,
    };

    onAddEntity(newEntity);
    setCreatedSuccess(true);
    setTimeout(() => setCreatedSuccess(false), 5000);
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6 animate-reveal">
      {/* Left Column: WhatsApp DM & Group Scraper AI Importer */}
      <div className="lg:col-span-5 space-y-5">
        <div className="bg-canopy-900 text-sand-50 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-ochre-400" />
              {isHe
                ? 'קליטה מוואטסאפ / Scraper'
                : 'WhatsApp DM & Scraper Ingestion'}
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-canopy-800 text-ochre-400 font-mono">
              Auto-Extract
            </span>
          </div>

          <p className="text-xs text-sand-200 leading-relaxed">
            {isHe
              ? 'הדביקו הודעה מקבוצת הוואטסאפ של גואה או מהודעה פרטית לבוט "בן". המערכת תזהה אוטומטית אם מדובר באירוע חד-פעמי, חוג, שירות שעתי או השכרת בית (כולל מחיר, שעות וטלפון).'
              : 'Paste any message from a Goa WhatsApp group or DM to "Ben". LUZ automatically detects whether it is a one-time event, workshop, hourly service, or home rental.'}
          </p>

          {/* Preset Quick-Load Buttons */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-sand-300">
              {isHe ? 'נסו הודעה לדוגמה בלחיצה:' : 'Try a sample WhatsApp message:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_WHATSAPP_MESSAGES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRawWhatsApp(sample.text)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-canopy-800 hover:bg-canopy-700 text-sand-100 border border-canopy-700 transition-colors"
                >
                  {isHe ? sample.labelHe : sample.labelEn}
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={4}
            value={rawWhatsApp}
            onChange={(e) => setRawWhatsApp(e.target.value)}
            placeholder={
              isHe
                ? 'הדביקו כאן טקסט חופשי מוואטסאפ...'
                : 'Paste raw WhatsApp text here...'
            }
            className="w-full rounded-xl bg-canopy-950/90 border border-canopy-700 p-3.5 text-sm text-sand-50 placeholder:text-sand-400/50"
          />

          <button
            type="button"
            onClick={handleParseWhatsApp}
            className="w-full py-2.5 px-4 rounded-xl bg-ochre-500 text-canopy-950 font-semibold text-sm hover:bg-ochre-400 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isHe ? 'פענח הודעה ומלא את הטופס' : 'Parse Message & Fill Form'}
          </button>

          {parsedNotes.length > 0 && (
            <div className="p-3.5 rounded-xl bg-canopy-800/90 border border-canopy-700 space-y-1.5 text-xs text-sand-100">
              <div className="font-semibold text-ochre-400">
                {isHe ? 'זוהה אוטומטית מהטקסט:' : 'Automatically extracted:'}
              </div>
              {parsedNotes.map((n, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-ochre-400 shrink-0" />
                  <span>{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Structured 4-Entity Creation Form */}
      <div className="lg:col-span-7">
        <form
          onSubmit={handleSubmit}
          className="bg-sand-50 rounded-2xl border border-sand-300 p-6 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-200 pb-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-canopy-900">
                {isHe ? 'העלאת תוכן וניהול ספק (Provider Studio)' : 'Publish to LUZ Community OS'}
              </h2>
              <p className="text-xs text-canopy-600">
                {isHe
                  ? 'בחרו את סוג הישות והגדירו זמינות, מיקום או טווח תאריכים להשכרת נכס'
                  : 'Select entity type and configure schedule, slots, or property date range'}
              </p>
            </div>
          </div>

          {createdSuccess && (
            <div className="p-4 rounded-xl bg-canopy-100 border border-canopy-500 text-canopy-900 flex items-center gap-3 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 text-canopy-700 shrink-0" />
              {isHe
                ? 'הפריט פורסם בהצלחה בלוח LUZ וזמין כעת גם בבוט הוואטסאפ "בן"!'
                : 'Published to LUZ Schedule and synced with "Ben" WhatsApp Bot!'}
            </div>
          )}

          {/* 4 ENTITY TYPE SELECTOR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              {
                id: 'event',
                icon: Calendar,
                labelHe: 'אירוע חד-פעמי',
                subHe: 'הופעה / מפגש',
                labelEn: 'One-Time Event',
                subEn: 'Show / Gathering',
              },
              {
                id: 'workshop',
                icon: Clock,
                labelHe: 'סדנה / חוג',
                subHe: 'יום ושעה קבועים',
                labelEn: 'Workshop / Class',
                subEn: 'Recurring Slot',
              },
              {
                id: 'service',
                icon: Wrench,
                labelHe: 'שירות שעתי',
                subHe: 'סנכרון יומן / אולפן',
                labelEn: 'Hourly Service',
                subEn: 'Calendar Slots',
              },
              {
                id: 'rental',
                icon: Home,
                labelHe: 'השכרת בית',
                subHe: 'טווח מתאריך לתאריך',
                labelEn: 'Home Rental',
                subEn: 'Date Range',
              },
            ].map((item) => {
              const Icon = item.icon;
              const active = type === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id as EntityType)}
                  className={`p-3 rounded-xl border text-start transition-all ${
                    active
                      ? 'bg-canopy-800 text-sand-50 border-canopy-800 shadow-sm'
                      : 'bg-white text-canopy-800 border-sand-300 hover:border-canopy-600'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 mb-1.5 ${
                      active ? 'text-ochre-400' : 'text-terracotta-500'
                    }`}
                  />
                  <div className="font-bold text-xs">{isHe ? item.labelHe : item.labelEn}</div>
                  <div
                    className={`text-[11px] ${
                      active ? 'text-sand-200' : 'text-canopy-600'
                    }`}
                  >
                    {isHe ? item.subHe : item.subEn}
                  </div>
                </button>
              );
            })}
          </div>

          {/* COMMON FIELDS */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-canopy-800 mb-1">
                {isHe ? 'כותרת הפעילות / השירות / הנכס' : 'Title'}
              </label>
              <input
                type="text"
                required
                value={titleHe}
                onChange={(e) => setTitleHe(e.target.value)}
                placeholder={
                  type === 'rental'
                    ? isHe
                      ? 'לדוגמה: וילה 3 חדרים עם גינה וסיבים בקולום'
                      : 'e.g., 3BHK Garden Villa with Fiber in Colomb'
                    : isHe
                    ? 'לדוגמה: ג׳אם שקיעה אקוסטי / סדנת גלישה'
                    : 'e.g., Sunset Acoustic Jam / Surf Workshop'
                }
                className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-canopy-800 mb-1">
                {isHe ? 'אזור בגואה' : 'Goa Neighborhood'}
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value as GoaArea)}
                className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-sm"
              >
                <option value="Colomb">Colomb (קולום)</option>
                <option value="Patnem">Patnem (פטנם)</option>
                <option value="Palolem">Palolem (פאלולם)</option>
                <option value="Agonda">Agonda (אגונדה)</option>
                <option value="Galgibaga">Galgibaga (גלגיבגה)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-canopy-800 mb-1">
                {isHe ? 'מיקום מדויק' : 'Exact Location'}
              </label>
              <input
                type="text"
                value={locationDetailsHe}
                onChange={(e) => setLocationDetailsHe(e.target.value)}
                className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 text-sm"
              />
            </div>
          </div>

          {/* DYNAMIC SECTION BY ENTITY TYPE */}
          {type === 'event' && (
            <div className="p-4 rounded-xl bg-terracotta-50 border border-terracotta-100 grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-canopy-800 mb-1">
                  {isHe ? 'תאריך האירוע' : 'Event Date'}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-canopy-800 mb-1">
                  {isHe ? 'שעת התחלה' : 'Start Time'}
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-canopy-800 mb-1">
                  {isHe ? 'מכסת משתתפים' : 'Max Capacity'}
                </label>
                <input
                  type="number"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(parseInt(e.target.value, 10) || 20)}
                  className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>
          )}

          {type === 'workshop' && (
            <div className="p-4 rounded-xl bg-canopy-50 border border-canopy-100 grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-canopy-800 mb-1">
                  {isHe ? 'יום קבוע בשבוע' : 'Day of Week'}
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm"
                >
                  <option value={1}>{isHe ? 'יום שני' : 'Monday'}</option>
                  <option value={2}>{isHe ? 'יום שלישי' : 'Tuesday'}</option>
                  <option value={3}>{isHe ? 'יום רביעי' : 'Wednesday'}</option>
                  <option value={4}>{isHe ? 'יום חמישי' : 'Thursday'}</option>
                  <option value={5}>{isHe ? 'יום שישי' : 'Friday'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-canopy-800 mb-1">
                  {isHe ? 'מחזוריות (שבוע א׳/ב׳)' : 'Week Cycle'}
                </label>
                <select
                  value={weekCycle}
                  onChange={(e) => setWeekCycle(e.target.value as any)}
                  className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="all">{isHe ? 'כל שבוע' : 'Every Week'}</option>
                  <option value="week_a">{isHe ? 'שבוע א׳ בלבד' : 'Week A Alternating'}</option>
                  <option value="week_b">{isHe ? 'שבוע ב׳ בלבד' : 'Week B Alternating'}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-canopy-800 mb-1">
                  {isHe ? 'שעת המפגש' : 'Session Time'}
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>
          )}

          {type === 'service' && (
            <div className="p-4 rounded-xl bg-ochre-50 border border-ochre-100 space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'תת-קטגוריה' : 'Service Category'}
                  </label>
                  <select
                    value={serviceSubtype}
                    onChange={(e) => setServiceSubtype(e.target.value as ServiceSubtype)}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="provider">
                      {isHe ? 'מטפל / מורה פרטי / מומחה' : 'Practitioner / Tutor'}
                    </option>
                    <option value="space">
                      {isHe ? 'משאב קהילתי (אולפן / עמדת עבודה)' : 'Space / Studio Booking'}
                    </option>
                    <option value="medical">
                      {isHe ? 'רפואה ו-Wellness (זימון תור)' : 'Medical / Doctor Appointment'}
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'משך משבצת (דקות)' : 'Slot Duration (min)'}
                  </label>
                  <select
                    value={slotDurationMinutes}
                    onChange={(e) => setSlotDurationMinutes(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                  >
                    <option value={30}>30 {isHe ? 'דקות' : 'min'}</option>
                    <option value={45}>45 {isHe ? 'דקות' : 'min'}</option>
                    <option value={60}>60 {isHe ? 'דקות' : 'min'}</option>
                    <option value={90}>90 {isHe ? 'דקות' : 'min'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="w-3.5 h-3.5" />
                      {isHe ? 'סנכרון יומן (Calendly/GCal)' : 'Calendar Integration'}
                    </span>
                  </label>
                  <select
                    value={calendarSyncStatus}
                    onChange={(e) => setCalendarSyncStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="connected">
                      {isHe ? 'מחובר ל-Google Calendar (חי)' : 'Google Calendar Connected'}
                    </option>
                    <option value="manual">
                      {isHe ? 'ניהול משבצות ידני ב-LUZ' : 'Manual Slots in LUZ'}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-canopy-800 mb-1">
                  {isHe
                    ? 'משבצות שעה יומיות לבחירה (מופרדות בפסיק)'
                    : 'Available Daily Time Slots (comma separated)'}
                </label>
                <input
                  type="text"
                  value={timeSlotsText}
                  onChange={(e) => setTimeSlotsText(e.target.value)}
                  className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm font-mono tabular-nums"
                />
              </div>
            </div>
          )}

          {type === 'rental' && (
            <div className="p-4 rounded-xl bg-lagoon-50 border border-lagoon-100 space-y-4">
              <div className="text-xs font-semibold text-lagoon-700">
                {isHe
                  ? 'איפיון השכרת בית / סאבלט — סגירת לו"ז מיום ספציפי עד יום ספציפי'
                  : 'Property Sublet / Rental Configuration — Date Range Availability'}
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'זמין מתאריך (From)' : 'Available From'}
                  </label>
                  <input
                    type="date"
                    value={availableFrom}
                    onChange={(e) => setAvailableFrom(e.target.value)}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'עד תאריך (To)' : 'Available To'}
                  </label>
                  <input
                    type="date"
                    value={availableTo}
                    onChange={(e) => setAvailableTo(e.target.value)}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-canopy-800 mb-1">
                    {isHe ? 'מספר חדרי שינה (BHK)' : 'Bedrooms (BHK)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={bedrooms}
                    onChange={(e) => setBedrooms(parseInt(e.target.value, 10) || 2)}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-canopy-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasFiberWifi}
                    onChange={(e) => setHasFiberWifi(e.target.checked)}
                    className="rounded text-lagoon-600"
                  />
                  <Wifi className="w-4 h-4 text-lagoon-600" />
                  {isHe ? 'אינטרנט סיבים אופטיים יציב' : 'Fiber Optic Wi-Fi'}
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-medium text-canopy-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPowerBackup}
                    onChange={(e) => setHasPowerBackup(e.target.checked)}
                    className="rounded text-lagoon-600"
                  />
                  <Zap className="w-4 h-4 text-ochre-600" />
                  {isHe ? 'אינוורטר / גנרטור להפסקות חשמל' : 'Inverter / Generator Backup'}
                </label>
              </div>
            </div>
          )}

          {/* PRICE, HOST & DESCRIPTION */}
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-canopy-800 mb-1">
                {type === 'rental'
                  ? isHe
                    ? 'מחיר ללילה'
                    : 'Price / Night'
                  : isHe
                  ? 'מחיר'
                  : 'Price'}
              </label>
              <input
                type="number"
                min={0}
                value={priceAmount}
                onChange={(e) => setPriceAmount(parseInt(e.target.value, 10) || 0)}
                className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-canopy-800 mb-1">
                {isHe ? 'מטבע' : 'Currency'}
              </label>
              <select
                value={priceCurrency}
                onChange={(e) => setPriceCurrency(e.target.value as any)}
                className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm"
              >
                <option value="INR">₹ רופי (INR)</option>
                <option value="ILS">₪ ש"ח (ILS)</option>
                <option value="USD">$ דולר (USD)</option>
                <option value="FREE">{isHe ? 'חינם / קהילתי' : 'Free'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-canopy-800 mb-1">
                {isHe ? 'שם המארח / הספק' : 'Host / Provider Name'}
              </label>
              <input
                type="text"
                required
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder={isHe ? 'לדוגמה: אלון / גלי / נאור' : 'e.g., Alon / Gali / Naor'}
                className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-canopy-800 mb-1">
                {isHe ? 'וואטסאפ ליצירת קשר' : 'WhatsApp Phone'}
              </label>
              <input
                type="tel"
                required
                value={hostPhone}
                onChange={(e) => setHostPhone(e.target.value)}
                className="w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-canopy-800 mb-1">
              {isHe ? 'תיאור מלא ופרטים לקהילה' : 'Full Description'}
            </label>
            <textarea
              rows={3}
              value={descriptionHe}
              onChange={(e) => setDescriptionHe(e.target.value)}
              className="w-full rounded-xl border border-sand-300 bg-white p-3 text-sm"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-terracotta-500 text-white font-semibold text-sm hover:bg-terracotta-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {isHe ? 'פרסם בלוח LUZ ובבוט "בן"' : 'Publish to LUZ & "Ben" Bot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
