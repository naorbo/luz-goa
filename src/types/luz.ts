export type Language = 'he' | 'en';

export type AppEnvironment = 'prod' | 'test';

export type EntityType = 'event' | 'workshop' | 'service' | 'rental';

export type ServiceSubtype = 'provider' | 'space' | 'medical';

export type GoaArea = 'Colomb' | 'Patnem' | 'Palolem' | 'Agonda' | 'Galgibaga';

export type AudienceGroup = 'youth_11_15' | 'kids_8_15' | 'families' | 'adults' | 'all';

export type IngestionSource = 'web' | 'whatsapp_dm' | 'scraper';

export type CalendarSyncStatus = 'connected' | 'manual' | 'error';

export type UserRole = 'guest' | 'member' | 'provider' | 'youth_staff' | 'admin';

export type EntityModerationStatus = 'approved' | 'pending_review' | 'archived';

export type VolunteerRole =
  | 'activities'
  | 'community'
  | 'scheduling'
  | 'logistics'
  | 'finance'
  | 'ideas';

export type BusinessCategory =
  | 'spaces_cafes'      // מתחמי אירוח, בתי קפה, יוגה ואקולוגיה
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
  endorsementsCount?: number;
  updatedAt?: string;
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
  hostNameEn?: string;
  hostRoleHe?: string;
  hostRoleEn?: string;
  hostPhone: string;
  priceAmount: number;
  priceCurrency: 'INR' | 'ILS' | 'USD' | 'FREE' | 'CONTACT';
  audience: AudienceGroup;
  ingestionSource: IngestionSource;
  moderationStatus?: EntityModerationStatus;
  imageUrl: string;
  tags: string[];
  rsvpCount: number;
  maxCapacity?: number;
  endorsementsCount?: number;
  createdAt?: string;
  updatedAt?: string;

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

  // 5. Custom Dynamic Fields ('customFields')
  customFields?: CustomFieldItem[];
}

export interface CustomFieldItem {
  id: string;
  key: string;
  value: string;
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
  status: 'confirmed' | 'pending' | 'cancelled';
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

export type AnalyticsEventType =
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
  | 'business_view'
  | 'business_card_click'
  | 'business_whatsapp_click'
  | 'business_slot_click'
  | 'business_website_click'
  | 'business_phone_click'
  | 'category_filter_click'
  | 'area_filter_click'
  | 'day_filter_click'
  | 'search_performed'
  | 'hero_cta_click'
  | 'youth_center_click'
  | 'tab_switch'
  | string;

export interface ClickAnalyticsEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  environment: AppEnvironment;
  eventType: AnalyticsEventType;
  targetType?: 'event' | 'business' | 'youth' | 'general';
  targetId?: string;
  targetTitleHe?: string;
  targetTitleEn?: string;
  providerName?: string;
  providerOrHostName?: string;
  providerPhone?: string;
  area?: GoaArea;
  category?: string;
  categoryOrType?: string;
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
  uid?: string;
  role?: UserRole;
  name: string;
  phone: string;
  email?: string;
  preferredArea: GoaArea | 'All';
  kidsAges: number[];
  interests: string[];
  digestFrequency: 'weekly' | 'monthly';
  rawPreferenceText: string;
  savedEntityIds?: string[];
  savedBusinessIds?: string[];
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

// ============================================================================
// FUTURE-PROOF COMMUNITY OS ENTITIES (Phase 2 & 3 Expansion Ready)
// ============================================================================

/**
 * 1. WhatsApp Scraper & AI Moderation Queue ('moderation_queue')
 * Holds events/listings auto-detected from WhatsApp groups before or after publishing
 */
export interface ScrapedListingDraft {
  id: string;
  rawText: string;
  sourceGroupName: string;
  senderPhone: string;
  detectedType: EntityType | 'marketplace' | 'rideshare';
  titleHe: string;
  titleEn: string;
  area: GoaArea;
  date?: string;
  startTime?: string;
  priceAmount: number;
  priceCurrency: 'INR' | 'ILS' | 'USD' | 'FREE' | 'CONTACT';
  confidenceScore: number; // 0..100
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

/**
 * 2. Community Marketplace & Scooter/Gear Board ('marketplace')
 * For buying/selling/renting scooters (Activa/Enfield), baby gear, inverters, surfboards
 */
export type MarketplaceCategory =
  | 'scooter_bike'
  | 'baby_kids_gear'
  | 'power_internet_tech'
  | 'surf_sports'
  | 'furniture_kitchen'
  | 'giveaway_free';

export interface MarketplaceListing {
  id: string;
  category: MarketplaceCategory;
  titleHe: string;
  titleEn: string;
  descriptionHe: string;
  descriptionEn: string;
  priceAmount: number;
  priceCurrency: 'INR' | 'ILS' | 'USD' | 'FREE';
  isRental: boolean; // e.g., Scooter monthly rental vs outright sale
  area: GoaArea;
  sellerName: string;
  sellerPhone: string;
  imageUrl?: string;
  availableFrom?: string;
  status: 'available' | 'reserved' | 'sold';
  createdAt: string;
}

/**
 * 3. Airport Taxi Pool & Israel-Goa Courier Mule ('rideshares')
 * For sharing taxis to Dabolim (GOI) / Mopa (GOX) or bringing small items/meds from Israel
 */
export type RideshareType = 'airport_taxi' | 'israel_goa_mule' | 'local_carpool';

export interface RideshareOffer {
  id: string;
  type: RideshareType;
  direction: 'to_goa' | 'from_goa' | 'local';
  airportCode?: 'GOI' | 'GOX'; // Dabolim or Mopa
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  fromLocation: string;
  toLocation: string;
  seatsOrWeightAvailable: string;
  organizerName: string;
  organizerPhone: string;
  notesHe?: string;
  notesEn?: string;
  status: 'open' | 'full' | 'completed';
  createdAt: string;
}

/**
 * 4. Community Urgent Board & Infrastructure Alerts ('urgent_board')
 * For power cuts, fiber internet outages, lost & found, and medical recommendations
 */
export type AlertCategory = 'power_internet' | 'medical_urgent' | 'lost_found' | 'community_notice';

export interface CommunityAlert {
  id: string;
  category: AlertCategory;
  severity: 'info' | 'warning' | 'urgent';
  titleHe: string;
  titleEn: string;
  bodyHe: string;
  bodyEn: string;
  area: GoaArea | 'All';
  reporterName: string;
  reporterPhone?: string;
  active: boolean;
  createdAt: string;
  expiresAt?: string;
}

/**
 * 5. Community Trust & Vouching ('endorsements')
 * Residents vouching for trusted local drivers, nannies, therapists, and villa owners
 */
export interface CommunityEndorsement {
  id: string;
  targetId: string; // entityId or businessId
  targetType: 'entity' | 'business';
  authorName: string;
  authorPhoneHash?: string;
  commentHe?: string;
  commentEn?: string;
  createdAt: string;
}
