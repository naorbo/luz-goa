export type Language = 'he' | 'en';

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
  hostName: string;
  hostRoleHe?: string;
  hostRoleEn?: string;
  hostPhone: string;
  priceAmount: number;
  priceCurrency: 'INR' | 'ILS' | 'USD' | 'FREE';
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
  bookedSlots?: Record<string, string[]>; // { "2026-10-20": ["10:30"] }
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
  entityId: string;
  entityTitleHe: string;
  entityTitleEn: string;
  entityType: EntityType;
  customerName: string;
  customerPhone: string;
  participantsCount: number;
  selectedDate?: string;
  selectedSlot?: string;
  rentalFrom?: string;
  rentalTo?: string;
  totalPrice?: number;
  currency?: string;
  reminderChannel: 'whatsapp' | 'calendar_ics' | 'both';
  notes?: string;
  createdAt: string;
  status: 'confirmed' | 'pending';
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
  createdEntityId?: string;
  profileUpdated?: boolean;
}
