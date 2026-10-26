import { LuzEntity, GoaArea, EntityType, Language, YouthCenterFamily, BookingRecord } from '../types/luz';

/**
 * Generates an RFC 5545 .ics calendar file and triggers browser download
 */
export function downloadIcsFile(params: {
  title: string;
  description: string;
  location: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endDate?: string;   // YYYY-MM-DD
  endTime?: string;   // HH:mm
}) {
  const cleanDate = (d: string) => d.replace(/-/g, '');
  const cleanTime = (t?: string) => (t ? t.replace(/:/g, '') + '00' : '100000');

  const dtStart = `${cleanDate(params.startDate)}T${cleanTime(params.startTime)}`;
  const dtEnd = params.endDate
    ? `${cleanDate(params.endDate)}T${cleanTime(params.endTime || '11:00')}`
    : `${cleanDate(params.startDate)}T${cleanTime(params.endTime || '19:30')}`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LUZ Goa Community OS//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:luz-${Date.now()}@goacommunity.org`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${params.location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${params.title.slice(0, 28).replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds a Google Calendar Quick-Add URL
 */
export function buildGoogleCalendarUrl(params: {
  title: string;
  description: string;
  location: string;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
}): string {
  const cleanDate = (d: string) => d.replace(/-/g, '');
  const cleanTime = (t?: string) => (t ? t.replace(/:/g, '') + '00' : '100000');

  const start = `${cleanDate(params.startDate)}T${cleanTime(params.startTime)}`;
  const end = params.endDate
    ? `${cleanDate(params.endDate)}T${cleanTime(params.endTime || '11:00')}`
    : `${cleanDate(params.startDate)}T${cleanTime(params.endTime || '19:30')}`;

  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', params.title);
  url.searchParams.set('dates', `${start}/${end}`);
  url.searchParams.set('details', params.description);
  url.searchParams.set('location', params.location);
  return url.toString();
}

/**
 * Parses a free-text WhatsApp message (from a group scraper or DM to "Ben")
 * into structured LuzEntity fields!
 */
export interface ParsedWhatsAppDraft {
  type: EntityType;
  titleHe: string;
  titleEn: string;
  descriptionHe: string;
  area: GoaArea;
  locationDetailsHe: string;
  hostPhone: string;
  priceAmount: number;
  priceCurrency: 'INR' | 'ILS' | 'USD' | 'FREE';
  date: string;
  startTime: string;
  endTime: string;
  availableFrom: string;
  availableTo: string;
  bedrooms: number;
  hasFiberWifi: boolean;
  hasPowerBackup: boolean;
  confidenceNotes: string[];
}

export function parseWhatsAppMessageToDraft(
  rawText: string,
  lang: Language = 'en'
): ParsedWhatsAppDraft {
  const isHe = lang === 'he';
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const notes: string[] = [];

  // 1. Detect Entity Type
  let type: EntityType = 'event';
  if (
    /להשכרה|סאבלט|וילה|בית|חדרי שינה|קוטג|sublet|villa|bhk|rent|house|cottage/i.test(text)
  ) {
    type = 'rental';
    notes.push(isHe ? 'זוהתה ישות מסוג: השכרת בית / נכס (Date Range)' : 'Detected type: Home Rental / Sublet (Date Range)');
  } else if (
    /לפי שעה|תור|טיפול|אולפן|ייעוץ|שיעור פרטי|קליניקה|session|appointment|studio|1-on-1|hourly/i.test(text)
  ) {
    type = 'service';
    notes.push(isHe ? 'זוהתה ישות מסוג: שירות שעתי / תיאום יומן' : 'Detected type: Hourly Service / Resource Slot');
  } else if (
    /כל יום|מדי שבוע|חוג|מתנ"ס|קבוע|סדנה שבועית|every|weekly|youth center/i.test(text)
  ) {
    type = 'workshop';
    notes.push(isHe ? 'זוהתה ישות מסוג: חוג / סדנה קבועה' : 'Detected type: Recurring Class / Youth Center');
  } else {
    notes.push(isHe ? 'זוהתה ישות מסוג: אירוע חד-פעמי' : 'Detected type: One-Time Event');
  }

  // 2. Detect Area in Goa
  let area: GoaArea = 'Colomb';
  if (/פטנם|פאטנם|patnem/i.test(text)) {
    area = 'Patnem';
  } else if (/פאלולם|פלולם|palolem/i.test(text)) {
    area = 'Palolem';
  } else if (/אגונדה|agonda/i.test(text)) {
    area = 'Agonda';
  } else if (/גלגיבגה|galgibaga/i.test(text)) {
    area = 'Galgibaga';
  } else if (/קולום|colomb/i.test(text)) {
    area = 'Colomb';
  }
  notes.push(isHe ? `אזור בגואה: ${area}` : `Area in Goa: ${area}`);

  // 3. Extract Phone Number
  const phoneMatch = text.match(/(\+?\d{2,3}[-\s]?\d{2,4}[-\s]?\d{3}[-\s]?\d{3,4}|\b05\d[-\s]?\d{3}[-\s]?\d{4}\b)/);
  const hostPhone = phoneMatch ? phoneMatch[0] : '+972-52-478-0033';

  // 4. Extract Price
  let priceAmount = 0;
  let priceCurrency: 'INR' | 'ILS' | 'USD' | 'FREE' = 'FREE';
  const inrMatch = text.match(/(\d[\d,]*)\s*(?:רופי|רופיות|rs|inr|₹)/i);
  const ilsMatch = text.match(/(?:₪|ש"ח|שח)\s*(\d[\d,]*)|(\d[\d,]*)\s*(?:₪|ש"ח|שח)/i);
  const usdMatch = text.match(/\$\s*(\d[\d,]*)|(\d[\d,]*)\s*\$/i);

  if (inrMatch) {
    priceAmount = parseInt(inrMatch[1].replace(/,/g, ''), 10);
    priceCurrency = 'INR';
    notes.push(isHe ? `מחיר זוהה: ₹${priceAmount}` : `Detected price: ₹${priceAmount}`);
  } else if (ilsMatch) {
    const val = ilsMatch[1] || ilsMatch[2];
    priceAmount = parseInt(val.replace(/,/g, ''), 10);
    priceCurrency = 'ILS';
    notes.push(isHe ? `מחיר זוהה: ₪${priceAmount}` : `Detected price: ₪${priceAmount}`);
  } else if (usdMatch) {
    const val = usdMatch[1] || usdMatch[2];
    priceAmount = parseInt(val.replace(/,/g, ''), 10);
    priceCurrency = 'USD';
    notes.push(isHe ? `מחיר זוהה: $${priceAmount}` : `Detected price: $${priceAmount}`);
  }

  // 5. Extract Time (HH:MM)
  const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const startTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '18:00';
  const startHour = parseInt(startTime.split(':')[0], 10);
  const endTime = `${String((startHour + 2) % 24).padStart(2, '0')}:${startTime.split(':')[1]}`;

  // 6. Extract Title (first line or first sentence)
  const firstLine = text.split('\n')[0].replace(/^[*-•]\s*/, '').trim();
  const titleFallback = isHe ? 'אירוע קהילתי בגואה' : 'Community Event in Goa';
  const titleHe = firstLine.length > 65 ? firstLine.slice(0, 62) + '...' : firstLine || titleFallback;

  // 7. Extract Bedrooms / Fiber / Backup for Rentals
  const bhkMatch = text.match(/(\d)\s*(?:חדרי שינה|חדרים|bhk|bedrooms)/i);
  const bedrooms = bhkMatch ? parseInt(bhkMatch[1], 10) : 2;
  const hasFiberWifi = /סיבים|פייבר|fiber|wifi|אינטרנט/i.test(lower);
  const hasPowerBackup = /גנרטור|אינוורטר|גיבוי|inverter|backup|generator/i.test(lower);

  return {
    type,
    titleHe,
    titleEn: titleHe,
    descriptionHe: text,
    area,
    locationDetailsHe: isHe ? `${area}, גואה` : `${area}, South Goa`,
    hostPhone,
    priceAmount,
    priceCurrency,
    date: '2026-10-30',
    startTime,
    endTime,
    availableFrom: '2026-11-01',
    availableTo: '2026-11-30',
    bedrooms,
    hasFiberWifi,
    hasPowerBackup,
    confidenceNotes: notes,
  };
}

/**
 * Generates formatted WhatsApp Digest for Users or Admins
 */
export function generateWhatsAppDigest(
  entities: LuzEntity[],
  families: YouthCenterFamily[],
  bookings: BookingRecord[],
  mode: 'user_weekly' | 'admin_system',
  lang: Language,
  businesses: import('../types/luz').CommunityBusiness[] = [],
  appEnv: import('../types/luz').AppEnvironment = 'prod',
  referralsCount: number = 0
): string {
  const envTagHe = appEnv === 'test' ? ' [סביבת TEST — נתוני הדגמה]' : '';
  const envTagEn = appEnv === 'test' ? ' [TEST Sandbox]' : '';

  if (mode === 'user_weekly') {
    const events = entities.filter((e) => e.type === 'event' || e.type === 'workshop');
    const services = entities.filter((e) => e.type === 'service');
    const rentals = entities.filter((e) => e.type === 'rental');

    if (lang === 'he') {
      return [
        `*LUZ גואה — הסיכום השבועי מהבוט "בן"*${envTagHe}`,
        `היי חברים! הנה מה שקורה השבוע בקהילה שלנו בקולום, פטנם ופאלולם:`,
        ``,
        `*אירועים ומפגשי מתנ"ס השבוע (${events.length}):*`,
        ...(events.length === 0
          ? ['• טרם פורסמו אירועים מאומתים לשבוע זה']
          : events.map(
              (e) =>
                `• *${e.titleHe}* (${e.area}) — ${e.date ? e.date : 'קבוע שבועי'} בשעה ${e.startTime || '17:00'} | ${
                  e.priceCurrency === 'CONTACT'
                    ? 'פרטים בהרשמה'
                    : e.priceCurrency === 'FREE'
                    ? 'כניסה חופשית'
                    : `${e.priceAmount} ${e.priceCurrency}`
                }`
            )),
        ``,
        `*בעלי עסקים ומטפלים בקהילה (${businesses.length}):*`,
        ...(businesses.length === 0
          ? ['• האינדקס פתוח לרישום בעלי עסקים מאומתים']
          : businesses.map(
              (b) =>
                `• *${b.businessNameHe}* (${b.specialtyHe}) — ${b.ownerNameHe}, ${b.area}`
            )),
        ``,
        `*משאבי קהילה ושירותים שעתיים (${services.length}):*`,
        ...(services.length === 0
          ? ['• אין משאבים שעתיים פעילים כרגע']
          : services.map(
              (s) =>
                `• *${s.titleHe}* — עם ${s.hostName} (${s.timeSlots?.length || 4} משבצות פנויות השבוע)`
            )),
        ``,
        `*בתים וסאבלטים פנויים בקהילה (${rentals.length}):*`,
        ...(rentals.length === 0
          ? ['• אין בתים פנויים רשומים כרגע']
          : rentals.map(
              (r) =>
                `• *${r.titleHe}* (${r.bedrooms} חדרים ב-${r.area}) — זמין מ-${r.availableFrom} עד ${r.availableTo} | ${
                  r.pricePerMonth ? `₹${r.pricePerMonth.toLocaleString()}/חודש` : `₹${r.pricePerNight}/לילה`
                }`
            )),
        ``,
        `*רוצים להירשם, לקבוע תור לבעל עסק או לעדכן העדפות?* פשוט השיבו לי כאן בוואטסאפ בטקסט חופשי!`,
      ].join('\n');
    } else {
      return [
        `*LUZ Goa — Weekly Community Digest from "Ben"*${envTagEn}`,
        `Here is what's happening this week across Colomb, Patnem & Palolem:`,
        ``,
        `*Events & Youth Center Sessions (${events.length}):*`,
        ...(events.length === 0
          ? ['• No verified events scheduled yet']
          : events.map(
              (e) =>
                `• *${e.titleEn}* (${e.area}) — ${e.date || 'Weekly'} at ${e.startTime || '17:00'} | ${
                  e.priceCurrency === 'CONTACT'
                    ? 'Contact for details'
                    : e.priceCurrency === 'FREE'
                    ? 'Free'
                    : `${e.priceAmount} ${e.priceCurrency}`
                }`
            )),
        ``,
        `*Community Businesses & Practitioners (${businesses.length}):*`,
        ...(businesses.length === 0
          ? ['• Directory open for verified community businesses']
          : businesses.map(
              (b) => `• *${b.businessNameEn}* (${b.specialtyEn}) — ${b.ownerNameEn}, ${b.area}`
            )),
        ``,
        `*Hourly Community Spaces (${services.length}):*`,
        ...services.map((s) => `• *${s.titleEn}* — ${s.hostName} (${s.area})`),
        ``,
        `*Community Homes & Sublets (${rentals.length}):*`,
        ...rentals.map(
          (r) =>
            `• *${r.titleEn}* (${r.bedrooms}BHK in ${r.area}) — ${r.availableFrom} to ${r.availableTo} | ${
              r.pricePerMonth ? `₹${r.pricePerMonth.toLocaleString()}/mo` : `₹${r.pricePerNight}/night`
            }`
        ),
        ``,
        `*Reply directly to Ben on WhatsApp in free text to book or update your family profile!*`,
      ].join('\n');
    }
  }

  // Admin System Digest
  const totalKids = families.reduce((acc, f) => acc + f.children.length, 0);
  const connectedCalendars = entities.filter(
    (e) => e.type === 'service' && e.calendarSyncStatus === 'connected'
  ).length;
  const manualCalendars = entities.filter(
    (e) => e.type === 'service' && e.calendarSyncStatus !== 'connected'
  ).length;

  if (lang !== 'he') {
    return [
      `*LUZ Admin Digest — System Status & Integrations*${envTagEn}`,
      `Active Environment: ${appEnv === 'prod' ? 'PROD (Verified Live Data Only)' : 'TEST (Demo Sandbox)'}`,
      `Generated Date: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      `Core Team: Naor, Shay Eliyahu, Shay Zaluf`,
      ``,
      `1. *Entities, Events & Community Businesses:*`,
      `• One-Time Events: ${entities.filter((e) => e.type === 'event').length}`,
      `• Recurring Classes & Youth Center: ${entities.filter((e) => e.type === 'workshop').length}`,
      `• Community Business Directory: ${businesses.length} verified businesses`,
      `• Hourly Resources & Spaces: ${entities.filter((e) => e.type === 'service').length}`,
      `• Home Rentals (Date Ranges): ${entities.filter((e) => e.type === 'rental').length}`,
      ``,
      `2. *Integrations & Real-Time Lead Attribution:*`,
      `• Provider Referral Attribution (#LUZ-XXXX + UTM) & Alerts (Sheets CRM / Gmail / Telegram): Active & Live`,
      `• Total Provider Referrals & Leads from LUZ: ${referralsCount}`,
      `• WhatsApp AI Bot ("Ben" - Unofficial API): Connected & Running`,
      `• WhatsApp Group Scraper: Active (${entities.filter((e) => e.ingestionSource === 'scraper' || e.ingestionSource === 'whatsapp_dm').length} items ingested)`,
      `• Provider Calendar Sync: ${connectedCalendars} auto-synced, ${manualCalendars} manual management`,
      ``,
      `3. *Youth Center & Engagement:*`,
      `• Active Bookings & RSVPs: ${bookings.length}`,
      `• Registered Colomb Youth Center Families: ${families.length} families (${totalKids} enrolled kids)`,
      `• Monthly Youth Center Budget Est.: ₪${totalKids * 200} (~$${totalKids * 65})`,
    ].join('\n');
  }

  return [
    `*LUZ Admin Digest — דוח מצב מערכת ואינטגרציות*${envTagHe}`,
    `סביבה פעילה: ${appEnv === 'prod' ? 'PROD (נתוני אמת בלבד)' : 'TEST (סביבת בדיקות והדגמה)'}`,
    `תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}`,
    `צוות: נאור, שי אליהו, שי זלוף`,
    ``,
    `1. *צבר תוכן, אירועים ובעלי עסקים במערכת:*`,
    `• אירועים חד-פעמיים: ${entities.filter((e) => e.type === 'event').length}`,
    `• חוגים ומפגשי מתנ"ס: ${entities.filter((e) => e.type === 'workshop').length}`,
    `• בעלי עסקים בקהילה (לפי קטגוריות): ${businesses.length}`,
    `• משאבים ושירותים שעתיים: ${entities.filter((e) => e.type === 'service').length}`,
    `• בתים להשכרה (Date Range): ${entities.filter((e) => e.type === 'rental').length}`,
    ``,
    `2. *סטטוס אינטגרציות והתראות לידים בזמן אמת:*`,
    `• שיוך פניות לספקים (#LUZ-XXXX + UTM) והתראות לידים (Email / Webhook / Telegram): מחובר ופעיל`,
    `• סך הפניות ולידים לספקים שנרשמו מ-LUZ: ${referralsCount}`,
    `• בוט וואטסאפ ("בן" - Unofficial API): מחובר ופעיל`,
    `• Scraper קבוצות וואטסאפ (שי): פעיל (${entities.filter((e) => e.ingestionSource === 'scraper' || e.ingestionSource === 'whatsapp_dm').length} פריטים נקלטו מהצ'אט)`,
    `• חיבורי יומן ספקים (Calendly/Google): ${connectedCalendars} מסונכרנים אוטומטית, ${manualCalendars} בניהול ידני`,
    ``,
    `3. *מרכז הנוער והרשמות (Engagement):*`,
    `• הזמנות, תורים לעסקים ו-RSVPs פעילים: ${bookings.length}`,
    `• משפחות רשומות למתנ"ס בקולום: ${families.length} משפחות (${totalKids} ילדים רשומים)`,
    `• אומדן תקציב מתנ"ס חודשי: ₪${totalKids * 200} (כ-$${totalKids * 65})`,
  ].join('\n');
}
