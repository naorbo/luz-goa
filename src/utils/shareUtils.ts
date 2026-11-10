import { LuzEntity } from '../types/luz';
const DAY_NAMES_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const formatDateFull = (dateStr?: string, isHe = true): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const dayName = isHe ? DAY_NAMES_HE[d.getDay()] : DAY_NAMES_EN[d.getDay()];
  const day = Number(parts[2]);
  return isHe ? `${dayName}, ${day} בנובמבר` : `${dayName}, Nov ${day}`;
};

export interface ShareEventOptions {
  isHe?: boolean;
  wasRegistered?: boolean;
  customSchedule?: string;
  customerName?: string;
}

export interface ShareResult {
  success: boolean;
  method: 'native' | 'clipboard' | 'whatsapp' | 'aborted' | 'error';
  shareUrl: string;
  shareText: string;
}

/**
 * Builds the canonical shareable URL for a given event entity.
 */
export function buildEventShareUrl(
  entityId: string,
  isYouthCenter?: boolean,
  isBeitBina?: boolean
): string {
  const tabQuery = isBeitBina
    ? '&tab=beit_bina'
    : isYouthCenter
    ? '&tab=youth_center'
    : '';
  if (typeof window === 'undefined') {
    return `https://my-luz-dc028.web.app/?event=${encodeURIComponent(entityId)}${tabQuery}`;
  }
  const baseUrl = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '');
  return `${baseUrl}?event=${encodeURIComponent(entityId)}${tabQuery}`;
}

/**
 * Formats a clean, engaging bilingual share message for WhatsApp / social sharing.
 */
export function buildEventShareContent(
  entity: LuzEntity,
  options?: ShareEventOptions
): { title: string; text: string; url: string; fullMessage: string } {
  const isHe = options?.isHe ?? true;
  const title = isHe ? entity.titleHe : entity.titleEn;
  const isYC = Boolean(entity.isYouthCenter || entity.id.startsWith('yc-'));
  const isBina = Boolean(entity.isBeitBina || entity.id.startsWith('bina-'));
  const url = buildEventShareUrl(entity.id, isYC, isBina);

  let schedule = options?.customSchedule || '';
  if (!schedule) {
    if (entity.date) {
      schedule = formatDateFull(entity.date, isHe);
    } else if (typeof entity.dayOfWeek === 'number') {
      const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      schedule = isHe ? `ימי ${DAYS_HE[entity.dayOfWeek]}` : `Every ${DAYS_EN[entity.dayOfWeek]}`;
    }
    if (entity.startTime) {
      schedule = schedule
        ? `${schedule} · ${entity.startTime}${entity.endTime ? ` עד ${entity.endTime}` : ''}`
        : entity.startTime;
    }
  }

  const scheduleStr = schedule ? ` (${schedule})` : '';

  let text = '';
  if (options?.wasRegistered) {
    text = isHe
      ? `היי! נרשמתי ל"${title}" ב-LUZ דרום גואה${scheduleStr}. חשבתי שזה יעניין אותך, בוא/י נלך יחד! לפרטים והרשמה:`
      : `Hey! I just registered for "${title}" on LUZ South Goa${scheduleStr}. Thought you might like it too, check it out:`;
  } else {
    text = isHe
      ? `היי! ראיתי את "${title}" ב-LUZ דרום גואה${scheduleStr} וחשבתי שזה יעניין אותך! לפרטים והרשמה:`
      : `Hey! Check out "${title}" on LUZ South Goa${scheduleStr}:`;
  }

  const fullMessage = `${text}\n${url}`;

  return {
    title: `LUZ Goa: ${title}`,
    text,
    url,
    fullMessage,
  };
}

/**
 * Direct WhatsApp share URL with pre-filled message and deep link.
 */
export function buildWhatsAppShareUrl(entity: LuzEntity, options?: ShareEventOptions): string {
  const { fullMessage } = buildEventShareContent(entity, options);
  return `https://wa.me/?text=${encodeURIComponent(fullMessage)}`;
}

/**
 * Triggers native device share sheet (iOS/Android/Edge) with graceful clipboard and WhatsApp fallbacks.
 */
export async function shareLuzEvent(
  entity: LuzEntity,
  options?: ShareEventOptions
): Promise<ShareResult> {
  const content = buildEventShareContent(entity, options);

  // 1. Try Web Share API (native on mobile devices & Safari/Edge)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: content.title,
        text: content.text,
        url: content.url,
      });
      return {
        success: true,
        method: 'native',
        shareUrl: content.url,
        shareText: content.fullMessage,
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          success: false,
          method: 'aborted',
          shareUrl: content.url,
          shareText: content.fullMessage,
        };
      }
      // If native share failed for reasons other than abort, continue to fallback
    }
  }

  // 2. Try writing to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(content.fullMessage);
      return {
        success: true,
        method: 'clipboard',
        shareUrl: content.url,
        shareText: content.fullMessage,
      };
    } catch {
      // Continue to WhatsApp fallback
    }
  }

  // 3. Fallback: open WhatsApp Web / App share dialog
  if (typeof window !== 'undefined') {
    const waUrl = buildWhatsAppShareUrl(entity, options);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    return {
      success: true,
      method: 'whatsapp',
      shareUrl: content.url,
      shareText: content.fullMessage,
    };
  }

  return {
    success: false,
    method: 'error',
    shareUrl: content.url,
    shareText: content.fullMessage,
  };
}
