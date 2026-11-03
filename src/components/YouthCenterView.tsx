import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Plus,
  CheckCircle2,
  Download,
  MapPin,
  Calendar,
  Clock,
  FileSpreadsheet,
  LayoutGrid,
  CalendarDays,
  X,
  UserCheck,
  MessageCircle,
} from 'lucide-react';
import {
  YouthCenterFamily,
  LuzEntity,
  BookingRecord,
  Language,
} from '../types/luz';
import { DEFAULT_GLOBAL_WEBHOOK_OR_GAS_URL } from '../config/notifications';

export interface YouthCenterEventRegistration {
  id: string;
  eventId: string;
  eventTitleHe: string;
  eventTitleEn: string;
  eventSchedule: string;
  participantName: string;
  participantAge: number;
  parentName: string;
  parentPhone: string;
  notes: string;
  createdAt: string;
}

interface YouthCenterViewProps {
  families: YouthCenterFamily[];
  lang: Language;
  onRegisterFamily: (family: Omit<YouthCenterFamily, 'id' | 'createdAt'>) => void;
  entities?: LuzEntity[];
  bookings?: BookingRecord[];
  onAddEntity?: (entity: LuzEntity) => void;
  onConfirmBooking?: (
    entityId: string,
    bookingData: Omit<BookingRecord, 'id' | 'createdAt' | 'status'>
  ) => void;
}

const YC_REGISTRATIONS_STORAGE_KEY = 'luz_yc_event_registrations_v1';
const YC_SHEET_WEBHOOK_STORAGE_KEY = 'luz_yc_google_sheet_webhook_v1';

const CORE_YOUTH_CENTER_EVENTS: LuzEntity[] = [
  {
    id: 'yc-evt-mon-game-on',
    type: 'workshop',
    titleHe: 'Game On — משחקי אסטרטגיה, שחמט וטורנירים',
    titleEn: 'Game On — Strategy Board Games, Chess & Tournaments',
    descriptionHe:
      'אחר צהריים של משחקי קופסה אסטרטגיים, שחמט, קטאן וטורנירים קבוצתיים במרחב הבמבוק בקולום לגילאי 8–15.',
    descriptionEn:
      'Afternoon of strategy board games, chess, Catan, and team tournaments at the Colomb bamboo pavilion for ages 8–15.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=900',
    tags: ['משחקי קופסה', 'שחמט', 'נוער', 'Game On'],
    rsvpCount: 0,
    dayOfWeek: 1, // Monday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:00',
  },
  {
    id: 'yc-evt-tue-open-minds',
    type: 'workshop',
    titleHe: 'Open Minds — מעגל שיח, דיבייט ורעיונות גדולים',
    titleEn: 'Open Minds — Youth Discussion Circle & Big Ideas',
    descriptionHe:
      'מפגש שבועי בגובה העיניים לבני נוער: שאלות מסקרנות, דיבייט חופשי, סיפורים אישיים ופרויקטים שהנוער מוביל בעצמו.',
    descriptionEn:
      'Weekly youth circle exploring big questions, friendly debate, storytelling, and youth-led initiatives.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=900',
    tags: ['שיח פתוח', 'נוער', 'Open Minds'],
    rsvpCount: 0,
    dayOfWeek: 2, // Tuesday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:00',
  },
  {
    id: 'yc-evt-wed-screen-scene',
    type: 'workshop',
    titleHe: 'Screen / Scene — ערב סרט, אימפרוביזציה ובמה',
    titleEn: 'Screen / Scene — Movie Night, Improv & Stage',
    descriptionHe:
      'ערב של תיאטרון ואימפרוביזציה בשקיעה ובהמשך הקרנת סרט על מסך גדול עם פופקורן ושיחה משותפת.',
    descriptionEn:
      'Sunset improv games and theater expression followed by an outdoor big-screen movie screening with popcorn.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=900',
    tags: ['קולנוע', 'במה', 'אימפרוביזציה', 'נוער'],
    rsvpCount: 0,
    dayOfWeek: 3, // Wednesday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '17:00',
    endTime: '19:30',
  },
  {
    id: 'yc-evt-thu-noise-makers',
    type: 'workshop',
    titleHe: 'Noise / Makers — מעבדת יצירה בבמבוק וג׳אם מוזיקה',
    titleEn: 'Noise / Makers — Bamboo Makers Lab & Music Jam',
    descriptionHe:
      'עבודה מעשית עם במבוק, כלי עבודה ואמנות, ולקראת השקיעה — ג׳אם אקוסטי פתוח עם גיטרות, כלי הקשה ושירה.',
    descriptionEn:
      'Hands-on bamboo crafting and art lab followed by an open sunset acoustic jam for youth musicians.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=900',
    tags: ['מייקרים', 'במבוק', 'מוזיקה', 'ג׳אם'],
    rsvpCount: 0,
    dayOfWeek: 4, // Thursday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:30',
  },
];

