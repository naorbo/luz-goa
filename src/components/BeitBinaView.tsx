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
  ExternalLink,
  Upload,
  Edit3,
  Eye,
  Sparkles,
  ClipboardCheck,
  UserPlus,
  Undo2,
  Search,
  Check,
  Copy,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  LuzEntity,
  BookingRecord,
  Language,
} from '../types/luz';
import { buildGoogleCalendarUrl } from '../utils/calendarAndParser';
import { shareLuzEvent } from '../utils/shareUtils';
import { GOOGLE_APPS_SCRIPT_CODE } from '../utils/appsScriptTemplate';
import {
  CORE_BEIT_BINA_EVENTS,
  BEIT_BINA_PAYMENT_URL,
  BEIT_BINA_WEEKLY_POSTER_URL,
} from '../data/beitBinaEvents';
import { DEFAULT_YC_WEBHOOK_URL } from './YouthCenterView';

export interface BeitBinaRegistration {
  id: string;
  eventId: string;
  eventTitleHe: string;
  eventTitleEn: string;
  eventTabName: string;
  eventScheduleHe: string;
  participantName: string;
  participantPhone: string;
  participantsCount: number;
  notes: string;
  createdAt: string;
  attended?: boolean;
  attendedAt?: string;
  isWalkIn?: boolean;
  checkedInBy?: string;
}

interface BeitBinaViewProps {
  lang: Language;
  isAdmin?: boolean;
  entities?: LuzEntity[];
  bookings?: BookingRecord[];
  onAddEntity?: (entity: LuzEntity) => void;
  onUpdateEntity?: (entity: LuzEntity) => void;
  onDeleteEntity?: (entityId: string) => void;
  onConfirmBooking?: (
    bookingData: Omit<BookingRecord, 'id' | 'createdAt' | 'status'>
  ) => void;
  initialEventId?: string | null;
  onClearInitialEvent?: () => void;
}

const BINA_REGISTRATIONS_STORAGE_KEY = 'luz_bina_event_registrations_v1';
const BINA_SHEET_WEBHOOK_STORAGE_KEY = 'luz_bina_google_sheet_webhook_v1';
const BINA_DEDICATED_SHEET_URL_STORAGE_KEY = 'luz_bina_dedicated_spreadsheet_url_v1';
const BINA_EVENT_OVERRIDES_STORAGE_KEY = 'luz_bina_event_custom_overrides_v1';
const BINA_GATE_UNLOCKED_STORAGE_KEY = 'luz_bina_gate_unlocked_v1';

export const BINA_GATE_PASSCODE = 'Bina2026';

export function verifyBinaPasscode(input: string): boolean {
  const clean = input.trim().toLowerCase();
  return clean === 'bina2026' || clean === 'bina' || clean === 'matnas2026';
}

