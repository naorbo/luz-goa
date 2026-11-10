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
  ExternalLink,
  Image as ImageIcon,
  Upload,
  Edit3,
  ChevronDown,
  ChevronUp,
  Eye,
  Sparkles,
  ClipboardCheck,
  UserPlus,
  Undo2,
  Search,
  PhoneCall,
  Send,
  Check,
  Copy,
  Filter,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Lock,
  Unlock,
  Heart,
} from 'lucide-react';
import {
  YouthCenterFamily,
  LuzEntity,
  BookingRecord,
  Language,
  EventVolunteer,
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
  // Attendance tracking for volunteer parent shifts:
  attended?: boolean;
  attendedAt?: string;
  isWalkIn?: boolean;
  checkedInBy?: string;
}

interface YouthCenterViewProps {
  families: YouthCenterFamily[];
  lang: Language;
  isAdmin?: boolean;
  onRegisterFamily: (family: Omit<YouthCenterFamily, 'id' | 'createdAt'>) => void;
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

const YC_REGISTRATIONS_STORAGE_KEY = 'luz_yc_event_registrations_nov26';
const YC_SHEET_WEBHOOK_STORAGE_KEY = 'luz_yc_google_sheet_webhook_v1';
const YC_DEDICATED_SHEET_URL_STORAGE_KEY = 'luz_yc_dedicated_spreadsheet_url_v1';
const YC_EVENT_OVERRIDES_STORAGE_KEY = 'luz_yc_event_custom_overrides_v2';
const YC_VOLUNTEERS_STORAGE_KEY = 'luz_yc_event_volunteers_v1';
const GATE_UNLOCKED_STORAGE_KEY = 'luz_yc_gate_unlocked_v1';
export const GATE_MASTER_PASSCODE = 'Matnas2026';

export function verifyGatePasscode(input: string): boolean {
  const clean = input.trim().toLowerCase();
  return clean === 'matnas2026' || clean === 'matnas';
}
export const DEFAULT_YC_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1I3EEIlSbA83KK_t-ElZVb5ILACKs598FhjkR7pOASH4/edit';
export const DEFAULT_YC_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbxOvJbRgHTIgN-Fp2iCMpC-Qq0ORKy4bLUWXeqhr-7bvRIXIAWH_Umu1ost7CyQ2VV2HA/exec';

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
  onUpdateEntity,
  onDeleteEntity,
  onConfirmBooking,
  initialEventId,
  onClearInitialEvent,
}) => {
  const isHe = lang === 'he';

  const [viewMode, setViewMode] = useState<'cards' | 'calendar' | 'gate'>('calendar');
  const [selectedEventForReg, setSelectedEventForReg] = useState<LuzEntity | null>(null);
  const [filterEventId, setFilterEventId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string | 'all'>('all');

  // Volunteer Door / Gate Check-In Portal State (100% Free, Mobile-First)
  const [gateEventId, setGateEventId] = useState<string | null>(null);
  const [volunteerName, setVolunteerName] = useState<string>(() => {
    try {
      return localStorage.getItem('luz_yc_volunteer_name') || '';
    } catch {
      return '';
    }
  });
  const [gateSearchQuery, setGateSearchQuery] = useState<string>('');
  const [gateFilter, setGateFilter] = useState<'all' | 'pending' | 'attended' | 'walkin'>('all');
  const [gateToast, setGateToast] = useState<string | null>(null);

  // Volunteer Gate Passcode Protection ('Matnas2026')
  const [isGateUnlocked, setIsGateUnlocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GATE_UNLOCKED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [gatePasscodeInput, setGatePasscodeInput] = useState<string>('');
  const [gatePasscodeError, setGatePasscodeError] = useState<string>('');

  const hasGateAccess = isAdmin || isGateUnlocked;

  // Walk-in modal state
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [walkInChildName, setWalkInChildName] = useState<string>('');
  const [walkInParentName, setWalkInParentName] = useState<string>('');
  const [walkInParentPhone, setWalkInParentPhone] = useState<string>('');
  const [walkInIsSubscriber, setWalkInIsSubscriber] = useState<boolean>(false);
  const [walkInNotes, setWalkInNotes] = useState<string>('');
  const [walkInSaving, setWalkInSaving] = useState<boolean>(false);

  // Multi-line description expansion toggle
  const [expandedDescIds, setExpandedDescIds] = useState<Record<string, boolean>>({});
  const toggleDescExpanded = (id: string) => {
    setExpandedDescIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Lightbox / Fullscreen Image Preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Edit Event modal state (Admin)
  const [editingEvent, setEditingEvent] = useState<LuzEntity | null>(null);
  const [editTitleHe, setEditTitleHe] = useState('');
  const [editTitleEn, setEditTitleEn] = useState('');
  const [editDescHe, setEditDescHe] = useState('');
  const [editDescEn, setEditDescEn] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDayOfWeek, setEditDayOfWeek] = useState<number>(5);
  const [editStartTime, setEditStartTime] = useState('10:00');
  const [editEndTime, setEditEndTime] = useState('13:00');
  const [editPriceAmount, setEditPriceAmount] = useState<number>(0);
  const [editPriceCurrency, setEditPriceCurrency] = useState<'INR' | 'ILS' | 'FREE'>('FREE');
  const [editHostName, setEditHostName] = useState('');
  const [editHostPhone, setEditHostPhone] = useState('');

  // Persistent Event Overrides (stores updates & uploaded images for both core and custom events)
  const [eventOverrides, setEventOverrides] = useState<Record<string, LuzEntity>>(() => {
    try {
      const saved = localStorage.getItem(YC_EVENT_OVERRIDES_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(YC_EVENT_OVERRIDES_STORAGE_KEY, JSON.stringify(eventOverrides));
    } catch {
      // ignore
    }
  }, [eventOverrides]);

  // Persistent Volunteer Parents per Event (synced to both localStorage and Cloud Firestore via onUpdateEntity)
  const [eventVolunteers, setEventVolunteers] = useState<Record<string, EventVolunteer[]>>(() => {
    try {
      const saved = localStorage.getItem(YC_VOLUNTEERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(YC_VOLUNTEERS_STORAGE_KEY, JSON.stringify(eventVolunteers));
    } catch {
      // ignore
    }
  }, [eventVolunteers]);

  // Volunteer Parent Signup Modal State
  const [selectedEventForVolunteer, setSelectedEventForVolunteer] = useState<LuzEntity | null>(null);
  const [volParentName, setVolParentName] = useState<string>(() => {
    try {
      return localStorage.getItem('luz_yc_volunteer_name') || '';
    } catch {
      return '';
    }
  });
  const [volParentPhone, setVolParentPhone] = useState<string>(() => {
    try {
      return localStorage.getItem('luz_yc_volunteer_phone') || '';
    } catch {
      return '';
    }
  });
  const [volRole, setVolRole] = useState<string>('הורה תורן בשער ונוכחות');
  const [volSubmitted, setVolSubmitted] = useState<boolean>(false);
  const [volSyncing, setVolSyncing] = useState<boolean>(false);

  // Client-side image upload & resize helper (keeps photos lightweight, max 1200px width/height)
  const handleProcessImageFile = (
    file: File,
    onSuccess: (dataUrl: string) => void
  ) => {
    if (file.size > 10 * 1024 * 1024) {
      alert(isHe ? 'קובץ גדול מדי (מקסימום 10MB)' : 'File too large (max 10MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = e.target?.result as string;
      if (!raw) return;
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          onSuccess(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          onSuccess(raw);
        }
      };
      img.onerror = () => onSuccess(raw);
      img.src = raw;
    };
    reader.readAsDataURL(file);
  };

  const handleStartEditEvent = (ev: LuzEntity) => {
    setEditingEvent(ev);
    setEditTitleHe(ev.titleHe || '');
    setEditTitleEn(ev.titleEn || ev.titleHe || '');
    setEditDescHe(ev.descriptionHe || '');
    setEditDescEn(ev.descriptionEn || ev.descriptionHe || '');
    setEditImageUrl(ev.imageUrl || '');
    setEditDate(ev.date || '');
    setEditDayOfWeek(typeof ev.dayOfWeek === 'number' ? ev.dayOfWeek : 5);
    setEditStartTime(ev.startTime || '10:00');
    setEditEndTime(ev.endTime || '13:00');
    setEditPriceAmount(ev.priceAmount || 0);
    setEditPriceCurrency((ev.priceCurrency as any) || (ev.priceAmount ? 'INR' : 'FREE'));
    setEditHostName(ev.hostName || '');
    setEditHostPhone(ev.hostPhone || '+972-52-478-0033');
  };

  const handleSaveEditedEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    const updated: LuzEntity = {
      ...editingEvent,
      titleHe: editTitleHe.trim() || editingEvent.titleHe,
      titleEn: editTitleEn.trim() || editTitleHe.trim() || editingEvent.titleEn,
      descriptionHe: editDescHe.trim() || editingEvent.descriptionHe,
      descriptionEn: editDescEn.trim() || editDescHe.trim() || editingEvent.descriptionEn,
      imageUrl: editImageUrl.trim() || editingEvent.imageUrl,
      date: editDate || undefined,
      dayOfWeek: editDayOfWeek,
      startTime: editStartTime,
      endTime: editEndTime,
      priceAmount: Number(editPriceAmount) || 0,
      priceCurrency: Number(editPriceAmount) > 0 ? (editPriceCurrency as any) : 'FREE',
      hostName: editHostName.trim() || editingEvent.hostName,
      hostPhone: editHostPhone.trim() || editingEvent.hostPhone,
    };

    setEventOverrides((prev) => ({
      ...prev,
      [updated.id]: updated,
    }));

    if (onUpdateEntity) {
      onUpdateEntity(updated);
    }

    setEditingEvent(null);
    setShareToast(isHe ? 'האירוע עודכן בהצלחה!' : 'Event updated successfully!');
    setTimeout(() => setShareToast(null), 3000);
  };

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

  // =========================================================================
  // YOUTH CENTER MORNING REMINDER BOT (09:30 IST) — SAFE TEST MODE (972508878902 ONLY)
  // =========================================================================
  const SAFE_TEST_PHONE = '972508878902';
  const TARGET_GROUP_NAME_FUTURE = 'Youth center parents';
  const [reminderPreviewEvent, setReminderPreviewEvent] = useState<LuzEntity | null>(null);
  const [sendingBotReminder, setSendingBotReminder] = useState(false);
  const [botStatusMessage, setBotStatusMessage] = useState<string | null>(null);

  const buildYouthMorningReminderText = (ev: LuzEntity) => {
    const schedule = formatEventSchedule(ev);
    const eventUrl = `https://naorbo.github.io/luz-goa/?tab=youth_center&event=${encodeURIComponent(ev.id)}`;
    const vols = ev.volunteers || eventVolunteers[ev.id] || [];
    const volunteerLine =
      vols.length > 0
        ? `🤝 *הורה מתנדב/ת במפגש:* ${vols.map((v) => v.name).join(', ')}\n`
        : `🙋 *הורה מתנדב/ת:* נשמח להורה תורן שירשום את עצמו בקישור!\n`;

    return (
      `☀️ *בוקר טוב הורים יקרים! תזכורת לאירוע היום במרכז הנוער גואה (Goa Teens House)* 🌿\n\n` +
      `🎯 *${ev.titleHe}*\n` +
      `📅 *מתי:* היום (${schedule})\n` +
      `📍 *מיקום:* ${ev.locationDetailsHe || 'מרכז הנוער קולום (ליד שייליש)'}\n` +
      volunteerLine +
      `\n📝 *על הפעילות:*\n${ev.descriptionHe || ev.titleHe}\n\n` +
      `👇 *להרשמה מהירה לאירוע ולשיבוץ הורה מתנדב:*\n` +
      `${eventUrl}`
    );
  };

  const handleSendSampleReminderTo972508878902 = async (
    ev: LuzEntity,
    preferMode: 'auto' | 'direct_wa' | 'share_with_image' = 'auto'
  ) => {
    const text = buildYouthMorningReminderText(ev);
    const vols = ev.volunteers || eventVolunteers[ev.id] || [];

    if (preferMode === 'share_with_image' && typeof navigator !== 'undefined' && navigator.share) {
      try {
        setSendingBotReminder(true);
        if (ev.imageUrl) {
          const response = await fetch(ev.imageUrl);
          const blob = await response.blob();
          const file = new File([blob], 'youth-center-event.jpg', { type: blob.type || 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: ev.titleHe,
              text,
              files: [file],
            });
            setSendingBotReminder(false);
            return;
          }
        }
        await navigator.share({ title: ev.titleHe, text });
        setSendingBotReminder(false);
        return;
      } catch {
        setSendingBotReminder(false);
      }
    }

    if (preferMode === 'auto') {
      setSendingBotReminder(true);
      setBotStatusMessage(null);
      try {
        const res = await fetch('http://localhost:8080/send-youth-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: ev.id,
            event: {
              id: ev.id,
              date: ev.date || '2026-11-05',
              startTime: ev.startTime || '16:30',
              endTime: ev.endTime || '18:30',
              titleHe: ev.titleHe,
              titleEn: ev.titleEn,
              descriptionHe: ev.descriptionHe,
              imageUrl: ev.imageUrl,
              volunteerParent: vols.map((v) => v.name).join(', '),
            },
          }),
        });
        const data = await res.json();
        if (data && data.ok) {
          setBotStatusMessage(
            `✅ נשלח בהצלחה מהבוט (עם תמונה + טקסט) אל ${SAFE_TEST_PHONE}! (קבוצת "${TARGET_GROUP_NAME_FUTURE}" נעולה ולא קיבלה הודעה)`
          );
          setSendingBotReminder(false);
          return;
        }
      } catch {
        // Fallback to direct WhatsApp link to 972508878902 if local bot needs QR scan
      }
      setSendingBotReminder(false);
    }

    // Direct 1-click WhatsApp dispatch strictly to 972508878902
    const waUrl = `https://wa.me/${SAFE_TEST_PHONE}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setBotStatusMessage(
      `📲 נפתחה שליחה ישירה בוואטסאפ אל ${SAFE_TEST_PHONE} בלבד! (לשליחה אוטומטית עם תמונה ב-09:30 ניתן גם לחבר את הבוט ב-localhost:8080/qr)`
    );
  };

  // Add new Youth Center Event modal state (Admin Only)
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newTitleHe, setNewTitleHe] = useState('');
  const [newTitleEn, setNewTitleEn] = useState('');
  const [newDescHe, setNewDescHe] = useState('');
  const [newDescEn, setNewDescEn] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newDayOfWeek, setNewDayOfWeek] = useState<number>(1);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('16:30');
  const [newEndTime, setNewEndTime] = useState('19:00');
  const [newPriceAmount, setNewPriceAmount] = useState<number>(0);
  const [newPriceCurrency, setNewPriceCurrency] = useState<'INR' | 'ILS' | 'FREE'>('FREE');
  const [newHostName, setNewHostName] = useState('צוות מרכז הנוער גואה');
  const [newHostPhone, setNewHostPhone] = useState('+972-52-478-0033');

  // Dedicated Google Sheet Webhook URL
  const [ycSheetWebhookUrl, setYcSheetWebhookUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(YC_SHEET_WEBHOOK_STORAGE_KEY);
      if (saved && saved.trim() && !saved.includes('AKfycbwGwt1q-aWG9CWNrCqDNBx2NG3w_cKQhNFTTxJ2XmIlHGNIh_aK2xM6jDIjq9Yj2LGp')) {
        return saved.trim();
      }
      return DEFAULT_YC_WEBHOOK_URL;
    } catch {
      return DEFAULT_YC_WEBHOOK_URL;
    }
  });

  // Dedicated Youth Center Google Sheet Document URL (Separate from Site Log)
  const [ycSpreadsheetUrl, setYcSpreadsheetUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(YC_DEDICATED_SHEET_URL_STORAGE_KEY);
      return saved && saved.trim() ? saved.trim() : DEFAULT_YC_SPREADSHEET_URL;
    } catch {
      return DEFAULT_YC_SPREADSHEET_URL;
    }
  });

  useEffect(() => {
    try {
      if (ycSpreadsheetUrl.trim()) {
        localStorage.setItem(YC_DEDICATED_SHEET_URL_STORAGE_KEY, ycSpreadsheetUrl.trim());
      }
    } catch {
      // ignore
    }
  }, [ycSpreadsheetUrl]);

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

  // Combine core Youth Center events with any Youth/Kids events from entities + custom overrides + volunteers
  const youthEvents = useMemo(() => {
    const customYouthEntities = entities.filter(
      (e) => e.isYouthCenter && e.id !== 'prod-wks-yc-colomb'
    );

    const map = new Map<string, LuzEntity>();
    CORE_YOUTH_CENTER_EVENTS.forEach((ev) => map.set(ev.id, ev));
    customYouthEntities.forEach((ev) => {
      const existing = map.get(ev.id);
      map.set(ev.id, existing ? { ...existing, ...ev } : ev);
    });
    Object.values(eventOverrides).forEach((ov) => {
      const existing = map.get(ov.id);
      if (!existing) {
        map.set(ov.id, ov);
        return;
      }
      const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const ovTime = ov.updatedAt ? new Date(ov.updatedAt).getTime() : 0;
      if (ovTime >= existingTime) {
        map.set(ov.id, { ...existing, ...ov, volunteers: ov.volunteers ?? existing.volunteers });
      } else {
        map.set(ov.id, { ...ov, ...existing, volunteers: existing.volunteers ?? ov.volunteers });
      }
    });

    Array.from(map.keys()).forEach((id) => {
      const item = map.get(id)!;
      const localVols = eventVolunteers[id];
      if (localVols && (!item.volunteers || item.volunteers.length === 0)) {
        map.set(id, { ...item, volunteers: localVols });
      }
    });

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
  }, [entities, eventOverrides, eventVolunteers]);

  // Deep-linking: auto-open registration modal or gate when an event is targeted via URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const gateParam = params.get('gate') || params.get('checkin');
      if (gateParam) {
        setViewMode('gate');
        setGateEventId(gateParam);
      }
    }
  }, []);

  useEffect(() => {
    if (initialEventId && youthEvents.length > 0) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('gate') || params.get('checkin')) {
          setViewMode('gate');
          setGateEventId(initialEventId);
          onClearInitialEvent?.();
          return;
        }
      }
      const match = youthEvents.find((e) => e.id === initialEventId);
      if (match) {
        setSelectedEventForReg(match);
        setIsSubscriber(true);
        setRegSubmitted(false);
        onClearInitialEvent?.();
      }
    }
  }, [initialEventId, youthEvents, onClearInitialEvent]);

  useEffect(() => {
    try {
      if (volunteerName.trim()) {
        localStorage.setItem('luz_yc_volunteer_name', volunteerName.trim());
      }
    } catch {
      // ignore
    }
  }, [volunteerName]);

  // Active event in Gate check-in view
  const activeGateEvent = useMemo(() => {
    if (gateEventId) {
      const match = youthEvents.find((e) => e.id === gateEventId);
      if (match) return match;
    }
    return youthEvents[0] || CORE_YOUTH_CENTER_EVENTS[0];
  }, [gateEventId, youthEvents]);

  // Gate live metrics (Pre-registered vs Walk-in vs Expected)
  const gateMetrics = useMemo(() => {
    if (!activeGateEvent) {
      return { totalAttended: 0, attendedPreReg: 0, totalPreReg: 0, attendedWalkIns: 0, pendingCount: 0 };
    }
    const eventRegs = registrations.filter((r) => r.eventId === activeGateEvent.id);
    const preRegs = eventRegs.filter((r) => !r.isWalkIn);
    const attendedPreReg = preRegs.filter((r) => r.attended).length;
    const attendedWalkIns = eventRegs.filter((r) => r.isWalkIn && r.attended).length;
    const totalAttended = attendedPreReg + attendedWalkIns;
    const totalPreReg = preRegs.length;
    const pendingCount = Math.max(0, totalPreReg - attendedPreReg);

    return {
      totalAttended,
      attendedPreReg,
      totalPreReg,
      attendedWalkIns,
      pendingCount,
    };
  }, [activeGateEvent, registrations]);

  // Gate attendee filtered list for display
  const gateFilteredList = useMemo(() => {
    if (!activeGateEvent) return [];
    return registrations.filter((r) => r.eventId === activeGateEvent.id);
  }, [activeGateEvent, registrations]);

  const gateDisplayList = useMemo(() => {
    let list = gateFilteredList;

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
          r.parentName.toLowerCase().includes(q) ||
          r.parentPhone.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q))
      );
    }

    return list;
  }, [gateFilteredList, gateFilter, gateSearchQuery]);

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

  const formatEventScheduleEn = (ev: LuzEntity) => {
    let dayStr = '';
    if (ev.date) {
      dayStr = formatDateFull(ev.date, false);
    } else if (typeof ev.dayOfWeek === 'number') {
      dayStr = DAY_NAMES_EN[ev.dayOfWeek] || '';
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

  const getEventVolunteers = (ev: LuzEntity): EventVolunteer[] => {
    return ev.volunteers || eventVolunteers[ev.id] || [];
  };

  const handleOpenVolunteerModal = (ev: LuzEntity) => {
    const latestEv = youthEvents.find((item) => item.id === ev.id) || ev;
    setSelectedEventForVolunteer(latestEv);
    setVolSubmitted(false);
  };

  const handleSubmitVolunteerSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForVolunteer || !volParentName.trim()) return;

    const cleanName = volParentName.trim();
    const cleanPhone = volParentPhone.trim() || '—';
    const cleanRole = volRole.trim() || (isHe ? 'הורה מתנדב/ת' : 'Volunteer Parent');

    try {
      localStorage.setItem('luz_yc_volunteer_name', cleanName);
      if (cleanPhone && cleanPhone !== '—') {
        localStorage.setItem('luz_yc_volunteer_phone', cleanPhone);
      }
    } catch {
      // ignore
    }
    setVolunteerName(cleanName);

    const newVolunteer: EventVolunteer = {
      id: `vol-${Date.now()}`,
      name: cleanName,
      phone: cleanPhone,
      role: cleanRole,
      createdAt: new Date().toISOString(),
    };

    const currentEv =
      youthEvents.find((ev) => ev.id === selectedEventForVolunteer.id) ||
      selectedEventForVolunteer;
    const existingVols = getEventVolunteers(currentEv);
    const filteredExisting = existingVols.filter(
      (v) => v.name.trim().toLowerCase() !== cleanName.toLowerCase()
    );
    const nextVolunteers = [...filteredExisting, newVolunteer];

    const updatedEvent: LuzEntity = {
      ...currentEv,
      volunteers: nextVolunteers,
      updatedAt: new Date().toISOString(),
    };

    setEventVolunteers((prev) => ({
      ...prev,
      [currentEv.id]: nextVolunteers,
    }));

    setEventOverrides((prev) => ({
      ...prev,
      [currentEv.id]: updatedEvent,
    }));

    setSelectedEventForVolunteer(updatedEvent);

    if (onUpdateEntity) {
      onUpdateEntity(updatedEvent);
    }

    const targetUrl = (ycSheetWebhookUrl || DEFAULT_YC_WEBHOOK_URL).trim();
    if (targetUrl.startsWith('https://')) {
      setVolSyncing(true);
      try {
        const scheduleLabelEn = formatEventScheduleEn(currentEv);
        const payload = {
          event: 'luz.youth_center_event_rsvp',
          dedicatedSheetName: 'LUZ Goa — Youth Center Registrations',
          sheetTabName: 'Youth_Center_Events',
          referralCode: `YC-VOL-${Date.now().toString().slice(-4)}`,
          environment: 'prod',
          actionType: 'youth_center_volunteer_signup',
          actionLabelEn: 'Volunteer Parent Shift Signup',
          actionLabelHe: 'שיבוץ הורה מתנדב לאירוע במרכז הנוער',
          youthCenterEvent: {
            eventId: currentEv.id,
            titleEn: currentEv.titleEn,
            titleHe: currentEv.titleHe,
            schedule: scheduleLabelEn,
            location: currentEv.locationDetailsEn || 'Colomb Youth Center',
            participantName: `[VOLUNTEER PARENT] ${cleanName}`,
            isSubscriber: 'Volunteer Parent on Duty',
            parentName: cleanName,
            parentPhone: cleanPhone,
            notes: `Role: ${cleanRole}`,
            registeredAt: newVolunteer.createdAt,
          },
        };
        await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          mode: 'no-cors',
        });
      } catch {
        // Saved locally & in Firestore even if offline
      } finally {
        setVolSyncing(false);
      }
    }

    setVolSubmitted(true);
    setShareToast(
      isHe
        ? `🤝 תודה ${cleanName}! שובצת כהורה מתנדב/ת באירוע`
        : `🤝 Thank you ${cleanName}! Signed up as volunteer parent`
    );
    setTimeout(() => setShareToast(null), 3500);
  };

  const handleRemoveVolunteer = (ev: LuzEntity, volId: string) => {
    const existingVols = getEventVolunteers(ev);
    const nextVolunteers = existingVols.filter((v) => v.id !== volId);
    const updatedEvent: LuzEntity = {
      ...ev,
      volunteers: nextVolunteers,
      updatedAt: new Date().toISOString(),
    };

    setEventVolunteers((prev) => ({
      ...prev,
      [ev.id]: nextVolunteers,
    }));

    setEventOverrides((prev) => ({
      ...prev,
      [ev.id]: updatedEvent,
    }));

    if (selectedEventForVolunteer?.id === ev.id) {
      setSelectedEventForVolunteer(updatedEvent);
    }

    if (onUpdateEntity) {
      onUpdateEntity(updatedEvent);
    }

    setShareToast(isHe ? 'השיבוץ הוסר מהאירוע' : 'Volunteer removed from event');
    setTimeout(() => setShareToast(null), 2500);
  };

  const handleSubmitEventRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForReg) return;

    const scheduleLabel = formatEventSchedule(selectedEventForReg);
    const scheduleLabelEn = formatEventScheduleEn(selectedEventForReg);
    const notesValue = notes.trim() || 'None';
    const subscriberTextEn = isSubscriber ? 'Yes (Subscriber)' : 'No (Single Entry)';

    const newReg: YouthCenterEventRegistration = {
      id: `yc-reg-${Date.now()}`,
      eventId: selectedEventForReg.id,
      eventTitleHe: selectedEventForReg.titleHe,
      eventTitleEn: selectedEventForReg.titleEn,
      eventSchedule: scheduleLabelEn,
      participantName: participantName.trim(),
      isSubscriber,
      parentName: parentName.trim(),
      parentPhone: parentPhone.trim(),
      notes: notesValue,
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
        customerName: `${newReg.participantName} (${subscriberTextEn}, Parent: ${newReg.parentName})`,
        customerPhone: newReg.parentPhone,
        participantsCount: 1,
        selectedDate: selectedEventForReg.date || scheduleLabelEn,
        selectedSlot: selectedEventForReg.startTime || '16:30',
        totalPrice: 0,
        currency: 'FREE',
        reminderChannel: 'whatsapp',
      });
    }

    // Dispatch to Dedicated Youth Center Google Sheet via Webhook (All English schema & text)
    const targetUrl = (ycSheetWebhookUrl || DEFAULT_YC_WEBHOOK_URL).trim();
    if (targetUrl.startsWith('https://')) {
      setSyncingSheet(true);
      try {
        const payload = {
          event: 'luz.youth_center_event_rsvp',
          dedicatedSheetName: 'LUZ Goa — Youth Center Registrations',
          sheetTabName: 'Youth_Center_Events',
          referralCode: `YC-${Date.now().toString().slice(-4)}`,
          environment: 'prod',
          actionType: 'youth_center_event_rsvp',
          actionLabelEn: 'Youth Center Event Registration',
          actionLabelHe: 'הרשמה לאירוע במרכז הנוער גואה',
          youthCenterEvent: {
            eventId: selectedEventForReg.id,
            titleEn: selectedEventForReg.titleEn,
            titleHe: selectedEventForReg.titleHe,
            schedule: scheduleLabelEn,
            location: selectedEventForReg.locationDetailsEn || 'Colomb Youth Center',
            participantName: newReg.participantName,
            isSubscriber: subscriberTextEn,
            parentName: newReg.parentName,
            parentPhone: newReg.parentPhone,
            notes: notesValue,
            registeredAt: newReg.createdAt,
          },
          provider: {
            id: selectedEventForReg.id,
            nameEn: `Youth Center — ${selectedEventForReg.titleEn}`,
            nameHe: `מרכז הנוער — ${selectedEventForReg.titleHe}`,
            ownerOrHost: selectedEventForReg.hostNameEn || selectedEventForReg.hostName || 'Youth Center Team',
            phone: selectedEventForReg.hostPhone || '+972-52-478-0033',
            categoryOrType: 'Youth Center Event',
            area: selectedEventForReg.area || 'Colomb',
            contactLang: 'en',
          },
          customer: {
            name: `${newReg.participantName} (${subscriberTextEn}, Parent: ${newReg.parentName})`,
            phone: newReg.parentPhone,
          },
          serviceOrDateSummary: `${selectedEventForReg.titleEn} | ${scheduleLabelEn} | Subscriber: ${isSubscriber ? 'Yes' : 'No'} | Notes: ${notesValue}`,
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

  // =========================================================================
  // VOLUNTEER DOOR / GATE CHECK-IN PORTAL HANDLERS (100% Free, Mobile-First)
  // =========================================================================

  const handleOpenGateForEvent = (eventId: string) => {
    setGateEventId(eventId);
    setViewMode('gate');
    setGateSearchQuery('');
    setGateFilter('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGatePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyGatePasscode(gatePasscodeInput)) {
      setIsGateUnlocked(true);
      try {
        localStorage.setItem(GATE_UNLOCKED_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
      setGatePasscodeError('');
      setGatePasscodeInput('');
      setGateToast(
        isHe
          ? 'שער הנוכחות נפתח בהצלחה! משמרת נעימה 🌿'
          : 'Gate unlocked successfully! Have a great shift 🌿'
      );
      setTimeout(() => setGateToast(null), 3000);
    } else {
      setGatePasscodeError(
        isHe
          ? 'קוד שגוי. הסיסמה היא: Matnas2026'
          : 'Incorrect passcode. Passcode is: Matnas2026'
      );
    }
  };

  const handleLockGate = () => {
    setIsGateUnlocked(false);
    try {
      localStorage.removeItem(GATE_UNLOCKED_STORAGE_KEY);
    } catch {
      // ignore
    }
    setGateToast(isHe ? 'שער הנוכחות ננעל' : 'Gate locked');
    setTimeout(() => setGateToast(null), 2500);
  };

  const handleToggleAttendance = (regId: string) => {
    const defaultVolunteer = isHe ? 'הורה מתנדב' : 'Volunteer Parent';
    const finalVolunteer = volunteerName.trim() || defaultVolunteer;

    setRegistrations((prev) =>
      prev.map((r) => {
        if (r.id !== regId) return r;
        const nextAttended = !r.attended;
        return {
          ...r,
          attended: nextAttended,
          attendedAt: nextAttended ? new Date().toISOString() : undefined,
          checkedInBy: nextAttended ? finalVolunteer : undefined,
        };
      })
    );

    const target = registrations.find((r) => r.id === regId);
    if (target) {
      const willBeAttended = !target.attended;
      const msg = willBeAttended
        ? (isHe ? `✅ ${target.participantName} סומן/ה כנוכח/ת!` : `✅ ${target.participantName} checked in!`)
        : (isHe ? `↩️ בוטל סימון הנוכחות עבור ${target.participantName}` : `↩️ Check-in undone for ${target.participantName}`);
      setGateToast(msg);
      setTimeout(() => setGateToast(null), 2500);
    }
  };

  const handleSaveWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInChildName.trim()) return;

    setWalkInSaving(true);
    const scheduleLabelEn = formatEventScheduleEn(activeGateEvent);
    const scheduleLabelHe = formatEventSchedule(activeGateEvent);
    const defaultVolunteer = isHe ? 'הורה מתנדב' : 'Volunteer Parent';
    const finalVolunteer = volunteerName.trim() || defaultVolunteer;

    const newWalkInReg: YouthCenterEventRegistration = {
      id: `yc-walkin-${Date.now()}`,
      eventId: activeGateEvent.id,
      eventTitleHe: activeGateEvent.titleHe,
      eventTitleEn: activeGateEvent.titleEn,
      eventSchedule: isHe ? scheduleLabelHe : scheduleLabelEn,
      participantName: walkInChildName.trim(),
      isSubscriber: walkInIsSubscriber,
      parentName: walkInParentName.trim() || (isHe ? 'ללא ציון' : 'Not specified'),
      parentPhone: walkInParentPhone.trim() || '—',
      notes: walkInNotes.trim() || (isHe ? 'הגיע/ה ללא הרשמה מראש (Walk-in בשער)' : 'Walk-in at gate (Not pre-registered)'),
      createdAt: new Date().toISOString(),
      attended: true,
      attendedAt: new Date().toISOString(),
      isWalkIn: true,
      checkedInBy: finalVolunteer,
    };

    setRegistrations((prev) => [newWalkInReg, ...prev]);

    // Fire Google Sheet Webhook if available (100% free)
    const targetUrl = (ycSheetWebhookUrl || DEFAULT_YC_WEBHOOK_URL).trim();
    if (targetUrl.startsWith('https://')) {
      try {
        const payload = {
          event: 'luz.youth_center_event_rsvp',
          dedicatedSheetName: 'LUZ Goa — Youth Center Registrations',
          sheetTabName: 'Youth_Center_Events',
          referralCode: `YC-WALKIN-${Date.now().toString().slice(-4)}`,
          environment: 'prod',
          actionType: 'youth_center_walkin_attendance',
          actionLabelEn: 'Youth Center Gate Walk-In (Attended)',
          actionLabelHe: 'נוכח בשער ללא הרשמה מראש (Walk-in)',
          youthCenterEvent: {
            eventId: activeGateEvent.id,
            titleEn: activeGateEvent.titleEn,
            titleHe: activeGateEvent.titleHe,
            schedule: scheduleLabelEn,
            location: activeGateEvent.locationDetailsEn || 'Colomb Youth Center',
            participantName: newWalkInReg.participantName,
            isSubscriber: walkInIsSubscriber ? 'Yes (Subscriber)' : 'No (Walk-in Guest)',
            parentName: newWalkInReg.parentName,
            parentPhone: newWalkInReg.parentPhone,
            notes: `[WALK-IN AT GATE by ${finalVolunteer}] ${newWalkInReg.notes}`,
            registeredAt: newWalkInReg.createdAt,
          },
        };
        void fetch(targetUrl, {
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
    setWalkInChildName('');
    setWalkInParentName('');
    setWalkInParentPhone('');
    setWalkInIsSubscriber(false);
    setWalkInNotes('');

    setGateToast(
      isHe
        ? `🎉 ${newWalkInReg.participantName} נוסף/ה וסומן/ה כנוכח/ת!`
        : `🎉 ${newWalkInReg.participantName} added and checked in!`
    );
    setTimeout(() => setGateToast(null), 3000);
  };

  const handleDeleteRegistration = (regId: string) => {
    if (!window.confirm(isHe ? 'האם להסיר רשומת נוכחות זו?' : 'Remove this registration?')) {
      return;
    }
    setRegistrations((prev) => prev.filter((r) => r.id !== regId));
    setGateToast(isHe ? 'הרשומה הוסרה' : 'Registration removed');
    setTimeout(() => setGateToast(null), 2500);
  };

  const handleShareAttendanceSummaryWhatsApp = (event: LuzEntity) => {
    const eventRegs = registrations.filter((r) => r.eventId === event.id);
    const preRegs = eventRegs.filter((r) => !r.isWalkIn);
    const attendedPreRegs = preRegs.filter((r) => r.attended);
    const attendedWalkIns = eventRegs.filter((r) => r.isWalkIn && r.attended);
    const totalAttended = attendedPreRegs.length + attendedWalkIns.length;
    const noShows = preRegs.filter((r) => !r.attended);

    const eventTitle = isHe ? event.titleHe : event.titleEn;
    const schedule = formatEventSchedule(event);
    const volunteer = volunteerName.trim() || (isHe ? 'הורה מתנדב' : 'Volunteer Parent');

    let text = `*דוח נוכחות — מרכז הנוער גואה (Goa Teens House)*\n`;
    text += `🎯 *פעילות:* ${eventTitle}\n`;
    text += `📅 *מועד:* ${schedule}\n`;
    text += `👤 *הורה מתנדב בשער:* ${volunteer}\n`;
    text += `----------------------------------------\n`;
    text += `👥 *סה"כ נוכחים במקום:* ${totalAttended}\n`;
    text += `✅ *נרשמו מראש והגיעו:* ${attendedPreRegs.length} מתוך ${preRegs.length}\n`;
    text += `🚶 *הגיעו ללא הרשמה (Walk-in):* ${attendedWalkIns.length}\n`;
    text += `⏳ *נרשמו וטרם הגיעו:* ${noShows.length}\n`;
    text += `----------------------------------------\n\n`;

    if (totalAttended > 0) {
      text += `*📋 פירוט נוכחים (${totalAttended}):*\n`;
      let idx = 1;
      attendedPreRegs.forEach((r) => {
        const timeStr = r.attendedAt
          ? new Date(r.attendedAt).toLocaleTimeString('he-IL', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';
        text += `${idx++}. ${r.participantName} ${r.isSubscriber ? '(מנוי)' : '(אורח)'}${timeStr ? ` · ${timeStr}` : ''}\n`;
      });
      attendedWalkIns.forEach((r) => {
        text += `${idx++}. 🚶 ${r.participantName} (Walk-in${r.parentName && r.parentName !== 'ללא ציון' ? `, הורה: ${r.parentName}` : ''}${r.parentPhone && r.parentPhone !== '—' ? ` ${r.parentPhone}` : ''})\n`;
      });
      text += `\n`;
    }

    if (noShows.length > 0) {
      text += `*⏳ טרם הגיעו (${noShows.length}):*\n`;
      noShows.forEach((r, i) => {
        text += `${i + 1}. ${r.participantName} (הורה: ${r.parentName}${r.parentPhone && r.parentPhone !== '—' ? `, ${r.parentPhone}` : ''})\n`;
      });
      text += `\n`;
    }

    text += `נשלח מתוך LUZ Community OS (Goa Teens House) 🌿`;

    const cleanPhone = (event.hostPhone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone && cleanPhone.length >= 9
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePingNoShowParentWhatsApp = (
    reg: YouthCenterEventRegistration,
    event: LuzEntity
  ) => {
    const cleanPhone = (reg.parentPhone || '').replace(/[^0-9]/g, '');
    const eventTitle = isHe ? event.titleHe : event.titleEn;
    const text = isHe
      ? `שלום ${reg.parentName}, ראינו שרשמתם את ${reg.participantName} למפגש "${eventTitle}" במרכז הנוער שמתקיים כעת. האם אתם בדרך? נשמח לעדכון 🙏`
      : `Hi ${reg.parentName}, we noticed ${reg.participantName} is registered for "${eventTitle}" at the Youth Center happening now. Are you on your way? Please let us know 🙏`;

    const url = cleanPhone && cleanPhone.length >= 9
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyGateLink = (eventId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const url = `${origin}${path}?tab=youth_center&gate=${eventId}`;

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setGateToast(
            isHe
              ? 'קישור שער הכניסה הועתק! ניתן לשלוח בוואטסאפ להורה התורן'
              : 'Gate link copied! Ready to share with duty volunteer'
          );
          setTimeout(() => setGateToast(null), 3000);
        })
        .catch(() => {
          setGateToast(url);
          setTimeout(() => setGateToast(null), 4000);
        });
    } else {
      setGateToast(url);
      setTimeout(() => setGateToast(null), 4000);
    }
  };

  const handleCreateYouthEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleHe.trim()) return;

    const created: LuzEntity = {
      id: `yc-custom-${Date.now()}`,
      type: 'workshop',
      titleHe: newTitleHe.trim(),
      titleEn: newTitleEn.trim() || newTitleHe.trim(),
      descriptionHe: newDescHe.trim() || newTitleHe.trim(),
      descriptionEn: newDescEn.trim() || newDescHe.trim() || newTitleHe.trim(),
      area: 'Colomb',
      locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
      locationDetailsEn: 'Colomb Youth Center (near Shailish)',
      hostName: newHostName.trim() || 'צוות מרכז הנוער',
      hostNameEn: newHostName.trim() || 'Youth Center Team',
      hostPhone: newHostPhone.trim() || '+972-52-478-0033',
      priceAmount: Number(newPriceAmount) || 0,
      priceCurrency: Number(newPriceAmount) > 0 ? (newPriceCurrency as any) : 'FREE',
      audience: 'youth_11_15',
      ingestionSource: 'web',
      imageUrl:
        newImageUrl.trim() ||
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=900',
      tags: ['מרכז הנוער', 'קולום', 'Goa Teens House'],
      rsvpCount: 0,
      dayOfWeek: newDayOfWeek,
      date: newDate || undefined,
      weekCycle: 'all',
      isYouthCenter: true,
      startTime: newStartTime,
      endTime: newEndTime,
    };

    setEventOverrides((prev) => ({
      ...prev,
      [created.id]: created,
    }));

    if (onAddEntity) {
      onAddEntity(created);
    }
    setShowAddEventModal(false);
    setNewTitleHe('');
    setNewTitleEn('');
    setNewDescHe('');
    setNewDescEn('');
    setNewImageUrl('');
    setNewPriceAmount(0);
    setShareToast(isHe ? 'האירוע פורסם בהצלחה!' : 'Event published successfully!');
    setTimeout(() => setShareToast(null), 3000);
  };

  const exportRegistrationsToCsv = (onlyEventId?: string) => {
    const targetList =
      onlyEventId && onlyEventId !== 'all'
        ? registrations.filter((r) => r.eventId === onlyEventId)
        : visibleRegistrations;

    const headers = [
      'Registration Timestamp (Goa IST)',
      'Event Name',
      'Date & Schedule',
      'Participant Name',
      'Monthly Subscriber?',
      'Parent Name',
      'Parent WhatsApp Phone',
      'Attended? (Gate)',
      'Attendance Time',
      'Walk-In (Unregistered)?',
      'Checked In By',
      'Notes / Special Requests',
    ];

    const rows = targetList.map((r) => {
      const istTime =
        new Date(r.createdAt).toLocaleString('en-GB', {
          timeZone: 'Asia/Kolkata',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST';

      const attendanceTime = r.attendedAt
        ? new Date(r.attendedAt).toLocaleString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
          }) + ' IST'
        : 'N/A';

      return [
        istTime,
        r.eventTitleEn || r.eventTitleHe,
        r.eventSchedule,
        r.participantName,
        r.isSubscriber ? 'Yes (Subscriber)' : 'No (Single Entry)',
        r.parentName,
        r.parentPhone,
        r.attended ? 'Yes (Attended)' : 'No (Expected)',
        attendanceTime,
        r.isWalkIn ? 'Yes (Walk-in)' : 'No (Pre-registered)',
        r.checkedInBy || 'N/A',
        r.notes || 'None',
      ];
    });

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

  const downloadYouthCenterCsvTemplate = () => {
    const headers = [
      'Timestamp (Goa IST)',
      'Registration ID',
      'Event Name',
      'Date & Schedule',
      'Participant Name',
      'Monthly Subscriber?',
      'Parent Name',
      'Parent WhatsApp Phone',
      'Notes / Special Requests',
      'Environment',
    ];
    const sampleRow = [
      '2026-11-06 16:30:00',
      '#YC-1001',
      'Pottery Workshop with Local Clay',
      'Friday, Nov 6 · 16:30 – 18:30',
      'Liam Boiarsky',
      'Yes (Monthly Subscriber)',
      'Naor Boiarsky',
      '+972-52-478-0033',
      'None',
      'PROD',
    ];
    const csvContent =
      '\uFEFF' +
      [headers, sampleRow]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'LUZ_Youth_Center_Template.csv';
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
            <button
              type="button"
              onClick={() => {
                setViewMode('gate');
                if (!gateEventId && youthEvents.length > 0) {
                  setGateEventId(youthEvents[0].id);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                viewMode === 'gate'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-ink-2 hover:text-ink'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{isHe ? 'שער נוכחות למתנדב' : 'Volunteer Gate'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setBotStatusMessage(null);
              setReminderPreviewEvent(youthEvents[0] || CORE_YOUTH_CENTER_EVENTS[0]);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-emerald-600/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold transition-all active:scale-[0.98]"
            title={isHe ? 'תצוגה ושליחת הודעת תזכורת בוקר (09:30) לדוגמא אל 972508878902' : 'Preview & Send 09:30 Morning Reminder Sample'}
          >
            <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{isHe ? '🤖 בוט תזכורת בוקר (09:30)' : '🤖 09:30 Reminder Bot'}</span>
          </button>

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
          YOUTH CENTER: VOLUNTEER DOOR & CHECK-IN GATE vs CALENDAR vs CARDS
         ===================================================================== */}
      {viewMode === 'gate' ? (
        !hasGateAccess ? (
          <section className="hallmark-plate p-6 sm:p-10 max-w-lg mx-auto text-center space-y-6 my-8" aria-label={isHe ? 'שער נעול למתנדבים' : 'Locked Gate'}>
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-display text-2xl font-bold text-ink">
                {isHe ? 'שער כניסה ונוכחות — מרכז הנוער' : 'Volunteer Gate — Youth Center'}
              </h2>
              <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
                {isHe
                  ? 'ממשק זה מיועד להורה המתנדב/ת במשמרת לסימון נוכחות בזמן אמת, רישום המגיעים (Walk-in) ומעקב. לכניסה, הזינו את קוד הגישה:'
                  : 'This portal is for the volunteer parent on duty to check in attendees and register walk-ins in real time. Please enter the gate passcode:'}
              </p>
            </div>

            <form onSubmit={handleGatePasscodeSubmit} className="space-y-4 max-w-xs mx-auto">
              <div className="space-y-1 text-start">
                <label className="block text-xs font-semibold text-muted text-center">
                  {isHe ? 'קוד גישה למתנדבים' : 'Volunteer Passcode'}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={gatePasscodeInput}
                  onChange={(e) => {
                    setGatePasscodeInput(e.target.value);
                    if (gatePasscodeError) setGatePasscodeError('');
                  }}
                  placeholder="Matnas2026"
                  className="w-full px-4 py-3 text-center rounded-xl bg-paper border border-rule font-mono font-bold text-lg text-ink focus:outline-none focus:border-accent tracking-wider shadow-inner"
                  autoFocus
                />
              </div>

              {gatePasscodeError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2 justify-center">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{gatePasscodeError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
              >
                <Unlock className="w-4 h-4" />
                <span>{isHe ? 'פתיחת שער הנוכחות' : 'Unlock Gate'}</span>
              </button>
            </form>

            <div className="pt-2 border-t border-rule">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink transition-colors"
              >
                {isHe ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                <span>{isHe ? 'חזרה ללוח הפעילויות' : 'Back to Calendar'}</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-6 w-full max-w-full min-w-0" aria-label={isHe ? 'שער כניסה וסימון נוכחות' : 'Volunteer Gate & Check-in'}>
            {/* Top Control Bar: Back, Event Selector, Volunteer Name */}
            <div className="hallmark-plate p-4 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-rule">
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted hover:text-ink transition-colors"
                >
                  {isHe ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  <span>{isHe ? 'חזרה ללוח הפעילויות' : 'Back to Calendar'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyGateLink(activeGateEvent.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rule bg-paper text-xs font-semibold text-ink hover:text-accent transition-colors"
                    title={isHe ? 'העתק קישור ישיר לשער למתנדב' : 'Copy direct gate link'}
                  >
                    <Copy className="w-3.5 h-3.5 text-accent" />
                    <span>{isHe ? 'העתק קישור לשער' : 'Copy Gate Link'}</span>
                  </button>

                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={handleLockGate}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-rule bg-paper text-xs font-semibold text-muted hover:text-red-600 hover:border-red-300 transition-colors"
                      title={isHe ? 'נעילת השער בתום המשמרת' : 'Lock gate when shift ends'}
                    >
                      <Lock className="w-3.5 h-3.5 text-red-500" />
                      <span>{isHe ? 'נעילת שער' : 'Lock Gate'}</span>
                    </button>
                  )}
                </div>
              </div>

            {/* Event Selector & Volunteer Shift details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {isHe ? 'בחירת אירוע לסימון נוכחות:' : 'Select Event for Gate Attendance:'}
                </label>
                <select
                  value={gateEventId || activeGateEvent.id}
                  onChange={(e) => setGateEventId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-paper border border-rule font-bold text-ink text-sm sm:text-base focus:outline-none focus:border-accent"
                >
                  {youthEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {isHe ? ev.titleHe : ev.titleEn} ({formatEventSchedule(ev)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-xs font-semibold text-muted">
                    {isHe ? 'שם ההורה המתנדב/ת במשמרת:' : 'Volunteer Parent on Duty:'}
                  </label>
                  <button
                    type="button"
                    onClick={() => handleOpenVolunteerModal(activeGateEvent)}
                    className="text-[11px] font-bold text-accent hover:underline inline-flex items-center gap-1"
                  >
                    <Heart className="w-3 h-3" />
                    <span>{isHe ? 'שיבוץ מתנדבים לאירוע' : 'Manage Event Volunteers'}</span>
                  </button>
                </div>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-accent absolute top-3 start-3.5" />
                  <input
                    type="text"
                    value={volunteerName}
                    onChange={(e) => setVolunteerName(e.target.value)}
                    placeholder={isHe ? 'לדוגמה: יעל (הורה תורן)' : 'e.g. Yael (Parent on duty)'}
                    className="w-full ps-10 pe-3.5 py-2 rounded-xl bg-paper border border-rule font-medium text-ink text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                {getEventVolunteers(activeGateEvent).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-[11px] text-muted">
                      {isHe ? 'רשומים כמתנדבים:' : 'Signed up:'}
                    </span>
                    {getEventVolunteers(activeGateEvent).map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVolunteerName(v.name)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors ${
                          volunteerName === v.name
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        🤝 {v.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active Event Banner & Details */}
            <div className="p-3.5 rounded-xl bg-paper-2 border border-rule flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink-2">
                <span className="font-bold text-ink">{isHe ? activeGateEvent.titleHe : activeGateEvent.titleEn}</span>
                <span>📅 {formatEventSchedule(activeGateEvent)}</span>
                <span>📍 {isHe ? activeGateEvent.locationDetailsHe : activeGateEvent.locationDetailsEn}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted">
                  {isHe ? 'איש קשר:' : 'Host:'} {isHe ? activeGateEvent.hostName : activeGateEvent.hostNameEn || activeGateEvent.hostName} ({activeGateEvent.hostPhone})
                </span>
              </div>
            </div>
          </div>

          {/* 4 LIVE METRIC STATS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Present */}
            <div className="hallmark-plate p-4 sm:p-5 border-2 border-emerald-500/40 bg-emerald-500/5 space-y-1">
              <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isHe ? 'סה״כ נוכחים במקום' : 'Total Present'}
                </span>
                <Users className="w-4 h-4" />
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-emerald-950 dark:text-emerald-100">
                {gateMetrics.totalAttended}
              </div>
              <p className="text-[11px] text-emerald-800/80">
                {isHe ? 'ילדים ומשתתפים בתוך המתחם' : 'Attendees currently inside'}
              </p>
            </div>

            {/* Pre-Registered & Attended */}
            <div className="hallmark-plate p-4 sm:p-5 space-y-1">
              <div className="flex items-center justify-between text-accent">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isHe ? 'נרשמו מראש והגיעו' : 'Pre-registered & In'}
                </span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-ink">
                {gateMetrics.attendedPreReg} <span className="text-sm font-normal text-muted">/ {gateMetrics.totalPreReg}</span>
              </div>
              <p className="text-[11px] text-muted">
                {gateMetrics.totalPreReg > 0
                  ? `${Math.round((gateMetrics.attendedPreReg / gateMetrics.totalPreReg) * 100)}% ${isHe ? 'מימוש הרשמה' : 'attendance rate'}`
                  : (isHe ? 'אין נרשמים מראש' : 'No pre-registrations')}
              </p>
            </div>

            {/* Walk-in (Unregistered) */}
            <div className="hallmark-plate p-4 sm:p-5 space-y-1">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-300">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isHe ? 'הגיעו ללא הרשמה (Walk-in)' : 'Walk-in (Unregistered)'}
                </span>
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-ink">
                {gateMetrics.attendedWalkIns}
              </div>
              <p className="text-[11px] text-muted">
                {isHe ? 'משתתפים שהצטרפו בשער' : 'Arrived directly at the door'}
              </p>
            </div>

            {/* Expected Pending / No-show */}
            <div className="hallmark-plate p-4 sm:p-5 space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isHe ? 'נרשמו וטרם הגיעו' : 'Still Expected'}
                </span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-ink">
                {gateMetrics.pendingCount}
              </div>
              <p className="text-[11px] text-muted">
                {isHe ? 'נרשמו מראש וטרם סומנו' : 'Registered but not checked-in'}
              </p>
            </div>
          </div>

          {/* ACTION BAR: Big Prominent Walk-in Button + WhatsApp Summary Button */}
          <div className="hallmark-plate p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-paper-2/60">
            <button
              type="button"
              onClick={() => setShowWalkInModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-sm sm:text-base shadow-sm hover:shadow active:scale-[0.98] transition-all"
            >
              <UserPlus className="w-5 h-5 shrink-0" />
              <span>{isHe ? '+ הוסף משתתף שלא נרשם (Walk-in)' : '+ Add Unregistered Walk-in'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleShareAttendanceSummaryWhatsApp(activeGateEvent)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs hover:shadow-sm active:scale-[0.98] transition-all"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>{isHe ? '📤 שלח דוח סיכום לוואטסאפ של המארגן' : '📤 Send WhatsApp Summary to Host'}</span>
            </button>
          </div>

          {/* SEARCH & FILTER CHIPS */}
          <div className="hallmark-plate p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted absolute top-3 start-3.5" />
                <input
                  type="text"
                  value={gateSearchQuery}
                  onChange={(e) => setGateSearchQuery(e.target.value)}
                  placeholder={isHe ? 'חיפוש מהיר לפי שם ילד/ה, שם הורה או טלפון...' : 'Quick search by participant, parent, phone...'}
                  className="w-full ps-10 pe-3.5 py-2.5 rounded-xl bg-paper border border-rule text-xs sm:text-sm font-medium text-ink focus:outline-none focus:border-accent"
                />
                {gateSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setGateSearchQuery('')}
                    className="absolute top-2.5 end-3 text-xs text-muted hover:text-ink"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setGateFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    gateFilter === 'all'
                      ? 'bg-ink text-paper'
                      : 'bg-paper text-ink-2 hover:bg-paper-2 border border-rule'
                  }`}
                >
                  {isHe ? `הכל (${gateFilteredList.length})` : `All (${gateFilteredList.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setGateFilter('pending')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    gateFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-paper text-amber-800 dark:text-amber-300 hover:bg-paper-2 border border-amber-300 dark:border-amber-700'
                  }`}
                >
                  {isHe ? `טרם הגיעו (${gateMetrics.pendingCount})` : `Expected (${gateMetrics.pendingCount})`}
                </button>
                <button
                  type="button"
                  onClick={() => setGateFilter('attended')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    gateFilter === 'attended'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-paper text-emerald-800 dark:text-emerald-300 hover:bg-paper-2 border border-emerald-300 dark:border-emerald-700'
                  }`}
                >
                  {isHe ? `נוכחים (${gateMetrics.totalAttended})` : `Present (${gateMetrics.totalAttended})`}
                </button>
                <button
                  type="button"
                  onClick={() => setGateFilter('walkin')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    gateFilter === 'walkin'
                      ? 'bg-accent text-white'
                      : 'bg-paper text-ink-2 hover:bg-paper-2 border border-rule'
                  }`}
                >
                  {isHe ? `Walk-in (${gateMetrics.attendedWalkIns})` : `Walk-ins (${gateMetrics.attendedWalkIns})`}
                </button>
              </div>
            </div>

            {/* ATTENDEE CARDS LIST */}
            <div className="space-y-3 pt-2">
              {gateDisplayList.length === 0 ? (
                <div className="p-8 text-center bg-paper rounded-2xl border border-rule space-y-3">
                  <UserCheck className="w-8 h-8 text-muted mx-auto" />
                  <div className="font-display text-base font-bold text-ink">
                    {isHe ? 'לא נמצאו משתתפים בסינון זה' : 'No attendees found for this filter'}
                  </div>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    {gateSearchQuery
                      ? (isHe ? 'נסה לשנות את מילות החיפוש או הוסף אותו כ-Walk-in חדש.' : 'Try adjusting search keywords or add as a new walk-in.')
                      : (isHe ? 'עדיין אין נרשמים לאירוע זה. ניתן ללחוץ על "+ הוסף משתתף שלא נרשם" כדי לסמן הגעות במקום.' : 'No registrants yet. Click "+ Add Unregistered Walk-in" to check in arrivals.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowWalkInModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white font-semibold text-xs shadow-xs"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isHe ? 'הוסף משתתף שלא נרשם מראש' : 'Add Walk-in Attendee'}</span>
                  </button>
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
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isCheckedIn
                          ? 'bg-emerald-500/5 border-emerald-500/30'
                          : 'bg-paper border-rule hover:border-rule-strong'
                      }`}
                    >
                      {/* Left: Participant Info */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display text-base sm:text-lg font-bold text-ink">
                            {reg.participantName}
                          </h4>
                          {reg.isSubscriber ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              {isHe ? 'מנוי חודשי' : 'Subscriber'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-paper-2 text-ink-2 border border-rule">
                              {isHe ? 'אורח (חד-פעמי)' : 'Guest'}
                            </span>
                          )}
                          {reg.isWalkIn && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                              {isHe ? '🚶 Walk-in (הגיע ללא הרשמה)' : '🚶 Walk-in'}
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-ink-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>
                            {isHe ? 'הורה:' : 'Parent:'} <span className="font-semibold text-ink">{reg.parentName}</span>
                          </span>
                          {reg.parentPhone && reg.parentPhone !== '—' && (
                            <span dir="ltr" className="font-mono text-muted">
                              {reg.parentPhone}
                            </span>
                          )}
                          {reg.notes && reg.notes !== 'None' && (
                            <span className="text-muted italic truncate max-w-xs">
                              💬 {reg.notes}
                            </span>
                          )}
                        </div>

                        {isCheckedIn && (
                          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5 pt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {isHe
                                ? `נוכח/ת במקום (הגיע ב-${arrivalTime || 'לא צוין'}${reg.checkedInBy ? ` ע"י ${reg.checkedInBy}` : ''})`
                                : `Checked in (at ${arrivalTime || 'now'}${reg.checkedInBy ? ` by ${reg.checkedInBy}` : ''})`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Check-in / Undo Action Button + Ping Parent Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isCheckedIn ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(reg.id)}
                              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs active:scale-[0.97] transition-all min-h-[42px]"
                            >
                              <Check className="w-4 h-4 shrink-0" />
                              <span>{isHe ? 'סמן כנוכח/ת ✅' : 'Check In ✅'}</span>
                            </button>

                            {reg.parentPhone && reg.parentPhone !== '—' && (
                              <button
                                type="button"
                                onClick={() => handlePingNoShowParentWhatsApp(reg, activeGateEvent)}
                                className="p-2.5 rounded-xl border border-rule bg-paper hover:bg-paper-2 text-emerald-700 dark:text-emerald-400 hover:border-emerald-500/40 transition-colors"
                                title={isHe ? 'שלח תזכורת בוואטסאפ להורה' : 'Send WhatsApp ping to parent'}
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleAttendance(reg.id)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rule bg-paper hover:bg-paper-2 text-ink-2 hover:text-ink text-xs font-semibold active:scale-[0.97] transition-all min-h-[42px]"
                              title={isHe ? 'בטל סימון נוכחות אם סומן בטעות' : 'Undo check-in'}
                            >
                              <Undo2 className="w-3.5 h-3.5 text-muted" />
                              <span>{isHe ? 'בטל סימון' : 'Undo'}</span>
                            </button>

                            {reg.isWalkIn && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRegistration(reg.id)}
                                className="p-2 rounded-xl text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                title={isHe ? 'מחק רשומת Walk-in' : 'Delete Walk-in record'}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      )) : viewMode === 'calendar' ? (
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
                        const eventVols = getEventVolunteers(ev);
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
                            {/* Left/Start: Time Box + Image + Event Details */}
                            <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                              {/* Time Box */}
                              <div className="w-20 sm:w-24 shrink-0 rounded-2xl bg-paper-2 border border-rule p-2 sm:p-2.5 text-center">
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

                              {/* Poster / Thumbnail if available */}
                              {ev.imageUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenRegisterModal(ev)}
                                  className="relative w-16 h-20 sm:w-20 sm:h-24 rounded-2xl overflow-hidden border border-rule shrink-0 shadow-xs hover:shadow-md hover:scale-105 transition-all group bg-paper-2"
                                  title={isHe ? 'לחץ לצפייה בפרטי האירוע וההרשמה' : 'Click to view event details'}
                                >
                                  <img
                                    src={ev.imageUrl}
                                    alt={title}
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  />
                                  <span className="absolute inset-0 bg-black/15 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                    <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                  </span>
                                </button>
                              )}

                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-700 text-white">
                                    {isHe ? 'מרכז הנוער' : 'Youth Center'}
                                  </span>
                                  {ev.date && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent/15 text-accent">
                                      {formatDateFull(ev.date, isHe)}
                                    </span>
                                  )}

                                  {/* Price Badge */}
                                  {ev.priceAmount && ev.priceAmount > 0 ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30">
                                      ₹{ev.priceAmount.toLocaleString()} {isHe ? 'לחודש' : '/ month'}
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                                      {isHe ? 'חינם' : 'Free'}
                                    </span>
                                  )}

                                  {/* Registration count only (NO NAMES) */}
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-paper-2 text-xs font-semibold text-ink">
                                    <Users className="w-3 h-3 text-accent" />
                                    <span>
                                      {regCount} {isHe ? 'נרשמו' : 'registered'}
                                    </span>
                                  </span>

                                  {/* Volunteer Parent Badge on Calendar Row */}
                                  {eventVols.length > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenVolunteerModal(ev)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-bold text-emerald-900 dark:text-emerald-200 transition-colors"
                                      title={isHe ? 'לחצו לצפייה או הצטרפות כהורה מתנדב' : 'Click to view or join as volunteer parent'}
                                    >
                                      <Heart className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                      <span>
                                        {isHe ? 'הורה מתנדב/ת:' : 'Volunteer:'} {eventVols.map((v) => v.name).join(', ')}
                                      </span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenVolunteerModal(ev)}
                                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-dashed border-amber-600/50 text-xs font-semibold text-amber-900 dark:text-amber-300 transition-colors"
                                      title={isHe ? 'לחצו לרישום עצמי כהורה מתנדב באירוע' : 'Click to sign up as volunteer parent'}
                                    >
                                      <UserPlus className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                      <span>{isHe ? 'דרוש הורה מתנדב — לחצו לשיבוץ' : 'Volunteer Needed — Sign Up'}</span>
                                    </button>
                                  )}
                                </div>

                                <h4
                                  onClick={() => handleOpenRegisterModal(ev)}
                                  className="font-display text-lg font-bold text-ink hover:text-accent cursor-pointer transition-colors"
                                >
                                  {title}
                                </h4>

                                <div className="space-y-1">
                                  <p
                                    className={`text-xs sm:text-sm text-ink-2 leading-relaxed whitespace-pre-line ${
                                      expandedDescIds[ev.id] ? '' : 'line-clamp-2'
                                    }`}
                                  >
                                    {desc}
                                  </p>
                                  {desc && desc.length > 90 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleDescExpanded(ev.id)}
                                      className="text-[11px] font-bold text-accent hover:underline inline-flex items-center gap-1"
                                    >
                                      <span>
                                        {expandedDescIds[ev.id]
                                          ? (isHe ? 'הסתר פירוט' : 'Show less')
                                          : (isHe ? 'קרא עוד...' : 'Read more...')}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right/End: Quick Actions */}
                            <div className="w-full md:w-auto flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-rule">
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditEvent(ev)}
                                  className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-rule-strong bg-paper hover:bg-paper-2 text-ink hover:text-accent text-xs sm:text-sm font-semibold active:scale-[0.97] transition-all min-h-[44px]"
                                  title={isHe ? 'עריכת אירוע (אדמין)' : 'Edit event'}
                                >
                                  <Edit3 className="w-4 h-4 text-accent shrink-0" />
                                  <span className="hidden sm:inline">{isHe ? 'עריכה' : 'Edit'}</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleShareEvent(ev)}
                                className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-rule-strong bg-paper hover:bg-paper-2 text-accent hover:border-accent/40 text-xs sm:text-sm font-semibold active:scale-[0.97] transition-all min-h-[44px] min-w-[44px]"
                                title={isHe ? 'שיתוף אירוע' : 'Share event'}
                              >
                                <Share2 className="w-4 h-4 shrink-0" />
                                <span className="hidden sm:inline">{isHe ? 'שיתוף' : 'Share'}</span>
                              </button>
                              <a
                                href={gcalLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-rule-strong bg-paper hover:bg-paper-2 text-ink hover:border-ink/30 text-xs sm:text-sm font-semibold active:scale-[0.97] transition-all min-h-[44px]"
                              >
                                <CalendarPlus className="w-4 h-4 text-accent shrink-0" />
                                <span className="hidden lg:inline truncate">{isHe ? 'ליומן גוגל' : '+ Google Cal'}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleOpenVolunteerModal(ev)}
                                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold active:scale-[0.97] transition-all min-h-[44px] ${
                                  eventVols.length > 0
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/20'
                                    : 'border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20'
                                }`}
                                title={isHe ? 'רישום עצמי כהורה מתנדב לאירוע' : 'Sign up as volunteer parent'}
                              >
                                <Heart className="w-4 h-4 shrink-0 text-accent" />
                                <span>
                                  {eventVols.length > 0
                                    ? isHe
                                      ? `מתנדב: ${eventVols[0].name.split(' ')[0]}`
                                      : `Vol: ${eventVols[0].name.split(' ')[0]}`
                                    : isHe
                                    ? 'התנדבות הורה'
                                    : 'Volunteer'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenGateForEvent(ev.id)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs sm:text-sm font-semibold active:scale-[0.97] transition-all min-h-[44px]"
                                title={isHe ? 'שער כניסה וסימון נוכחות (להורה מתנדב)' : 'Volunteer Gate & Check-in'}
                              >
                                <ClipboardCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <span className="hidden sm:inline">{isHe ? 'שער נוכחות' : 'Gate'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRegisterModal(ev)}
                                className="flex-1 min-w-0 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm active:scale-[0.97] transition-all min-h-[44px]"
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
           CARDS VIEW: CLEAN MODERN CARDS (REGISTRATION COUNT + VOLUNTEER PARENT)
           ===================================================================== */
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {youthEvents.map((ev) => {
            const regCount = getEventRegistrationsCount(ev.id);
            const eventVols = getEventVolunteers(ev);
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
                  <div
                    className="relative h-52 sm:h-56 w-full overflow-hidden bg-paper-2 cursor-pointer"
                    onClick={() => handleOpenRegisterModal(ev)}
                  >
                    <img
                      src={ev.imageUrl}
                      alt={title}
                      loading="lazy"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
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

                    {/* Volunteer badge on image bottom-left if assigned */}
                    {eventVols.length > 0 && (
                      <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-bold bg-emerald-900/85 text-emerald-100 backdrop-blur-xs border border-emerald-400/30 shadow-sm inline-flex items-center gap-1.5 max-w-[70%] truncate">
                        <Heart className="w-3 h-3 text-emerald-300 shrink-0" />
                        <span className="truncate">
                          {isHe ? 'מתנדב/ת:' : 'Volunteer:'} {eventVols.map((v) => v.name).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Price Badge on Image bottom right */}
                    {ev.priceAmount && ev.priceAmount > 0 && (
                      <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full text-xs font-bold bg-black/75 text-amber-300 backdrop-blur-xs border border-amber-400/30 shadow-sm">
                        ₹{ev.priceAmount.toLocaleString()} {isHe ? 'לחודש' : '/ month'}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    <h3
                      onClick={() => handleOpenRegisterModal(ev)}
                      className="font-display text-xl font-bold text-ink leading-snug hover:text-accent cursor-pointer transition-colors"
                    >
                      {title}
                    </h3>

                    {/* Expandable description with whitespace-pre-line */}
                    <div className="space-y-1">
                      <p
                        className={`text-sm text-ink-2 leading-relaxed whitespace-pre-line ${
                          expandedDescIds[ev.id] ? '' : 'line-clamp-3'
                        }`}
                      >
                        {desc}
                      </p>
                      {desc && desc.length > 100 && (
                        <button
                          type="button"
                          onClick={() => toggleDescExpanded(ev.id)}
                          className="text-xs font-bold text-accent hover:underline inline-flex items-center gap-1 pt-1"
                        >
                          <span>
                            {expandedDescIds[ev.id]
                              ? (isHe ? 'הסתר פירוט' : 'Show less')
                              : (isHe ? 'קרא עוד...' : 'Read more...')}
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="pt-2 space-y-1.5 text-xs sm:text-sm text-ink-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-accent shrink-0" />
                        <span className="font-semibold text-ink">{formatEventSchedule(ev)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted">
                        <MapPin className="w-4 h-4 text-accent shrink-0" />
                        <span>{loc}</span>
                      </div>
                    </div>

                    {/* Volunteer Parent Status & Self-Signup Box on Card */}
                    <div
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition-colors ${
                        eventVols.length > 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                          : 'bg-amber-500/10 border-dashed border-amber-500/40 text-amber-950 dark:text-amber-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold uppercase tracking-wide opacity-80 flex items-center gap-1">
                          <Heart className="w-3 h-3 text-accent shrink-0" />
                          <span>
                            {eventVols.length > 0
                              ? isHe
                                ? 'הורה מתנדב/ת באירוע:'
                                : 'Volunteer Parent on Duty:'
                              : isHe
                              ? 'תורנות הורה מתנדב:'
                              : 'Volunteer Parent Shift:'}
                          </span>
                        </div>
                        {eventVols.length > 0 ? (
                          <div className="text-xs sm:text-sm font-bold text-ink truncate mt-0.5">
                            {eventVols.map((v) => v.name).join(' · ')}
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-muted mt-0.5">
                            {isHe ? 'עדיין לא שובץ הורה מתנדב' : 'No volunteer parent assigned yet'}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenVolunteerModal(ev)}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-[0.97] ${
                          eventVols.length > 0
                            ? 'bg-paper hover:bg-paper-2 text-ink border border-rule shadow-2xs'
                            : 'bg-ink text-paper hover:opacity-90 shadow-xs'
                        }`}
                      >
                        {eventVols.length > 0
                          ? isHe
                            ? '+ הצטרפות / עדכון'
                            : '+ Join / Edit'
                          : isHe
                          ? 'אני רוצה להתנדב 🙋'
                          : 'Volunteer 🙋'}
                      </button>
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
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleStartEditEvent(ev)}
                        className="shrink-0 p-2.5 rounded-xl border border-rule-strong bg-paper hover:bg-paper-2 text-ink hover:text-accent active:scale-[0.97] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title={isHe ? 'עריכת אירוע (אדמין)' : 'Edit event'}
                      >
                        <Edit3 className="w-4 h-4 text-accent shrink-0" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleShareEvent(ev)}
                      className="shrink-0 p-2.5 rounded-xl border border-rule-strong bg-paper hover:bg-paper-2 text-accent hover:border-accent/40 active:scale-[0.97] transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title={isHe ? 'שיתוף אירוע' : 'Share event'}
                    >
                      <Share2 className="w-4 h-4 shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenGateForEvent(ev.id)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 text-xs sm:text-sm font-semibold active:scale-[0.97] transition-all min-h-[44px]"
                      title={isHe ? 'שער כניסה וסימון נוכחות (להורה מתנדב)' : 'Volunteer Gate & Check-in'}
                    >
                      <ClipboardCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{isHe ? 'שער נוכחות' : 'Gate'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRegisterModal(ev)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs sm:text-sm font-semibold shadow-xs hover:shadow-sm active:scale-[0.97] transition-all min-h-[44px]"
                    >
                      <UserCheck className="w-4 h-4 shrink-0" />
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

              {/* Dedicated Youth Center Google Sheet Button */}
              {ycSpreadsheetUrl.trim() ? (
                <a
                  href={ycSpreadsheetUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-[0.98]"
                  title={isHe ? 'פתיחת גיליון Google Sheets הייעודי של המתנ״ס (באנגלית)' : 'Open Dedicated Youth Center Google Sheet'}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{isHe ? 'פתיחת Google Sheets למתנ״ס' : 'Open Youth Center Sheet'}</span>
                  <ExternalLink className="w-3 h-3 text-emerald-700 opacity-70 shrink-0" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSheetSettings(true)}
                  className="px-3.5 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-[0.98]"
                  title={isHe ? 'חיבור מסמך Google Sheets ייעודי רק למתנ״ס' : 'Connect Dedicated Youth Center Google Sheet'}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{isHe ? 'חיבור גיליון ייעודי למתנ״ס' : 'Connect Youth Center Sheet'}</span>
                  <Plus className="w-3 h-3 text-emerald-700 opacity-70 shrink-0" />
                </button>
              )}

              <button
                type="button"
                onClick={() => exportRegistrationsToCsv(filterEventId)}
                className="hallmark-btn-secondary text-xs !py-2 !px-3.5"
              >
                <Download className="w-4 h-4 text-accent" />
                <span>{isHe ? 'ייצוא גיליון (CSV)' : 'Export CSV'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSheetSettings(!showSheetSettings)}
                className="px-3.5 py-2 rounded-full bg-paper-2 hover:bg-paper-3 text-xs font-semibold text-ink transition-colors inline-flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-ink-2" />
                <span>{isHe ? 'הגדרות גיליון ו-Webhook' : 'Sheet & Webhook'}</span>
              </button>
            </div>
          </div>

          {showSheetSettings && (
            <div className="p-5 rounded-2xl bg-paper-2 border border-rule space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-rule pb-2.5">
                <div className="font-bold text-ink text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isHe
                      ? 'ניהול מסמך Google Sheets ייעודי רק למתנ״ס (נפרד מ-Log האתר)'
                      : 'Dedicated Youth Center Google Sheet (Separate from Site Log)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSheetSettings(false)}
                  className="p-1 rounded-lg hover:bg-paper-3 text-muted hover:text-ink transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Dedicated Youth Center Spreadsheet URL */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="font-bold text-ink block">
                    {isHe
                      ? '1. קישור למסמך ה-Google Sheets הייעודי של המתנ״ס (באנגלית):'
                      : '1. Dedicated Youth Center Google Sheet URL (English):'}
                  </label>
                  {ycSpreadsheetUrl.trim() && (
                    <a
                      href={ycSpreadsheetUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {isHe ? 'פתיחת המסמך המחובר' : 'Open Connected Sheet'}
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={ycSpreadsheetUrl}
                  onChange={(e) => setYcSpreadsheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  className="w-full rounded-xl border border-rule-strong bg-plate px-3.5 py-2 text-xs hallmark-code text-ink"
                  dir="ltr"
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isHe ? 'יצירת מסמך חדש ב-Google Sheets (בלחיצה אחת)' : 'Create New Sheet (sheets.new)'}</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>

                  <button
                    type="button"
                    onClick={downloadYouthCenterCsvTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-paper border border-rule-strong hover:bg-paper-3 font-semibold text-ink text-[11px] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-accent" />
                    <span>{isHe ? 'הורדת תבנית עמודות באנגלית (CSV Template)' : 'Download English Columns Template'}</span>
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-paper border border-rule text-muted space-y-1 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {isHe
                        ? 'מסמך ה-Log של האתר (ספקים, פניות ולידים) נשמר בנפרד:'
                        : 'Site Log Document (Referrals & CRM) remains strictly separate:'}
                    </span>
                    <a
                      href="https://docs.google.com/spreadsheets/d/1Wy_m63Rrsux7XIpn_gpVPQufGWvbYKOu0YAPZzuLW6k/edit"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-accent hover:underline shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{isHe ? 'פתיחת Log האתר (1Wy_m63...)' : 'Open Site Log Sheet'}</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* 2. Webhook for Real-time Auto Sync */}
              <div className="space-y-1.5 pt-2 border-t border-rule">
                <label className="font-bold text-ink block">
                  {isHe
                    ? '2. כתובת Webhook לסנכרון אוטומטי (Google Apps Script):'
                    : '2. Dedicated Webhook URL for Real-Time Sync (Google Apps Script):'}
                </label>
                <input
                  type="url"
                  value={ycSheetWebhookUrl}
                  onChange={(e) => setYcSheetWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full rounded-xl border border-rule-strong bg-plate px-3.5 py-2 text-xs hallmark-code text-ink"
                  dir="ltr"
                />
                <p className="text-muted leading-relaxed text-[11px]">
                  {isHe
                    ? 'קוד ה-Apps Script המעודכן מזהה הרשמות מתנ״ס ויוצר/מעדכן אוטומטית מסמך חדש ונפרד בשם "LUZ Goa — Youth Center Registrations" בדרייב, מבלי לפגוע או לגעת במסמך ה-Log של האתר.'
                    : 'The updated Apps Script backend writes youth center registrations strictly to the dedicated Youth Center sheet and never touches the site log sheet.'}
                </p>
              </div>
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
                      {isHe ? 'נוכחות בשער' : 'Gate Attendance'}
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
                      <td className="py-3 px-4">
                        {reg.attended ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isHe ? 'הגיע/ה' : 'Attended'}</span>
                              {reg.isWalkIn && <span className="text-[10px] text-amber-800 dark:text-amber-300">(Walk-in)</span>}
                            </span>
                            {reg.attendedAt && (
                              <span className="text-[10px] text-muted">
                                {new Date(reg.attendedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                {reg.checkedInBy && ` (${reg.checkedInBy})`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-paper-2 text-muted border border-rule">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{isHe ? 'טרם הגיע/ה' : 'Expected'}</span>
                          </span>
                        )}
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
          REGISTRATION MODAL: PROMINENT POSTER / IMAGE + FULL RICH DESCRIPTION
         ===================================================================== */}
      {selectedEventForReg && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedEventForReg(null)}
        >
          <div
            className="hallmark-plate max-w-xl w-full p-5 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-rule pb-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-accent">
                  {isHe ? 'מרכז הנוער גואה · Goa Teens House' : 'Youth Center Goa · Goa Teens House'}
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-ink leading-tight">
                  {isHe ? selectedEventForReg.titleHe : selectedEventForReg.titleEn}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleShareEvent(selectedEventForReg, regSubmitted)}
                  className="p-2 rounded-xl bg-paper-2 text-accent hover:bg-paper-3 transition-colors active:scale-[0.97]"
                  title={isHe ? 'שיתוף אירוע' : 'Share event'}
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEventForReg(null)}
                  className="p-2 rounded-xl bg-paper-2 text-ink hover:bg-paper-3 transition-colors active:scale-[0.97]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Poster / Image Banner (if available) */}
            {selectedEventForReg.imageUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-rule bg-paper-2 shadow-xs group max-h-72 sm:max-h-80 flex items-center justify-center">
                <img
                  src={selectedEventForReg.imageUrl}
                  alt={isHe ? selectedEventForReg.titleHe : selectedEventForReg.titleEn}
                  className="w-full max-h-72 sm:max-h-80 object-contain bg-paper-2 cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
                  onClick={() => setPreviewImageUrl(selectedEventForReg.imageUrl)}
                  title={isHe ? 'לחץ להגדלת התמונה / פוסטר' : 'Click to enlarge image / poster'}
                />
                <button
                  type="button"
                  onClick={() => setPreviewImageUrl(selectedEventForReg.imageUrl)}
                  className="absolute bottom-2.5 left-2.5 px-3 py-1.5 rounded-xl bg-black/65 hover:bg-black/85 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs transition-colors shadow-sm"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{isHe ? 'הגדלת פוסטר' : 'View Full Poster'}</span>
                </button>
              </div>
            )}

            {/* Quick Metadata Badges Strip */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-2 text-ink font-semibold border border-rule">
                <Clock className="w-3.5 h-3.5 text-accent" />
                <span>{formatEventSchedule(selectedEventForReg)}</span>
              </span>
              {selectedEventForReg.priceAmount && selectedEventForReg.priceAmount > 0 ? (
                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-300 font-bold border border-amber-500/30">
                  ₹{selectedEventForReg.priceAmount.toLocaleString()} {isHe ? 'לחודש (תקופת ניסיון)' : '/ month (trial)'}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30">
                  {isHe ? 'השתתפות חינם' : 'Free Entry'}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-paper-2 text-muted font-medium border border-rule">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                <span>
                  {isHe ? selectedEventForReg.locationDetailsHe : selectedEventForReg.locationDetailsEn}
                </span>
              </span>
            </div>

            {/* Full Rich Description Box */}
            {(selectedEventForReg.descriptionHe || selectedEventForReg.descriptionEn) && (
              <div className="p-4 rounded-2xl bg-paper-2/70 border border-rule space-y-1.5 text-start">
                <div className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isHe ? 'תיאור ופרטי הפעילות' : 'Event Details & Overview'}</span>
                </div>
                <div className="text-xs sm:text-sm text-ink-2 leading-relaxed whitespace-pre-line max-h-56 overflow-y-auto pr-1">
                  {isHe ? selectedEventForReg.descriptionHe : selectedEventForReg.descriptionEn}
                </div>
              </div>
            )}

            {/* Volunteer Parent Status & Quick Switch to Volunteer Signup */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Heart className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  {getEventVolunteers(selectedEventForReg).length > 0 ? (
                    <span className="text-ink font-semibold">
                      {isHe ? 'הורה מתנדב/ת במפגש:' : 'Volunteer Parent:'}{' '}
                      <strong className="text-emerald-800 dark:text-emerald-300">
                        {getEventVolunteers(selectedEventForReg)
                          .map((v) => v.name)
                          .join(', ')}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-ink font-medium">
                      {isHe
                        ? 'רוצה לעזור כהורה מתנדב/ת במפגש הזה?'
                        : 'Want to help as a volunteer parent at this session?'}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const target = selectedEventForReg;
                  setSelectedEventForReg(null);
                  handleOpenVolunteerModal(target);
                }}
                className="px-3 py-1.5 rounded-xl bg-paper hover:bg-paper-2 border border-rule text-xs font-bold text-accent transition-all active:scale-[0.97]"
              >
                {getEventVolunteers(selectedEventForReg).length > 0
                  ? isHe
                    ? '+ הצטרפות / עדכון מתנדב'
                    : '+ Join / Edit Volunteer'
                  : isHe
                  ? '🙋 הרשמה כהורה מתנדב'
                  : '🙋 Sign up as Volunteer'}
              </button>
            </div>

            {regSubmitted ? (
              <div className="py-6 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-display text-2xl font-bold text-ink">
                    {isHe ? 'ההרשמה לאירוע נקלטה בהצלחה!' : 'Registered Successfully!'}
                  </h4>
                  <div className="p-3.5 rounded-2xl bg-paper-2 border border-rule text-sm text-ink-2 max-w-sm mx-auto">
                    <p className="font-semibold text-ink">
                      {participantName}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {isHe
                        ? 'נוספ/ה לספירת הנרשמים במפגש, והפרטים סונכרנו לגיליון מרכז הנוער.'
                        : 'Added to session count and synced to Youth Center Google Sheet.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => handleShareEvent(selectedEventForReg, true)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-accent hover:bg-accent/90 text-white font-semibold text-sm shadow-md hover:shadow-lg active:scale-[0.97] transition-all min-h-[48px]"
                  >
                    <Share2 className="w-4 h-4 shrink-0" />
                    <span>{isHe ? 'שיתוף המפגש עם חברים' : 'Share Session with Friends'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedEventForReg(null);
                      setParticipantName('');
                      setNotes('');
                    }}
                    className="sm:flex-initial inline-flex items-center justify-center px-6 py-3.5 rounded-2xl border border-rule-strong bg-paper hover:bg-paper-2 text-ink font-semibold text-sm active:scale-[0.97] transition-all min-h-[48px]"
                  >
                    <span>{isHe ? 'סיום' : 'Done'}</span>
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
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-accent hover:bg-accent/90 text-white font-semibold text-sm shadow-md hover:shadow-lg active:scale-[0.97] disabled:opacity-50 transition-all min-h-[48px]"
                >
                  <UserCheck className="w-4 h-4 shrink-0" />
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
          MODAL 2: ADD NEW YOUTH CENTER EVENT (ADMIN ONLY) - WITH IMAGE & DESCRIPTION
         ===================================================================== */}
      {isAdmin && showAddEventModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowAddEventModal(false)}
        >
          <div
            className="hallmark-plate max-w-xl w-full p-5 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-accent">
                  {isHe ? 'ניהול מרכז הנוער · אדמין' : 'Youth Center Admin'}
                </span>
                <h3 className="font-display text-xl font-bold text-ink">
                  {isHe ? 'הוספת אירוע חדש למרכז הנוער' : 'Add New Youth Center Event'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="p-1.5 rounded-full bg-paper-2 text-ink hover:bg-paper-3 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateYouthEvent} className="space-y-4">
              {/* Event Title He / En */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'שם האירוע בעברית *' : 'Event Title (Hebrew) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitleHe}
                    onChange={(e) => setNewTitleHe(e.target.value)}
                    placeholder={isHe ? 'לדוגמה: טורניר פינג פונג' : 'Event Title He'}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'שם האירוע באנגלית (אופציונלי)' : 'Event Title (English)'}
                  </label>
                  <input
                    type="text"
                    value={newTitleEn}
                    onChange={(e) => setNewTitleEn(e.target.value)}
                    placeholder="e.g. Ping Pong Tournament"
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              {/* Event Image Upload / URL */}
              <div className="p-3.5 rounded-2xl bg-paper-2 border border-rule space-y-3">
                <label className="block text-xs font-semibold text-ink">
                  {isHe ? 'תמונה / פוסטר לאירוע' : 'Event Poster / Image'}
                </label>

                {newImageUrl ? (
                  <div className="relative w-full max-h-48 rounded-xl overflow-hidden border border-rule bg-paper flex items-center justify-center">
                    <img
                      src={newImageUrl}
                      alt="Event Preview"
                      className="max-h-48 w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('')}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs transition-colors"
                      title={isHe ? 'הסר תמונה' : 'Remove Image'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-semibold shadow-xs active:scale-[0.97] transition-all">
                      <Upload className="w-4 h-4" />
                      <span>{isHe ? 'העלאת תמונה מהמכשיר' : 'Upload from Device'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProcessImageFile(file, (url) => setNewImageUrl(url));
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder={isHe ? 'או הדבק כתובת URL לתמונה...' : 'Or paste Image URL...'}
                      className="flex-1 rounded-xl border border-rule bg-paper px-3 py-2 text-xs text-ink"
                    />
                  </div>
                )}
                <p className="text-[11px] text-muted">
                  {isHe
                    ? 'ניתן להעלות תמונה או פוסטר ישירות מהטלפון או המחשב (התמונה תותאם אוטומטית).'
                    : 'Upload any flyer or image directly from your phone/desktop.'}
                </p>
              </div>

              {/* Event Description He / En */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  {isHe ? 'תיאור מפורט של הפעילות (עברית) *' : 'Detailed Description (Hebrew) *'}
                </label>
                <textarea
                  rows={4}
                  required
                  value={newDescHe}
                  onChange={(e) => setNewDescHe(e.target.value)}
                  placeholder={isHe ? 'מה עושים במפגש, למי מתאים, ציוד, וכו׳...' : 'Detailed description...'}
                  className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm text-ink leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  {isHe ? 'תיאור באנגלית (אופציונלי)' : 'Description (English, optional)'}
                </label>
                <textarea
                  rows={3}
                  value={newDescEn}
                  onChange={(e) => setNewDescEn(e.target.value)}
                  placeholder="Event details in English..."
                  className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm text-ink leading-relaxed"
                />
              </div>

              {/* Schedule: Day of Week, Start Time, End Time */}
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

              {/* Date & Price */}
              <div className="grid sm:grid-cols-3 gap-3">
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
                    {isHe ? 'עלות (0 = חינם)' : 'Price (0 = Free)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={newPriceAmount}
                    onChange={(e) => setNewPriceAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'מטבע' : 'Currency'}
                  </label>
                  <select
                    value={newPriceCurrency}
                    onChange={(e) => setNewPriceCurrency(e.target.value as any)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  >
                    <option value="FREE">{isHe ? 'חינם (FREE)' : 'Free'}</option>
                    <option value="INR">רופי הודי (INR ₹)</option>
                    <option value="ILS">שקלים (ILS ₪)</option>
                  </select>
                </div>
              </div>

              {/* Host Contact */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'שם המארח / מוביל הפעילות' : 'Host / Instructor Name'}
                  </label>
                  <input
                    type="text"
                    value={newHostName}
                    onChange={(e) => setNewHostName(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'טלפון איש קשר (וואטסאפ)' : 'Contact Phone'}
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

      {/* =====================================================================
          MODAL 3: EDIT EXISTING YOUTH CENTER EVENT (ADMIN ONLY)
         ===================================================================== */}
      {isAdmin && editingEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setEditingEvent(null)}
        >
          <div
            className="hallmark-plate max-w-xl w-full p-5 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-accent">
                  {isHe ? 'עריכת אירוע במרכז הנוער · אדמין' : 'Edit Youth Center Event · Admin'}
                </span>
                <h3 className="font-display text-xl font-bold text-ink">
                  {isHe ? editTitleHe || 'עריכת אירוע' : editTitleEn || 'Edit Event'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="p-1.5 rounded-full bg-paper-2 text-ink hover:bg-paper-3 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedEvent} className="space-y-4">
              {/* Event Title He / En */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'שם האירוע בעברית *' : 'Event Title (Hebrew) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitleHe}
                    onChange={(e) => setEditTitleHe(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'שם האירוע באנגלית' : 'Event Title (English)'}
                  </label>
                  <input
                    type="text"
                    value={editTitleEn}
                    onChange={(e) => setEditTitleEn(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              {/* Event Image Upload / URL */}
              <div className="p-3.5 rounded-2xl bg-paper-2 border border-rule space-y-3">
                <label className="block text-xs font-semibold text-ink">
                  {isHe ? 'תמונה / פוסטר לאירוע' : 'Event Poster / Image'}
                </label>

                {editImageUrl ? (
                  <div className="relative w-full max-h-52 rounded-xl overflow-hidden border border-rule bg-paper flex items-center justify-center">
                    <img
                      src={editImageUrl}
                      alt="Event Preview"
                      className="max-h-52 w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setEditImageUrl('')}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs transition-colors"
                      title={isHe ? 'הסר תמונה' : 'Remove Image'}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                    <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs font-semibold shadow-xs active:scale-[0.97] transition-all">
                      <Upload className="w-4 h-4" />
                      <span>{isHe ? 'העלאת תמונה חדשה מהמכשיר' : 'Upload New from Device'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProcessImageFile(file, (url) => setEditImageUrl(url));
                        }}
                      />
                    </label>
                    <input
                      type="url"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder={isHe ? 'או הדבק קישור לתמונה...' : 'Or paste Image URL...'}
                      className="flex-1 rounded-xl border border-rule bg-paper px-3 py-2 text-xs text-ink"
                    />
                  </div>
                )}
                {editImageUrl && (
                  <div className="flex justify-start">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isHe ? 'החלף תמונה מהמכשיר' : 'Replace Image from Device'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProcessImageFile(file, (url) => setEditImageUrl(url));
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Event Description He / En */}
              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  {isHe ? 'תיאור מפורט של הפעילות (עברית) *' : 'Detailed Description (Hebrew) *'}
                </label>
                <textarea
                  rows={5}
                  required
                  value={editDescHe}
                  onChange={(e) => setEditDescHe(e.target.value)}
                  className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm text-ink leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1">
                  {isHe ? 'תיאור באנגלית (אופציונלי)' : 'Description (English)'}
                </label>
                <textarea
                  rows={4}
                  value={editDescEn}
                  onChange={(e) => setEditDescEn(e.target.value)}
                  className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm text-ink leading-relaxed"
                />
              </div>

              {/* Schedule: Day of Week, Start Time, End Time */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'יום בשבוע' : 'Day of Week'}
                  </label>
                  <select
                    value={editDayOfWeek}
                    onChange={(e) => setEditDayOfWeek(Number(e.target.value))}
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
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'שעת סיום' : 'End Time'}
                  </label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              {/* Date & Price */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'תאריך ספציפי (אופציונלי)' : 'Specific Date (Optional)'}
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'עלות (0 = חינם)' : 'Price (0 = Free)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editPriceAmount}
                    onChange={(e) => setEditPriceAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'מטבע' : 'Currency'}
                  </label>
                  <select
                    value={editPriceCurrency}
                    onChange={(e) => setEditPriceCurrency(e.target.value as any)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  >
                    <option value="FREE">{isHe ? 'חינם (FREE)' : 'Free'}</option>
                    <option value="INR">רופי הודי (INR ₹)</option>
                    <option value="ILS">שקלים (ILS ₪)</option>
                  </select>
                </div>
              </div>

              {/* Host Contact */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'שם המארח / מוביל הפעילות' : 'Host / Instructor'}
                  </label>
                  <input
                    type="text"
                    value={editHostName}
                    onChange={(e) => setEditHostName(e.target.value)}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">
                    {isHe ? 'טלפון איש קשר (וואטסאפ)' : 'Contact Phone'}
                  </label>
                  <input
                    type="tel"
                    value={editHostPhone}
                    onChange={(e) => setEditHostPhone(e.target.value)}
                    dir="ltr"
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3 py-2 text-sm text-ink"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" className="flex-1 hallmark-btn-primary py-3 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isHe ? 'שמירת שינויים באירוע' : 'Save Changes'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-5 py-3 rounded-2xl border border-rule-strong bg-paper hover:bg-paper-2 text-ink text-sm font-semibold transition-colors"
                >
                  {isHe ? 'ביטול' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          LIGHTBOX: FULLSCREEN IMAGE / POSTER PREVIEW MODAL
         ===================================================================== */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-2xl max-h-[92vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title={isHe ? 'סגירה' : 'Close'}
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImageUrl}
              alt="Poster Preview"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
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

      {/* =====================================================================
          GATE: ADD WALK-IN ATTENDEE MODAL (Rapid 5-second Door Registration)
         ===================================================================== */}
      {showWalkInModal && activeGateEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setShowWalkInModal(false)}
        >
          <div
            className="hallmark-plate max-w-lg w-full p-5 sm:p-7 space-y-5 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-rule pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent">
                  {isHe ? 'שער כניסה ונוכחות' : 'Gate Check-In'}
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-ink">
                  {isHe ? 'הוספת משתתף שהגיע ללא הרשמה (Walk-in)' : 'Add Unregistered Walk-in Attendee'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {isHe ? activeGateEvent.titleHe : activeGateEvent.titleEn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="p-1.5 rounded-xl hover:bg-paper-2 text-muted hover:text-ink transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWalkIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  {isHe ? 'שם המשתתף/ת (ילד/ה) *' : 'Participant Name *'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={walkInChildName}
                  onChange={(e) => setWalkInChildName(e.target.value)}
                  placeholder={isHe ? 'לדוגמה: איתי כהן' : 'e.g. Itai Cohen'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-paper border border-rule font-medium text-ink text-sm focus:outline-none focus:border-accent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    {isHe ? 'שם ההורה' : 'Parent Name'}
                  </label>
                  <input
                    type="text"
                    value={walkInParentName}
                    onChange={(e) => setWalkInParentName(e.target.value)}
                    placeholder={isHe ? 'לדוגמה: שרה' : 'e.g. Sarah'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-paper border border-rule font-medium text-ink text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">
                    {isHe ? 'טלפון וואטסאפ של ההורה' : 'Parent WhatsApp Phone'}
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={walkInParentPhone}
                    onChange={(e) => setWalkInParentPhone(e.target.value)}
                    placeholder="+972-50-000-0000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-paper border border-rule font-mono text-ink text-sm focus:outline-none focus:border-accent text-start"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {isHe ? 'מעמד מנוי' : 'Subscription Status'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalkInIsSubscriber(true)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      walkInIsSubscriber
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-xs'
                        : 'bg-paper border-rule text-ink-2 hover:bg-paper-2'
                    }`}
                  >
                    {isHe ? '✓ מנוי חודשי' : '✓ Monthly Subscriber'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInIsSubscriber(false)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      !walkInIsSubscriber
                        ? 'bg-accent/15 border-accent text-ink shadow-xs'
                        : 'bg-paper border-rule text-ink-2 hover:bg-paper-2'
                    }`}
                  >
                    {isHe ? 'אורח (תשלום חד-פעמי)' : 'Guest (Single entry)'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted mb-1">
                  {isHe ? 'הערות (למשל: שולם 100 רופי במזומן)' : 'Notes (e.g. Paid cash 100 INR)'}
                </label>
                <input
                  type="text"
                  value={walkInNotes}
                  onChange={(e) => setWalkInNotes(e.target.value)}
                  placeholder={isHe ? 'הערות נוספות...' : 'Additional notes...'}
                  className="w-full px-3.5 py-2 rounded-xl bg-paper border border-rule text-xs sm:text-sm text-ink focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-rule">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-rule text-xs sm:text-sm font-semibold text-muted hover:text-ink transition-colors"
                >
                  {isHe ? 'ביטול' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={walkInSaving || !walkInChildName.trim()}
                  className="hallmark-btn-primary text-xs sm:text-sm !py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isHe ? 'הוסף וסמן כנוכח/ת מיד ✅' : 'Add & Check In Immediately ✅'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          VOLUNTEER PARENT SIGNUP MODAL (Visible on Calendar & Cards)
         ===================================================================== */}
      {selectedEventForVolunteer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedEventForVolunteer(null)}
        >
          <div
            className="hallmark-plate max-w-lg w-full p-5 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-rule pb-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <Heart className="w-3.5 h-3.5" />
                  <span>{isHe ? 'התנדבות הורים · מרכז הנוער גואה' : 'Parent Volunteering · Youth Center'}</span>
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-ink leading-tight">
                  {isHe ? selectedEventForVolunteer.titleHe : selectedEventForVolunteer.titleEn}
                </h3>
                <p className="text-xs text-muted flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  <span>{formatEventSchedule(selectedEventForVolunteer)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventForVolunteer(null)}
                className="p-2 rounded-xl bg-paper-2 text-ink hover:bg-paper-3 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Volunteers List for this Event */}
            {getEventVolunteers(selectedEventForVolunteer).length > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {isHe
                      ? 'הורים מתנדבים הרשומים כעת למפגש זה:'
                      : 'Volunteer parents currently signed up for this session:'}
                  </span>
                </div>
                <div className="space-y-2">
                  {getEventVolunteers(selectedEventForVolunteer).map((vol) => (
                    <div
                      key={vol.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-paper border border-rule text-xs sm:text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-ink flex items-center gap-2 flex-wrap">
                          <span>🤝 {vol.name}</span>
                          {vol.role && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-paper-2 text-ink-2 border border-rule">
                              {vol.role}
                            </span>
                          )}
                        </div>
                        {isAdmin && vol.phone && vol.phone !== '—' && (
                          <div className="text-[11px] text-muted font-mono mt-0.5" dir="ltr">
                            {vol.phone}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVolunteer(selectedEventForVolunteer, vol.id)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                        title={isHe ? 'ביטול שיבוץ מתנדב' : 'Remove volunteer'}
                      >
                        {isHe ? 'ביטול שיבוץ' : 'Remove'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {volSubmitted ? (
              <div className="py-5 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                  <Heart className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="font-display text-2xl font-bold text-ink">
                    {isHe ? 'תודה רבה! שובצת כהורה מתנדב/ת 🌿' : 'Thank You! You are signed up 🌿'}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted max-w-sm mx-auto leading-relaxed">
                    {isHe
                      ? 'השם שלך מופיע כעת בלוח השנה ובכרטיסיית האירוע כהורה מתנדב. ביום האירוע תוכל/י להיכנס ל״שער נוכחות״ עם הסיסמה Matnas2026 ולסמן מי הגיע.'
                      : 'Your name is now displayed on the calendar and event card. On the day of the event, open the Volunteer Gate with passcode Matnas2026.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = selectedEventForVolunteer.id;
                      setSelectedEventForVolunteer(null);
                      handleOpenGateForEvent(targetId);
                    }}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>{isHe ? 'מעבר לשער הנוכחות של האירוע' : 'Open Event Gate'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEventForVolunteer(null)}
                    className="px-6 py-3 rounded-2xl border border-rule-strong bg-paper hover:bg-paper-2 text-ink font-semibold text-xs sm:text-sm transition-all"
                  >
                    {isHe ? 'סגירה' : 'Done'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitVolunteerSignup} className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-paper-2 border border-rule text-xs text-ink-2 leading-relaxed">
                  {isHe
                    ? 'מרכז הנוער פועל בזכות מעורבות ההורים בקהילה. רישום כהורה מתנדב מציג את שמך בלוח הפעילויות ובכרטיס האירוע כדי שכולם ידעו שיש הורה תורן במפגש.'
                    : 'The Youth Center thrives thanks to community parents. Signing up displays your name on the schedule and event card so everyone knows a volunteer parent is on duty.'}
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {isHe ? 'שם ההורה המתנדב/ת (יוצג בלוח ובכרטיס האירוע) *' : 'Volunteer Parent Name (Shown on Calendar & Card) *'}
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={volParentName}
                    onChange={(e) => setVolParentName(e.target.value)}
                    placeholder={isHe ? 'לדוגמה: יעל כהן' : 'e.g. Yael Cohen'}
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm font-medium text-ink focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    {isHe ? 'טלפון וואטסאפ (לתיאום בלבד — לא מוצג באתר) *' : 'WhatsApp Phone (For coordination only — kept private) *'}
                  </label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={volParentPhone}
                    onChange={(e) => setVolParentPhone(e.target.value)}
                    placeholder="+972-52-..."
                    className="w-full rounded-xl border border-rule-strong bg-paper px-3.5 py-2.5 text-sm font-mono text-ink focus:outline-none focus:border-accent text-start"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    {isHe ? 'תפקיד במשמרת:' : 'Shift Role:'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      isHe ? 'הורה תורן בשער ונוכחות' : 'Gate & Check-in Parent',
                      isHe ? 'ליווי ועזרה בפעילות' : 'Activity Helper',
                      isHe ? 'עזרה בלוגיסטיקה וכיבוד' : 'Logistics & Refreshments',
                    ].map((roleOption) => (
                      <button
                        key={roleOption}
                        type="button"
                        onClick={() => setVolRole(roleOption)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          volRole === roleOption
                            ? 'bg-ink text-paper border-ink shadow-xs'
                            : 'bg-paper text-ink-2 border-rule hover:bg-paper-2'
                        }`}
                      >
                        {roleOption}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={volSyncing || !volParentName.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-accent hover:bg-accent/90 text-white font-bold text-sm shadow-md active:scale-[0.97] disabled:opacity-50 transition-all"
                  >
                    <Heart className="w-4 h-4 shrink-0" />
                    <span>
                      {volSyncing
                        ? isHe
                          ? 'שומר שיבוץ...'
                          : 'Saving...'
                        : isHe
                        ? 'אישור רישום כהורה מתנדב/ת'
                        : 'Confirm Volunteer Signup'}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: MORNING REMINDER BOT (09:30 IST) PREVIEW & SAFE SAMPLE SENDER
         ===================================================================== */}
      {reminderPreviewEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={() => setReminderPreviewEvent(null)}
        >
          <div
            className="hallmark-plate max-w-xl w-full p-5 sm:p-7 space-y-5 my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-rule pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>
                    {isHe
                      ? 'בוט תזכורות בוקר למרכז הנוער · 09:30 שעון הודו'
                      : 'Youth Center Morning Reminder Bot · 09:30 IST'}
                  </span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-ink leading-tight">
                  {isHe
                    ? 'תצוגת הודעת תזכורת ושליחה לדוגמא'
                    : 'Morning Reminder Preview & Sample Dispatch'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReminderPreviewEvent(null)}
                className="p-2 rounded-xl bg-paper-2 text-ink hover:bg-paper-3 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Strict Safety Lock Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1">
              <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isHe
                    ? `מצב בדיקה בטוח פעיל: קבוצת "${TARGET_GROUP_NAME_FUTURE}" חסומה לשליחה עד לאישורך!`
                    : `Safe Test Mode Active: "${TARGET_GROUP_NAME_FUTURE}" is locked until your approval!`}
                </span>
              </div>
              <p className="text-ink-2 leading-relaxed">
                {isHe
                  ? `כל תזכורת בוקר (09:30 שעון הודו ביום האירוע) או הודעה לדוגמא נשלחת כרגע אך ורק למספר האישי שלך: ${SAFE_TEST_PHONE}. רק לאחר שתאשר שהתהליך תקין נעביר לשליחה בקבוצת "${TARGET_GROUP_NAME_FUTURE}".`
                  : `All reminders and sample messages are strictly routed ONLY to your personal number (${SAFE_TEST_PHONE}) until you approve switching to "${TARGET_GROUP_NAME_FUTURE}".`}
              </p>
            </div>

            {/* Event Selector for Sample Preview */}
            <div>
              <label className="block text-xs font-bold text-muted mb-1">
                {isHe ? 'בחר אירוע של מרכז הנוער לתצוגה ושליחה לדוגמא:' : 'Select Youth Center Event for Sample:'}
              </label>
              <select
                value={reminderPreviewEvent.id}
                onChange={(e) => {
                  const found = youthEvents.find((item) => item.id === e.target.value);
                  if (found) {
                    setReminderPreviewEvent(found);
                    setBotStatusMessage(null);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-paper border border-rule font-bold text-ink text-xs sm:text-sm focus:outline-none focus:border-accent"
              >
                {youthEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {isHe ? ev.titleHe : ev.titleEn} ({formatEventSchedule(ev)})
                  </option>
                ))}
              </select>
            </div>

            {/* WhatsApp Bubble Preview (Image + Formatted Text) */}
            <div className="rounded-2xl border border-emerald-600/30 bg-[#e5ddd5] dark:bg-stone-900 p-3.5 shadow-inner space-y-2">
              <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400 flex items-center justify-between">
                <span>📱 תצוגה מקדימה של ההודעה בוואטסאפ (תמונה + טקסט + קישור):</span>
                <span dir="ltr" className="font-mono">09:30 IST → {SAFE_TEST_PHONE}</span>
              </div>
              <div className="rounded-xl bg-white dark:bg-stone-800 p-2.5 shadow-xs space-y-2.5 border border-black/5">
                {reminderPreviewEvent.imageUrl && (
                  <div className="rounded-lg overflow-hidden max-h-48 bg-stone-100 flex items-center justify-center">
                    <img
                      src={reminderPreviewEvent.imageUrl}
                      alt={reminderPreviewEvent.titleHe}
                      className="w-full max-h-48 object-cover"
                    />
                  </div>
                )}
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-stone-900 dark:text-stone-100 leading-relaxed overflow-x-auto">
                  {buildYouthMorningReminderText(reminderPreviewEvent)}
                </pre>
              </div>
            </div>

            {botStatusMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                {botStatusMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                disabled={sendingBotReminder}
                onClick={() => handleSendSampleReminderTo972508878902(reminderPreviewEvent, 'auto')}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>
                  {sendingBotReminder
                    ? isHe
                      ? 'שולח הודעה לדוגמא...'
                      : 'Sending sample...'
                    : isHe
                    ? `📲 שלח הודעה לדוגמא אלי (${SAFE_TEST_PHONE})`
                    : `📲 Send Sample to ${SAFE_TEST_PHONE}`}
                </span>
              </button>

              <button
                type="button"
                disabled={sendingBotReminder}
                onClick={() => handleSendSampleReminderTo972508878902(reminderPreviewEvent, 'share_with_image')}
                className="inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-rule-strong bg-paper hover:bg-paper-2 text-ink font-semibold text-xs sm:text-sm active:scale-[0.98] transition-all"
                title={isHe ? 'שיתוף התמונה והטקסט ישירות מהנייד לוואטסאפ' : 'Share image + text via mobile sheet'}
              >
                <Share2 className="w-4 h-4 text-accent shrink-0" />
                <span>{isHe ? 'שיתוף עם קובץ התמונה' : 'Share with Image File'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Gate Toast */}
      {gateToast && (
        <div className="fixed bottom-6 inset-x-4 max-w-sm mx-auto z-50 bg-ink text-paper px-4 py-3 rounded-2xl shadow-elevated flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold border border-white/10 text-center animate-reveal">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{gateToast}</span>
        </div>
      )}
    </div>
  );
};