const DAY_NAMES_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const YouthCenterView: React.FC<YouthCenterViewProps> = ({
  lang,
  entities = [],
  onAddEntity,
  onConfirmBooking,
}) => {
  const isHe = lang === 'he';

  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards');
  const [selectedEventForReg, setSelectedEventForReg] = useState<LuzEntity | null>(null);
  const [filterEventId, setFilterEventId] = useState<string>('all');

  // Event registration form state
  const [participantName, setParticipantName] = useState('');
  const [participantAge, setParticipantAge] = useState<number>(12);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [regSubmitted, setRegSubmitted] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);

  // Add new Youth Center Event modal state
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newTitleHe, setNewTitleHe] = useState('');
  const [newDescHe, setNewDescHe] = useState('');
  const [newDayOfWeek, setNewDayOfWeek] = useState<number>(1);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('16:30');
  const [newEndTime, setNewEndTime] = useState('19:00');
  const [newHostName, setNewHostName] = useState('צוות מרכז הנוער גואה');
  const [newHostPhone, setNewHostPhone] = useState('+972-52-478-0033');

  // Dedicated Google Sheet Webhook URL (defaults to the active LUZ Google Apps Script Webhook)
  const [ycSheetWebhookUrl, setYcSheetWebhookUrl] = useState<string>(() => {
    try {
      return (
        localStorage.getItem(YC_SHEET_WEBHOOK_STORAGE_KEY) ||
        DEFAULT_GLOBAL_WEBHOOK_OR_GAS_URL
      );
    } catch {
      return DEFAULT_GLOBAL_WEBHOOK_OR_GAS_URL;
    }
  });
  const [showSheetSettings, setShowSheetSettings] = useState(false);

  // Persistent list of Youth Center Event Registrations
  const [registrations, setRegistrations] = useState<YouthCenterEventRegistration[]>(() => {
    try {
      const saved = localStorage.getItem(YC_REGISTRATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(YC_REGISTRATIONS_STORAGE_KEY, JSON.stringify(registrations));
    } catch {
      // ignore
    }
  }, [registrations]);

  useEffect(() => {
    try {
      if (ycSheetWebhookUrl.trim()) {
        localStorage.setItem(YC_SHEET_WEBHOOK_STORAGE_KEY, ycSheetWebhookUrl.trim());
      }
    } catch {
      // ignore
    }
  }, [ycSheetWebhookUrl]);

  // Combine core Youth Center events with any Youth/Kids events from entities
  const youthEvents = useMemo(() => {
    const customYouthEntities = entities.filter(
      (e) =>
        (e.isYouthCenter || e.audience === 'youth_11_15' || e.audience === 'kids_8_15') &&
        e.id !== 'prod-wks-yc-colomb'
    );

    const map = new Map<string, LuzEntity>();
    CORE_YOUTH_CENTER_EVENTS.forEach((ev) => map.set(ev.id, ev));
    customYouthEntities.forEach((ev) => map.set(ev.id, ev));

    return Array.from(map.values()).sort((a, b) => {
      const dayA = typeof a.dayOfWeek === 'number' ? a.dayOfWeek : 1;
      const dayB = typeof b.dayOfWeek === 'number' ? b.dayOfWeek : 1;
      if (dayA !== dayB) return dayA - dayB;
      return (a.startTime || '16:00').localeCompare(b.startTime || '16:00');
    });
  }, [entities]);

  const formatEventSchedule = (ev: LuzEntity) => {
    const dayStr =
      typeof ev.dayOfWeek === 'number'
        ? isHe
          ? DAY_NAMES_HE[ev.dayOfWeek]
          : DAY_NAMES_EN[ev.dayOfWeek]
        : ev.date || '';
    const timeStr = `${ev.startTime || '16:30'}${ev.endTime ? ` – ${ev.endTime}` : ''}`;
    return dayStr ? `${dayStr} · ${timeStr}` : timeStr;
  };

  const getEventRegistrations = (eventId: string) =>
    registrations.filter((r) => r.eventId === eventId);

  const visibleRegistrations = useMemo(() => {
    if (filterEventId === 'all') return registrations;
    return registrations.filter((r) => r.eventId === filterEventId);
  }, [registrations, filterEventId]);

  const handleOpenRegisterModal = (ev: LuzEntity) => {
    setSelectedEventForReg(ev);
    setRegSubmitted(false);
  };

  const handleSubmitEventRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForReg) return;

    const scheduleLabel = formatEventSchedule(selectedEventForReg);
    const newReg: YouthCenterEventRegistration = {
      id: `yc-reg-${Date.now()}`,
      eventId: selectedEventForReg.id,
      eventTitleHe: selectedEventForReg.titleHe,
      eventTitleEn: selectedEventForReg.titleEn,
      eventSchedule: scheduleLabel,
      participantName: participantName.trim(),
      participantAge: Number(participantAge) || 12,
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      notes: notes.trim() || (isHe ? 'ללא' : 'None'),
      createdAt: new Date().toISOString(),
    };

    setRegistrations((prev) => [newReg, ...prev]);

    if (onConfirmBooking) {
      onConfirmBooking(selectedEventForReg.id, {
        referralCode: `YC-${Date.now().toString().slice(-4)}`,
        entityId: selectedEventForReg.id,
        entityTitleHe: selectedEventForReg.titleHe,
        entityTitleEn: selectedEventForReg.titleEn,
        entityType: 'workshop',
        customerName: `${newReg.participantName} (הורה: ${newReg.parentName})`,
        customerPhone: newReg.parentPhone,
        participantsCount: 1,
        selectedDate: selectedEventForReg.date || scheduleLabel,
        selectedSlot: selectedEventForReg.startTime || '16:30',
        totalPrice: 0,
        currency: 'FREE',
        reminderChannel: 'whatsapp',
      });
    }

    // Dispatch to Dedicated Youth Center Google Sheet via Google Apps Script Webhook
    const targetUrl = (ycSheetWebhookUrl || DEFAULT_GLOBAL_WEBHOOK_OR_GAS_URL).trim();
    if (targetUrl.startsWith('https://')) {
      setSyncingSheet(true);
      try {
        const payload = {
          event: 'luz.youth_center_event_rsvp',
          dedicatedSheetName: 'LUZ Goa — Youth Center Events Roster',
          sheetTabName: 'Youth_Center_Events',
          referralCode: `YC-${Date.now().toString().slice(-4)}`,
          environment: 'prod',
          actionType: 'event_rsvp',
          actionLabelHe: 'הרשמה לאירוע במרכז הנוער גואה',
          youthCenterEvent: {
            eventId: selectedEventForReg.id,
            titleHe: selectedEventForReg.titleHe,
            titleEn: selectedEventForReg.titleEn,
            schedule: scheduleLabel,
            location: selectedEventForReg.locationDetailsHe,
            participantName: newReg.participantName,
            participantAge: newReg.participantAge,
            parentName: newReg.parentName,
            parentPhone: newReg.parentPhone,
            notes: newReg.notes,
            registeredAt: newReg.createdAt,
          },
          provider: {
            id: selectedEventForReg.id,
            nameHe: `מרכז הנוער — ${selectedEventForReg.titleHe}`,
            nameEn: `Youth Center — ${selectedEventForReg.titleEn}`,
            ownerOrHost: selectedEventForReg.hostName,
            phone: selectedEventForReg.hostPhone,
            categoryOrType: 'Youth Center Event',
            area: selectedEventForReg.area,
            contactLang: 'he',
          },
          customer: {
            name: `${newReg.participantName} (גיל ${newReg.participantAge}, הורה: ${newReg.parentName})`,
            phone: newReg.parentPhone,
          },
          serviceOrDateSummary: `${selectedEventForReg.titleHe} | ${scheduleLabel} | הערות: ${newReg.notes}`,
        };

        await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          mode: 'no-cors',
        });
      } catch {
        // Saved locally even if offline
      } finally {
        setSyncingSheet(false);
      }
    }

    setRegSubmitted(true);
  };

  const handleCreateYouthEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleHe.trim()) return;

    const created: LuzEntity = {
      id: `yc-custom-${Date.now()}`,
      type: 'workshop',
      titleHe: newTitleHe.trim(),
      titleEn: newTitleHe.trim(),
      descriptionHe: newDescHe.trim() || newTitleHe.trim(),
      descriptionEn: newDescHe.trim() || newTitleHe.trim(),
      area: 'Colomb',
      locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
      locationDetailsEn: 'Colomb Youth Center (near Shailish)',
      hostName: newHostName.trim() || 'צוות מרכז הנוער',
      hostNameEn: newHostName.trim() || 'Youth Center Team',
      hostPhone: newHostPhone.trim() || '+972-52-478-0033',
      priceAmount: 0,
      priceCurrency: 'FREE',
      audience: 'youth_11_15',
      ingestionSource: 'web',
      imageUrl:
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=900',
      tags: ['מרכז הנוער', 'קולום'],
      rsvpCount: 0,
      dayOfWeek: newDayOfWeek,
      date: newDate || undefined,
      weekCycle: 'all',
      isYouthCenter: true,
      startTime: newStartTime,
      endTime: newEndTime,
    };

    if (onAddEntity) {
      onAddEntity(created);
    }
    setShowAddEventModal(false);
    setNewTitleHe('');
    setNewDescHe('');
  };

  const exportRegistrationsToCsv = (onlyEventId?: string) => {
    const targetList =
      onlyEventId && onlyEventId !== 'all'
        ? registrations.filter((r) => r.eventId === onlyEventId)
        : visibleRegistrations;

    const headers = [
      'תאריך רישום (Timestamp)',
      'שם האירוע (Event)',
      'מועד ושעה (Schedule)',
      'שם הילד/ה (Participant Name)',
      'גיל (Age)',
      'שם ההורה (Parent Name)',
      'טלפון הורה (Parent WhatsApp)',
      'הערות (Notes)',
    ];

    const rows = targetList.map((r) => [
      new Date(r.createdAt).toLocaleString('he-IL'),
      r.eventTitleHe,
      r.eventSchedule,
      r.participantName,
      String(r.participantAge),
      r.parentName,
      r.parentPhone,
      r.notes,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'youth_center_goa_event_registrations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Clean Modern Header for Youth Center Events */}
      <section className="hallmark-well-gold p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-paper-2 text-xs font-semibold text-ink-2">
            <MapPin className="w-3.5 h-3.5 text-accent" />
            <span>
              {isHe
                ? 'מרכז הנוער גואה · קולום (ליד שייליש) · גילאי 8–15'
                : 'Youth Center Goa · Colomb (near Shailish) · Ages 8–15'}
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink leading-tight">
            {isHe
              ? 'אירועים ופעילויות במרכז הנוער גואה'
              : 'Youth Center Goa Events & Activities'}
          </h1>

          <p className="text-sm sm:text-base text-ink-2 leading-relaxed">
            {isHe
              ? 'צפו בלוח הפעילויות והאירועים של מרכז הנוער והירשמו לכל מפגש בנפרד. כל הרשמה נשמרת אוטומטית בגיליון Google Sheets הייעודי של מרכז הנוער.'
              : 'Browse all Youth Center Goa sessions and register for individual events. Every registration is logged automatically to the dedicated Youth Center Google Sheet.'}
          </p>
        </div>

        {/* Right Controls: View Switcher + Add Event */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div
            className="inline-flex items-center bg-paper-2 p-1 rounded-full border border-rule"
            role="group"
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                viewMode === 'cards'
                  ? 'bg-ink text-paper shadow-sm'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{isHe ? 'כרטיסי אירועים' : 'Event Cards'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>{isHe ? 'לוח שבועי' : 'Weekly Schedule'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddEventModal(true)}
            className="hallmark-btn-primary text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isHe ? 'הוספת אירוע לנוער' : 'Add Youth Event'}</span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          YOUTH CENTER EVENTS: CARDS VIEW vs WEEKLY CALENDAR VIEW
         ===================================================================== */}
      {viewMode === 'calendar' ? (
        <section className="hallmark-plate overflow-hidden">
          <div className="p-5 bg-paper-2 border-b border-rule flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-ink">
              {isHe ? 'לוח אירועי מרכז הנוער לפי ימים' : 'Youth Center Chronological Schedule'}
            </h2>
            <span className="text-xs font-semibold text-muted">
              {youthEvents.length} {isHe ? 'מפגשים פעילים' : 'active sessions'}
            </span>
          </div>

          <div className="divide-y divide-rule">
            {youthEvents.map((ev) => {
              const evRegs = getEventRegistrations(ev.id);
              const title = isHe ? ev.titleHe : ev.titleEn;
              const desc = isHe ? ev.descriptionHe : ev.descriptionEn;
              const loc = isHe ? ev.locationDetailsHe : ev.locationDetailsEn;

              return (
                <div
                  key={ev.id}
                  className="p-5 hover:bg-paper-2/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-32 shrink-0 rounded-2xl bg-paper-2 border border-rule p-3 text-center">
                      <div className="text-xs font-bold text-accent">
                        {typeof ev.dayOfWeek === 'number'
                          ? isHe
                            ? DAY_NAMES_HE[ev.dayOfWeek]
                            : DAY_NAMES_EN[ev.dayOfWeek]
                          : ev.date}
                      </div>
                      <div className="hallmark-code text-sm font-bold text-ink mt-0.5">
                        {ev.startTime || '16:30'}
                      </div>
                    </div>

                    <div className="space-y-1 min-w-0">
                      <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
                      <p className="text-xs sm:text-sm text-ink-2 line-clamp-2">{desc}</p>
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-accent" />
                          {loc}
                        </span>
                        <span className="inline-flex items-center gap-1 font-semibold text-ink">
                          <Users className="w-3.5 h-3.5 text-accent" />
                          {evRegs.length} {isHe ? 'נרשמו לאירוע זה' : 'registered'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenRegisterModal(ev)}
                      className="hallmark-btn-primary text-xs sm:text-sm !py-2 !px-4"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{isHe ? 'הרשמה לאירוע' : 'Register'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {youthEvents.map((ev) => {
            const evRegs = getEventRegistrations(ev.id);
            const title = isHe ? ev.titleHe : ev.titleEn;
            const desc = isHe ? ev.descriptionHe : ev.descriptionEn;
            const loc = isHe ? ev.locationDetailsHe : ev.locationDetailsEn;

            return (
              <article
                key={ev.id}
                className="hallmark-plate overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all group"
              >
                <div>
                  {/* Image Header */}
                  <div className="relative h-44 w-full overflow-hidden bg-paper-2">
                    <img
                      src={ev.imageUrl}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-accent text-white shadow-sm">
                        {typeof ev.dayOfWeek === 'number'
                          ? isHe
                            ? DAY_NAMES_HE[ev.dayOfWeek]
                            : DAY_NAMES_EN[ev.dayOfWeek]
                          : isHe
                          ? 'אירוע נוער'
                          : 'Youth Event'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-ink shadow-sm inline-flex items-center gap-1">
                        <Users className="w-3 h-3 text-accent" />
                        <span>
                          {evRegs.length} {isHe ? 'נרשמים' : 'registered'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-display text-xl font-bold text-ink leading-snug">
                      {title}
                    </h3>

                    <p className="text-sm text-ink-2 line-clamp-2 leading-relaxed">{desc}</p>

                    <div className="pt-2 space-y-1.5 text-xs sm:text-sm text-ink-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-accent shrink-0" />
                        <span className="font-semibold text-ink">{formatEventSchedule(ev)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted shrink-0" />
                        <span className="truncate">{loc}</span>
                      </div>
                    </div>

                    {/* Preview of Registered Kids for this Event */}
                    {evRegs.length > 0 && (
                      <div className="pt-2 border-t border-rule">
                        <div className="text-[11px] font-semibold text-muted mb-1">
                          {isHe ? 'נרשמו לאירוע:' : 'Registered participants:'}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {evRegs.slice(0, 5).map((r) => (
                            <span
                              key={r.id}
                              className="px-2.5 py-0.5 rounded-full bg-paper-2 text-xs font-medium text-ink"
                            >
                              {r.participantName} ({r.participantAge})
                            </span>
                          ))}
                          {evRegs.length > 5 && (
                            <span className="px-2 py-0.5 rounded-full bg-paper-2 text-xs text-muted">
                              +{evRegs.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Footer */}
                <div className="px-5 py-4 bg-paper/60 border-t border-rule flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-ink-2">
                    {isHe ? 'גילאי 8–15' : 'Ages 8–15'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenRegisterModal(ev)}
                    className="hallmark-btn-primary text-xs sm:text-sm !py-2 !px-4"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{isHe ? 'הרשמה לאירוע' : 'Register for Event'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* =====================================================================
          DEDICATED GOOGLE SHEETS ROSTER PANEL FOR YOUTH CENTER EVENTS
         ===================================================================== */}
      <section className="hallmark-plate p-6 sm:p-8 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rule">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {isHe
                  ? 'מסונכרן אוטומטית למסמך Google Sheets ייעודי של מרכז הנוער'
                  : 'Synced automatically to Dedicated Youth Center Google Sheet'}
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">
              {isHe ? 'רשימת נרשמים לאירועי מרכז הנוער' : 'Youth Center Event Registrants Roster'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter by Event */}
            <select
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              className="px-3.5 py-2 rounded-full bg-paper border border-rule-strong text-xs sm:text-sm font-semibold text-ink"
            >
              <option value="all">
                {isHe
                  ? `כל האירועים (${registrations.length} נרשמים)`
                  : `All Events (${registrations.length})`}
              </option>
              {youthEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {isHe ? ev.titleHe : ev.titleEn} ({getEventRegistrations(ev.id).length})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => exportRegistrationsToCsv(filterEventId)}
              className="hallmark-btn-secondary text-xs !py-2 !px-3.5"
            >
              <Download className="w-4 h-4 text-accent" />
              <span>{isHe ? 'ייצוא ל-Google Sheets (CSV)' : 'Export CSV'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSheetSettings(!showSheetSettings)}
              className="px-3.5 py-2 rounded-full bg-paper-2 hover:bg-paper-3 text-xs font-semibold text-ink transition-colors inline-flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isHe ? 'הגדרת גיליון ייעודי' : 'Sheet Link'}</span>
            </button>
          </div>
        </div>

        {showSheetSettings && (
          <div className="p-4 rounded-2xl bg-paper-2 border border-rule space-y-2 text-xs">
            <label className="font-bold text-ink block">
              {isHe
                ? 'כתובת ה-Webhook של גיליון Google Sheets הייעודי למרכז הנוער:'
                : 'Dedicated Youth Center Google Sheet Webhook URL:'}
            </label>
            <input
              type="url"
              value={ycSheetWebhookUrl}
              onChange={(e) => setYcSheetWebhookUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full rounded-xl border border-rule-strong bg-plate px-3.5 py-2 text-xs hallmark-code text-ink"
              dir="ltr"
            />
            <p className="text-muted">
              {isHe
                ? 'כל הרשמה לאירוע נשלחת אוטומטית עם תגית luz.youth_center_event_rsvp ויוצרת/מעדכנת את גיליון "LUZ Goa — Youth Center Events Roster" בחשבון Google שלך.'
                : 'Every event signup automatically posts luz.youth_center_event_rsvp to your dedicated Youth Center Google Sheet.'}
            </p>
          </div>
        )}

        {visibleRegistrations.length === 0 ? (
          <div className="p-8 rounded-2xl bg-paper text-center space-y-2 border border-rule">
            <Users className="w-7 h-7 text-muted mx-auto" />
            <div className="font-display text-base font-bold text-ink">
              {isHe ? 'עדיין אין נרשמים לאירוע זה' : 'No registrants for this event yet'}
            </div>
            <p className="text-xs text-muted">
              {isHe
                ? 'לחצו על "הרשמה לאירוע" בכרטיס האירוע למעלה כדי להוסיף משתתף/ת לרשימה ולגיליון ה-Google Sheets.'
                : 'Click "Register for Event" on any event card above to add a participant.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-rule text-muted bg-paper-2/60">
                  <th className="py-3 px-4 text-start font-semibold">
                    {isHe ? 'שם המשתתף/ת' : 'Participant'}
                  </th>
                  <th className="py-3 px-4 text-start font-semibold">
                    {isHe ? 'גיל' : 'Age'}
                  </th>
                  <th className="py-3 px-4 text-start font-semibold">
                    {isHe ? 'אירוע' : 'Event'}
                  </th>
                  <th className="py-3 px-4 text-start font-semibold">
                    {isHe ? 'מועד' : 'Schedule'}
                  </th>
                  <th className="py-3 px-4 text-start font-semibold">
                    {isHe ? 'הורה וטלפון' : 'Parent & Phone'}
                  </th>
                  <th className="py-3 px-4 text-start font-semibold">
                    {isHe ? 'הערות' : 'Notes'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {visibleRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-paper-2/40">
                    <td className="py-3 px-4 font-bold text-ink">{reg.participantName}</td>
                    <td className="py-3 px-4 text-ink-2">{reg.participantAge}</td>
                    <td className="py-3 px-4 font-medium text-ink">
                      {isHe ? reg.eventTitleHe : reg.eventTitleEn}
                    </td>
                    <td className="py-3 px-4 text-muted">{reg.eventSchedule}</td>
                    <td className="py-3 px-4 text-ink-2">
                      {reg.parentName} · <span dir="ltr">{reg.parentPhone}</span>
                    </td>
                    <td className="py-3 px-4 text-muted">{reg.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================================
          MODAL 1: REGISTER PARTICIPANT FOR A SPECIFIC YOUTH CENTER EVENT
         ===================================================================== */}
      {selectedEventForReg && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedEventForReg(null)}
        >
          <div
            className="hallmark-plate max-w-lg w-full p-6 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-rule pb-4">
              <div>
                <span className="text-xs font-semibold text-accent">
                  {isHe ? 'הרשמה לאירוע במרכז הנוער' : 'Youth Center Event Registration'}
                </span>
                <h3 className="font-display text-xl font-bold text-ink mt-0.5">
                  {isHe ? selectedEventForReg.titleHe : selectedEventForReg.titleEn}
                </h3>
                <p className="text-xs text-muted mt-1">
                  {formatEventSchedule(selectedEventForReg)} ·{' '}
                  {isHe
                    ? selectedEventForReg.locationDetailsHe
                    : selectedEventForReg.locationDetailsEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventForReg(null)}
                className="p-1.5 rounded-full bg-paper-2 text-ink hover:bg-paper-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {regSubmitted ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display text-2xl font-bold text-ink">
                    {isHe ? 'ההרשמה לאירוע נקלטה!' : 'Registered Successfully!'}
                  </h4>
                  <p className="text-sm text-ink-2">
                    {isHe
                      ? `${participantName} רשום/ה למפגש "${selectedEventForReg.titleHe}" והשורה נוספה אוטומטית לגיליון ה-Google Sheets של מרכז הנוער.`
                      : `${participantName} is registered and synced to the Youth Center Google Sheet.`}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <a
                    href={`https://wa.me/${selectedEventForReg.hostPhone.replace(
                      /[^0-9]/g,
                      ''
                    )}?text=${encodeURIComponent(
                      isHe
                        ? `היי! רשמתי את ${participantName} (גיל ${participantAge}) לאירוע "${selectedEventForReg.titleHe}" במרכז הנוער (${formatEventSchedule(
                            selectedEventForReg
                          )}). הורה: ${parentName}`
                        : `Hi! I registered ${participantName} (age ${participantAge}) for "${selectedEventForReg.titleEn}" at Youth Center Goa.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hallmark-btn-primary text-xs sm:text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{isHe ? 'שליחת הודעה בוואטסאפ לצוות' : 'Message Team on WhatsApp'}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEventForReg(null);
                      setParticipantName('');
                      setNotes('');
                    }}
                    className="hallmark-btn-secondary text-xs sm:text-sm"
                  >
                    {isHe ? 'סיום' : 'Done'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitEventRegistration} className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-ink mb-1">
                      {isHe ? 'שם הילד/ה או הנער/ה *' : 'Participant Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      placeholder={isHe ? 'לדוגמה: אורי כהן' : 'e.g. Ori Cohen'}
                      className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      {isHe ? 'גיל *' : 'Age *'}
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={18}
                      required
                      value={participantAge}
                      onChange={(e) => setParticipantAge(parseInt(e.target.value, 10) || 12)}
                      className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm text-ink"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      {isHe ? 'שם ההורה *' : 'Parent Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder={isHe ? 'שם ההורה' : 'Parent Name'}
                      className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1">
                      {isHe ? 'טלפון וואטסאפ של ההורה *' : 'Parent WhatsApp Phone *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      placeholder="+972-52-..."
                      dir="ltr"
                      className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'הערות / רגישויות (אופציונלי)' : 'Notes / Allergies (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isHe ? 'לדוגמה: מגיע עם חבר / אלרגיה...' : 'Optional notes...'}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm text-ink"
                  />
                </div>

                <button
                  type="submit"
                  disabled={syncingSheet}
                  className="w-full hallmark-btn-primary py-3 text-sm"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {syncingSheet
                      ? isHe
                        ? 'שומר בגיליון Google Sheets...'
                        : 'Saving to Google Sheet...'
                      : isHe
                      ? 'אישור הרשמה לאירוע'
                      : 'Confirm Event Registration'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ADD NEW YOUTH CENTER EVENT
         ===================================================================== */}
      {showAddEventModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddEventModal(false)}
        >
          <div
            className="hallmark-plate max-w-lg w-full p-6 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-xl font-bold text-ink">
                {isHe ? 'הוספת אירוע חדש למרכז הנוער' : 'Add New Youth Center Event'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="p-1.5 rounded-full bg-paper-2 text-ink"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateYouthEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  {isHe ? 'שם האירוע / הפעילות *' : 'Event Title *'}
                </label>
                <input
                  type="text"
                  required
                  value={newTitleHe}
                  onChange={(e) => setNewTitleHe(e.target.value)}
                  placeholder={isHe ? 'לדוגמה: סדנת קומיקס / ערב פיצה וג׳אם' : 'Event title'}
                  className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  {isHe ? 'תיאור קצר *' : 'Short Description *'}
                </label>
                <textarea
                  rows={2}
                  required
                  value={newDescHe}
                  onChange={(e) => setNewDescHe(e.target.value)}
                  placeholder={isHe ? 'מה עושים במפגש ולאיזה גילאים מתאים?' : 'Description'}
                  className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'יום בשבוע' : 'Day of Week'}
                  </label>
                  <select
                    value={newDayOfWeek}
                    onChange={(e) => setNewDayOfWeek(Number(e.target.value))}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  >
                    {DAY_NAMES_HE.map((d, idx) => (
                      <option key={idx} value={idx}>
                        {isHe ? d : DAY_NAMES_EN[idx]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'שעת התחלה' : 'Start Time'}
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'שעת סיום' : 'End Time'}
                  </label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'תאריך ספציפי (אופציונלי)' : 'Specific Date (Optional)'}
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'טלפון איש קשר' : 'Contact Phone'}
                  </label>
                  <input
                    type="tel"
                    value={newHostPhone}
                    onChange={(e) => setNewHostPhone(e.target.value)}
                    dir="ltr"
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              <button type="submit" className="w-full hallmark-btn-primary py-3 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{isHe ? 'פרסום אירוע במרכז הנוער' : 'Publish Youth Event'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
