import { LuzEntity } from '../types/luz';

export const BEIT_BINA_PAYMENT_URL = 'https://bit.ly/47elZLv';
export const BEIT_BINA_WEEKLY_POSTER_URL = '/images/events/beit-bina-weekly-nov8-14.jpg';
export const BEIT_BINA_SPREADSHEET_ID = '1BYBN6bJIAFR0wN8_aX1LlsoiQ8jlevExlrCbn-lr5Pg';
export const BEIT_BINA_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1BYBN6bJIAFR0wN8_aX1LlsoiQ8jlevExlrCbn-lr5Pg/edit?gid=0#gid=0';
export const DEFAULT_BEIT_BINA_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbxzn3MjuFAX1CETxkzcvWV1S1c762y2WV5KMEczM_uaLsAvV1X2IQhO5anpWcMPCww_4Q/exec';

export const CORE_BEIT_BINA_EVENTS: LuzEntity[] = [
  // 1. יום ראשון 8.11 | 10:30 — טורניר שחמט + הזמנת ג'חנון מראש (הרשמה ותשלום בקישור חיצוני)
  {
    id: 'bina-2026-11-08-chess-jachnun',
    type: 'event',
    titleHe: 'טורניר שחמט + הזמנת ג׳חנון מראש',
    titleEn: 'Chess Tournament + Pre-ordered Jachnun @ Beit BINA Goa',
    descriptionHe: `בוקר יום ראשון בבית בינ"ה בגואה! ♟️🧺
מוזמנים ומוזמנות לפתוח את השבוע בטורניר שחמט קהילתי באווירה מעולה, לצד ג׳חנון ביתי מפנק בהזמנה מראש (רסק, ביצה וסחוג).

🔗 ההרשמה והתשלום מראש לטורניר השחמט ולהזמנת הג׳חנון מתבצעים בקישור הייעודי:
https://bit.ly/47elZLv`,
    descriptionEn: `Sunday morning at Beit BINA in Goa! Join our community chess tournament alongside homemade Jachnun (pre-order required).
Register & pay in advance via: https://bit.ly/47elZLv`,
    area: 'Palolem',
    locationDetailsHe: 'מתחם בית בינ"ה בגואה (פאלולם / פטנם)',
    locationDetailsEn: 'Beit BINA Hub, South Goa',
    websiteUrl: BEIT_BINA_PAYMENT_URL,
    externalRegistrationUrl: BEIT_BINA_PAYMENT_URL,
    hostName: 'בית בינ"ה בגואה',
    hostNameEn: 'Beit BINA Goa',
    hostRoleHe: 'הבית של היהדות הישראלית · מרחב הל"ב',
    hostRoleEn: 'Home of Israeli Judaism in Goa',
    hostPhone: '+972-52-478-0033',
    preferredContactLang: 'he',
    priceAmount: 0,
    priceCurrency: 'CONTACT',
    audience: 'all',
    ingestionSource: 'web',
    imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=1000',
    tags: ['בית בינ"ה', 'שחמט', 'ג׳חנון', 'יום ראשון', 'Beit BINA'],
    rsvpCount: 18,
    date: '2026-11-08',
    dayOfWeek: 0, // Sunday
    weekCycle: 'all',
    isBeitBina: true,
    startTime: '10:30',
    endTime: '13:30',
  },

  // 2. יום ראשון 8.11 | 21:00 — אימון movement עם אוריאל וירין
  {
    id: 'bina-2026-11-08-movement',
    type: 'workshop',
    titleHe: 'אימון Movement עם אוריאל וירין',
    titleEn: 'Evening Movement Training with Uriel & Yarin @ Beit BINA',
    descriptionHe: `סוגרים את יום ראשון בתנועה! 🧘‍♂️
אימון Movement משותף בבית בינ"ה בגואה בהנחיית אוריאל וירין — עבודה על תנועתיות, זרימה, גמישות, שליטה בגוף וחיבור בין כוח לרכות. מתאים לכל הרמות.

מוזמנים להירשם מראש באתר כדי לשריין מקום במתחם!`,
    descriptionEn: `Evening Movement session at Beit BINA Goa led by Uriel & Yarin — mobility, flow, body control, and functional movement for all levels.`,
    area: 'Palolem',
    locationDetailsHe: 'מתחם בית בינ"ה בגואה',
    locationDetailsEn: 'Beit BINA Hub, South Goa',
    hostName: 'אוריאל וירין · בית בינ"ה',
    hostNameEn: 'Uriel & Yarin · Beit BINA',
    hostRoleHe: 'מנחי תנועה וקליסטניקס בבית בינ"ה',
    hostRoleEn: 'Movement & Calisthenics Facilitators',
    hostPhone: '+972-52-478-0033',
    preferredContactLang: 'he',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'adults',
    ingestionSource: 'web',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=1000',
    tags: ['בית בינ"ה', 'Movement', 'תנועה', 'אוריאל וירין', 'כושר'],
    rsvpCount: 14,
    date: '2026-11-08',
    dayOfWeek: 0, // Sunday
    weekCycle: 'all',
    isBeitBina: true,
    startTime: '21:00',
    endTime: '22:30',
  },

  // 3. יום שני 9.11 | 20:00 — חג הדיוואלי–לימוד משותף: האור, החושך ומה שביניהם
  {
    id: 'bina-2026-11-09-diwali-study',
    type: 'event',
    titleHe: 'חג הדיוואלי — לימוד משותף: האור, החושך ומה שביניהם',
    titleEn: 'Diwali Gathering & Shared Study: Light, Darkness & Everything Between',
    descriptionHe: `ערב מיוחד בבית בינ"ה לכבוד חג האורות ההודי — הדיוואלי! 🪔✨
ניפגש ללימוד משותף, שיחה פתוחה והשראה סביב מוטיב האור, החושך ומה שביניהם בתרבות המקומית בהודו ובמסורת הישראלית-יהודית.

המפגש בעברית ובאווירה חמה ומחברת — אנא הירשמו מראש באתר.`,
    descriptionEn: `Special Diwali evening at Beit BINA Goa: shared textual and cultural study exploring light, darkness, and what lies between them in Indian and Israeli traditions.`,
    area: 'Palolem',
    locationDetailsHe: 'מתחם בית בינ"ה בגואה',
    locationDetailsEn: 'Beit BINA Hub, South Goa',
    hostName: 'בית בינ"ה בגואה',
    hostNameEn: 'Beit BINA Goa',
    hostRoleHe: 'הבית של היהדות הישראלית · מרחב הל"ב',
    hostRoleEn: 'Beit BINA Goa Team',
    hostPhone: '+972-52-478-0033',
    preferredContactLang: 'he',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'all',
    ingestionSource: 'web',
    imageUrl: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&q=80&w=1000',
    tags: ['בית בינ"ה', 'דיוואלי', 'לימוד משותף', 'תרבות', 'Diwali'],
    rsvpCount: 22,
    date: '2026-11-09',
    dayOfWeek: 1, // Monday
    weekCycle: 'all',
    isBeitBina: true,
    startTime: '20:00',
    endTime: '22:00',
  },

  // 4. יום שלישי 10.11 | 10:00 — אימון קליסטניקס עם אוריאל וירין
  {
    id: 'bina-2026-11-10-calisthenics',
    type: 'workshop',
    titleHe: 'אימון קליסטניקס עם אוריאל וירין',
    titleEn: 'Morning Calisthenics Workout with Uriel & Yarin @ Beit BINA',
    descriptionHe: `בוקר של כוח ותנועה בבית בינ"ה בגואה! 🤸‍♂️
אימון קליסטניקס (כוח משקל גוף) מודרך עם אוריאל וירין — חיזוק פלג גוף עליון וליבה, עמידות ידיים, שליטה בתנועה ואנרגיה גבוהה לפתיחת היום. מתאים למתחילים ולמתקדמים.

מוזמנים להירשם מראש באתר!`,
    descriptionEn: `Morning bodyweight strength and Calisthenics session with Uriel & Yarin at Beit BINA Goa. Suitable for all levels.`,
    area: 'Palolem',
    locationDetailsHe: 'מתחם בית בינ"ה בגואה',
    locationDetailsEn: 'Beit BINA Hub, South Goa',
    hostName: 'אוריאל וירין · בית בינ"ה',
    hostNameEn: 'Uriel & Yarin · Beit BINA',
    hostRoleHe: 'מנחי תנועה וקליסטניקס בבית בינ"ה',
    hostRoleEn: 'Movement & Calisthenics Facilitators',
    hostPhone: '+972-52-478-0033',
    preferredContactLang: 'he',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'adults',
    ingestionSource: 'web',
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=1000',
    tags: ['בית בינ"ה', 'קליסטניקס', 'כושר', 'אוריאל וירין', 'Calisthenics'],
    rsvpCount: 16,
    date: '2026-11-10',
    dayOfWeek: 2, // Tuesday
    weekCycle: 'all',
    isBeitBina: true,
    startTime: '10:00',
    endTime: '11:30',
  },

  // 5. יום שלישי 10.11 | 16:30 — סדנת הכנת צמידים עם תמר ונעם
  {
    id: 'bina-2026-11-10-bracelets',
    type: 'workshop',
    titleHe: 'סדנת הכנת צמידים עם תמר ונעם',
    titleEn: 'Handmade Bracelets & Macrame Workshop with Tamar & Noam',
    descriptionHe: `אחר צהריים של יצירה, צבעים וחיבור בבית בינ"ה! 🧵✨
סדנת שזירה והכנת צמידים בעבודת יד בהנחיית תמר ונעם. כל החומרים והחוטים הצבעוניים מחכים לכם במתחם — בואו ליצור, לקשקש ולהכין מזכרת אישית מגואה.

ההשתתפות בהרשמה מראש באתר!`,
    descriptionEn: `Creative afternoon workshop at Beit BINA Goa: weaving colorful handmade bracelets with Tamar & Noam. All materials provided.`,
    area: 'Palolem',
    locationDetailsHe: 'מתחם בית בינ"ה בגואה',
    locationDetailsEn: 'Beit BINA Hub, South Goa',
    hostName: 'תמר ונעם · בית בינ"ה',
    hostNameEn: 'Tamar & Noam · Beit BINA',
    hostRoleHe: 'מנחות סדנת יצירה בבית בינ"ה',
    hostRoleEn: 'Craft Workshop Facilitators',
    hostPhone: '+972-52-478-0033',
    preferredContactLang: 'he',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'all',
    ingestionSource: 'web',
    imageUrl: 'https://images.unsplash.com/photo-1611591472159-259f7ce81187?auto=format&fit=crop&q=80&w=1000',
    tags: ['בית בינ"ה', 'יצירה', 'צמידים', 'תמר ונעם', 'סדנה'],
    rsvpCount: 15,
    date: '2026-11-10',
    dayOfWeek: 2, // Tuesday
    weekCycle: 'all',
    isBeitBina: true,
    startTime: '16:30',
    endTime: '18:30',
  },

  // 6. יום חמישי 12.11 | 20:00 — סדנת מרחב נשימה בהנחיית מירב
  {
    id: 'bina-2026-11-12-breathwork',
    type: 'workshop',
    titleHe: 'סדנת מרחב נשימה בהנחיית מירב',
    titleEn: 'Breathing Space (Breathwork) Workshop Facilitated by Merav',
    descriptionHe: `ערב של שקט, עומק ונשימה בבית בינ"ה בגואה 🧘‍♀️✨🌬️
מוזמנים ומוזמנות לסדנת "מרחב נשימה" מיוחדת בהנחיית מירב — מפגש חווייתי המאפשר לעצור את המרוץ, להתחבר פנימה דרך תרגולי נשימה מודעת ולהרפות גוף ונפש לקראת סוף השבוע.

מספר המקומות במרחב מוגבל — אנא הירשמו מראש באתר.`,
    descriptionEn: `Evening Breathwork & mindful breathing workshop facilitated by Merav at Beit BINA Goa. Pre-registration required.`,
    area: 'Palolem',
    locationDetailsHe: 'מתחם בית בינ"ה בגואה',
    locationDetailsEn: 'Beit BINA Hub, South Goa',
    hostName: 'מירב · בית בינ"ה',
    hostNameEn: 'Merav · Beit BINA',
    hostRoleHe: 'מנחת מרחב נשימה בבית בינ"ה',
    hostRoleEn: 'Breathwork Facilitator',
    hostPhone: '+972-52-478-0033',
    preferredContactLang: 'he',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'adults',
    ingestionSource: 'web',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1000',
    tags: ['בית בינ"ה', 'נשימה', 'מירב', 'מדיטציה', 'Breathwork'],
    rsvpCount: 19,
    date: '2026-11-12',
    dayOfWeek: 4, // Thursday
    weekCycle: 'all',
    isBeitBina: true,
    startTime: '20:00',
    endTime: '22:00',
  },

  // 7. יום שישי 13.11 | 18:30 — קבלת שבת ישראלית חילונית וסעודה מפנקת (הרשמה ותשלום בקישור חיצוני)
  {
    id: 'bina-2026-11-13-kabbalat-shabbat',
    type: 'event',
    titleHe: 'קבלת שבת ישראלית חילונית וסעודה מפנקת',
    titleEn: 'Israeli Secular Kabbalat Shabbat & Festive Community Dinner @ Beit BINA',
    descriptionHe: `מקבלים את השבת יחד בבית בינ"ה בגואה! 🥂🥘🎸
מוזמנים ומוזמנות לקבלת שבת ישראלית חילונית מרגשת עם שירה משותפת, גיטרות, טקסטים מעוררי השראה, הדלקת נרות, חלות טריות וסעודת שישי עשירה ומפנקת סביב שולחנות ארוכים.

מחכים לראותכם בבית בינ"ה! ❤️
🔗 הרשמה ותשלום מראש לארוחת שישי בקישור:
https://bit.ly/47elZLv`,
    descriptionEn: `Join us at Beit BINA Goa for an Israeli secular Kabbalat Shabbat with live acoustic music, singing, blessings, and a lavish Friday night dinner.
Pre-registration & payment required: https://bit.ly/47elZLv`,
    area: 'Palolem',
    locationDetailsHe: 'מתחם בית בינ"ה בגואה',
    locationDetailsEn: 'Beit BINA Hub, South Goa',
    websiteUrl: BEIT_BINA_PAYMENT_URL,
    externalRegistrationUrl: BEIT_BINA_PAYMENT_URL,
    hostName: 'בית בינ"ה בגואה',
    hostNameEn: 'Beit BINA Goa',
    hostRoleHe: 'הבית של היהדות הישראלית · מרחב הל"ב',
    hostRoleEn: 'Home of Israeli Judaism in Goa',
    hostPhone: '+972-52-478-0033',
    preferredContactLang: 'he',
    priceAmount: 0,
    priceCurrency: 'CONTACT',
    audience: 'all',
    ingestionSource: 'web',
    imageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1000',
    tags: ['בית בינ"ה', 'קבלת שבת', 'ארוחת שישי', 'קהילה', 'Shabbat'],
    rsvpCount: 42,
    date: '2026-11-13',
    dayOfWeek: 5, // Friday
    weekCycle: 'all',
    isBeitBina: true,
    startTime: '18:30',
    endTime: '22:00',
  },
];
