import {
  AppEnvironment,
  CommunityBusiness,
  LeadReferralEvent,
  Language,
  LuzEntity,
  NotificationChannelsConfig,
  ReferralActionType,
} from '../types/luz';

const PLATFORM_SHORT_URL = 'naorbo.github.io/luz-goa';

/**
 * Deterministically generates a short, human-readable LUZ referral code
 * from providerId + click nonce so native <a href="..."> links and onClick
 * tracking share the exact same #LUZ-XXXX code.
 */
export function generateLuzReferralCode(providerId: string, nonce: number): string {
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const raw = `${providerId}-${nonce}-${mmdd}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const suffix = Math.abs(hash).toString(36).toUpperCase().slice(0, 4).padEnd(4, 'X');
  return `LUZ-${mmdd}-${suffix}`;
}

/**
 * Generates a unique instant referral code for form submissions (bookings, RSVPs, rentals).
 */
export function createBookingReferralCode(): string {
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LUZ-${mmdd}-${rand}`;
}

/**
 * Resolves the best language ('he' or 'en') to address the service provider
 * so Israeli providers get Hebrew and local Indian/international providers get English.
 */
export function resolveProviderContactLang(
  preferred?: Language,
  phone?: string,
  nameHe?: string
): Language {
  if (preferred === 'en' || preferred === 'he') return preferred;
  const cleanPhone = (phone || '').trim();
  if (cleanPhone.startsWith('+972') || cleanPhone.startsWith('05')) return 'he';
  // If non-Israeli phone and name contains no Hebrew characters, default to English
  if (nameHe && !/[\u0590-\u05FF]/.test(nameHe)) return 'en';
  return 'he';
}

export function getActionTypeLabel(action: ReferralActionType, lang: Language): string {
  const map: Record<ReferralActionType, { he: string; en: string }> = {
    whatsapp_click: {
      he: 'פנייה ישירה בוואטסאפ לספק',
      en: 'Direct WhatsApp Inquiry',
    },
    slot_booking: {
      he: 'קביעת תור ביומן הספק',
      en: 'Appointment Slot Booking',
    },
    event_rsvp: {
      he: 'הרשמה לאירוע / חוג',
      en: 'Event / Workshop RSVP',
    },
    rental_booking: {
      he: 'בקשת שריון נכס להשכרה',
      en: 'Property Rental Request',
    },
    website_click: {
      he: 'מעבר לאתר הספק (UTM)',
      en: 'Provider Website Visit',
    },
    whatsapp_group_click: {
      he: 'מעבר לקבוצת הוואטסאפ של הספק',
      en: 'Provider WhatsApp Group Join',
    },
    instagram_click: {
      he: 'מעבר לעמוד האינסטגרם של הספק',
      en: 'Provider Instagram Visit',
    },
    youth_center_signup: {
      he: 'רישום משפחה למרכז הנוער גואה',
      en: 'Youth Center Family Registration',
    },
  };
  return lang === 'he' ? map[action].he : map[action].en;
}

/**
 * Appends LUZ attribution UTM parameters to any external provider website URL
 * so the provider's website/analytics sees they came from LUZ Goa.
 */
