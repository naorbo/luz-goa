import {
  LuzEntity,
  CommunityBusiness,
  BookingRecord,
  YouthCenterFamily,
  UserProfile,
} from '../types/luz';
import {
  INITIAL_ENTITIES,
  INITIAL_BOOKINGS,
  INITIAL_FAMILIES,
  INITIAL_USER_PROFILE,
} from './seedData';

/**
 * ============================================================================
 * TEST / SANDBOX DATA (סביבת TEST — נתוני הדגמה ובדיקות בלבד)
 * ============================================================================
 */

export const TEST_ENTITIES: LuzEntity[] = INITIAL_ENTITIES;

export const TEST_BUSINESSES: CommunityBusiness[] = [
  {
    id: 'biz-shiatsu-omer',
    category: 'body_therapy',
    specialtyHe: 'מטפל שיאצו ורפואה סינית (דמו)',
    specialtyEn: 'Shiatsu & Chinese Medicine Practitioner (Demo)',
    businessNameHe: 'קליניקת מגע שקט — שיאצו ודיקור',
    businessNameEn: 'Quiet Touch — Shiatsu & Acupuncture Studio',
    ownerNameHe: 'עומר דגן',
    ownerNameEn: 'Omer Dagan',
    bioHe:
      'מטפל מוסמך בשיאצו, טווינא ודיקור סיני עם 9 שנות ניסיון. טיפולים לשחרור כאבי גב וצוואר, איזון מערכת העצבים והתאוששות מגלישה ואימונים. קליניקה שקטה וממוזגת בקולום או הגעה לבית הלקוח.',
    bioEn:
      'Certified Shiatsu, Tuina, and Acupuncture therapist with 9 years of experience. Focused on back/neck pain relief, nervous system reset, and post-surf recovery in an AC studio in Colomb.',
    area: 'Colomb',
    locationDetailsHe: 'סמטת הדקלים, קולום (אפשרות לביקור בית)',
    locationDetailsEn: 'Palm Lane, Colomb (Home visits available)',
    homeVisitAvailable: true,
    phone: '+972-54-210-9988',
    instagramHandle: '@omer.shiatsu.goa',
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=1000',
    availableDays: [1, 2, 3, 4, 5],
    timeSlots: ['09:00', '10:30', '14:30', '16:30'],
    bookedSlots: {
      '2026-10-27': ['10:30'],
    },
    servicesMenu: [
      {
        id: 's-1',
        nameHe: 'טיפול שיאצו מלא על מזרן (60 דק׳)',
        nameEn: 'Full Traditional Shiatsu Session (60m)',
        durationMinutes: 60,
        priceAmount: 1800,
        priceCurrency: 'INR',
      },
      {
        id: 's-2',
        nameHe: 'שיאצו משולב דיקור וכוסות רוח (75 דק׳)',
        nameEn: 'Shiatsu + Acupuncture & Cupping (75m)',
        durationMinutes: 75,
        priceAmount: 2300,
        priceCurrency: 'INR',
      },
    ],
    tags: ['שיאצו', 'דיקור', 'כאבי גב', 'עיסוי רפואי', 'Shiatsu'],
    verifiedCommunityMember: true,
  },
  {
    id: 'biz-cosmetics-noa',
    category: 'beauty_cosmetics',
    specialtyHe: 'קוסמטיקאית טבעית ופרא-רפואית (דמו)',
    specialtyEn: 'Clinical & Botanical Cosmetician (Demo)',
    businessNameHe: 'Noa Glow — קוסמטיקה וטיפוח מותאם לאקלים טרופי',
    businessNameEn: 'Noa Glow — Tropical Skincare & Aesthetics',
    ownerNameHe: 'נועה כרמי',
    ownerNameEn: 'Noa Carmi',
    bioHe:
      'קוסמטיקאית מוסמכת המתמחה בשיקום העור מנזקי שמש ולחות טרופית, טיפולי פנים עמוקים, עיצוב גבות טבעי ורוקחות טבעית עדינה. חומרים נקיים והיגיינה מוקפדת.',
    bioEn:
      'Licensed cosmetician specializing in sun-recovery facials, tropical humidity balance, deep cleansing, and natural brow sculpting in a serene AC room in Patnem.',
    area: 'Patnem',
    locationDetailsHe: 'סטודיו ממוזג, השביל השקט פטנם',
    locationDetailsEn: 'Private AC Studio, Quiet Lane Patnem',
    homeVisitAvailable: false,
    phone: '+972-52-339-4411',
    instagramHandle: '@noaglow.goa',
    imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=1000',
    availableDays: [0, 1, 2, 3, 4],
    timeSlots: ['10:00', '12:00', '15:00', '17:00'],
    bookedSlots: {},
    servicesMenu: [
      {
        id: 'c-1',
        nameHe: 'טיפול פנים עמוק ושיקום מנזקי שמש',
        nameEn: 'Deep Cleansing & Sun-Recovery Facial',
        durationMinutes: 75,
        priceAmount: 2400,
        priceCurrency: 'INR',
      },
      {
        id: 'c-2',
        nameHe: 'טיפול זוהר מהיר + עיסוי פנים גוואשה',
        nameEn: 'Express Glow Facial & Gua Sha Sculpt',
        durationMinutes: 45,
        priceAmount: 1500,
        priceCurrency: 'INR',
      },
    ],
    tags: ['קוסמטיקאית', 'טיפול פנים', 'טיפוח', 'גבות', 'Skincare'],
    verifiedCommunityMember: true,
  },
  {
    id: 'biz-tattoo-libby',
    category: 'tattoo_art',
    specialtyHe: 'מקעקעת ואמנית איור (דמו)',
    specialtyEn: 'Fine-Line & Botanical Tattoo Artist (Demo)',
    businessNameHe: 'Libby Ink — סטודיו קעקועים אישי וסטרילי',
    businessNameEn: 'Libby Ink — Private Fine-Line Tattoo Studio',
    ownerNameHe: 'ליבי שחר',
    ownerNameEn: 'Libby Shahar',
    bioHe:
      'מקעקעת מתל אביב (כיום בקולום) המתמחה בקווים עדינים (Fine Line), איורים בוטניים ועיצובים אישיים בהזמנה. עבודה עם ציוד חד-פעמי מיובא בסטנדרט סטרילי מחמיר בסטודיו פרטי ונעים.',
    bioEn:
      'Tel Aviv tattoo artist based in Colomb specializing in delicate fine-line work, botanical motifs, and custom personal illustrations. Strict medical-grade sterile single-use imported needles.',
    area: 'Colomb',
    locationDetailsHe: 'סטודיו פרטי בקולום (בתיאום מראש)',
    locationDetailsEn: 'Private Studio, Colomb (By appointment)',
    homeVisitAvailable: false,
    phone: '+972-50-772-1919',
    instagramHandle: '@libby.ink.studio',
    imageUrl: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?auto=format&fit=crop&q=80&w=1000',
    availableDays: [1, 2, 3, 4, 6],
    timeSlots: ['11:00', '14:00', '17:00'],
    bookedSlots: {
      '2026-10-28': ['14:00'],
    },
    servicesMenu: [
      {
        id: 't-1',
        nameHe: 'ייעוץ, סקיצה אישית וקעקוע Fine-Line קטן-בינוני',
        nameEn: 'Custom Sketch & Small/Medium Fine-Line Tattoo',
        durationMinutes: 90,
        priceAmount: 4500,
        priceCurrency: 'INR',
      },
      {
        id: 't-2',
        nameHe: 'פגישת תכנון סקיצה לפרויקט גדול',
        nameEn: 'Design Consultation for Large Piece',
        durationMinutes: 45,
        priceAmount: 0,
        priceCurrency: 'INR',
      },
    ],
    tags: ['מקעקעת', 'קעקועים', 'Fine Line', 'אומנות', 'Tattoo'],
    verifiedCommunityMember: true,
  },
  {
    id: 'biz-boxing-roi',
    category: 'fitness_martial',
    specialtyHe: 'מאמן איגרוף ואומנויות לחימה (דמו)',
    specialtyEn: 'Boxing & Muay Thai Coach (Demo)',
    businessNameHe: 'Goa Fight Club — איגרוף קלאסי ותאילנדי לנוער ומבוגרים',
    businessNameEn: 'Goa Boxing & Muay Thai — Personal & Youth Coaching',
    ownerNameHe: 'רועי מזרחי',
    ownerNameEn: 'Roi Mizrahi',
    bioHe:
      'מאמן איגרוף מוסמך (מכון וינגייט) עם ניסיון בהדרכת בני נוער, ילדים ומבוגרים. דגש על טכניקה, ביטחון עצמי, כושר גופני ופריקת אנרגיה חיובית. כולל כפפות וציוד מלא.',
    bioEn:
      'Wingate-certified boxing & pad-work coach for teens, kids, and adults. Building technique, confidence, discipline, and stamina. All gloves and pads provided.',
    area: 'Palolem',
    locationDetailsHe: 'מתחם האימונים המוצל פאלולם / הגעה לבית',
    locationDetailsEn: 'Shaded Training Deck Palolem / Home sessions',
    homeVisitAvailable: true,
    phone: '+972-54-812-3300',
    instagramHandle: '@roi.boxing.goa',
    imageUrl: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&q=80&w=1000',
    availableDays: [0, 1, 2, 3, 4, 5],
    timeSlots: ['07:30', '09:00', '16:30', '18:00'],
    bookedSlots: {},
    servicesMenu: [
      {
        id: 'b-1',
        nameHe: 'אימון איגרוף אישי 1-על-1 (60 דק׳)',
        nameEn: '1-on-1 Personal Boxing Session (60m)',
        durationMinutes: 60,
        priceAmount: 1500,
        priceCurrency: 'INR',
      },
      {
        id: 'b-2',
        nameHe: 'אימון זוגי / הורה וילד (60 דק׳)',
        nameEn: 'Duo / Parent & Teen Boxing Session (60m)',
        durationMinutes: 60,
        priceAmount: 2200,
        priceCurrency: 'INR',
      },
    ],
    tags: ['מאמן איגרוף', 'איגרוף', 'נוער', 'אומנויות לחימה', 'Boxing'],
    verifiedCommunityMember: true,
  },
  {
    id: 'biz-fitness-dana',
    category: 'fitness_martial',
    specialtyHe: 'מאמנת ספורט, כוח ופילאטיס (דמו)',
    specialtyEn: 'Functional Fitness & Strength Coach (Demo)',
    businessNameHe: 'Move With Dana — אימוני כוח, חיטוב ופילאטיס',
    businessNameEn: 'Move With Dana — Strength, Mobility & Pilates',
    ownerNameHe: 'דנה אברהם',
    ownerNameEn: 'Dana Avraham',
    bioHe:
      'מאמנת ספורט וכושר פונקציונלי, מתמחה באימוני כוח לנשים וגברים, שיקום רצפת אגן לאחר לידה ואימוני בוקר מול הים בפטנם וקולום.',
    bioEn:
      'Certified athletic & functional strength trainer offering morning beach workouts, postpartum core rehab, and personal strength training in Patnem & Colomb.',
    area: 'Patnem',
    locationDetailsHe: 'סטודיו הגן בפטנם / דק הבוקר מול הים',
    locationDetailsEn: 'Garden Studio Patnem / Beachfront Deck',
    homeVisitAvailable: true,
    phone: '+972-52-600-7788',
    instagramHandle: '@movewithdana',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=1000',
    availableDays: [1, 2, 3, 4, 5],
    timeSlots: ['07:30', '08:45', '17:00', '18:15'],
    bookedSlots: {},
    servicesMenu: [
      {
        id: 'f-1',
        nameHe: 'אימון כושר אישי מותאם מטרה (55 דק׳)',
        nameEn: 'Personal Functional Training (55m)',
        durationMinutes: 55,
        priceAmount: 1400,
        priceCurrency: 'INR',
      },
      {
        id: 'f-2',
        nameHe: 'כרטיסיית 4 אימונים בקבוצה קטנה (עד 6 משתתפות)',
        nameEn: '4-Pack Small Group Strength Sessions',
        durationMinutes: 55,
        priceAmount: 2400,
        priceCurrency: 'INR',
      },
    ],
    tags: ['מאמנת ספורט', 'כושר', 'פילאטיס', 'אימון כוח', 'Fitness'],
    verifiedCommunityMember: true,
  },
  {
    id: 'biz-bakery-tamar',
    category: 'food_culinary',
    specialtyHe: 'מאפיית מחמצת וחלות לשבת (דמו)',
    specialtyEn: 'Artisan Sourdough & Shabbat Challah (Demo)',
    businessNameHe: 'התנור של תמר — מחמצת, חלות ועוגות שמרים',
    businessNameEn: 'Tamar’s Oven — Fresh Sourdough & Friday Challah',
    ownerNameHe: 'תמר גולן',
    ownerNameEn: 'Tamar Golan',
    bioHe:
      'לחמי מחמצת טריים באמצע השבוע, וחלות קלועות, בבאקה שוקולד וקובנה בהזמנה מראש לימי שישי בקולום ופטנם.',
    bioEn:
      'Slow-fermented sourdough loaves mid-week, plus braided Friday Challah, chocolate babka, and traditional Kubaneh by pre-order in Colomb & Patnem.',
    area: 'Colomb',
    locationDetailsHe: 'איסוף מקולום (ליד שייליש) או משלוח בקהילה',
    locationDetailsEn: 'Pickup in Colomb or local delivery',
    homeVisitAvailable: true,
    phone: '+972-54-555-1234',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1000',
    availableDays: [2, 5],
    timeSlots: ['11:00', '13:00', '15:00'],
    bookedSlots: {},
    servicesMenu: [
      {
        id: 'k-1',
        nameHe: 'מארז שבת: 2 חלות גדולות + עוגת שמרים שוקולד',
        nameEn: 'Shabbat Bundle: 2 Large Challahs + Chocolate Babka',
        priceAmount: 950,
        priceCurrency: 'INR',
      },
    ],
    tags: ['חלות', 'אוכל ביתי', 'מחמצת', 'שבת', 'Bakery'],
    verifiedCommunityMember: true,
  },
];

export const TEST_BOOKINGS: BookingRecord[] = INITIAL_BOOKINGS;

export const TEST_FAMILIES: YouthCenterFamily[] = INITIAL_FAMILIES;

export const TEST_USER_PROFILE: UserProfile = INITIAL_USER_PROFILE;