const DAY_NAMES_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
const DAY_SHORT_TITLE_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function buildEventSheetTabName(ev: LuzEntity): string {
  let prefix = '';
  if (ev.date) {
    const parts = ev.date.split('-');
    if (parts.length === 3) {
      prefix = `${parts[2]}.${parts[1]} - `;
    }
  } else if (typeof ev.dayOfWeek === 'number') {
    prefix = `יום ${DAY_SHORT_TITLE_HE[ev.dayOfWeek]} - `;
  }
  const cleanTitle = (ev.titleHe || ev.titleEn || 'אירוע בינ"ה')
    .replace(/[:\\/?*\[\]]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return `${prefix}${cleanTitle}`.slice(0, 85);
}

const INITIAL_DEMO_REGISTRATIONS: BeitBinaRegistration[] = [
  {
    id: 'bina-reg-seed-1',
    eventId: 'bina-2026-11-08-movement',
    eventTitleHe: 'אימון Movement עם אוריאל וירין',
    eventTitleEn: 'Evening Movement Training with Uriel & Yarin',
    eventTabName: '08.11 - אימון Movement עם אוריאל וירין',
    eventScheduleHe: 'יום ראשון, 8.11 · 21:00',
    participantName: 'עמית שפירא',
    participantPhone: '+972-54-321-8890',
    participantsCount: 1,
    notes: 'מגיע מהחוף בדרום פאלולם',
    createdAt: '2026-11-08T09:15:00.000Z',
    attended: true,
    attendedAt: '2026-11-08T15:25:00.000Z',
    checkedInBy: 'אוריאל',
  },
  {
    id: 'bina-reg-seed-2',
    eventId: 'bina-2026-11-08-movement',
    eventTitleHe: 'אימון Movement עם אוריאל וירין',
    eventTitleEn: 'Evening Movement Training with Uriel & Yarin',
    eventTabName: '08.11 - אימון Movement עם אוריאל וירין',
    eventScheduleHe: 'יום ראשון, 8.11 · 21:00',
    participantName: 'נועה ברקוביץ׳',
    participantPhone: '+972-52-678-1122',
    participantsCount: 1,
    notes: '—',
    createdAt: '2026-11-08T10:30:00.000Z',
    attended: false,
  },
  {
    id: 'bina-reg-seed-3',
    eventId: 'bina-2026-11-09-diwali-study',
    eventTitleHe: 'חג הדיוואלי — לימוד משותף: האור, החושך ומה שביניהם',
    eventTitleEn: 'Diwali Gathering & Shared Study',
    eventTabName: '09.11 - חג הדיוואלי — לימוד משותף- האור, החושך ומה שביניהם',
    eventScheduleHe: 'יום שני, 9.11 · 20:00',
    participantName: 'ירדן ותומר כהן',
    participantPhone: '+972-50-912-3344',
    participantsCount: 2,
    notes: 'נשמח להביא צ׳אי ביתי',
    createdAt: '2026-11-08T12:00:00.000Z',
    attended: false,
  },
  {
    id: 'bina-reg-seed-4',
    eventId: 'bina-2026-11-10-calisthenics',
    eventTitleHe: 'אימון קליסטניקס עם אוריאל וירין',
    eventTitleEn: 'Morning Calisthenics Workout with Uriel & Yarin',
    eventTabName: '10.11 - אימון קליסטניקס עם אוריאל וירין',
    eventScheduleHe: 'יום שלישי, 10.11 · 10:00',
    participantName: 'רועי אלון',
    participantPhone: '+972-54-776-5432',
    participantsCount: 1,
    notes: '—',
    createdAt: '2026-11-09T08:20:00.000Z',
    attended: false,
  },
  {
    id: 'bina-reg-seed-5',
    eventId: 'bina-2026-11-10-bracelets',
    eventTitleHe: 'סדנת הכנת צמידים עם תמר ונעם',
    eventTitleEn: 'Handmade Bracelets Workshop with Tamar & Noam',
    eventTabName: '10.11 - סדנת הכנת צמידים עם תמר ונעם',
    eventScheduleHe: 'יום שלישי, 10.11 · 16:30',
    participantName: 'מאיה לוי',
    participantPhone: '+972-58-443-2211',
    participantsCount: 2,
    notes: 'מגיעה עם אחותי',
    createdAt: '2026-11-09T11:10:00.000Z',
    attended: false,
  },
  {
    id: 'bina-reg-seed-6',
    eventId: 'bina-2026-11-12-breathwork',
    eventTitleHe: 'סדנת מרחב נשימה בהנחיית מירב',
    eventTitleEn: 'Breathing Space Workshop with Merav',
    eventTabName: '12.11 - סדנת מרחב נשימה בהנחיית מירב',
    eventScheduleHe: 'יום חמישי, 12.11 · 20:00',
    participantName: 'שירה דגן',
    participantPhone: '+972-52-334-9988',
    participantsCount: 1,
    notes: '—',
    createdAt: '2026-11-09T14:00:00.000Z',
    attended: false,
  },
];

export const BeitBinaView: React.FC<BeitBinaViewProps> = ({
  lang,
  isAdmin = false,
  entities = [],
  onAddEntity,
  onUpdateEntity,
  onConfirmBooking,
  initialEventId,
  onClearInitialEvent,
}) => {
  // Beit BINA's audience is primarily Hebrew-speaking Israelis in Goa
  const isHe = lang === 'he' || true;

  const [viewMode, setViewMode] = useState<'weekly_board' | 'cards' | 'gate' | 'sheets'>('weekly_board');
  const [selectedEventForReg, setSelectedEventForReg] = useState<LuzEntity | null>(null);
  const [showPosterModal, setShowPosterModal] = useState<boolean>(false);

  // Gate / Attendance Check-In state
  const [gateEventId, setGateEventId] = useState<string>('bina-2026-11-08-movement');
  const [staffName, setStaffName] = useState<string>(() => {
    try {
      return localStorage.getItem('luz_bina_staff_name') || '';
    } catch {
      return '';
    }
  });
  const [gateSearchQuery, setGateSearchQuery] = useState<string>('');
  const [gateFilter, setGateFilter] = useState<'all' | 'pending' | 'attended' | 'walkin'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isGateUnlocked, setIsGateUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(BINA_GATE_UNLOCKED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [passcodeError, setPasscodeError] = useState<string>('');
  const hasStaffAccess = isAdmin || isGateUnlocked;

  // Walk-in & Bulk Import modal state
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInCount, setWalkInCount] = useState<number>(1);
  const [walkInNotes, setWalkInNotes] = useState<string>('');
  const [walkInSaving, setWalkInSaving] = useState<boolean>(false);

  const [showBulkImportModal, setShowBulkImportModal] = useState<boolean>(false);
  const [bulkImportText, setBulkImportText] = useState<string>('');

  // Registration Form State
  const [participantName, setParticipantName] = useState<string>('');
  const [participantPhone, setParticipantPhone] = useState<string>('');
  const [participantsCount, setParticipantsCount] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [regSubmitted, setRegSubmitted] = useState<boolean>(false);
  const [syncingSheet, setSyncingSheet] = useState<boolean>(false);

  // Add / Edit Event Modal State
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<LuzEntity | null>(null);
  const [formTitleHe, setFormTitleHe] = useState<string>('');
  const [formDescHe, setFormDescHe] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('2026-11-08');
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(0);
  const [formStartTime, setFormStartTime] = useState<string>('20:00');
  const [formEndTime, setFormEndTime] = useState<string>('22:00');
  const [formHostName, setFormHostName] = useState<string>('בית בינ"ה בגואה');
  const [formExternalUrl, setFormExternalUrl] = useState<string>('');
  const [formImageUrl, setFormImageUrl] = useState<string>('');

  // Google Sheets Webhook & Spreadsheet URLs
  const [binaWebhookUrl, setBinaWebhookUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(BINA_SHEET_WEBHOOK_STORAGE_KEY);
      return saved && saved.trim() ? saved.trim() : DEFAULT_YC_WEBHOOK_URL;
    } catch {
      return DEFAULT_YC_WEBHOOK_URL;
    }
  });

  const [binaSpreadsheetUrl, setBinaSpreadsheetUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(BINA_DEDICATED_SHEET_URL_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [creatingSheet, setCreatingSheet] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);

  // Event Overrides
  const [eventOverrides, setEventOverrides] = useState<Record<string, LuzEntity>>(() => {
    try {
      const saved = localStorage.getItem(BINA_EVENT_OVERRIDES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(BINA_EVENT_OVERRIDES_STORAGE_KEY, JSON.stringify(eventOverrides));
    } catch {
      // ignore
    }
  }, [eventOverrides]);

  // Persistent Registrations
  const [registrations, setRegistrations] = useState<BeitBinaRegistration[]>(() => {
    try {
      const saved = localStorage.getItem(BINA_REGISTRATIONS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_DEMO_REGISTRATIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(BINA_REGISTRATIONS_STORAGE_KEY, JSON.stringify(registrations));
    } catch {
      // ignore
    }
  }, [registrations]);

  useEffect(() => {
    try {
      if (binaWebhookUrl.trim()) {
        localStorage.setItem(BINA_SHEET_WEBHOOK_STORAGE_KEY, binaWebhookUrl.trim());
      }
    } catch {
      // ignore
    }
  }, [binaWebhookUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(BINA_DEDICATED_SHEET_URL_STORAGE_KEY, binaSpreadsheetUrl.trim());
    } catch {
      // ignore
    }
  }, [binaSpreadsheetUrl]);

  useEffect(() => {
    try {
      if (staffName.trim()) {
        localStorage.setItem('luz_bina_staff_name', staffName.trim());
      }
    } catch {
      // ignore
    }
  }, [staffName]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Merge Core Beit BINA events + custom entities marked isBeitBina + overrides
  const binaEvents = useMemo(() => {
    const map = new Map<string, LuzEntity>();
    CORE_BEIT_BINA_EVENTS.forEach((ev) => map.set(ev.id, ev));
    entities
      .filter((e) => e.isBeitBina || e.id.startsWith('bina-'))
      .forEach((ev) => {
        const existing = map.get(ev.id);
        map.set(ev.id, existing ? { ...existing, ...ev } : ev);
      });
    Object.values(eventOverrides).forEach((ov) => {
      const existing = map.get(ov.id);
      map.set(ov.id, existing ? { ...existing, ...ov } : ov);
    });

    const getSortKey = (item: LuzEntity) => {
      if (item.date) return `${item.date}_${item.startTime || '10:00'}`;
      const dayIdx = typeof item.dayOfWeek === 'number' ? item.dayOfWeek : 0;
      return `2026-11-${String(8 + dayIdx).padStart(2, '0')}_${item.startTime || '10:00'}`;
    };

    return Array.from(map.values()).sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
  }, [entities, eventOverrides]);

  // Deep link handling (?event=bina-... or ?bina_gate=bina-...)
  useEffect(() => {
    if (initialEventId && binaEvents.length > 0) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('gate') || params.get('checkin') || params.get('bina_gate')) {
          setViewMode('gate');
          setGateEventId(initialEventId);
          onClearInitialEvent?.();
          return;
        }
      }
      const match = binaEvents.find((e) => e.id === initialEventId);
      if (match) {
        if (!match.externalRegistrationUrl) {
          setSelectedEventForReg(match);
          setRegSubmitted(false);
        }
        onClearInitialEvent?.();
      }
    }
  }, [initialEventId, binaEvents, onClearInitialEvent]);

  // Group events into the 7 days of the week (Sunday 8.11 to Saturday 14.11)
  const weeklyColumns = useMemo(() => {
    const dates = [
      { dayOfWeek: 0, dayLabel: 'ראשון', dateShort: '8.11', isoDate: '2026-11-08' },
      { dayOfWeek: 1, dayLabel: 'שני', dateShort: '9.11', isoDate: '2026-11-09' },
      { dayOfWeek: 2, dayLabel: 'שלישי', dateShort: '10.11', isoDate: '2026-11-10' },
      { dayOfWeek: 3, dayLabel: 'רביעי', dateShort: '11.11', isoDate: '2026-11-11' },
      { dayOfWeek: 4, dayLabel: 'חמישי', dateShort: '12.11', isoDate: '2026-11-12' },
      { dayOfWeek: 5, dayLabel: 'שישי', dateShort: '13.11', isoDate: '2026-11-13' },
      { dayOfWeek: 6, dayLabel: 'שבת', dateShort: '14.11', isoDate: '2026-11-14' },
    ];

    return dates.map((col) => {
      const dayEvents = binaEvents.filter((ev) => {
        if (ev.date === col.isoDate) return true;
        if (!ev.date && ev.dayOfWeek === col.dayOfWeek) return true;
        return false;
      });
      return {
        ...col,
        events: dayEvents,
      };
    });
  }, [binaEvents]);

  const activeGateEvent = useMemo(() => {
    return binaEvents.find((e) => e.id === gateEventId) || binaEvents[0] || CORE_BEIT_BINA_EVENTS[0];
  }, [gateEventId, binaEvents]);

  const formatScheduleHe = (ev: LuzEntity) => {
    const dayIdx =
      typeof ev.dayOfWeek === 'number'
        ? ev.dayOfWeek
        : ev.date
        ? new Date(ev.date).getDay()
        : 0;
    const dayName = DAY_NAMES_HE[dayIdx] || 'יום ראשון';
    let dateShort = '';
    if (ev.date) {
      const p = ev.date.split('-');
      if (p.length === 3) dateShort = `${Number(p[2])}.${Number(p[1])}`;
    }
    const timeStr = `${ev.startTime || '20:00'}${ev.endTime ? ` – ${ev.endTime}` : ''}`;
    return `${dayName}${dateShort ? `, ${dateShort}` : ''} · ${timeStr}`;
  };

  const getEventRegCount = (ev: LuzEntity) => {
    const localRegs = registrations
      .filter((r) => r.eventId === ev.id)
      .reduce((sum, r) => sum + (Number(r.participantsCount) || 1), 0);
    return Math.max(localRegs, ev.rsvpCount || 0);
  };

  // Gate metrics for active event
  const gateEventRegistrations = useMemo(() => {
    if (!activeGateEvent) return [];
    return registrations.filter((r) => r.eventId === activeGateEvent.id);
  }, [activeGateEvent, registrations]);

  const gateMetrics = useMemo(() => {
    const preRegs = gateEventRegistrations.filter((r) => !r.isWalkIn);
    const attendedPreReg = preRegs.filter((r) => r.attended).length;
    const attendedWalkIns = gateEventRegistrations.filter((r) => r.isWalkIn && r.attended).length;
    const totalAttended = attendedPreReg + attendedWalkIns;
    const totalPreReg = preRegs.length;
    const pendingCount = Math.max(0, totalPreReg - attendedPreReg);
    const totalPeoplePresent = gateEventRegistrations
      .filter((r) => r.attended)
      .reduce((sum, r) => sum + (Number(r.participantsCount) || 1), 0);

    return {
      totalAttended,
      totalPeoplePresent,
      attendedPreReg,
      totalPreReg,
      attendedWalkIns,
      pendingCount,
    };
  }, [gateEventRegistrations]);

  const gateDisplayList = useMemo(() => {
    let list = gateEventRegistrations;
    if (gateFilter === 'pending') {
      list = list.filter((r) => !r.attended);
    } else if (gateFilter === 'attended') {
      list = list.filter((r) => r.attended);
    } else if (gateFilter === 'walkin') {
      list = list.filter((r) => r.isWalkIn);
    }

    if (gateSearchQuery.trim()) {
      const q = gateSearchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.participantName.toLowerCase().includes(q) ||
          r.participantPhone.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }
    return list;
  }, [gateEventRegistrations, gateFilter, gateSearchQuery]);

  // Extract Spreadsheet ID if user pasted a Google Sheet URL
  const extractSpreadsheetId = (url: string): string => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : '';
  };

  // Submit in-site registration -> saves locally + syncs to dedicated Beit BINA Google Sheet (Master Tab + Auto Event Tab)
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForReg || !participantName.trim()) return;

    const scheduleHe = formatScheduleHe(selectedEventForReg);
    const tabName = buildEventSheetTabName(selectedEventForReg);
    const regId = `BINA-${Date.now().toString().slice(-5)}`;

    const newReg: BeitBinaRegistration = {
      id: regId,
      eventId: selectedEventForReg.id,
      eventTitleHe: selectedEventForReg.titleHe,
      eventTitleEn: selectedEventForReg.titleEn,
      eventTabName: tabName,
      eventScheduleHe: scheduleHe,
      participantName: participantName.trim(),
      participantPhone: participantPhone.trim() || '—',
      participantsCount: Math.max(1, Number(participantsCount) || 1),
      notes: notes.trim() || '—',
      createdAt: new Date().toISOString(),
      attended: false,
    };

    setRegistrations((prev) => [newReg, ...prev]);

    if (onConfirmBooking) {
      onConfirmBooking({
        referralCode: regId,
        entityId: selectedEventForReg.id,
        entityTitleHe: selectedEventForReg.titleHe,
        entityTitleEn: selectedEventForReg.titleEn,
        entityType: selectedEventForReg.type,
        customerName: newReg.participantName,
        customerPhone: newReg.participantPhone,
        participantsCount: newReg.participantsCount,
        selectedDate: selectedEventForReg.date || scheduleHe,
        selectedSlot: selectedEventForReg.startTime || '20:00',
        totalPrice: 0,
        currency: 'FREE',
        reminderChannel: 'whatsapp',
        notes: newReg.notes,
      });
    }

    const targetUrl = (binaWebhookUrl || DEFAULT_YC_WEBHOOK_URL).trim();
    if (targetUrl.startsWith('https://')) {
      setSyncingSheet(true);
      try {
        const payload = {
          event: 'luz.beit_bina_event_rsvp',
          actionType: 'beit_bina_event_rsvp',
          referralCode: regId,
          environment: 'prod',
          spreadsheetId: extractSpreadsheetId(binaSpreadsheetUrl),
          beitBinaEvent: {
            registrationId: regId,
            eventId: selectedEventForReg.id,
            titleHe: selectedEventForReg.titleHe,
            titleEn: selectedEventForReg.titleEn,
            eventTabName: tabName,
            scheduleHe,
            participantName: newReg.participantName,
            participantPhone: newReg.participantPhone,
            participantsCount: newReg.participantsCount,
            notes: newReg.notes,
            attended: false,
            isWalkIn: false,
          },
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

  // Toggle attendance in Gate -> updates local state AND dispatches live status update to Google Sheets
  const handleToggleAttendance = (reg: BeitBinaRegistration) => {
    const nextAttended = !reg.attended;
    const nowIso = new Date().toISOString();
    const checker = staffName.trim() || 'צוות בית בינ"ה';

    setRegistrations((prev) =>
      prev.map((item) => {
        if (item.id !== reg.id) return item;
        return {
          ...item,
          attended: nextAttended,
          attendedAt: nextAttended ? nowIso : undefined,
          checkedInBy: nextAttended ? checker : undefined,
        };
      })
    );

    showToast(
      nextAttended
        ? `✅ ${reg.participantName} סומן/ה כ"הגיע/ה" (עודכן בגיליון)`
        : `↩️ בוטל סימון ההגעה עבור ${reg.participantName}`
    );

    // Sync attendance status in real time to Google Sheets (Master Tab + Event Tab)
    const targetUrl = (binaWebhookUrl || DEFAULT_YC_WEBHOOK_URL).trim();
    if (targetUrl.startsWith('https://')) {
      const payload = {
        event: 'luz.beit_bina_attendance_update',
        actionType: 'beit_bina_attendance_update',
        spreadsheetId: extractSpreadsheetId(binaSpreadsheetUrl),
        beitBinaEvent: {
          registrationId: reg.id,
          eventId: reg.eventId,
          titleHe: reg.eventTitleHe,
          eventTabName: reg.eventTabName || buildEventSheetTabName(activeGateEvent),
          scheduleHe: reg.eventScheduleHe,
          participantName: reg.participantName,
          participantPhone: reg.participantPhone,
          participantsCount: reg.participantsCount,
          attended: nextAttended,
          attendedAt: nextAttended
            ? new Date(nowIso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
            : '',
          checkedInBy: checker,
          notes: reg.notes,
        },
      };

      void fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      }).catch(() => {});
    }
  };

  // Add Walk-In directly at Gate -> marked Attended + opens/appends to Event Tab in Google Sheets
  const handleSaveWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim() || !activeGateEvent) return;

    setWalkInSaving(true);
    const scheduleHe = formatScheduleHe(activeGateEvent);
    const tabName = buildEventSheetTabName(activeGateEvent);
    const checker = staffName.trim() || 'צוות בית בינ"ה';
    const regId = `BINA-WALK-${Date.now().toString().slice(-4)}`;
    const nowIso = new Date().toISOString();

    const newWalkIn: BeitBinaRegistration = {
      id: regId,
      eventId: activeGateEvent.id,
      eventTitleHe: activeGateEvent.titleHe,
      eventTitleEn: activeGateEvent.titleEn,
      eventTabName: tabName,
      eventScheduleHe: scheduleHe,
      participantName: walkInName.trim(),
      participantPhone: walkInPhone.trim() || '—',
      participantsCount: Math.max(1, Number(walkInCount) || 1),
      notes: walkInNotes.trim() || 'הגיע/ה במקום (Walk-in)',
      createdAt: nowIso,
      attended: true,
      attendedAt: nowIso,
      isWalkIn: true,
      checkedInBy: checker,
    };

    setRegistrations((prev) => [newWalkIn, ...prev]);

    const targetUrl = (binaWebhookUrl || DEFAULT_YC_WEBHOOK_URL).trim();
    if (targetUrl.startsWith('https://')) {
      try {
        const payload = {
          event: 'luz.beit_bina_event_rsvp',
          actionType: 'beit_bina_walkin_attendance',
          referralCode: regId,
          environment: 'prod',
          spreadsheetId: extractSpreadsheetId(binaSpreadsheetUrl),
          beitBinaEvent: {
            registrationId: regId,
            eventId: activeGateEvent.id,
            titleHe: activeGateEvent.titleHe,
            titleEn: activeGateEvent.titleEn,
            eventTabName: tabName,
            scheduleHe,
            participantName: newWalkIn.participantName,
            participantPhone: newWalkIn.participantPhone,
            participantsCount: newWalkIn.participantsCount,
            notes: newWalkIn.notes,
            attended: true,
            attendedAt: new Date(nowIso).toLocaleTimeString('he-IL', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            checkedInBy: checker,
            isWalkIn: true,
          },
        };
        await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          mode: 'no-cors',
        });
      } catch {
        // ignore
      }
    }

    setWalkInSaving(false);
    setShowWalkInModal(false);
    setWalkInName('');
    setWalkInPhone('');
    setWalkInCount(1);
    setWalkInNotes('');
    showToast(`🎉 ${newWalkIn.participantName} נוסף/ה וסומן/ה כנוכח/ת!`);
  };

  // Bulk import names (useful for importing paid list from bit.ly/47elZLv for Chess / Shabbat)
  const handleBulkImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkImportText.trim() || !activeGateEvent) return;

    const lines = bulkImportText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const scheduleHe = formatScheduleHe(activeGateEvent);
    const tabName = buildEventSheetTabName(activeGateEvent);
    const nowIso = new Date().toISOString();

    const imported: BeitBinaRegistration[] = lines.map((line, idx) => {
      const parts = line.split(/[,|\t-]/).map((p) => p.trim());
      const name = parts[0] || line;
      const phone = parts[1] || '—';
      return {
        id: `BINA-IMP-${Date.now().toString().slice(-4)}-${idx}`,
        eventId: activeGateEvent.id,
        eventTitleHe: activeGateEvent.titleHe,
        eventTitleEn: activeGateEvent.titleEn,
        eventTabName: tabName,
        eventScheduleHe: scheduleHe,
        participantName: name,
        participantPhone: phone,
        participantsCount: 1,
        notes: 'יובא מרשימת תשלום חיצונית',
        createdAt: nowIso,
        attended: false,
      };
    });

    setRegistrations((prev) => [...imported, ...prev]);
    setBulkImportText('');
    setShowBulkImportModal(false);
    showToast(`✅ יובאו ${imported.length} נרשמים בהצלחה לרשימת הנוכחות!`);
  };

  // Share the entire Weekly Schedule formatted for WhatsApp groups
  const handleShareWeeklyScheduleWhatsApp = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://naorbo.github.io';
    const path = typeof window !== 'undefined' ? window.location.pathname : '/luz-goa/';
    const binaLink = `${origin}${path}?tab=beit_bina`;

    const message = [
      `✨ *לו"ז שבועי בבית בינ"ה בגואה | 8.11 - 14.11* ✨`,
      `מוזמנים ומוזמנות להצטרף אלינו לשבוע מלא בפעילויות, בתנועה, בלימוד, ביצירה ובמפגשים מעולים! 🏡🌴`,
      ``,
      `*יום ראשון (8.11):*`,
      `• 10:30 | טורניר שחמט ♟️ + הזמנת ג'חנון מראש 🧺`,
      `• 21:00 | אימון movement עם אוריאל וירין 🧘‍♂️`,
      ``,
      `*יום שני (9.11):*`,
      `• 20:00 | חג הדיוואלי–לימוד משותף: האור, החושך ומה שביניהם 🪔✨`,
      ``,
      `*יום שלישי (10.11):*`,
      `• 10:00 | אימון קליסטניקס עם אוריאל וירין 🤸‍♂️`,
      `• 16:30 | סדנת הכנת צמידים עם תמר ונעם 🧵`,
      ``,
      `*יום חמישי (12.11):*`,
      `• 20:00 | סדנת מרחב נשימה בהנחיית מירב 🧘‍♀️✨🌬️`,
      ``,
      `*יום שישי (13.11):*`,
      `• 18:30 | קבלת שבת ישראלית חילונית וסעודה מפנקת 🥂🥘🎸`,
      ``,
      `מחכים לראותכם בבית בינ"ה! ❤️`,
      `🔗 *הרשמה ותשלום לשחמט ולארוחת שישי:*`,
      BEIT_BINA_PAYMENT_URL,
      `📅 *להרשמה לשאר הסדנאות והאימונים בלוח השבועי באתר:*`,
      binaLink,
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(message).catch(() => {});
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    showToast('הודעת הלו"ז השבועי הועתקה ונפתחה לשיתוף בוואטסאפ!');
  };

  // Share single event
  const handleShareSingleEvent = async (ev: LuzEntity, wasRegistered = false) => {
    const schedule = formatScheduleHe(ev);
    const res = await shareLuzEvent(ev, { isHe: true, wasRegistered, customSchedule: schedule });
    if (res.method === 'clipboard') {
      showToast('הקישור לאירוע הועתק! אפשר להדביק ולשתף בוואטסאפ');
    } else if (res.method === 'native') {
      showToast('האירוע שותף בהצלחה!');
    }
  };

  // Send WhatsApp Attendance Summary for an event
  const handleShareAttendanceSummaryWhatsApp = (ev: LuzEntity) => {
    const eventRegs = registrations.filter((r) => r.eventId === ev.id);
    const preRegs = eventRegs.filter((r) => !r.isWalkIn);
    const attendedPreRegs = preRegs.filter((r) => r.attended);
    const attendedWalkIns = eventRegs.filter((r) => r.isWalkIn && r.attended);
    const totalAttended = attendedPreRegs.length + attendedWalkIns.length;
    const noShows = preRegs.filter((r) => !r.attended);
    const checker = staffName.trim() || 'צוות בית בינ"ה';

    let text = `*דוח נוכחות — בית בינ"ה בגואה*\n`;
    text += `🎯 *אירוע:* ${ev.titleHe}\n`;
    text += `📅 *מועד:* ${formatScheduleHe(ev)}\n`;
    text += `📑 *כרטיסיית שיטס:* ${buildEventSheetTabName(ev)}\n`;
    text += `👤 *צוות מאשר:* ${checker}\n`;
    text += `----------------------------------------\n`;
    text += `✅ *סה"כ הגיעו:* ${totalAttended}\n`;
    text += `📋 *נרשמו מראש והגיעו:* ${attendedPreRegs.length} מתוך ${preRegs.length}\n`;
    text += `🚶 *הגיעו במקום (Walk-in):* ${attendedWalkIns.length}\n`;
    text += `⏳ *נרשמו ולא הגיעו:* ${noShows.length}\n`;
    text += `----------------------------------------\n\n`;

    if (totalAttended > 0) {
      text += `*נוכחים שהגיעו (${totalAttended}):*\n`;
      let idx = 1;
      [...attendedPreRegs, ...attendedWalkIns].forEach((r) => {
        text += `${idx++}. ${r.participantName}${r.participantsCount > 1 ? ` (${r.participantsCount} משתתפים)` : ''}${r.isWalkIn ? ' [Walk-in]' : ''}\n`;
      });
      text += `\n`;
    }

    if (noShows.length > 0) {
      text += `*נרשמו וטרם הגיעו (${noShows.length}):*\n`;
      noShows.forEach((r, i) => {
        text += `${i + 1}. ${r.participantName} (${r.participantPhone})\n`;
      });
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  // Ping a registrant who hasn't arrived yet via WhatsApp
  const handlePingRegistrantWhatsApp = (reg: BeitBinaRegistration, ev: LuzEntity) => {
    const cleanPhone = (reg.participantPhone || '').replace(/[^0-9]/g, '');
    const text = `היי ${reg.participantName}, מחכים לך בבית בינ"ה בגואה למפגש "${ev.titleHe}" שמתחיל עכשיו! נשמח לדעת אם את/ה בדרך ❤️`;
    const url =
      cleanPhone && cleanPhone.length >= 9
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Export CSV (either specific event tab or all registrations)
  const exportBeitBinaCsv = (onlyEventId?: string) => {
    const list =
      onlyEventId && onlyEventId !== 'all'
        ? registrations.filter((r) => r.eventId === onlyEventId)
        : registrations;

    const headers = [
      'זמן רישום',
      'מזהה רישום',
      'כרטיסיית אירוע (Tab)',
      'שם האירוע',
      'מועד',
      'שם המשתתף/ת',
      'טלפון וואטסאפ',
      'כמות משתתפים',
      'הגיע/ה? (שער נוכחות)',
      'זמן הגעה',
      'צוות מאשר',
      'הערות',
    ];

    const rows = list.map((r) => [
      new Date(r.createdAt).toLocaleString('he-IL'),
      r.id,
      r.eventTabName,
      r.eventTitleHe,
      r.eventScheduleHe,
      r.participantName,
      r.participantPhone,
      r.participantsCount,
      r.attended ? 'הגיע ✅' : 'לא הגיע / טרם סומן',
      r.attendedAt ? new Date(r.attendedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '—',
      r.checkedInBy || '—',
      r.notes || '—',
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
    a.download = onlyEventId && onlyEventId !== 'all'
      ? `beit_bina_${onlyEventId}.csv`
      : 'beit_bina_goa_all_registrations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auto-create dedicated Beit BINA Google Sheet via Apps Script GET endpoint
  const handleAutoCreateBeitBinaSheet = async () => {
    const targetUrl = (binaWebhookUrl || DEFAULT_YC_WEBHOOK_URL).trim();
    if (!targetUrl.startsWith('https://')) {
      showToast('נא להזין כתובת Webhook תקנית של Google Apps Script');
      return;
    }
    setCreatingSheet(true);
    try {
      const sep = targetUrl.includes('?') ? '&' : '?';
      const res = await fetch(`${targetUrl}${sep}action=createBeitBinaSheet`);
      const data = await res.json().catch(() => null);
      if (data?.beitBinaSheetUrl) {
        setBinaSpreadsheetUrl(data.beitBinaSheetUrl);
        showToast('🎉 גיליון Google Sheets ייעודי לבית בינ"ה נוצר וחובר בהצלחה!');
      } else {
        window.open('https://sheets.new', '_blank', 'noopener,noreferrer');
        showToast('נפתח גיליון Google Sheets חדש — הדבק את הקישור שלו בשדה למטה');
      }
    } catch {
      window.open('https://sheets.new', '_blank', 'noopener,noreferrer');
      showToast('נפתח גיליון Google Sheets חדש — הדבק את הקישור שלו בשדה למטה');
    } finally {
      setCreatingSheet(false);
    }
  };

  // Add or Edit Beit BINA Event
  const handleOpenAddEvent = () => {
    setEditingEvent(null);
    setFormTitleHe('');
    setFormDescHe('');
    setFormDate('2026-11-08');
    setFormDayOfWeek(0);
    setFormStartTime('20:00');
    setFormEndTime('22:00');
    setFormHostName('בית בינ"ה בגואה');
    setFormExternalUrl('');
    setFormImageUrl('');
    setShowAddEventModal(true);
  };

  const handleOpenEditEvent = (ev: LuzEntity) => {
    setEditingEvent(ev);
    setFormTitleHe(ev.titleHe);
    setFormDescHe(ev.descriptionHe);
    setFormDate(ev.date || '2026-11-08');
    setFormDayOfWeek(typeof ev.dayOfWeek === 'number' ? ev.dayOfWeek : 0);
    setFormStartTime(ev.startTime || '20:00');
    setFormEndTime(ev.endTime || '22:00');
    setFormHostName(ev.hostName || 'בית בינ"ה בגואה');
    setFormExternalUrl(ev.externalRegistrationUrl || '');
    setFormImageUrl(ev.imageUrl || '');
    setShowAddEventModal(true);
  };

  const handleSaveEventForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleHe.trim()) return;

    const cleanExternal = formExternalUrl.trim() || undefined;
    const savedEntity: LuzEntity = {
      id: editingEvent ? editingEvent.id : `bina-custom-${Date.now()}`,
      type: editingEvent ? editingEvent.type : 'workshop',
      titleHe: formTitleHe.trim(),
      titleEn: editingEvent?.titleEn || formTitleHe.trim(),
      descriptionHe: formDescHe.trim() || formTitleHe.trim(),
      descriptionEn: editingEvent?.descriptionEn || formDescHe.trim() || formTitleHe.trim(),
      area: 'Palolem',
      locationDetailsHe: 'מתחם בית בינ"ה בגואה',
      locationDetailsEn: 'Beit BINA Hub, South Goa',
      hostName: formHostName.trim() || 'בית בינ"ה בגואה',
      hostNameEn: 'Beit BINA Goa',
      hostPhone: '+972-52-478-0033',
      preferredContactLang: 'he',
      priceAmount: 0,
      priceCurrency: cleanExternal ? 'CONTACT' : 'FREE',
      audience: 'all',
      ingestionSource: 'web',
      imageUrl:
        formImageUrl.trim() ||
        'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1000',
      tags: ['בית בינ"ה', 'Beit BINA'],
      rsvpCount: editingEvent?.rsvpCount || 0,
      date: formDate || undefined,
      dayOfWeek: formDayOfWeek,
      weekCycle: 'all',
      isBeitBina: true,
      externalRegistrationUrl: cleanExternal,
      websiteUrl: cleanExternal,
      startTime: formStartTime,
      endTime: formEndTime,
      updatedAt: new Date().toISOString(),
    };

    setEventOverrides((prev) => ({
      ...prev,
      [savedEntity.id]: savedEntity,
    }));

    if (editingEvent) {
      onUpdateEntity?.(savedEntity);
      showToast('האירוע בבית בינ"ה עודכן בהצלחה!');
    } else {
      onAddEntity?.(savedEntity);
      showToast('אירוע חדש נוסף ללוח השבועי של בית בינ"ה!');
    }
    setShowAddEventModal(false);
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyBinaPasscode(passcodeInput)) {
      setIsGateUnlocked(true);
      try {
        localStorage.setItem(BINA_GATE_UNLOCKED_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
      setPasscodeError('');
      setPasscodeInput('');
      showToast('ממשק הצוות וסימון הנוכחות של בית בינ"ה נפתח בהצלחה!');
    } else {
      setPasscodeError('קוד שגוי. קוד הגישה לצוות בית בינ"ה הוא: Bina2026');
    }
  };

  return (
    <div dir="rtl" className="space-y-8 text-start">
      {/* =====================================================================
          HERO BANNER: BEIT BINA GOA (Inspired by Beit BINA's Plum & Sky-Blue Identity)
         ===================================================================== */}
      <section className="rounded-3xl overflow-hidden border border-[#4A1942]/25 bg-gradient-to-br from-[#4A1942] via-[#3B1238] to-[#260B24] text-white shadow-lg p-6 sm:p-8 lg:p-10 relative">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#0095DA] text-white text-xs font-bold shadow-xs">
                <span>בית בינ"ה בגואה · מרחב הל"ב</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-amber-200 text-xs font-semibold border border-white/15">
                <Calendar className="w-3.5 h-3.5" />
                <span>לו"ז שבועי: 8.11 – 14.11</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium border border-white/15">
                <MapPin className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>הבית של היהדות הישראלית בגואה</span>
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              לו"ז שבועי בבית בינ"ה בגואה · 8.11–14.11
            </h1>

            <p className="text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl">
              מוזמנים ומוזמנות להצטרף אלינו לשבוע מלא בפעילויות, בתנועה, בלימוד, ביצירה ובמפגשים מעולים!
              ההרשמה לאירועים מתבצעת מראש — כל אירוע נפתח אוטומטית ככרטיסייה ייעודית ב-Google Sheets של בית בינ"ה ומסתנכרן לממשק סימון הנוכחות לצוות.
            </p>

            {/* Quick Distribution & Payment Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleShareWeeklyScheduleWhatsApp}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>הפצת הלו"ז השבועי בוואטסאפ</span>
              </button>

              <a
                href={BEIT_BINA_PAYMENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0095DA] hover:bg-[#0284C7] text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98]"
              >
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>הרשמה ותשלום לשחמט ולארוחת שישי</span>
              </a>

              <button
                type="button"
                onClick={() => setShowPosterModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs sm:text-sm border border-white/20 transition-all"
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span>צפייה בפוסטר המקורי</span>
              </button>

              {hasStaffAccess && (
                <button
                  type="button"
                  onClick={handleOpenAddEvent}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm transition-all"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>הוספת אירוע חדש</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Poster Thumbnail Card */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPosterModal(true)}
              className="group relative w-full sm:w-64 rounded-2xl overflow-hidden border-2 border-white/25 shadow-xl bg-black/20 hover:border-[#38BDF8] transition-all"
              title="לחצו להגדלת הפוסטר השבועי של בית בינ״ה"
            >
              <img
                src={BEIT_BINA_WEEKLY_POSTER_URL}
                alt="לו״ז שבועי בבית בינ״ה בגואה 8.11-14.11"
                className="w-full h-40 sm:h-44 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end justify-between p-3">
                <span className="text-xs font-bold text-white">פוסטר הלו"ז השבועי</span>
                <span className="px-2 py-1 rounded-lg bg-white/20 text-[11px] font-semibold text-white backdrop-blur-xs">
                  הגדלה
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Navigation Switcher Bar inside Beit BINA */}
        <div className="mt-7 pt-5 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2" role="tablist">
            <button
              type="button"
              onClick={() => setViewMode('weekly_board')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'weekly_board'
                  ? 'bg-white text-[#4A1942] shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>לוח שבועי (ראשון–שבת)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-[#4A1942] shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>כרטיסי אירועים והרשמה ({binaEvents.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('gate')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'gate'
                  ? 'bg-emerald-400 text-slate-950 shadow-sm'
                  : 'bg-emerald-500/25 text-emerald-100 border border-emerald-400/30 hover:bg-emerald-500/35'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>שער נוכחות לצוות (מי הגיע / לא הגיע)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('sheets')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'sheets'
                  ? 'bg-white text-[#4A1942] shadow-sm'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>גיליון Google Sheets וכרטיסיות אוטומטיות</span>
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          VIEW 1: WEEKLY BOARD (7 COLUMNS: SUNDAY TO SATURDAY — LIKE THE POSTER)
         ===================================================================== */}
      {viewMode === 'weekly_board' && (
        <section className="space-y-5" aria-label="לוח שבועי בבית בינ״ה בגואה">
          <div className="rounded-3xl border-2 border-[#4A1942]/20 bg-[#3B1238] p-4 sm:p-6 shadow-md space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4 text-white">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold">
                  לו"ז שבועי — 8.11–14.11
                </h2>
                <p className="text-xs sm:text-sm text-white/80 mt-0.5">
                  לחצו על כל פעילות להרשמה מהירה. באירועי השחמט וקבלת שבת הכפתור מוביל ישירות לקישור התשלום.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('gate')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>מעבר לסימון נוכחות לצוות</span>
                </button>
              </div>
            </div>

            {/* 7-Day Columns Grid (RTL: Sunday on the right -> Saturday on the left) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
              {weeklyColumns.map((col) => (
                <div
                  key={col.dayOfWeek}
                  className="flex flex-col rounded-2xl overflow-hidden bg-white text-slate-900 border border-white/20 shadow-xs min-h-[260px]"
                >
                  {/* Sky-Blue Header matching Beit BINA poster */}
                  <div className="bg-[#0095DA] text-white py-3 px-3 text-center border-b border-[#0284C7]">
                    <div className="font-display text-lg font-bold leading-tight">
                      {col.dayLabel}
                    </div>
                    <div className="text-[11px] font-semibold text-white/90 tabular-nums">
                      {col.dateShort}
                    </div>
                  </div>

                  {/* Column Body */}
                  <div className="flex-1 p-3 flex flex-col justify-between gap-3 bg-[#FAF8F5]">
                    {col.events.length === 0 ? (
                      <div className="my-auto py-8 text-center text-xs text-slate-400 font-medium">
                        מרחב פתוח / מנוחה
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {col.events.map((ev) => {
                          const isExternalPaid = Boolean(ev.externalRegistrationUrl);
                          const regCount = getEventRegCount(ev);

                          return (
                            <div
                              key={ev.id}
                              className="p-3 rounded-xl bg-white border border-slate-200 hover:border-[#4A1942]/50 shadow-2xs transition-all space-y-2.5 flex flex-col justify-between"
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#4A1942] text-white font-mono text-xs font-bold tabular-nums">
                                    <Clock className="w-3 h-3 text-amber-300" />
                                    {ev.startTime}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGateEventId(ev.id);
                                      setViewMode('gate');
                                    }}
                                    className="text-[11px] font-semibold text-slate-500 hover:text-[#4A1942] inline-flex items-center gap-1"
                                    title="פתיחת רשימת נוכחות לאירוע זה"
                                  >
                                    <Users className="w-3 h-3 text-[#0095DA]" />
                                    <span className="tabular-nums">{regCount}</span>
                                  </button>
                                </div>

                                <h3 className="font-display text-sm sm:text-base font-bold text-slate-900 leading-snug">
                                  {ev.titleHe}
                                </h3>

                                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                                  {ev.hostName}
                                </p>
                              </div>

                              <div className="pt-1 space-y-1.5">
                                {isExternalPaid ? (
                                  <a
                                    href={ev.externalRegistrationUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0095DA] hover:bg-[#0284C7] text-white text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                                  >
                                    <span>הרשמה ותשלום</span>
                                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                  </a>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEventForReg(ev);
                                      setRegSubmitted(false);
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#4A1942] hover:bg-[#3B1238] text-white text-xs font-bold shadow-2xs transition-all active:scale-[0.98]"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                    <span>הרשמה לאירוע</span>
                                  </button>
                                )}

                                <div className="flex items-center justify-between gap-1 pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGateEventId(ev.id);
                                      setViewMode('gate');
                                    }}
                                    className="text-[11px] font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
                                  >
                                    <ClipboardCheck className="w-3 h-3" />
                                    <span>נוכחות</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleShareSingleEvent(ev)}
                                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
                                  >
                                    <Share2 className="w-3 h-3" />
                                    <span>שיתוף</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Callout Strip inside Weekly Board */}
            <div className="rounded-2xl bg-white/10 border border-white/15 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white">
              <div className="space-y-0.5">
                <div className="font-bold text-sm">
                  🔗 הרשמה ותשלום מראש לטורניר השחמט (+ הזמנת ג׳חנון) ולקבלת שבת וסעודה מפנקת:
                </div>
                <div className="text-xs text-white/80">
                  באירועים אלו הכפתור מוביל ישירות לטופס התשלום החיצוני. בשאר האירועים ההרשמה מתבצעת כאן באתר ונשמרת אוטומטית ב-Google Sheets של בית בינ"ה.
                </div>
              </div>
              <a
                href={BEIT_BINA_PAYMENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0095DA] hover:bg-[#0284C7] text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
              >
                <span>מעבר לקישור התשלום (bit.ly/47elZLv)</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          VIEW 2: DETAILED EVENT CARDS
         ===================================================================== */}
      {viewMode === 'cards' && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {binaEvents.map((ev) => {
            const isExternalPaid = Boolean(ev.externalRegistrationUrl);
            const regCount = getEventRegCount(ev);
            const tabName = buildEventSheetTabName(ev);
            const gcalUrl = buildGoogleCalendarUrl({
              title: `בית בינ"ה בגואה: ${ev.titleHe}`,
              description: `${ev.descriptionHe}\nמיקום: ${ev.locationDetailsHe}`,
              location: `${ev.locationDetailsHe}, South Goa`,
              startDate: ev.date || '2026-11-08',
              startTime: ev.startTime || '20:00',
              endTime: ev.endTime || '22:00',
            });

            return (
              <article
                key={ev.id}
                className="hallmark-plate overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all group"
              >
                <div>
                  <div className="relative h-48 w-full overflow-hidden bg-paper-2">
                    <img
                      src={ev.imageUrl}
                      alt={ev.titleHe}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-black/20" />
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#4A1942] text-white shadow-sm">
                        {formatScheduleHe(ev)}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-900 shadow-sm inline-flex items-center gap-1.5 tabular-nums">
                        <Users className="w-3.5 h-3.5 text-[#0095DA]" />
                        <span>{regCount} נרשמו</span>
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-black/65 text-white/90 text-[11px] font-medium backdrop-blur-xs truncate">
                        כרטיסיית שיטס: {tabName}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-display text-xl font-bold text-ink leading-snug">
                      {ev.titleHe}
                    </h3>
                    <p className="text-xs sm:text-sm text-ink-2 leading-relaxed whitespace-pre-line">
                      {ev.descriptionHe}
                    </p>
                    <div className="pt-2 space-y-1 text-xs text-muted">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#0095DA] shrink-0" />
                        <span>{ev.locationDetailsHe}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-paper/60 border-t border-rule space-y-2.5">
                  <div className="flex items-center gap-2">
                    {isExternalPaid ? (
                      <a
                        href={ev.externalRegistrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0095DA] hover:bg-[#0284C7] text-white text-xs sm:text-sm font-bold shadow-xs transition-all min-h-[44px]"
                      >
                        <span>הרשמה ותשלום בקישור</span>
                        <ExternalLink className="w-4 h-4 shrink-0" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEventForReg(ev);
                          setRegSubmitted(false);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4A1942] hover:bg-[#3B1238] text-white text-xs sm:text-sm font-bold shadow-xs transition-all min-h-[44px]"
                      >
                        <UserCheck className="w-4 h-4 shrink-0" />
                        <span>הרשמה לאירוע</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setGateEventId(ev.id);
                        setViewMode('gate');
                      }}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 text-xs font-bold min-h-[44px]"
                      title="סימון נוכחות לצוות"
                    >
                      <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                      <span>נוכחות</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <a
                      href={gcalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-ink"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-[#0095DA]" />
                      <span>הוספה ליומן גוגל</span>
                    </a>

                    <div className="flex items-center gap-2">
                      {hasStaffAccess && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditEvent(ev)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2 hover:text-ink"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>עריכה</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleShareSingleEvent(ev)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#4A1942] hover:underline"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>שיתוף בוואטסאפ</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* =====================================================================
          VIEW 3: GATE / ATTENDANCE CHECK-IN INTERFACE ("מי הגיע ומי לא")
         ===================================================================== */}
      {viewMode === 'gate' && (
        !hasStaffAccess ? (
          <section className="hallmark-plate p-6 sm:p-10 max-w-lg mx-auto text-center space-y-6 my-6">
            <div className="w-16 h-16 rounded-3xl bg-[#4A1942]/10 text-[#4A1942] border border-[#4A1942]/20 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-ink">
                ממשק סימון נוכחות — צוות בית בינ"ה בגואה
              </h2>
              <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
                ממשק ייעודי לצוות בית בינ"ה לסימון מי הגיע ומי לא הגיע לכל אירוע, הוספת משתתפים במקום וסנכרון חי לכרטיסיית האירוע ב-Google Sheets.
              </p>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="space-y-4 max-w-xs mx-auto">
              <div className="space-y-1 text-center">
                <label className="block text-xs font-semibold text-muted">
                  קוד גישה לצוות בית בינ"ה (ברירת מחדל: Bina2026)
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    if (passcodeError) setPasscodeError('');
                  }}
                  placeholder="Bina2026"
                  dir="ltr"
                  className="w-full px-4 py-3 text-center rounded-xl bg-paper border border-rule font-mono font-bold text-lg text-ink focus:outline-none focus:border-[#4A1942]"
                />
              </div>

              {passcodeError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2 justify-center">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passcodeError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#4A1942] hover:bg-[#3B1238] text-white font-bold text-sm shadow-sm transition-all"
              >
                <Unlock className="w-4 h-4" />
                <span>פתיחת ממשק הנוכחות</span>
              </button>
            </form>
          </section>
        ) : (
          <section className="space-y-6" aria-label="ממשק סימון נוכחות לבית בינ״ה">
            {/* Control Header: Event Selector + Staff Name + Sheet Tab Indicator */}
            <div className="hallmark-plate p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-rule">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-800 text-xs font-bold border border-emerald-500/30">
                    ממשק צוות פעיל · בית בינ"ה
                  </span>
                  <span className="text-xs text-muted">
                    כרטיסיית Google Sheets של האירוע:{' '}
                    <strong className="text-ink font-mono">
                      {buildEventSheetTabName(activeGateEvent)}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {binaSpreadsheetUrl.trim() ? (
                    <a
                      href={binaSpreadsheetUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      <span>פתיחת ה-Google Sheet של בינ"ה</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setViewMode('sheets')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper-2 hover:bg-paper-3 text-ink border border-rule text-xs font-semibold"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      <span>חיבור / יצירת Google Sheet אוטומטי</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => exportBeitBinaCsv(activeGateEvent.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rule bg-paper hover:bg-paper-2 text-xs font-semibold text-ink"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0095DA]" />
                    <span>ייצוא CSV לאירוע זה</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    בחירת אירוע לסימון מי הגיע ומי לא:
                  </label>
                  <select
                    value={activeGateEvent.id}
                    onChange={(e) => setGateEventId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-paper border border-rule-strong font-bold text-ink text-sm sm:text-base focus:outline-none focus:border-[#4A1942]"
                  >
                    {binaEvents.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.titleHe} ({formatScheduleHe(ev)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    שם איש/אשת הצוות המסמן/ת נוכחות:
                  </label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="לדוגמה: תמר / אוריאל / מירב"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-paper border border-rule font-medium text-ink text-sm focus:outline-none focus:border-[#4A1942]"
                  />
                </div>
              </div>

              {/* Notice if event uses external payment link */}
              {activeGateEvent.externalRegistrationUrl && (
                <div className="p-3.5 rounded-xl bg-[#0095DA]/10 border border-[#0095DA]/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-ink">
                      💡 אירוע זה גובה הרשמה ותשלום מראש בקישור החיצוני ({BEIT_BINA_PAYMENT_URL})
                    </span>
                    <p className="text-muted">
                      תוכלו לייבא לכאן בלחיצה את שמות הנרשמים ששילמו בקישור החיצוני או להוסיף משתתפים בכניסה כדי לסמן מי הגיע ומי לא!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBulkImportModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#0095DA] hover:bg-[#0284C7] text-white font-bold text-xs shrink-0"
                  >
                    + הדבקת רשימת נרשמים מהירה
                  </button>
                </div>
              )}
            </div>

            {/* 4 Attendance Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="hallmark-plate p-4 sm:p-5 border-2 border-emerald-500/40 bg-emerald-500/5 space-y-1">
                <div className="flex items-center justify-between text-emerald-800">
                  <span className="text-xs font-bold">הגיעו לאירוע (נוכחים)</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 tabular-nums">
                  {gateMetrics.totalAttended}
                  {gateMetrics.totalPeoplePresent > gateMetrics.totalAttended && (
                    <span className="text-xs font-normal text-emerald-800 ms-1.5">
                      ({gateMetrics.totalPeoplePresent} משתתפים)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-emerald-800/80">סומנו כ"הגיע ✅" במתחם</p>
              </div>

              <div className="hallmark-plate p-4 sm:p-5 space-y-1">
                <div className="flex items-center justify-between text-[#4A1942]">
                  <span className="text-xs font-bold">נרשמו מראש והגיעו</span>
                  <Users className="w-4 h-4" />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-ink tabular-nums">
                  {gateMetrics.attendedPreReg}{' '}
                  <span className="text-sm font-normal text-muted">/ {gateMetrics.totalPreReg}</span>
                </div>
                <p className="text-[11px] text-muted">מתוך רשימת הנרשמים מראש</p>
              </div>

              <div className="hallmark-plate p-4 sm:p-5 space-y-1">
                <div className="flex items-center justify-between text-amber-700">
                  <span className="text-xs font-bold">נרשמו וטרם הגיעו (לא הגיעו)</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-ink tabular-nums">
                  {gateMetrics.pendingCount}
                </div>
                <p className="text-[11px] text-muted">ממתינים לסימון הגעה בכניסה</p>
              </div>

              <div className="hallmark-plate p-4 sm:p-5 space-y-1">
                <div className="flex items-center justify-between text-[#0095DA]">
                  <span className="text-xs font-bold">הגיעו ללא הרשמה (Walk-in)</span>
                  <UserPlus className="w-4 h-4" />
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-ink tabular-nums">
                  {gateMetrics.attendedWalkIns}
                </div>
                <p className="text-[11px] text-muted">נוספו ישירות בכניסה למתחם</p>
              </div>
            </div>

            {/* Action Bar: Add Walk-in + Bulk Import + WhatsApp Summary */}
            <div className="hallmark-plate p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 bg-paper-2/60">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#4A1942] hover:bg-[#3B1238] text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ הוספת משתתף שהגיע במקום (Walk-in)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rule-strong bg-paper hover:bg-paper-2 text-ink font-semibold text-xs sm:text-sm transition-all"
                >
                  <Plus className="w-4 h-4 text-[#0095DA]" />
                  <span>הדבקת רשימת שמות מהירה</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleShareAttendanceSummaryWhatsApp(activeGateEvent)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>שליחת דוח נוכחות (מי הגיע ומי לא) בוואטסאפ</span>
              </button>
            </div>

            {/* Search & Filter List */}
            <div className="hallmark-plate p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted absolute top-3 start-3.5" />
                  <input
                    type="text"
                    value={gateSearchQuery}
                    onChange={(e) => setGateSearchQuery(e.target.value)}
                    placeholder="חיפוש מהיר לפי שם משתתף/ת או טלפון..."
                    className="w-full ps-10 pe-3.5 py-2.5 rounded-xl bg-paper border border-rule text-xs sm:text-sm font-medium text-ink focus:outline-none focus:border-[#4A1942]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setGateFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      gateFilter === 'all'
                        ? 'bg-ink text-paper'
                        : 'bg-paper text-ink-2 border border-rule'
                    }`}
                  >
                    הכל ({gateEventRegistrations.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGateFilter('pending')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      gateFilter === 'pending'
                        ? 'bg-amber-600 text-white'
                        : 'bg-paper text-amber-800 border border-amber-300'
                    }`}
                  >
                    טרם הגיעו ({gateMetrics.pendingCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGateFilter('attended')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      gateFilter === 'attended'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-paper text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    הגיעו ✅ ({gateMetrics.totalAttended})
                  </button>
                </div>
              </div>

              {/* Attendees List */}
              <div className="space-y-2.5">
                {gateDisplayList.length === 0 ? (
                  <div className="p-8 text-center bg-paper rounded-2xl border border-rule space-y-3">
                    <UserCheck className="w-8 h-8 text-muted mx-auto" />
                    <div className="font-display text-base font-bold text-ink">
                      אין נרשמים להצגה בסינון זה
                    </div>
                    <p className="text-xs text-muted max-w-md mx-auto">
                      ניתן להוסיף משתתפים שהגיעו במקום בלחיצה על "+ הוספת משתתף שהגיע במקום" או לייבא רשימת נרשמים.
                    </p>
                  </div>
                ) : (
                  gateDisplayList.map((reg) => {
                    const isCheckedIn = Boolean(reg.attended);
                    const arrivalTime = reg.attendedAt
                      ? new Date(reg.attendedAt).toLocaleTimeString('he-IL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : null;

                    return (
                      <div
                        key={reg.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isCheckedIn
                            ? 'bg-emerald-500/10 border-emerald-500/40'
                            : 'bg-paper border-rule hover:border-rule-strong'
                        }`}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-display text-base sm:text-lg font-bold text-ink">
                              {reg.participantName}
                            </h4>
                            {reg.participantsCount > 1 && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#4A1942]/10 text-[#4A1942]">
                                {reg.participantsCount} משתתפים
                              </span>
                            )}
                            {isCheckedIn ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white inline-flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>הגיע/ה</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-900 border border-amber-400/40">
                                לא הגיע / ממתין
                              </span>
                            )}
                            {reg.isWalkIn && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-900">
                                הגיע במקום (Walk-in)
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-ink-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                            {reg.participantPhone && reg.participantPhone !== '—' && (
                              <span dir="ltr" className="font-mono text-muted">
                                {reg.participantPhone}
                              </span>
                            )}
                            {reg.notes && reg.notes !== '—' && (
                              <span className="text-muted">💬 {reg.notes}</span>
                            )}
                            {isCheckedIn && arrivalTime && (
                              <span className="text-emerald-800 font-semibold">
                                סומן ב-{arrivalTime} {reg.checkedInBy ? `ע"י ${reg.checkedInBy}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isCheckedIn ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleAttendance(reg)}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-[0.97] transition-all min-h-[42px]"
                              >
                                <Check className="w-4 h-4 shrink-0" />
                                <span>סמן שהגיע ✅</span>
                              </button>
                              {reg.participantPhone && reg.participantPhone !== '—' && (
                                <button
                                  type="button"
                                  onClick={() => handlePingRegistrantWhatsApp(reg, activeGateEvent)}
                                  className="p-2.5 rounded-xl border border-rule bg-paper hover:bg-paper-2 text-emerald-700"
                                  title="שליחת הודעת וואטסאפ לבירור הגעה"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(reg)}
                              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-rule bg-paper hover:bg-paper-2 text-ink-2 hover:text-ink text-xs font-semibold min-h-[40px]"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>סמן כ"לא הגיע" (בטל)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>
        )
      )}

      {/* =====================================================================
          VIEW 4: GOOGLE SHEETS AUTO-TAB ARCHITECTURE & CONFIGURATION
         ===================================================================== */}
      {viewMode === 'sheets' && (
        <section className="hallmark-plate p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rule pb-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#0095DA] uppercase tracking-wider">
                אוטומציית Google Sheets לבית בינ"ה בגואה
              </span>
              <h2 className="font-display text-2xl font-bold text-ink">
                פתיחת כרטיסייה (Tab) חדשה אוטומטית לכל אירוע + עדכון נוכחות חי
              </h2>
              <p className="text-xs sm:text-sm text-muted max-w-3xl">
                בנינו עבור בית בינ"ה מנגנון חכם ב-Google Sheets: לצד גיליון מרכזי (<strong>"כל_ההרשמות"</strong>), בכל פעם שמשתתף נרשם לאירוע חדש, המערכת פותחת אוטומטית <strong>כרטיסייה (Tab) נפרדת בתחתית הגיליון עם שם האירוע והתאריך</strong>, ומעדכנת בה בזמן אמת מי הגיע ומי לא!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={creatingSheet}
                onClick={handleAutoCreateBeitBinaSheet}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>
                  {creatingSheet
                    ? 'יוצר גיליון ייעודי לבית בינ"ה...'
                    : 'יצירה ופתיחה אוטומטית של גיליון בית בינ"ה'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => exportBeitBinaCsv('all')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-rule-strong bg-paper hover:bg-paper-2 text-ink font-semibold text-xs sm:text-sm"
              >
                <Download className="w-4 h-4 text-[#0095DA]" />
                <span>הורדת כל ההרשמות (CSV)</span>
              </button>
            </div>
          </div>

          {/* Visual Preview of the Auto-Created Tabs in Google Sheets */}
          <div className="space-y-3">
            <h3 className="font-display text-base font-bold text-ink">
              כרטיסיות האירועים שנפתחות אוטומטית בגיליון של בית בינ"ה (לחצו לסינון או ייצוא):
            </h3>
            <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-2xl bg-paper-2 border border-rule">
              <span className="px-3.5 py-2 rounded-xl bg-[#4A1942] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                <span>טאב ראשי: כל_ההרשמות ({registrations.length})</span>
              </span>

              {binaEvents.map((ev) => {
                const tabName = buildEventSheetTabName(ev);
                const count = registrations.filter((r) => r.eventId === ev.id).length;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => {
                      setGateEventId(ev.id);
                      setViewMode('gate');
                    }}
                    className="px-3 py-2 rounded-xl bg-paper hover:bg-white border border-rule hover:border-[#4A1942] text-xs font-semibold text-ink inline-flex items-center gap-1.5 transition-all"
                    title="לחצו למעבר לשער הנוכחות של כרטיסייה זו"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#0095DA]" />
                    <span>{tabName}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-paper-2 text-[11px] font-bold text-[#4A1942] tabular-nums">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connection Inputs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
            <div className="p-4 rounded-2xl bg-paper-2 border border-rule space-y-2">
              <label className="block text-xs font-bold text-ink">
                1. קישור לגיליון ה-Google Sheets הייעודי של בית בינ"ה:
              </label>
              <input
                type="url"
                dir="ltr"
                value={binaSpreadsheetUrl}
                onChange={(e) => setBinaSpreadsheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                className="w-full px-3.5 py-2 rounded-xl bg-paper border border-rule-strong font-mono text-xs text-ink"
              />
              <p className="text-[11px] text-muted">
                אם תדביקו כאן קישור לגיליון קיים, הסקריפט יפתח בו אוטומטית את הכרטיסיות לכל אירוע חדש. אם תשאירו ריק, הסקריפט ייצור גיליון חדש בעצמו בדרייב!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-paper-2 border border-rule space-y-2">
              <label className="block text-xs font-bold text-ink">
                2. כתובת ה-Webhook של Google Apps Script:
              </label>
              <input
                type="url"
                dir="ltr"
                value={binaWebhookUrl}
                onChange={(e) => setBinaWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full px-3.5 py-2 rounded-xl bg-paper border border-rule-strong font-mono text-xs text-ink"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-muted">
                  הקוד כולל את הפונקציה <code>setupAndTestBeitBinaSheet</code> ליצירת הכרטיסיות האוטומטית.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(GOOGLE_APPS_SCRIPT_CODE);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 3000);
                    showToast('קוד ה-Google Apps Script המלא הועתק ללוח!');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4A1942] text-white text-xs font-bold"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'הקוד הועתק!' : 'העתקת קוד ה-Apps Script המעודכן'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          MODAL 1: IN-SITE REGISTRATION FOR BEIT BINA EVENTS
         ===================================================================== */}
      {selectedEventForReg && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedEventForReg(null)}
        >
          <div
            className="hallmark-plate max-w-lg w-full p-5 sm:p-7 space-y-5 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-rule pb-3">
              <div>
                <span className="text-xs font-bold text-[#0095DA]">
                  בית בינ"ה בגואה · הרשמה מראש
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-ink mt-0.5">
                  {selectedEventForReg.titleHe}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {formatScheduleHe(selectedEventForReg)} · {selectedEventForReg.locationDetailsHe}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventForReg(null)}
                className="p-1.5 rounded-xl bg-paper-2 text-ink hover:bg-paper-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {regSubmitted ? (
              <div className="py-5 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-display text-2xl font-bold text-ink">
                    נרשמת בהצלחה! מחכים לראותך בבית בינ"ה ❤️
                  </h4>
                  <p className="text-xs sm:text-sm text-muted max-w-sm mx-auto">
                    הפרטים של <strong>{participantName}</strong> נוספו לכרטיסיית האירוע (
                    <code className="font-mono text-ink">{buildEventSheetTabName(selectedEventForReg)}</code>
                    ) ולרשימת הנוכחות של הצוות.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleShareSingleEvent(selectedEventForReg, true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#4A1942] text-white font-bold text-xs sm:text-sm"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>שיתוף עם חברים בוואטסאפ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEventForReg(null);
                      setParticipantName('');
                      setParticipantPhone('');
                      setParticipantsCount(1);
                      setNotes('');
                    }}
                    className="px-5 py-3 rounded-xl border border-rule-strong bg-paper text-ink font-semibold text-xs sm:text-sm"
                  >
                    סיום
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitRegistration} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    שם מלא *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="לדוגמה: עמית שפירא"
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm text-ink"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      טלפון וואטסאפ *
                    </label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={participantPhone}
                      onChange={(e) => setParticipantPhone(e.target.value)}
                      placeholder="+972-54-000-0000"
                      className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm font-mono text-ink text-start"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">
                      מספר משתתפים
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={participantsCount}
                      onChange={(e) => setParticipantsCount(Number(e.target.value) || 1)}
                      className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm text-ink"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    הערות (אופציונלי)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="משהו שחשוב שצוות בית בינ״ה ידע?"
                    className="w-full rounded-xl border border-rule bg-paper px-3.5 py-2.5 text-sm text-ink"
                  />
                </div>

                <button
                  type="submit"
                  disabled={syncingSheet}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#4A1942] hover:bg-[#3B1238] text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {syncingSheet
                      ? 'שומר בכרטיסיית האירוע ב-Google Sheets...'
                      : 'אישור הרשמה לאירוע בבית בינ"ה'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: WALK-IN MODAL (FOR STAFF AT THE DOOR)
         ===================================================================== */}
      {showWalkInModal && activeGateEvent && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowWalkInModal(false)}
        >
          <div
            className="hallmark-plate max-w-md w-full p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700">שער נוכחות · בית בינ"ה</span>
                <h3 className="font-display text-xl font-bold text-ink">
                  הוספת משתתף שהגיע במקום (Walk-in)
                </h3>
                <p className="text-xs text-muted">{activeGateEvent.titleHe}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="p-1.5 rounded-lg hover:bg-paper-2 text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWalkIn} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">שם המשתתף/ת *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  placeholder="שם מלא"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-paper border border-rule-strong text-sm text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">טלפון (אופציונלי)</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    placeholder="+972-50-..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-paper border border-rule text-sm font-mono text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">כמות אנשים</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={walkInCount}
                    onChange={(e) => setWalkInCount(Number(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-paper border border-rule text-sm text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">הערה</label>
                <input
                  type="text"
                  value={walkInNotes}
                  onChange={(e) => setWalkInNotes(e.target.value)}
                  placeholder="לדוגמה: שילם בכניסה / אורח"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-paper border border-rule text-sm text-ink"
                />
              </div>

              <button
                type="submit"
                disabled={walkInSaving}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm"
              >
                {walkInSaving ? 'שומר...' : 'הוסף וסמן כ"הגיע ✅"'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: QUICK BULK IMPORT (FOR CHESS / SHABBAT EXTERNAL PAYMENT LIST)
         ===================================================================== */}
      {showBulkImportModal && activeGateEvent && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => setShowBulkImportModal(false)}
        >
          <div
            className="hallmark-plate max-w-lg w-full p-5 sm:p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-rule pb-3">
              <div>
                <span className="text-xs font-bold text-[#0095DA]">ייבוא מהיר לשער הנוכחות</span>
                <h3 className="font-display text-xl font-bold text-ink">
                  הדבקת רשימת נרשמים עבור: {activeGateEvent.titleHe}
                </h3>
                <p className="text-xs text-muted">
                  הדביקו כאן שורה לכל נרשם (שם בלבד, או: שם, טלפון) — למשל מתוך רשימת התשלום של טורניר השחמט או ארוחת שישי — כדי שתוכלו לסמן בכניסה מי הגיע ומי לא!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                className="p-1.5 rounded-lg hover:bg-paper-2 text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkImportSubmit} className="space-y-4">
              <textarea
                rows={6}
                required
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                placeholder={`דוגמה:\nאלון לוי, 054-1234567\nמיכל כהן, 052-7654321\nגיא ברק`}
                className="w-full rounded-xl border border-rule-strong bg-paper p-3.5 text-sm text-ink leading-relaxed"
              />
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#0095DA] hover:bg-[#0284C7] text-white font-bold text-sm"
              >
                ייבוא השמות לרשימת הנוכחות של האירוע
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: ADD / EDIT BEIT BINA EVENT
         ===================================================================== */}
      {showAddEventModal && (
        <div
          dir="rtl"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowAddEventModal(false)}
        >
          <div
            className="hallmark-plate max-w-lg w-full p-5 sm:p-6 space-y-4 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="font-display text-xl font-bold text-ink">
                {editingEvent ? 'עריכת אירוע בבית בינ"ה' : 'הוספת אירוע חדש ללו"ז בית בינ"ה'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="p-1.5 rounded-lg hover:bg-paper-2 text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEventForm} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">שם האירוע (בעברית) *</label>
                <input
                  type="text"
                  required
                  value={formTitleHe}
                  onChange={(e) => setFormTitleHe(e.target.value)}
                  placeholder="לדוגמה: סדנת מרחב נשימה בהנחיית מירב"
                  className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">יום בשבוע</label>
                  <select
                    value={formDayOfWeek}
                    onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-2.5 py-2 text-xs sm:text-sm text-ink"
                  >
                    {DAY_NAMES_HE.map((d, idx) => (
                      <option key={idx} value={idx}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">תאריך</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-2.5 py-2 text-xs sm:text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">שעת התחלה</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-2.5 py-2 text-xs sm:text-sm text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">מנחה / מארח</label>
                <input
                  type="text"
                  value={formHostName}
                  onChange={(e) => setFormHostName(e.target.value)}
                  className="w-full rounded-xl border border-rule bg-paper px-3.5 py-2 text-sm text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  קישור חיצוני לתשלום (רק אם נדרש מעבר ישיר ל-bit.ly וכד׳, אחרת להשאיר ריק להרשמה באתר)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={formExternalUrl}
                  onChange={(e) => setFormExternalUrl(e.target.value)}
                  placeholder="https://bit.ly/47elZLv (אופציונלי)"
                  className="w-full rounded-xl border border-rule bg-paper px-3.5 py-2 text-xs font-mono text-ink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">תיאור הפעילות</label>
                <textarea
                  rows={3}
                  value={formDescHe}
                  onChange={(e) => setFormDescHe(e.target.value)}
                  className="w-full rounded-xl border border-rule bg-paper p-3 text-sm text-ink"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#4A1942] hover:bg-[#3B1238] text-white font-bold text-sm"
              >
                שמירה ופרסום בלו"ז בית בינ"ה
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: POSTER LIGHTBOX
         ===================================================================== */}
      {showPosterModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowPosterModal(false)}
        >
          <div
            className="relative max-w-4xl w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPosterModal(false)}
              className="mb-3 self-end px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>סגירה</span>
            </button>
            <img
              src={BEIT_BINA_WEEKLY_POSTER_URL}
              alt="לו״ז שבועי בבית בינ״ה בגואה"
              className="max-h-[84vh] w-auto max-w-full rounded-2xl shadow-2xl border border-white/15 object-contain"
            />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 inset-x-4 max-w-md mx-auto z-50 bg-[#4A1942] text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold border border-white/15 text-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
