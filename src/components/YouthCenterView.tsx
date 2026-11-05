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
  CalendarPlus,
  Share2,
  X,
  UserCheck,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import {
  YouthCenterFamily,
  LuzEntity,
  BookingRecord,
  Language,
} from '../types/luz';
import {
  buildGoogleCalendarUrl,
  buildChronologicalDateGroups,
} from '../utils/calendarAndParser';
import { shareLuzEvent } from '../utils/shareUtils';
import { DEFAULT_GLOBAL_WEBHOOK_OR_GAS_URL } from '../config/notifications';
import { CORE_YOUTH_CENTER_EVENTS } from '../data/youthCenterEvents';

export interface YouthCenterEventRegistration {
  id: string;
  eventId: string;
  eventTitleHe: string;
  eventTitleEn: string;
  eventSchedule: string;
  participantName: string;
  isSubscriber: boolean;
  parentName: string;
  parentPhone: string;
  notes: string;
  createdAt: string;
}

interface YouthCenterViewProps {
  families: YouthCenterFamily[];
  lang: Language;
  isAdmin?: boolean;
  onRegisterFamily: (family: Omit<YouthCenterFamily, 'id' | 'createdAt'>) => void;
  entities?: LuzEntity[];
  bookings?: BookingRecord[];
  onAddEntity?: (entity: LuzEntity) => void;
  onConfirmBooking?: (
    bookingData: Omit<BookingRecord, 'id' | 'createdAt' | 'status'>
  ) => void;
}

const YC_REGISTRATIONS_STORAGE_KEY = 'luz_yc_event_registrations_nov26';
const YC_SHEET_WEBHOOK_STORAGE_KEY = 'luz_yc_google_sheet_webhook_v1';

const DAY_NAMES_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
const DAY_SHORT_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const formatDateShort = (dateStr?: string, isHe = true) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = Number(parts[2]);
  return isHe ? `${day} בנובמבר` : `Nov ${day}`;
};

export const formatDateFull = (dateStr?: string, isHe = true) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const dayName = isHe ? DAY_NAMES_HE[d.getDay()] : DAY_NAMES_EN[d.getDay()];
  const day = Number(parts[2]);
  return isHe ? `${dayName}, ${day} בנובמבר` : `${dayName}, Nov ${day}`;
};

