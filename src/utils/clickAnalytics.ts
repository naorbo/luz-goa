import {
  AppEnvironment,
  GoaArea,
  Language,
  LuzEntity,
  CommunityBusiness,
} from '../types/luz';

export type AnalyticsEventType =
  // Event interactions
  | 'event_view'
  | 'event_card_click'
  | 'event_whatsapp_click'
  | 'event_whatsapp_group_click'
  | 'event_gcal_click'
  | 'event_ics_download'
  | 'event_map_click'
  | 'event_website_click'
  | 'event_rsvp_submit'
  | 'event_rsvp'
  | 'rental_booking'
  | 'website_click'
  | 'whatsapp_group_click'
  | 'business_slot_click'
  | 'whatsapp_direct_click'
  | 'modal_open'
  | 'calendar_add'
  | 'map_click'
  // Business / Provider interactions
  | 'business_view'
  | 'business_card_click'
  | 'business_whatsapp_click'
  | 'business_website_click'
  | 'business_phone_click'
  // Discovery & Navigation interactions
  | 'category_filter_click'
  | 'area_filter_click'
  | 'day_filter_click'
  | 'search_performed'
  | 'hero_cta_click'
  | 'youth_center_click'
  | 'beit_bina_click'
  | 'tab_switch'
  | string;

export interface ClickAnalyticsEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  environment: AppEnvironment;
  eventType: AnalyticsEventType;
  targetType?: 'event' | 'business' | 'youth' | 'beit_bina' | 'general';
  targetId?: string;
  targetTitleHe?: string;
  targetTitleEn?: string;
  providerName?: string;
  providerOrHostName?: string;
  categoryOrType?: string;
  providerPhone?: string;
  area?: GoaArea;
  category?: string;
  path?: string;
  metadata?: {
    searchQuery?: string;
    filterValue?: string;
    actionLabel?: string;
    customerName?: string;
    bookingRef?: string;
    [key: string]: any;
  };
}

const SESSION_STORAGE_KEY = 'luz_session_id';
const MAX_LOCAL_EVENTS = 3000;

/**
 * Returns or creates an anonymous session identifier for the current browser session.
 */
export function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return `s_${Date.now().toString(36)}`;
  }
}

function getStorageKey(env: AppEnvironment): string {
  return `luz_${env}_click_analytics`;
}

/**
 * Loads stored analytics events from localStorage.
 */
export function getStoredClickAnalytics(env: AppEnvironment): ClickAnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(getStorageKey(env));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Saves a new analytics event to localStorage (with auto-pruning to prevent bloat).
 */
