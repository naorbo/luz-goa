import {
  LuzEntity,
  CommunityBusiness,
  BookingRecord,
  YouthCenterFamily,
  UserProfile,
} from '../types/luz';

/**
 * ============================================================================
 * PRODUCTION DATA (סביבת PROD — מידע אמיתי ומאומת בלבד!)
 * ============================================================================
 * קובץ זה מכיל אך ורק מידע אמיתי שנאור מספק ואישר להעלות לפרודקשן.
 * אין להכניס לכאן נתוני דמו או דוגמאות פיקטיביות.
 */

export const PROD_ENTITIES: LuzEntity[] = [];

export const PROD_BUSINESSES: CommunityBusiness[] = [];

export const PROD_BOOKINGS: BookingRecord[] = [];

export const PROD_FAMILIES: YouthCenterFamily[] = [];

export const PROD_USER_PROFILE: UserProfile = {
  name: '',
  phone: '',
  preferredArea: 'All',
  kidsAges: [],
  interests: [],
  digestFrequency: 'weekly',
  rawPreferenceText: '',
};
