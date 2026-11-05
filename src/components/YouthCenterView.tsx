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

  const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('calendar');
  const [selectedEventForReg, setSelectedEventForReg] = useState<LuzEntity | null>(null);
  const [filterEventId, setFilterEventId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string | 'all'>('all');

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

  // Combine core Youth Center events with any Youth/Kids events from entities + custom overrides
  const youthEvents = useMemo(() => {
    const customYouthEntities = entities.filter(
      (e) => e.isYouthCenter && e.id !== 'prod-wks-yc-colomb'
    );

    const map = new Map<string, LuzEntity>();
    CORE_YOUTH_CENTER_EVENTS.forEach((ev) => map.set(ev.id, ev));
    customYouthEntities.forEach((ev) => map.set(ev.id, ev));
    Object.values(eventOverrides).forEach((ov) => map.set(ov.id, ov));

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
  }, [entities, eventOverrides]);

  // Deep-linking: auto-open registration modal when an event is targeted via URL
  useEffect(() => {
    if (initialEventId && youthEvents.length > 0) {
      const match = youthEvents.find((e) => e.id === initialEventId);
      if (match) {
        setSelectedEventForReg(match);
        setIsSubscriber(true);
        setRegSubmitted(false);
        onClearInitialEvent?.();
      }
    }
  }, [initialEventId, youthEvents, onClearInitialEvent]);

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

      return [
        istTime,
        r.eventTitleEn || r.eventTitleHe,
        r.eventSchedule,
        r.participantName,
        r.isSubscriber ? 'Yes (Subscriber)' : 'No (Single Entry)',
        r.parentName,
        r.parentPhone,
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

                            {/* Right/End: Quick Actions (Crafted Responsive 3-Button Bar) */}
                            <div className="w-full md:w-auto flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-rule">
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
                                className="flex-1 min-w-0 md:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-rule-strong bg-paper hover:bg-paper-2 text-ink hover:border-ink/30 text-xs sm:text-sm font-semibold active:scale-[0.97] transition-all min-h-[44px]"
                              >
                                <CalendarPlus className="w-4 h-4 text-accent shrink-0" />
                                <span className="truncate">{isHe ? 'ליומן גוגל' : '+ Google Cal'}</span>
                              </a>
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
    </div>
  );
};