export function appendLuzAttributionParams(rawUrl: string, referralCode: string): string {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set('utm_source', 'luz_goa');
    url.searchParams.set('utm_medium', 'community_platform');
    url.searchParams.set('utm_campaign', 'provider_referral');
    url.searchParams.set('luz_ref', referralCode);
    return url.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Builds a 1-click WhatsApp URL to a CommunityBusiness with unmistakable LUZ Goa attribution
 * in the provider's own language ('he' or 'en') + #LUZ-XXXX referral tag.
 */
export function buildBusinessWhatsAppReferralUrl(
  biz: CommunityBusiness,
  referralCode: string,
  customerName?: string
): string {
  const providerLang = resolveProviderContactLang(
    biz.preferredContactLang,
    biz.phone,
    biz.ownerNameHe
  );
  const digits = biz.phone.replace(/[^0-9]/g, '');
  const cleanCustomer = customerName?.trim();

  const text =
    providerLang === 'en'
      ? [
          `Hi ${biz.ownerNameEn}, I reached out to you via the *LUZ Goa Community Platform* (${PLATFORM_SHORT_URL}).`,
          `I would love to get details / book regarding: *${biz.specialtyEn}*.`,
          cleanCustomer ? `My name: ${cleanCustomer}` : '',
          `(LUZ Referral: #${referralCode})`,
        ]
          .filter(Boolean)
          .join('\n')
      : [
          `היי ${biz.ownerNameHe}, הגעתי אליך דרך פלטפורמת הקהילה *LUZ גואה* (${PLATFORM_SHORT_URL}).`,
          `אשמח לפרטים / לתיאום לגבי: *${biz.specialtyHe}*.`,
          cleanCustomer ? `השם שלי: ${cleanCustomer}` : '',
          `(מזהה הפניה מ-LUZ: #${referralCode})`,
        ]
          .filter(Boolean)
          .join('\n');

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/**
 * Builds a WhatsApp confirmation URL after a user books a specific slot with a CommunityBusiness.
 */
export function buildBusinessBookingConfirmationWaUrl(
  biz: CommunityBusiness,
  params: {
    referralCode: string;
    serviceNameHe: string;
    serviceNameEn: string;
    selectedDate: string;
    selectedSlot: string;
    customerName: string;
    customerPhone: string;
  }
): string {
  const providerLang = resolveProviderContactLang(
    biz.preferredContactLang,
    biz.phone,
    biz.ownerNameHe
  );
  const digits = biz.phone.replace(/[^0-9]/g, '');

  const text =
    providerLang === 'en'
      ? [
          `Hi ${biz.ownerNameEn}, I just booked an appointment with you via the *LUZ Goa Community Platform* (${PLATFORM_SHORT_URL})!`,
          `• Service: ${params.serviceNameEn}`,
          `• Date & Time: ${params.selectedDate} at ${params.selectedSlot}`,
          `• Client: ${params.customerName} (${params.customerPhone})`,
          `• LUZ Booking Ref: #${params.referralCode}`,
          `Looking forward to your confirmation!`,
        ].join('\n')
      : [
          `היי ${biz.ownerNameHe}, שריינתי אצלך תור עכשיו דרך פלטפורמת הקהילה *LUZ גואה* (${PLATFORM_SHORT_URL})!`,
          `• שירות מבוקש: ${params.serviceNameHe}`,
          `• תאריך ושעה: ${params.selectedDate} בשעה ${params.selectedSlot}`,
          `• שם וטלפון: ${params.customerName} (${params.customerPhone})`,
          `• מזהה הזמנה ב-LUZ: #${params.referralCode}`,
          `אשמח לאישורך!`,
        ].join('\n');

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/**
 * Builds a WhatsApp URL to an Event / Workshop / Service / Property Rental host
 * with unmistakable LUZ Goa attribution.
 */
export function buildEntityWhatsAppReferralUrl(
  entity: LuzEntity,
  referralCode: string,
  mode: 'direct' | 'booked',
  details?: {
    customerName?: string;
    customerPhone?: string;
    scheduleSummary?: string;
    participantsCount?: number;
  }
): string {
  const providerLang = resolveProviderContactLang(
    entity.preferredContactLang,
    entity.hostPhone,
    entity.hostName
  );
  const digits = entity.hostPhone.replace(/[^0-9]/g, '');

  if (mode === 'direct') {
    const text =
      providerLang === 'en'
        ? [
            `Hi, I found "${entity.titleEn}" on the *LUZ Goa Community Platform* (${PLATFORM_SHORT_URL}) and would love more details.`,
            details?.customerName ? `My name: ${details.customerName}` : '',
            `(LUZ Referral: #${referralCode})`,
          ]
            .filter(Boolean)
            .join('\n')
        : [
            `היי ${entity.hostName}, הגעתי דרך פלטפורמת הקהילה *LUZ גואה* (${PLATFORM_SHORT_URL}) לגבי *"${entity.titleHe}"* ואשמח לפרטים.`,
            details?.customerName ? `השם שלי: ${details.customerName}` : '',
            `(מזהה הפניה מ-LUZ: #${referralCode})`,
          ]
            .filter(Boolean)
            .join('\n');

    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  const text =
    providerLang === 'en'
      ? [
          `Hi, I just registered / requested a booking via the *LUZ Goa Community Platform* (${PLATFORM_SHORT_URL})!`,
          `• Listing: ${entity.titleEn}`,
          details?.scheduleSummary ? `• Dates / Time: ${details.scheduleSummary}` : '',
          details?.customerName
            ? `• Name: ${details.customerName} (${details.customerPhone || ''})`
            : '',
          details?.participantsCount ? `• Guests / Participants: ${details.participantsCount}` : '',
          `• LUZ Booking Ref: #${referralCode}`,
        ]
          .filter(Boolean)
          .join('\n')
      : [
          `היי ${entity.hostName}, נרשמתי / שלחתי בקשת שריון עכשיו דרך פלטפורמת *LUZ גואה* (${PLATFORM_SHORT_URL})!`,
          `• פעילות / נכס: ${entity.titleHe}`,
          details?.scheduleSummary ? `• מועד: ${details.scheduleSummary}` : '',
          details?.customerName
            ? `• שם וטלפון: ${details.customerName} (${details.customerPhone || ''})`
            : '',
          details?.participantsCount ? `• מספר משתתפים: ${details.participantsCount}` : '',
          `• מזהה הזמנה ב-LUZ: #${referralCode}`,
        ]
          .filter(Boolean)
          .join('\n');

  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function formatAlertSummaryHe(event: LeadReferralEvent): string {
  const localTime = new Date(event.createdAt).toLocaleString('he-IL', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });
  const actionHe = getActionTypeLabel(event.actionType, 'he');
  const customerStr = event.customerName
    ? `${event.customerName}${event.customerPhone ? ` (${event.customerPhone})` : ''}`
    : 'מבקר/ת באתר (לחיצה ישירה)';

  return [
    `🔔 פנייה חדשה לספק מתוך LUZ גואה!`,
    `• מזהה הפניה: #${event.referralCode}`,
    `• פעולה: ${actionHe}`,
    `• ספק / שירות: ${event.providerNameHe} (${event.ownerOrHostName})`,
    `• קטגוריה ואזור: ${event.providerCategoryOrType} | ${event.area}`,
    `• טלפון ספק: ${event.providerPhone}`,
    `• פרטי פונה: ${customerStr}`,
    event.serviceOrDateSummary ? `• פירוט שירות/מועד: ${event.serviceOrDateSummary}` : '',
    `• סביבה: ${event.environment.toUpperCase()} | זמן: ${localTime}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export interface ChannelDispatchResult {
  channel: 'webhook' | 'telegram' | 'email';
  ok: boolean;
  detail: string;
}

/**
 * Dispatches real-time lead notifications to all configured channels:
 * 1. Webhook (Make.com / n8n / Shai's "Ben" WhatsApp Bot)
 * 2. Telegram Bot API
 * 3. Email (FormSubmit AJAX or Web3Forms)
 *
 * Uses `keepalive: true` so requests complete reliably even when the browser
 * simultaneously opens WhatsApp (`wa.me`) in a new tab/app.
 */
export async function dispatchLeadReferralAlerts(
  event: LeadReferralEvent,
  config: NotificationChannelsConfig,
  options?: { forceSend?: boolean }
): Promise<ChannelDispatchResult[]> {
  if (event.environment === 'test' && !config.sendRealAlertsInTestEnv && !options?.forceSend) {
    return [];
  }

  const results: ChannelDispatchResult[] = [];
  const formattedAlertHe = formatAlertSummaryHe(event);
  const actionLabelHe = getActionTypeLabel(event.actionType, 'he');
  const localTime = new Date(event.createdAt).toLocaleString('he-IL');

  const tasks: Promise<void>[] = [];

  // 1. Webhook (Make / n8n / WhatsApp Bot "Ben")
  if (config.enableWebhook && config.webhookUrl.trim()) {
    const webhookUrl = config.webhookUrl.trim();
    const webhookPayload = {
      event: 'luz.provider_referral',
      referralCode: event.referralCode,
      environment: event.environment,
      createdAt: event.createdAt,
      timestampLocal: localTime,
      actionType: event.actionType,
      actionLabelHe,
      provider: {
        id: event.providerId,
        nameHe: event.providerNameHe,
        nameEn: event.providerNameEn,
        ownerOrHost: event.ownerOrHostName,
        phone: event.providerPhone,
        categoryOrType: event.providerCategoryOrType,
        area: event.area,
        contactLang: event.providerContactLang,
      },
      customer: {
        name: event.customerName || 'אורח/ת בקהילה',
        phone: event.customerPhone || '',
      },
      serviceOrDateSummary: event.serviceOrDateSummary || '',
      formattedAlertHe,
    };

    tasks.push(
      (async () => {
        try {
          const res = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload),
            keepalive: true,
          });
          results.push({
            channel: 'webhook',
            ok: res.ok,
            detail: res.ok ? `נשלח ל-Webhook (HTTP ${res.status})` : `שגיאת HTTP ${res.status}`,
          });
        } catch {
          // Fallback to CORS-safe simple request (no preflight) for Google Apps Script / strict webhooks
          try {
            await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify(webhookPayload),
              mode: 'no-cors',
              keepalive: true,
            });
            results.push({
              channel: 'webhook',
              ok: true,
              detail: 'נשלח ל-Webhook (מצב no-cors)',
            });
          } catch (err2) {
            results.push({
              channel: 'webhook',
              ok: false,
              detail: `כשל בשליחה ל-Webhook: ${err2 instanceof Error ? err2.message : 'שגיאת רשת'}`,
            });
          }
        }
      })()
    );
  }

  // 2. Telegram Bot Instant Push
  if (
    config.enableTelegram &&
    config.telegramBotToken.trim() &&
    config.telegramChatId.trim()
  ) {
    const token = config.telegramBotToken.trim();
    const chatId = config.telegramChatId.trim();
    tasks.push(
      (async () => {
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: formattedAlertHe,
            }),
            keepalive: true,
          });
          const tgData = await tgRes.json().catch(() => ({}));
          results.push({
            channel: 'telegram',
            ok: tgRes.ok && tgData?.ok !== false,
            detail:
              tgRes.ok && tgData?.ok !== false
                ? 'נשלחה הודעה מיידית לטלגרם!'
                : `שגיאת טלגרם: ${tgData?.description || tgRes.status}`,
          });
        } catch (err) {
          results.push({
            channel: 'telegram',
            ok: false,
            detail: `שגיאת רשת מול טלגרם: ${err instanceof Error ? err.message : 'Network error'}`,
          });
        }
      })()
    );
  }

  // 3. Email Notification (Web3Forms or FormSubmit AJAX)
  if (config.enableEmail && config.adminEmail.trim()) {
    const email = config.adminEmail.trim();
    const subject = `פנייה חדשה מ-LUZ גואה: ${event.providerNameHe} [#${event.referralCode}]`;

    tasks.push(
      (async () => {
        try {
          if (config.web3formsAccessKey?.trim()) {
            const w3Res = await fetch('https://api.web3forms.com/submit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({
                access_key: config.web3formsAccessKey.trim(),
                subject,
                from_name: 'LUZ Goa Platform',
                referral_code: event.referralCode,
                action: actionLabelHe,
                provider: `${event.providerNameHe} (${event.ownerOrHostName})`,
                provider_phone: event.providerPhone,
                area: event.area,
                customer_name: event.customerName || 'אורח/ת באתר',
                customer_phone: event.customerPhone || 'לחיצה ישירה',
                details: event.serviceOrDateSummary || '—',
                environment: event.environment.toUpperCase(),
                time: localTime,
              }),
              keepalive: true,
            });
            results.push({
              channel: 'email',
              ok: w3Res.ok,
              detail: w3Res.ok ? `נשלח מייל ל-${email} (Web3Forms)` : `שגיאה ${w3Res.status}`,
            });
            return;
          }

          const fsRes = await fetch(
            `https://formsubmit.co/ajax/${encodeURIComponent(email)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({
                _subject: subject,
                _template: 'table',
                _captcha: 'false',
                מזהה_הפניה_LUZ: `#${event.referralCode}`,
                סוג_פעולה: actionLabelHe,
                ספק_או_פעילות: `${event.providerNameHe} (${event.ownerOrHostName})`,
                קטגוריה_ואזור: `${event.providerCategoryOrType} | ${event.area}`,
                טלפון_ספק: event.providerPhone,
                שם_הפונה: event.customerName || 'מבקר/ת באתר (לחיצה ישירה)',
                טלפון_הפונה: event.customerPhone || '—',
                פירוט_שירות_או_תור: event.serviceOrDateSummary || '—',
                סביבה: event.environment.toUpperCase(),
                זמן_פנייה: localTime,
              }),
              keepalive: true,
            }
          );
          const fsJson = await fsRes.json().catch(() => ({}));
          const rawMsg = String(fsJson?.message || '');
          const needsActivation = /activation|activate|confirm/i.test(rawMsg);
          results.push({
            channel: 'email',
            ok: fsRes.ok,
            detail: needsActivation
              ? `נשלח מייל הפעלה חד-פעמי ל-${email} — אשר אותו בתיבת הדואר ("Activate Form") כדי לקבל את כל ההתראות הבאות אוטומטית!`
              : fsRes.ok
              ? `נשלחה התראת אימייל אל ${email}`
              : rawMsg || `שגיאת אימייל (${fsRes.status})`,
          });
        } catch (err) {
          results.push({
            channel: 'email',
            ok: false,
            detail: `שגיאה בשליחת אימייל: ${err instanceof Error ? err.message : 'Network error'}`,
          });
        }
      })()
    );
  }

  await Promise.allSettled(tasks);
  return results;
}

export async function sendTestAlertAllChannels(
  config: NotificationChannelsConfig,
  env: AppEnvironment
): Promise<ChannelDispatchResult[]> {
  const testEvent: LeadReferralEvent = {
    id: `ref-test-${Date.now()}`,
    referralCode: 'LUZ-TEST-001',
    environment: env,
    actionType: 'whatsapp_click',
    providerId: 'test-ping',
    providerNameHe: 'בדיקת מערכת התראות LUZ גואה',
    providerNameEn: 'LUZ Goa Notification Test',
    ownerOrHostName: 'נאור (בדיקה)',
    providerPhone: '+972-52-478-0033',
    providerCategoryOrType: 'בדיקת חיבור ערוצים',
    area: 'Colomb',
    providerContactLang: 'he',
    customerName: 'בדיקת אדמין',
    customerPhone: '+972-50-000-0000',
    serviceOrDateSummary: 'בדיקת תקינות שליחת התראות בזמן אמת (Email / Webhook / Telegram)',
    channelsDispatched: [],
    createdAt: new Date().toISOString(),
  };

  return dispatchLeadReferralAlerts(testEvent, config, { forceSend: true });
}
