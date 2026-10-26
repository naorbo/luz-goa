export type Language = 'he' | 'en';

export type AppEnvironment = 'prod' | 'test';

export type EntityType = 'event' | 'workshop' | 'service' | 'rental';

export type ServiceSubtype = 'provider' | 'space' | 'medical';

export type GoaArea = 'Colomb' | 'Patnem' | 'Palolem' | 'Agonda' | 'Galgibaga';

export type AudienceGroup = 'youth_11_15' | 'kids_8_15' | 'families' | 'adults' | 'all';

export type IngestionSource = 'web' | 'whatsapp_dm' | 'scraper';

export type CalendarSyncStatus = 'connected' | 'manual' | 'error';

export type VolunteerRole =
  | 'activities'
  | 'community'
  | 'scheduling'
  | 'logistics'
  | 'finance'
  | 'ideas';

export type BusinessCategory =
  | 'body_therapy'      // טיפולי גוף, מים, נשימה ורפואה משלימה
  | 'beauty_cosmetics'  // שיער, תספורות, ראסטות, רוקחות טבעית וטיפוח
  | 'tattoo_art'        // טיפול באומנות, יצירה, עיצוב ואיור
  | 'fitness_martial'   // תנועה, פילאטיס, יוגה, שחייה וכושר
  | 'food_culinary'     // אוכל ביתי, טאלי, ג׳חנון, חלות וירקן במשלוח
  | 'kids_education'    // חינוך, חוגי ילדים, שחמט, מחול והדרכת הורים
  | 'transport_local'   // מוניות, ריקשות ושירותי דרך מקומיים
  | 'pro_services';     // ויזות וטיסות, עיצוב ושירותים מקצועיים

export interface BusinessServiceOffer {
  id: string;
  nameHe: string;
  nameEn: string;
  durationMinutes?: number;
  priceAmount: number;
  priceCurrency: 'INR' | 'ILS' | 'USD' | 'FREE' | 'CONTACT';
}

export interface CommunityBusiness {
  id: string;
  category: BusinessCategory;
  specialtyHe: string;
  specialtyEn: string;
  businessNameHe: string;
  businessNameEn: string;
  ownerNameHe: string;
  ownerNameEn: string;
  bioHe: string;
  bioEn: string;
  area: GoaArea;
  locationDetailsHe: string;
  locationDetailsEn: string;
  homeVisitAvailable: boolean;
  phone: string;
  instagramHandle?: string;
  websiteUrl?: string;
  whatsappGroupUrl?: string;
  preferredContactLang?: Language;
  imageUrl: string;
  availableDays: number[]; // 0..6
  timeSlots: string[];
  bookedSlots: Record<string, string[]>;
  servicesMenu: BusinessServiceOffer[];
  tags: string[];
  verifiedCommunityMember: boolean;
}

export interface BookedRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  guestName: string;
}

export interface LuzEntity {
  id: string;
  type: EntityType;
  titleHe: string;
  titleEn: string;
  descriptionHe: string;
  descriptionEn: string;
  area: GoaArea;
  locationDetailsHe: string;
  locationDetailsEn: string;
  mapUrl?: string;
  websiteUrl?: string;
  whatsappGroupUrl?: string;
  preferredContactLang?: Language;
  hostName: string;
  hostRoleHe?: string;
  hostRoleEn?: string;
  hostPhone: string;
  priceAmount: number;
  priceCurrency: 'INR' | 'ILS' | 'USD' | 'FREE' | 'CONTACT';
  audience: AudienceGroup;
  ingestionSource: IngestionSource;
  imageUrl: string;
  tags: string[];
  rsvpCount: number;
  maxCapacity?: number;

  // 1. One-time Event ('event')
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string;   // HH:mm

  // 2. Recurring Workshop / Youth Center Class ('workshop')
  dayOfWeek?: number; // 0 (Sun) to 6 (Sat)
  weekCycle?: 'all' | 'week_a' | 'week_b';
  isYouthCenter?: boolean;

  // 3. Hourly Service / Community Space / Medical ('service')
  serviceSubtype?: ServiceSubtype;
  slotDurationMinutes?: number;
  availableDays?: number[]; // e.g., [1, 2, 3, 4, 5]
  timeSlots?: string[]; // e.g., ["09:00", "10:30", "14:00", "16:30"]
  bookedSlots?: Record<string, string[]>; // { "2026-10-28": ["10:30"] }
  calendarSyncStatus?: CalendarSyncStatus;
  bookingMode?: 'instant' | 'request';

  // 4. Property Rental ('rental')
  availableFrom?: string; // YYYY-MM-DD
  availableTo?: string;   // YYYY-MM-DD
  bedrooms?: number;
  hasFiberWifi?: boolean;
  wifiSpeedMbps?: number;
  hasPowerBackup?: boolean;
  pricePerNight?: number;
  pricePerMonth?: number;
  bookedRanges?: BookedRange[];
}

export interface BookingRecord {
  id: string;
  referralCode?: string;
  entityId: string;
  entityTitleHe: string;
  entityTitleEn: string;
  entityType: EntityType | 'business';
  customerName: string;
  customerPhone: string;
  participantsCount: number;
  selectedDate?: string;
  selectedSlot?: string;
  selectedServiceOffer?: string;
  rentalFrom?: string;
  rentalTo?: string;
  totalPrice?: number;
  currency?: string;
  reminderChannel: 'whatsapp' | 'calendar_ics' | 'both';
  notes?: string;
  createdAt: string;
  status: 'confirmed' | 'pending';
}

export type ReferralActionType =
  | 'whatsapp_click'
  | 'slot_booking'
  | 'event_rsvp'
  | 'rental_booking'
  | 'website_click'
  | 'whatsapp_group_click'
  | 'instagram_click'
  | 'youth_center_signup';

export interface LeadReferralEvent {
  id: string;
  referralCode: string;
  environment: AppEnvironment;
  actionType: ReferralActionType;
  providerId: string;
  providerNameHe: string;
  providerNameEn: string;
  ownerOrHostName: string;
  providerPhone: string;
  providerCategoryOrType: string;
  area: GoaArea;
  providerContactLang: Language;
  customerName?: string;
  customerPhone?: string;
  serviceOrDateSummary?: string;
  channelsDispatched: Array<'webhook' | 'telegram' | 'email'>;
  createdAt: string;
}

export interface NotificationChannelsConfig {
  enableEmail: boolean;
  adminEmail: string;
  web3formsAccessKey?: string;
  enableWebhook: boolean;
  webhookUrl: string;
  enableTelegram: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  sendRealAlertsInTestEnv: boolean;
}

export interface ChildDetail {
  id: string;
  name: string;
  age: number;
  grade: string;
  interests: string;
}

export interface YouthCenterFamily {
  id: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  area: GoaArea;
  emergencyContact: string;
  medicalNotes: string;
  volunteerRole: VolunteerRole;
  consentVolunteer: boolean;
  children: ChildDetail[];
  createdAt: string;
}

export interface UserProfile {
  name: string;
  phone: string;
  preferredArea: GoaArea | 'All';
  kidsAges: number[];
  interests: string[];
  digestFrequency: 'weekly' | 'monthly';
  rawPreferenceText: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ben';
  text: string;
  timestamp: string;
  recommendedEntityIds?: string[];
  recommendedBusinessIds?: string[];
  createdEntityId?: string;
  profileUpdated?: boolean;
}