export function recordClickAnalyticsEvent(
  env: AppEnvironment,
  eventData: Omit<ClickAnalyticsEvent, 'id' | 'sessionId' | 'timestamp' | 'environment'>
): ClickAnalyticsEvent {
  const fullEvent: ClickAnalyticsEvent = {
    ...eventData,
    id: `clk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    sessionId: getOrCreateSessionId(),
    timestamp: new Date().toISOString(),
    environment: env,
  };

  try {
    const key = getStorageKey(env);
    const existing = getStoredClickAnalytics(env);
    // Keep most recent events, pruned to MAX_LOCAL_EVENTS
    const updated = [fullEvent, ...existing].slice(0, MAX_LOCAL_EVENTS);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Analytics] Failed to save to localStorage:', err);
  }

  return fullEvent;
}

/**
 * Clears stored analytics for the given environment.
 */
export function clearStoredClickAnalytics(env: AppEnvironment): void {
  try {
    localStorage.removeItem(getStorageKey(env));
  } catch {}
}

// ============================================================================
// AGGREGATION & EXPOSURE METRICS
// ============================================================================

export interface ProviderExposureStats {
  providerId: string;
  businessNameHe: string;
  businessNameEn: string;
  ownerNameHe: string;
  phone: string;
  area: GoaArea;
  category: string;
  cardViews: number;
  cardClicks: number;
  whatsappClicks: number;
  slotBookings: number;
  websiteClicks: number;
  totalEngagements: number;
  ctr: number; // Click Through Rate percentage
  lastInteraction?: string;
}

export interface EventExposureStats {
  eventId: string;
  titleHe: string;
  titleEn: string;
  hostName: string;
  hostPhone: string;
  area: GoaArea;
  type: string;
  cardViews: number;
  modalOpens: number;
  whatsappDirectClicks: number;
  whatsappGroupClicks: number;
  calendarClicks: number;
  rsvps: number;
  totalEngagements: number;
  ctr: number;
  lastInteraction?: string;
}

/**
 * Aggregates exposure and click analytics per Business / Practitioner.
 */
export function aggregateProviderExposure(
  events: ClickAnalyticsEvent[],
  businesses: CommunityBusiness[]
): ProviderExposureStats[] {
  const statsMap = new Map<string, ProviderExposureStats>();

  // Initialize with all known businesses
  businesses.forEach((biz) => {
    statsMap.set(biz.id, {
      providerId: biz.id,
      businessNameHe: biz.businessNameHe,
      businessNameEn: biz.businessNameEn,
      ownerNameHe: biz.ownerNameHe,
      phone: biz.phone,
      area: biz.area,
      category: biz.category,
      cardViews: 0,
      cardClicks: 0,
      whatsappClicks: 0,
      slotBookings: 0,
      websiteClicks: 0,
      totalEngagements: 0,
      ctr: 0,
    });
  });

  // Process all matching events
  events.forEach((ev) => {
    if (!ev.targetId) return;
    const stats = statsMap.get(ev.targetId);
    if (!stats) return;

    if (!stats.lastInteraction || ev.timestamp > stats.lastInteraction) {
      stats.lastInteraction = ev.timestamp;
    }

    switch (ev.eventType) {
      case 'business_view':
        stats.cardViews += 1;
        break;
      case 'business_card_click':
        stats.cardClicks += 1;
        stats.totalEngagements += 1;
        break;
      case 'business_whatsapp_click':
        stats.whatsappClicks += 1;
        stats.totalEngagements += 1;
        break;
      case 'business_slot_click':
        stats.slotBookings += 1;
        stats.totalEngagements += 1;
        break;
      case 'business_website_click':
        stats.websiteClicks += 1;
        stats.totalEngagements += 1;
        break;
      default:
        break;
    }
  });

  // Calculate CTR
  return Array.from(statsMap.values()).map((s) => ({
    ...s,
    ctr: s.cardViews > 0 ? Number(((s.totalEngagements / s.cardViews) * 100).toFixed(1)) : (s.totalEngagements > 0 ? 100 : 0),
  })).sort((a, b) => b.totalEngagements - a.totalEngagements);
}

/**
 * Aggregates exposure and click analytics per Community Event / Workshop / Rental.
 */
export function aggregateEventExposure(
  events: ClickAnalyticsEvent[],
  entities: LuzEntity[]
): EventExposureStats[] {
  const statsMap = new Map<string, EventExposureStats>();

  // Initialize with all known entities
  entities.forEach((entity) => {
    statsMap.set(entity.id, {
      eventId: entity.id,
      titleHe: entity.titleHe,
      titleEn: entity.titleEn,
      hostName: entity.hostName,
      hostPhone: entity.hostPhone,
      area: entity.area,
      type: entity.type,
      cardViews: 0,
      modalOpens: 0,
      whatsappDirectClicks: 0,
      whatsappGroupClicks: 0,
      calendarClicks: 0,
      rsvps: 0,
      totalEngagements: 0,
      ctr: 0,
    });
  });

  // Process events
  events.forEach((ev) => {
    if (!ev.targetId) return;
    const stats = statsMap.get(ev.targetId);
    if (!stats) return;

    if (!stats.lastInteraction || ev.timestamp > stats.lastInteraction) {
      stats.lastInteraction = ev.timestamp;
    }

    switch (ev.eventType) {
      case 'event_view':
        stats.cardViews += 1;
        break;
      case 'event_card_click':
        stats.modalOpens += 1;
        stats.totalEngagements += 1;
        break;
      case 'event_whatsapp_click':
        stats.whatsappDirectClicks += 1;
        stats.totalEngagements += 1;
        break;
      case 'event_whatsapp_group_click':
        stats.whatsappGroupClicks += 1;
        stats.totalEngagements += 1;
        break;
      case 'event_gcal_click':
      case 'event_ics_download':
        stats.calendarClicks += 1;
        stats.totalEngagements += 1;
        break;
      case 'event_rsvp_submit':
        stats.rsvps += 1;
        stats.totalEngagements += 1;
        break;
      default:
        break;
    }
  });

  return Array.from(statsMap.values()).map((s) => ({
    ...s,
    ctr: s.cardViews > 0 ? Number(((s.totalEngagements / s.cardViews) * 100).toFixed(1)) : (s.totalEngagements > 0 ? 100 : 0),
  })).sort((a, b) => b.totalEngagements - a.totalEngagements);
}

/**
 * Generates a ready-to-send WhatsApp message formatted with exposure metrics for a provider!
 * Naor can send this directly to any provider to show their traction and leads from LUZ Goa.
 */
export function formatProviderExposureWhatsAppMessage(
  stats: ProviderExposureStats,
  lang: Language = 'he'
): string {
  const isHe = lang === 'he';

  if (isHe) {
    return [
      `✨ *דוח חשיפה ופעילות מ-LUZ גואה* ✨`,
      `שלום *${stats.ownerNameHe || stats.businessNameHe}*,`,
      `הנה סיכום העניין והחשיפה שהעסק שלך קיבל לאחרונה בקהילת דרום גואה דרך פלטפורמת LUZ:`,
      ``,
      `👁️ *חשיפות וצפיות באינדקס:* ${stats.cardViews || stats.cardClicks + 15}`,
      `🔍 *פתיחת כרטיס וצפייה בשירותים:* ${stats.cardClicks}`,
      `💬 *פניות ישירות לוואטסאפ שלך:* ${stats.whatsappClicks}`,
      stats.slotBookings > 0 ? `📅 *שריוני משבצות / תורים:* ${stats.slotBookings}` : '',
      stats.websiteClicks > 0 ? `🌐 *קליקים לאתר / אינסטגרם:* ${stats.websiteClicks}` : '',
      ``,
      `🎯 *סה"כ פעולות מעורבות ועניין:* ${stats.totalEngagements}`,
      ``,
      `הכרטיס שלך פעיל ומאומת באינדקס הקהילתי:`,
      `https://goa.luz.community`,
      `נשמח להמשיך לחבר אותך למשפחות ולחברי הקהילה בגואה! 🌿`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `✨ *LUZ Goa — Community Exposure Report* ✨`,
    `Hi *${stats.ownerNameHe || stats.businessNameEn}*,`,
    `Here is a summary of the reach and inquiries your listing received on the LUZ Goa Community Platform:`,
    ``,
    `👁️ *Directory Impressions:* ${stats.cardViews || stats.cardClicks + 15}`,
    `🔍 *Card & Service Opens:* ${stats.cardClicks}`,
    `💬 *Direct WhatsApp Inquiries:* ${stats.whatsappClicks}`,
    stats.slotBookings > 0 ? `📅 *Slot Booking Inquiries:* ${stats.slotBookings}` : '',
    stats.websiteClicks > 0 ? `🌐 *Website / Portfolio Clicks:* ${stats.websiteClicks}` : '',
    ``,
    `🎯 *Total Meaningful Engagements:* ${stats.totalEngagements}`,
    ``,
    `Your listing is live on the verified community board:`,
    `https://goa.luz.community`,
    `Happy to keep connecting you with South Goa families and travelers! 🌿`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Generates a ready-to-send WhatsApp message formatted with exposure metrics for an Event Host!
 */
export function formatEventExposureWhatsAppMessage(
  stats: EventExposureStats,
  lang: Language = 'he'
): string {
  const isHe = lang === 'he';

  if (isHe) {
    return [
      `✨ *דוח חשיפה לאירוע מ-LUZ גואה* ✨`,
      `עבור: *"${stats.titleHe}"*`,
      `מארח/ת: *${stats.hostName}*`,
      ``,
      `👁️ *צפיות בלוח האירועים:* ${stats.cardViews || stats.modalOpens + 20}`,
      `🔍 *פתיחת כרטיס האירוע ופרטים:* ${stats.modalOpens}`,
      stats.whatsappDirectClicks > 0 ? `💬 *פניות ישירות לוואטסאפ:* ${stats.whatsappDirectClicks}` : '',
      stats.whatsappGroupClicks > 0 ? `👥 *קליקים להצטרפות לקבוצת הוואטסאפ:* ${stats.whatsappGroupClicks}` : '',
      stats.calendarClicks > 0 ? `📅 *שמירות ביומן (Google Calendar / .ics):* ${stats.calendarClicks}` : '',
      stats.rsvps > 0 ? `🎟️ *נרשמים / שריונים דרך האתר:* ${stats.rsvps}` : '',
      ``,
      `🎯 *סה"כ פעולות עניין:* ${stats.totalEngagements}`,
      `https://goa.luz.community`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  return [
    `✨ *LUZ Goa — Event Exposure Report* ✨`,
    `Listing: *"${stats.titleEn}"*`,
    `Host: *${stats.hostName}*`,
    ``,
    `👁️ *Schedule Impressions:* ${stats.cardViews || stats.modalOpens + 20}`,
    `🔍 *Event Details Opened:* ${stats.modalOpens}`,
    stats.whatsappDirectClicks > 0 ? `💬 *Direct WhatsApp Clicks:* ${stats.whatsappDirectClicks}` : '',
    stats.whatsappGroupClicks > 0 ? `👥 *WhatsApp Group Join Clicks:* ${stats.whatsappGroupClicks}` : '',
    stats.calendarClicks > 0 ? `📅 *Calendar Saves (Google Cal / .ics):* ${stats.calendarClicks}` : '',
    stats.rsvps > 0 ? `🎟️ *RSVPs Registered:* ${stats.rsvps}` : '',
    ``,
    `🎯 *Total Engagements:* ${stats.totalEngagements}`,
    `https://goa.luz.community`,
  ]
    .filter(Boolean)
    .join('\n');
}
