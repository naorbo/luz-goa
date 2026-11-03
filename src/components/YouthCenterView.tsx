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
  ShieldCheck,
} from 'lucide-react';
import {
  YouthCenterFamily,
  LuzEntity,
  BookingRecord,
  Language,
} from '../types/luz';
import { DEFAULT_GLOBAL_WEBHOOK_OR_GAS_URL } from '../config/notifications';
import { buildGoogleCalendarUrl } from '../utils/calendarAndParser';

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

const CORE_YOUTH_CENTER_EVENTS: LuzEntity[] = [
  // 1. Friday 06/11/2026 - פתיחה חגיגית ופעילות ODT
  {
    id: 'yc-2026-11-06-odt-opening',
    type: 'workshop',
    titleHe: 'פתיחה חגיגית ופעילות ODT',
    titleEn: 'Grand Opening & Outdoor ODT Team Challenge',
    descriptionHe:
      'אירוע פתיחה חגיגי של מרכז הנוער גואה! פעילות ODT (Outdoor Training) לגיבוש קבוצתי, אתגרי שטח, כיבוד מפנק והיכרות עם המרחב.',
    descriptionEn:
      'Grand opening celebration of the Goa Youth Center! Outdoor training (ODT) team-building challenges, celebration treats, and space introduction for ages 11–15.',
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
      'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=1000',
    tags: ['פתיחה חגיגית', 'ODT', 'גיבוש', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-06',
    dayOfWeek: 5, // Friday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:00',
    endTime: '19:00',
  },
  // 2. Saturday 07/11/2026 - הקרנת סרט
  {
    id: 'yc-2026-11-07-movie',
    type: 'workshop',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe:
      'ערב סרט קהילתי על מסך ענק עם פופקורן, שתייה ואווירה כיפית לנוער במתחם הבמבוק בקולום.',
    descriptionEn:
      'Big-screen movie screening night with popcorn, cold drinks, and cozy youth hangout atmosphere.',
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
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
    tags: ['הקרנת סרט', 'קולנוע', 'פופקורן', 'שבת'],
    rsvpCount: 0,
    date: '2026-11-07',
    dayOfWeek: 6, // Saturday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '18:00',
    endTime: '20:30',
  },
  // 3. Sunday 08/11/2026 - מרחב פתוח
  {
    id: 'yc-2026-11-08-open-space',
    type: 'workshop',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Hangout',
    descriptionHe:
      'זמן חופשי לבני נוער להיפגש, לבלות, לשחק, להאזין למוזיקה וליצור יחד במרחב הבמבוק הפתוח.',
    descriptionEn:
      'Open youth space to connect, relax, play games, listen to music, and spend time together in Colomb.',
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
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
    tags: ['מרחב פתוח', 'מפגש', 'חברים', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-08',
    dayOfWeek: 0, // Sunday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:30',
  },
  // 4. Monday 09/11/2026 - פעילות ג'אם
  {
    id: 'yc-2026-11-09-jam',
    type: 'workshop',
    titleHe: 'פעילות ג\'אם',
    titleEn: 'Sunset Music Jam Session',
    descriptionHe:
      'ג\'אם מוזיקלי פתוח לנוער: גיטרות, כלי הקשה, שירה ואלתור משותף לקראת השקיעה.',
    descriptionEn:
      'Open sunset music jam: guitars, drums, percussion, vocals, and spontaneous live improvisation.',
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
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000',
    tags: ['ג\'אם', 'מוזיקה', 'שירה', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-09',
    dayOfWeek: 1, // Monday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '17:00',
    endTime: '19:30',
  },
  // 5. Thursday 12/11/2026 - משחקי קופסה
  {
    id: 'yc-2026-11-12-board-games',
    type: 'workshop',
    titleHe: 'משחקי קופסה',
    titleEn: 'Strategy Board Games & Tournaments',
    descriptionHe:
      'אחר צהריים של משחקי אסטרטגיה, קטאן, שחמט, משחקי שולחן וטורנירים מהנים.',
    descriptionEn:
      'Afternoon of board games, Catan, chess, strategy tabletop games, and friendly team competitions.',
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
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=1000',
    tags: ['משחקי קופסה', 'שחמט', 'קטאן', 'אסטרטגיה'],
    rsvpCount: 0,
    date: '2026-11-12',
    dayOfWeek: 4, // Thursday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:00',
  },
  // 6. Saturday 14/11/2026 - הקרנת סרט
  {
    id: 'yc-2026-11-14-movie',
    type: 'workshop',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe:
      'הקרנת סרט מרתק על מסך גדול עם פופקורן ושיחה משותפת אחרי הסרט.',
    descriptionEn:
      'Feature youth film screening on big screen with fresh popcorn and post-film discussion.',
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
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
    tags: ['הקרנת סרט', 'קולנוע', 'פופקורן', 'שבת'],
    rsvpCount: 0,
    date: '2026-11-14',
    dayOfWeek: 6, // Saturday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '18:00',
    endTime: '20:30',
  },
  // 7. Sunday 15/11/2026 - מרחב פתוח
  {
    id: 'yc-2026-11-15-open-space',
    type: 'workshop',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Hangout',
    descriptionHe:
      'מרחב פתוח וחופשי לנוער: מפגש חברים, עבודה על פרויקטים אישיים, משחקים ושיח.',
    descriptionEn:
      'Open community space for teens: social time, personal projects, board games, and chill vibe.',
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
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
    tags: ['מרחב פתוח', 'מפגש', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-15',
    dayOfWeek: 0, // Sunday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:30',
  },
  // 8. Monday 16/11/2026 - הרצאת אורח
  {
    id: 'yc-2026-11-16-guest-talk',
    type: 'workshop',
    titleHe: 'הרצאת אורח',
    titleEn: 'Guest Speaker & Inspiring Stories',
    descriptionHe:
      'הרצאת אורח מעוררת השראה ומפגש בגובה העיניים עם אורח מיוחד מהקהילה על מסעות חיים, יצירה ומדע.',
    descriptionEn:
      'Inspiring guest speaker session and friendly youth discussion on life journeys and creative exploration.',
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
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000',
    tags: ['הרצאת אורח', 'השראה', 'שיח', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-16',
    dayOfWeek: 1, // Monday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '17:00',
    endTime: '18:45',
  },
  // 9. Thursday 19/11/2026 - סדנת אומנות
  {
    id: 'yc-2026-11-19-art',
    type: 'workshop',
    titleHe: 'סדנת אומנות',
    titleEn: 'Youth Art & Creative Studio',
    descriptionHe:
      'סדנת אומנות ויצירה מעשית: ציור, חומרים טבעיים ויצירה מקורית בהנחיית יוצרים מהקהילה.',
    descriptionEn:
      'Hands-on creative art studio: painting, sculpture with natural materials, and self-expression.',
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
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1000',
    tags: ['אומנות', 'יצירה', 'סדנה', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-19',
    dayOfWeek: 4, // Thursday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:00',
  },
  // 10. Saturday 21/11/2026 - הקרנת סרט
  {
    id: 'yc-2026-11-21-movie',
    type: 'workshop',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe:
      'ערב סרט קולנוע ופופקורן לנוער במתחם הבמבוק בקולום.',
    descriptionEn:
      'Cinema movie night and popcorn for youth in the bamboo pavilion.',
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
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
    tags: ['הקרנת סרט', 'קולנוע', 'פופקורן', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-21',
    dayOfWeek: 6, // Saturday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '18:00',
    endTime: '20:30',
  },
  // 11. Sunday 22/11/2026 - מרחב פתוח
  {
    id: 'yc-2026-11-22-open-space',
    type: 'workshop',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Hangout',
    descriptionHe:
      'מרחב פתוח למפגש, שיחה חופשית, משחקי שולחן ומוזיקה.',
    descriptionEn:
      'Open space for hanging out, open conversations, board games, and relaxing with friends.',
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
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
    tags: ['מרחב פתוח', 'מפגש', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-22',
    dayOfWeek: 0, // Sunday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:30',
  },
  // 12. Monday 23/11/2026 - פעילות ג'אם
  {
    id: 'yc-2026-11-23-jam',
    type: 'workshop',
    titleHe: 'פעילות ג\'אם',
    titleEn: 'Acoustic Jam Session',
    descriptionHe:
      'פעילות ג\'אם מוזיקלי פתוח: הביאו כלי נגינה או בואו להקשיב ולהשתתף בשירה ואלתור.',
    descriptionEn:
      'Open youth music jam: bring instruments or join in with vocals, rhythm, and acoustic melodies.',
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
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000',
    tags: ['ג\'אם', 'מוזיקה', 'שירה', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-23',
    dayOfWeek: 1, // Monday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '17:00',
    endTime: '19:30',
  },
  // 13. Thursday 26/11/2026 - משחקי קופסה
  {
    id: 'yc-2026-11-26-board-games',
    type: 'workshop',
    titleHe: 'משחקי קופסה',
    titleEn: 'Strategy Board Games & Challenges',
    descriptionHe:
      'מפגש משחקי קופסה ואסטרטגיה: שחמט, קטאן, משחקי קלפים וטורניר קבוצתי מהנה.',
    descriptionEn:
      'Strategy board games, chess, Catan, card games, and fun team challenges.',
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
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=1000',
    tags: ['משחקי קופסה', 'שחמט', 'אסטרטגיה', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-26',
    dayOfWeek: 4, // Thursday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:00',
  },
  // 14. Saturday 28/11/2026 - הקרנת סרט
  {
    id: 'yc-2026-11-28-movie',
    type: 'workshop',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe:
      'הקרנת סרט סוף שבוע על מסך ענק עם כיבוד ופופקורן חם.',
    descriptionEn:
      'Weekend big screen movie night with warm popcorn and cinema treats.',
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
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
    tags: ['הקרנת סרט', 'קולנוע', 'פופקורן', 'סוף שבוע'],
    rsvpCount: 0,
    date: '2026-11-28',
    dayOfWeek: 6, // Saturday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '18:00',
    endTime: '20:30',
  },
  // 15. Sunday 29/11/2026 - מרחב פתוח
  {
    id: 'yc-2026-11-29-open-space',
    type: 'workshop',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Chill',
    descriptionHe:
      'מרחב פתוח לנוער: זמן חופשי, פינת יצירה, מוזיקה ומפגש חברים.',
    descriptionEn:
      'Open youth space: free time, creative corner, music, and socializing.',
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
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
    tags: ['מרחב פתוח', 'מפגש', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-29',
    dayOfWeek: 0, // Sunday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:30',
  },
  // 16. Monday 30/11/2026 - הרצאת אורח
  {
    id: 'yc-2026-11-30-guest-talk',
    type: 'workshop',
    titleHe: 'הרצאת אורח',
    titleEn: 'Guest Speaker & Youth Dialogue',
    descriptionHe:
      'הרצאת אורח מרתקת בנושאי מדע, יצירתיות וסיפורי חיים מעוררי השראה.',
    descriptionEn:
      'Fascinating guest speaker session touching upon science, creativity, and inspiring life stories.',
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
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000',
    tags: ['הרצאת אורח', 'השראה', 'שיח', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-30',
    dayOfWeek: 1, // Monday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '17:00',
    endTime: '18:45',
  },
];

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
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | 'all'>('all');

  // Event registration form state (Age removed, isSubscriber added)
  const [participantName, setParticipantName] = useState('');
  const [isSubscriber, setIsSubscriber] = useState<boolean>(true);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [regSubmitted, setRegSubmitted] = useState(false);
  const [syncingSheet, setSyncingSheet] = useState(false);

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

  // Chronological calendar by day mapping (matching ExploreView calendar)
  const calendarByDay = useMemo(() => {
    const map: Record<number, LuzEntity[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
    };

    youthEvents.forEach((item) => {
      let days = [1];
      if (item.date) {
        const parts = item.date.split('-');
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          days = [d.getDay()];
        }
      } else if (typeof item.dayOfWeek === 'number') {
        days = [item.dayOfWeek];
      }
      days.forEach((d) => {
        if (map[d]) {
          map[d].push(item);
        }
      });
    });

    Object.keys(map).forEach((k) => {
      const dayIdx = Number(k);
      map[dayIdx].sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.startTime || '16:00').localeCompare(b.startTime || '16:00');
      });
    });

    return map;
  }, [youthEvents]);

  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

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
        <section className="space-y-6" aria-label={isHe ? 'לוח שבועי כרונולוגי' : 'Chronological Youth Calendar'}>
          {/* Day-of-Week Selector Strip (Identical to ExploreView calendar) */}
          <div className="hallmark-plate p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">
                  {isHe ? 'לוח פעילויות שבועי כרונולוגי' : 'Weekly Chronological Activity Schedule'}
                </h2>
                <p className="text-xs sm:text-sm text-muted">
                  {isHe
                    ? 'כל מפגשי מרכז הנוער מסודרים לפי ימים ושעות. לחצו על יום לסינון או על מפגש להרשמה.'
                    : 'All Youth Center sessions ordered chronologically by day and time. Click any session to register.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayIndex('all')}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                  selectedDayIndex === 'all'
                    ? 'bg-ink text-paper'
                    : 'bg-paper-2 text-ink hover:bg-paper-3'
                }`}
              >
                {isHe ? 'הצג את כל ימי השבוע' : 'Show Full Week'}
              </button>
            </div>

            {/* Day Cards Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {orderedDays.map((dayIdx) => {
                const dayEvents = calendarByDay[dayIdx] || [];
                const isSelected = selectedDayIndex === dayIdx;
                return (
                  <button
                    key={dayIdx}
                    type="button"
                    onClick={() =>
                      setSelectedDayIndex(selectedDayIndex === dayIdx ? 'all' : dayIdx)
                    }
                    className={`p-3 rounded-2xl border text-start transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-accent text-white border-accent shadow-sm'
                        : dayEvents.length > 0
                        ? 'bg-paper hover:bg-paper-2 border-rule text-ink'
                        : 'bg-paper/40 border-rule/60 text-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">
                        {isHe ? DAY_NAMES_HE[dayIdx] : DAY_NAMES_EN[dayIdx]}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          isSelected
                            ? 'bg-white/25 text-white'
                            : dayEvents.length > 0
                            ? 'bg-accent/15 text-accent'
                            : 'bg-paper-2 text-muted'
                        }`}
                      >
                        {dayEvents.length}
                      </span>
                    </div>
                    <div
                      className={`text-[11px] mt-2 truncate ${
                        isSelected ? 'text-white/90' : 'text-muted'
                      }`}
                    >
                      {dayEvents.length === 0
                        ? isHe
                          ? 'אין מפגש החודש'
                          : 'No session'
                        : `${dayEvents.length} ${isHe ? 'מפגשים בנובמבר' : 'sessions'} · ${
                            isHe ? dayEvents[0].titleHe : dayEvents[0].titleEn
                          }`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chronological Day-by-Day Timeline */}
          <div className="space-y-6">
            {orderedDays
              .filter((d) => selectedDayIndex === 'all' || selectedDayIndex === d)
              .map((dayIdx) => {
                const dayEvents = calendarByDay[dayIdx] || [];
                if (dayEvents.length === 0 && selectedDayIndex === 'all') return null;

                return (
                  <div key={dayIdx} className="hallmark-plate overflow-hidden">
                    {/* Day Banner */}
                    <div className="px-5 py-3.5 bg-paper-2 border-b border-rule flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-xl bg-ink text-paper font-display font-bold text-sm flex items-center justify-center">
                          {isHe ? DAY_SHORT_HE[dayIdx] : DAY_SHORT_EN[dayIdx]}
                        </span>
                        <h3 className="font-display text-lg font-bold text-ink">
                          {isHe ? DAY_NAMES_HE[dayIdx] : DAY_NAMES_EN[dayIdx]}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-muted">
                        {dayEvents.length} {isHe ? 'מפגשים מתוכננים בנובמבר' : 'sessions in November'}
                      </span>
                    </div>

                    {dayEvents.length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted">
                        {isHe
                          ? 'אין פעילויות משובצות ליום זה.'
                          : 'No youth sessions scheduled for this day.'}
                      </div>
                    ) : (
                      <div className="divide-y divide-rule">
                        {dayEvents.map((ev) => {
                          const regCount = getEventRegistrationsCount(ev.id);
                          const title = isHe ? ev.titleHe : ev.titleEn;
                          const desc = isHe ? ev.descriptionHe : ev.descriptionEn;
                          const loc = isHe ? ev.locationDetailsHe : ev.locationDetailsEn;
                          const gcalLink = buildGoogleCalendarUrl({
                            title: `מרכז הנוער גואה: ${title}`,
                            description: `${desc}\nמיקום: ${loc}`,
                            location: `${loc}, Colomb, South Goa`,
                            startDate: ev.date || new Date().toISOString().slice(0, 10),
                            startTime: ev.startTime || '16:30',
                            endTime: ev.endTime || '19:00',
                          });

                          return (
                            <div
                              key={`${dayIdx}-${ev.id}`}
                              className="p-4 sm:p-5 hover:bg-paper-2/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                              {/* Left/Start: Time Box + Event Details */}
                              <div className="flex items-start gap-4 min-w-0">
                                <div className="w-24 sm:w-28 shrink-0 rounded-2xl bg-paper-2 border border-rule p-2.5 text-center">
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
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2">
                                      <MapPin className="w-3 h-3 text-accent" />
                                      {loc}
                                    </span>
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

                              {/* Right/End: Quick Actions */}
                              <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-rule">
                                <a
                                  href={gcalLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 rounded-full border border-rule-strong bg-plate text-xs font-semibold text-ink hover:bg-paper-2 transition-colors"
                                >
                                  {isHe ? '+ ליומן שלי' : '+ Google Cal'}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRegisterModal(ev)}
                                  className="hallmark-btn-primary text-xs !py-1.5 !px-4"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>{isHe ? 'הרשמה לאירוע' : 'Register'}</span>
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
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted shrink-0" />
                        <span className="truncate">{loc}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="px-5 py-4 bg-paper/60 border-t border-rule flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                    <Users className="w-3.5 h-3.5 text-accent" />
                    <span>{regCount} {isHe ? 'נרשמו' : 'registered'}</span>
                  </div>
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
                    {isHe ? 'ההרשמה לאירוע נקלטה בהצלחה!' : 'Registered Successfully!'}
                  </h4>
                  <p className="text-sm text-ink-2">
                    {isHe
                      ? `${participantName} נוספ/ה לספירת הנרשמים במפגש, והפרטים סונכרנו לגיליון ה-Google Sheets של מרכז הנוער.`
                      : `${participantName} has been registered and synced to the Youth Center Google Sheet.`}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
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
    </div>
  );
};