export const YouthCenterView: React.FC<YouthCenterViewProps> = ({
  lang,
  isAdmin = false,
  entities = [],
  onAddEntity,
  onConfirmBooking,
}) => {
  const isHe = lang === 'he';

  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('calendar');
  const [selectedEventForReg, setSelectedEventForReg] = useState<LuzEntity | null>(null);
  const [filterEventId, setFilterEventId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string | 'all'>('all');

  // Event registration form state (Age removed, isSubscriber added)
  const [participantName, setParticipantName] = useState('');
  const [isSubscriber, setIsSubscriber] = useState<boolean>(true);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [regSubmitted, setRegSubmitted] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const handleShareEvent = async (ev: LuzEntity, wasRegistered = false) => {
    const schedule = formatEventSchedule(ev);
    const res = await shareLuzEvent(ev, { isHe, wasRegistered, customSchedule: schedule });
    if (res.method === 'clipboard') {
      setShareToast(isHe ? 'הקישור הועתק! אפשר להדביק ולשתף בוואטסאפ' : 'Link copied to clipboard!');
      setTimeout(() => setShareToast(null), 3500);
    } else if (res.method === 'native') {
      setShareToast(isHe ? 'האירוע שותף!' : 'Event shared!');
      setTimeout(() => setShareToast(null), 2500);
    }
  };

  // Add new Youth Center Event modal state (Admin Only)
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newTitleHe, setNewTitleHe] = useState('');
  const [newDescHe, setNewDescHe] = useState('');
  const [newDayOfWeek, setNewDayOfWeek] = useState<number>(1);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('16:30');
  const [newEndTime, setNewEndTime] = useState('19:00');
  const [newHostName, setNewHostName] = useState('צוות מרכז הנוער גואה');
  const [newHostPhone, setNewHostPhone] = useState('+972-52-478-0033');

  // Dedicated Google Sheet Webhook URL
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
      (e) => e.isYouthCenter && e.id !== 'prod-wks-yc-colomb'
    );

    const map = new Map<string, LuzEntity>();
    CORE_YOUTH_CENTER_EVENTS.forEach((ev) => map.set(ev.id, ev));
    customYouthEntities.forEach((ev) => map.set(ev.id, ev));

    const getSortKey = (item: LuzEntity) => {
      if (item.date) return `${item.date}_${item.startTime || '16:00'}`;
      const fakeDay =
        typeof item.dayOfWeek === 'number'
          ? String(item.dayOfWeek + 1).padStart(2, '0')
          : '99';
      return `2026-11-${fakeDay}_${item.startTime || '16:00'}`;
    };

    return Array.from(map.values()).sort((a, b) =>
      getSortKey(a).localeCompare(getSortKey(b))
    );
  }, [entities]);

  // Chronological calendar by exact date
  const chronologicalDayGroups = useMemo(() => {
    return buildChronologicalDateGroups(youthEvents);
  }, [youthEvents]);

  const displayDayGroups = useMemo(() => {
    if (selectedDate === 'all') return chronologicalDayGroups;
    return chronologicalDayGroups.filter((g) => g.dateStr === selectedDate);
  }, [chronologicalDayGroups, selectedDate]);

  const formatEventSchedule = (ev: LuzEntity) => {
    let dayStr = '';
    if (ev.date) {
      dayStr = formatDateFull(ev.date, isHe);
    } else if (typeof ev.dayOfWeek === 'number') {
      dayStr = isHe ? DAY_NAMES_HE[ev.dayOfWeek] : DAY_NAMES_EN[ev.dayOfWeek];
    }
    const timeStr = `${ev.startTime || '16:30'}${ev.endTime ? ` – ${ev.endTime}` : ''}`;
    return dayStr ? `${dayStr} · ${timeStr}` : timeStr;
  };

  const getEventRegistrationsCount = (eventId: string) =>
    registrations.filter((r) => r.eventId === eventId).length;

  const visibleRegistrations = useMemo(() => {
    if (filterEventId === 'all') return registrations;
    return registrations.filter((r) => r.eventId === filterEventId);
  }, [registrations, filterEventId]);

  const handleOpenRegisterModal = (ev: LuzEntity) => {
    setSelectedEventForReg(ev);
    setIsSubscriber(true);
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
      isSubscriber,
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      notes: notes.trim() || (isHe ? 'ללא' : 'None'),
      createdAt: new Date().toISOString(),
    };

    setRegistrations((prev) => [newReg, ...prev]);

    if (onConfirmBooking) {
      onConfirmBooking({
        referralCode: `YC-${Date.now().toString().slice(-4)}`,
        entityId: selectedEventForReg.id,
        entityTitleHe: selectedEventForReg.titleHe,
        entityTitleEn: selectedEventForReg.titleEn,
        entityType: 'workshop',
        customerName: `${newReg.participantName} (${isSubscriber ? 'מנוי חודשי' : 'ללא מנוי'}, הורה: ${newReg.parentName})`,
        customerPhone: newReg.parentPhone,
        participantsCount: 1,
        selectedDate: selectedEventForReg.date || scheduleLabel,
        selectedSlot: selectedEventForReg.startTime || '16:30',
        totalPrice: 0,
        currency: 'FREE',
        reminderChannel: 'whatsapp',
      });
    }

    // Dispatch to Dedicated Youth Center Google Sheet via Webhook
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
            isSubscriber: newReg.isSubscriber,
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
            name: `${newReg.participantName} (${isSubscriber ? 'מנוי חודשי' : 'אורח'}, הורה: ${newReg.parentName})`,
            phone: newReg.parentPhone,
          },
          serviceOrDateSummary: `${selectedEventForReg.titleHe} | ${scheduleLabel} | מנוי: ${isSubscriber ? 'כן' : 'לא'} | הערות: ${newReg.notes}`,
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
      'מנוי חודשי (Monthly Subscriber)',
      'שם ההורה (Parent Name)',
      'טלפון הורה (Parent WhatsApp)',
      'הערות (Notes)',
    ];

    const rows = targetList.map((r) => [
      new Date(r.createdAt).toLocaleString('he-IL'),
      r.eventTitleHe,
      r.eventSchedule,
      r.participantName,
      r.isSubscriber ? 'כן' : 'לא',
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

        {/* Right Controls: View Switcher + Add Event (Admin Only) */}
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
              <span>{isHe ? 'לוח שבועי כרונולוגי' : 'Calendar View'}</span>
            </button>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddEventModal(true)}
              className="hallmark-btn-primary text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isHe ? 'הוספת אירוע לנוער (אדמין)' : 'Add Youth Event'}</span>
            </button>
          )}
        </div>
      </section>

      {/* =====================================================================
          YOUTH CENTER EVENTS: CARDS VIEW vs CHRONOLOGICAL CALENDAR VIEW
         ===================================================================== */}
      {viewMode === 'calendar' ? (
        <section className="space-y-6 w-full max-w-full min-w-0" aria-label={isHe ? 'לוח שבועי כרונולוגי' : 'Chronological Youth Calendar'}>
          {/* Date Selector Strip */}
          <div className="hallmark-plate p-4 sm:p-5 space-y-4 w-full max-w-full min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">
                  {isHe ? 'לוח פעילויות כרונולוגי לפי תאריכים' : 'Chronological Youth Activity Schedule'}
                </h2>
                <p className="text-xs sm:text-sm text-muted">
                  {isHe
                    ? 'כל מפגשי מרכז הנוער מסודרים לפי תאריכים ושעות לאורך החודש. לחצו על תאריך לסינון ממוקד או על מפגש להרשמה.'
                    : 'All Youth Center sessions ordered chronologically date by date throughout the month.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate('all')}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                  selectedDate === 'all'
                    ? 'bg-ink text-paper'
                    : 'bg-paper-2 text-ink hover:bg-paper-3'
                }`}
              >
                {isHe ? 'הצג את כל החודש' : 'Show Full Month'}
              </button>
            </div>

            {/* Chronological Date Cards Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar sm:grid sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 w-full max-w-full min-w-0">
              {chronologicalDayGroups.map((dayGroup) => {
                const isSelected = selectedDate === dayGroup.dateStr;
                return (
                  <button
                    key={dayGroup.dateStr}
                    type="button"
                    onClick={() =>
                      setSelectedDate(selectedDate === dayGroup.dateStr ? 'all' : dayGroup.dateStr)
                    }
                    className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-w-[76px] sm:min-w-0 ${
                      isSelected
                        ? 'bg-accent text-white border-accent shadow-sm'
                        : 'bg-paper hover:bg-paper-2 border-rule text-ink'
                    }`}
                  >
                    <span className={`text-[11px] font-medium uppercase ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                      {isHe ? dayGroup.dayShortHe : dayGroup.dayShortEn}
                    </span>
                    <span className="text-xl font-bold font-display my-0.5">
                      {dayGroup.dayOfMonth}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-paper-2 text-accent'
                      }`}
                    >
                      {dayGroup.events.length} {isHe ? 'מפגשים' : 'sessions'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chronological Day-by-Day Timeline */}
          <div className="space-y-6">
            {displayDayGroups.map((dayGroup) => {
              if (dayGroup.events.length === 0 && selectedDate === 'all') return null;

              return (
                <div key={dayGroup.dateStr} className="hallmark-plate overflow-hidden">
                  {/* Day Banner */}
                  <div className="px-5 py-4 bg-paper-2 border-b border-rule flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-ink text-paper flex flex-col items-center justify-center font-display shadow-sm shrink-0">
                        <span className="text-[10px] font-semibold uppercase text-accent tracking-wider">
                          {isHe ? dayGroup.dayShortHe : dayGroup.dayShortEn}
                        </span>
                        <span className="text-lg font-bold leading-none mt-0.5">
                          {dayGroup.dayOfMonth}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg sm:text-xl font-bold text-ink">
                            {isHe ? dayGroup.formattedDateHe : dayGroup.formattedDateEn}
                          </h3>
                          {dayGroup.isToday && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent text-white shadow-xs">
                              {isHe ? 'היום' : 'Today'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {dayGroup.events.length} {isHe ? 'מפגשים מתוכננים בתאריך זה' : 'sessions scheduled for this date'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-semibold text-ink-2 bg-plate px-3 py-1.5 rounded-full border border-rule">
                      {dayGroup.dateStr}
                    </span>
                  </div>

                  {dayGroup.events.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted">
                      {isHe
                        ? 'אין פעילויות משובצות ליום זה.'
                        : 'No youth sessions scheduled for this day.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-rule">
                      {dayGroup.events.map((ev) => {
                        const regCount = getEventRegistrationsCount(ev.id);
                        const title = isHe ? ev.titleHe : ev.titleEn;
                        const desc = isHe ? ev.descriptionHe : ev.descriptionEn;
                        const loc = isHe ? ev.locationDetailsHe : ev.locationDetailsEn;
                        const gcalLink = buildGoogleCalendarUrl({
                          title: `מרכז הנוער גואה: ${title}`,
                          description: `${desc}\nמיקום: ${loc}`,
                          location: `${loc}, Colomb, South Goa`,
                          startDate: ev.date || dayGroup.dateStr,
                          startTime: ev.startTime || '16:30',
                          endTime: ev.endTime || '19:00',
                        });

                        return (
                          <div
                            key={`${dayGroup.dateStr}-${ev.id}`}
                            className="p-4 sm:p-5 hover:bg-paper-2/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                              {/* Left/Start: Time Box + Event Details */}
                              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                                <div className="w-20 sm:w-28 shrink-0 rounded-2xl bg-paper-2 border border-rule p-2 sm:p-2.5 text-center">
                                  {ev.date && (
                                    <div className="text-[11px] font-bold text-accent mb-0.5">
                                      {formatDateShort(ev.date, isHe)}
                                    </div>
                                  )}
                                  <div className="hallmark-code text-sm sm:text-base font-bold text-ink">
                                    {ev.startTime || '16:30'}
                                  </div>
                                  {ev.endTime && (
                                    <div className="hallmark-code text-[11px] text-muted">
                                      {isHe ? `עד ${ev.endTime}` : `to ${ev.endTime}`}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1.5 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-700 text-white">
                                      {isHe ? 'מרכז הנוער' : 'Youth Center'}
                                    </span>
                                    {ev.date && (
                                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent/15 text-accent">
                                        {formatDateFull(ev.date, isHe)}
                                      </span>
                                    )}

                                    {/* Registration count only (NO NAMES) */}
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-paper-2 text-xs font-semibold text-ink">
                                      <Users className="w-3 h-3 text-accent" />
                                      <span>
                                        {regCount} {isHe ? 'נרשמו' : 'registered'}
                                      </span>
                                    </span>
                                  </div>

                                  <h4 className="font-display text-lg font-bold text-ink">
                                    {title}
                                  </h4>

                                  <p className="text-xs sm:text-sm text-ink-2 line-clamp-2">
                                    {desc}
                                  </p>
                                </div>
                              </div>

                              {/* Right/End: Quick Actions (Mobile-first responsive 3-button bar) */}
                              <div className="w-full md:w-auto flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-rule">
                                <button
                                  type="button"
                                  onClick={() => handleShareEvent(ev)}
                                  className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 md:py-1.5 rounded-xl md:rounded-full border border-rule-strong bg-plate hover:bg-paper-2 text-xs font-semibold text-ink shadow-2xs active:scale-[0.98] transition-all text-center min-h-[42px] min-w-[42px] md:min-h-0 md:min-w-0"
                                  title={isHe ? 'שיתוף אירוע' : 'Share event'}
                                >
                                  <Share2 className="w-4 h-4 text-accent shrink-0" />
                                  <span className="hidden sm:inline">{isHe ? 'שיתוף' : 'Share'}</span>
                                </button>
                                <a
                                  href={gcalLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex-1 min-w-0 md:flex-initial inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 md:py-1.5 rounded-xl md:rounded-full border border-rule-strong bg-plate hover:bg-paper-2 text-xs font-semibold text-ink shadow-2xs active:scale-[0.98] transition-all text-center min-h-[42px] md:min-h-0"
                                >
                                  <CalendarPlus className="w-4 h-4 text-accent shrink-0" />
                                  <span className="truncate">{isHe ? 'ליומן גוגל' : '+ Google Cal'}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRegisterModal(ev)}
                                  className="flex-1 min-w-0 md:flex-initial hallmark-btn-primary !py-2.5 md:!py-1.5 !px-3 sm:!px-4 rounded-xl md:rounded-full text-xs inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-sm min-h-[42px] md:min-h-0"
                                >
                                  <UserCheck className="w-4 h-4 shrink-0" />
                                  <span className="truncate">{isHe ? 'הרשמה לאירוע' : 'Register'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ) : (
        /* =====================================================================
           CARDS VIEW: CLEAN MODERN CARDS (ONLY REGISTRATION COUNT SHOWN)
           ===================================================================== */
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {youthEvents.map((ev) => {
            const regCount = getEventRegistrationsCount(ev.id);
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
                        {ev.date
                          ? formatDateFull(ev.date, isHe)
                          : typeof ev.dayOfWeek === 'number'
                          ? isHe
                            ? DAY_NAMES_HE[ev.dayOfWeek]
                            : DAY_NAMES_EN[ev.dayOfWeek]
                          : isHe
                          ? 'אירוע נוער'
                          : 'Youth Event'}
                      </span>
                      {/* ONLY COUNT IS DISPLAYED */}
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-ink shadow-sm inline-flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-accent" />
                        <span>
                          {regCount} {isHe ? 'נרשמו' : 'registered'}
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
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="px-5 py-4 bg-paper/60 border-t border-rule flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                    <Users className="w-3.5 h-3.5 text-accent" />
                    <span>{regCount} {isHe ? 'נרשמו' : 'registered'}</span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleShareEvent(ev)}
                      className="p-2.5 sm:p-2 rounded-xl sm:rounded-full border border-rule-strong bg-plate hover:bg-paper-2 text-ink shadow-2xs active:scale-[0.98] transition-all"
                      title={isHe ? 'שיתוף אירוע' : 'Share event'}
                    >
                      <Share2 className="w-4 h-4 text-accent" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRegisterModal(ev)}
                      className="flex-1 sm:flex-initial hallmark-btn-primary text-xs sm:text-sm !py-2.5 sm:!py-2 !px-4 rounded-xl sm:rounded-full inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-sm min-h-[42px] sm:min-h-0"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{isHe ? 'הרשמה לאירוע' : 'Register for Event'}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* =====================================================================
          ADMIN-ONLY SECTION: DETAILED REGISTRATIONS ROSTER & GOOGLE SHEET SYNC
          (Protected: Non-admins only see counts, never personal names/phones!)
         ===================================================================== */}
      {isAdmin ? (
        <section className="hallmark-plate p-6 sm:p-8 space-y-5 border-2 border-accent/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rule">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {isHe
                    ? 'ממשק ניהול נרשמים (מוצג לאדמין בלבד — המשתמשים רואים רק כמות)'
                    : 'Registrant Management (Admin Only — Visitors see counts only)'}
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">
                {isHe ? 'יומן נרשמים וסנכרון Google Sheets' : 'Youth Center Event Registrants Roster'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
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
                    {isHe ? ev.titleHe : ev.titleEn} ({getEventRegistrationsCount(ev.id)})
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
                      {isHe ? 'מנוי חודשי?' : 'Subscriber?'}
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
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            reg.isSubscriber
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {reg.isSubscriber
                            ? isHe
                              ? 'כן (מנוי)'
                              : 'Yes (Subscriber)'
                            : isHe
                            ? 'לא (חד-פעמי)'
                            : 'No (Guest)'}
                        </span>
                      </td>
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
      ) : (
        /* VISITOR PRIVACY NOTE: Clean & Reassuring */
        <section className="hallmark-plate p-5 sm:p-6 text-center space-y-1.5">
          <div className="font-display text-base font-bold text-ink">
            {isHe
              ? 'מרחב במבוק פתוח לנוער — הצטרפות ורישום למפגשים'
              : 'Open Bamboo Youth Space — Sessions & Registrations'}
          </div>
          <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto">
            {isHe
              ? 'ההרשמה לאירועים פתוחה לכל ילדי הקהילה בגילאי 8–15. כדי לשמור על פרטיות המשפחות, האתר מציג רק את כמות הנרשמים לכל מפגש.'
              : 'Registration is open for all community youth (ages 8–15). To protect family privacy, only participant counts are displayed publicly.'}
          </p>
        </section>
      )}

      {/* =====================================================================
          REGISTRATION MODAL: AGE REMOVED, SUBSCRIBER QUESTION ADDED
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShareEvent(selectedEventForReg, regSubmitted)}
                  className="p-1.5 rounded-full bg-paper-2 text-ink hover:bg-paper-3 transition-colors"
                  title={isHe ? 'שיתוף אירוע' : 'Share event'}
                >
                  <Share2 className="w-4 h-4 text-accent" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEventForReg(null)}
                  className="p-1.5 rounded-full bg-paper-2 text-ink hover:bg-paper-3"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {regSubmitted ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-display text-2xl font-bold text-ink">
                    {isHe ? 'ההרשמה לאירוע נקלטה בהצלחה!' : 'Registered Successfully!'}
                  </h4>
                  <p className="text-sm text-ink-2">
                    {isHe
                      ? `${participantName} נוספ/ה לספירת הנרשמים במפגש, והפרטים סונכרנו לגיליון ה-Google Sheets של מרכז הנוער.`
                      : `${participantName} has been registered and synced to the Youth Center Google Sheet.`}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleShareEvent(selectedEventForReg, true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent text-white text-xs sm:text-sm font-semibold hover:bg-accent/90 transition-all shadow-sm active:scale-[0.98]"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{isHe ? 'שיתוף המפגש עם חברים' : 'Share Session with Friends'}</span>
                  </button>
                  <a
                    href={`https://wa.me/${selectedEventForReg.hostPhone.replace(
                      /[^0-9]/g,
                      ''
                    )}?text=${encodeURIComponent(
                      isHe
                        ? `היי! רשמתי את ${participantName} (${
                            isSubscriber ? 'מנוי חודשי' : 'תשלום חד-פעמי'
                          }) לאירוע "${selectedEventForReg.titleHe}" במרכז הנוער (${formatEventSchedule(
                            selectedEventForReg
                          )}). הורה: ${parentName}`
                        : `Hi! I registered ${participantName} (${
                            isSubscriber ? 'Monthly subscriber' : 'Single entry'
                          }) for "${selectedEventForReg.titleEn}" at Youth Center Goa.`
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
                <div>
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

                {/* Question: Is participant a monthly subscriber? */}
                <div className="p-3.5 rounded-xl bg-paper-2 border border-rule space-y-2">
                  <label className="block text-xs font-semibold text-ink">
                    {isHe
                      ? 'האם הנרשם הוא מנוי של מרכז הנוער (שילם עלות חודשית)? *'
                      : 'Is the participant a monthly Youth Center subscriber? *'}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <label
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                        isSubscriber
                          ? 'bg-ink text-paper border-ink shadow-sm'
                          : 'bg-paper text-ink border-rule hover:bg-paper-2'
                      }`}
                    >
                      <input
                        type="radio"
                        name="isSubscriber"
                        checked={isSubscriber === true}
                        onChange={() => setIsSubscriber(true)}
                        className="sr-only"
                      />
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSubscriber ? 'border-accent bg-accent' : 'border-muted'
                      }`}>
                        {isSubscriber && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span>{isHe ? 'כן, יש מנוי חודשי בתוקף' : 'Yes, monthly subscriber'}</span>
                    </label>

                    <label
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer text-xs font-semibold transition-all ${
                        !isSubscriber
                          ? 'bg-ink text-paper border-ink shadow-sm'
                          : 'bg-paper text-ink border-rule hover:bg-paper-2'
                      }`}
                    >
                      <input
                        type="radio"
                        name="isSubscriber"
                        checked={isSubscriber === false}
                        onChange={() => setIsSubscriber(false)}
                        className="sr-only"
                      />
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        !isSubscriber ? 'border-accent bg-accent' : 'border-muted'
                      }`}>
                        {!isSubscriber && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span>{isHe ? 'לא (תשלום חד-פעמי / אורח)' : 'No (Single entry / guest)'}</span>
                    </label>
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
                    placeholder={isHe ? 'לדוגמה: מגיע/ה עם חבר / אלרגיה...' : 'Optional notes...'}
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
          MODAL 2: ADD NEW YOUTH CENTER EVENT (ADMIN ONLY)
         ===================================================================== */}
      {isAdmin && showAddEventModal && (
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
                {isHe ? 'הוספת אירוע חדש למרכז הנוער (אדמין)' : 'Add New Youth Center Event'}
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

      {/* Floating Share Feedback Toast */}
      {shareToast && (
        <div className="fixed bottom-6 inset-x-4 max-w-sm mx-auto z-50 bg-ink text-paper px-4 py-3 rounded-2xl shadow-elevated flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold border border-white/10 text-center animate-reveal">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{shareToast}</span>
        </div>
      )}
    </div>
  );
};
