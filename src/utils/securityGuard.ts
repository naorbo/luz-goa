// ============================================================================
// LUZ GOA COMMUNITY OS — ZERO-TRUST SECURITY GUARD
// Rate Limiting, Input Sanitization, File Magic-Byte Verification & Auth Checks
// ============================================================================

export type RateLimitAction =
  | 'auth_attempt'
  | 'signup_registration'
  | 'booking_submit'
  | 'entity_create'
  | 'business_create'
  | 'referral_dispatch'
  | 'file_upload';

interface RateLimitPolicy {
  maxRequests: number;
  windowMs: number;
  errorHe: string;
  errorEn: string;
}

const RATE_LIMIT_POLICIES: Record<RateLimitAction, RateLimitPolicy> = {
  auth_attempt: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 5 attempts per 15 minutes
    errorHe: 'חרגת ממספר ניסיונות ההתחברות המותר (5 ב-15 דקות). נסה שוב מאוחר יותר.',
    errorEn: 'Too many authentication attempts (max 5 per 15 min). Please wait before retrying.',
  },
  signup_registration: {
    maxRequests: 3,
    windowMs: 10 * 60 * 1000, // 3 signups per 10 minutes
    errorHe: 'בוצעו יותר מדי הרשמות בפרק זמן קצר. אנא המתן מספר דקות.',
    errorEn: 'Rate limit exceeded for registrations (max 3 per 10 min). Please wait a few minutes.',
  },
  booking_submit: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5 bookings per 5 minutes
    errorHe: 'בוצעו יותר מדי בקשות תור בדקות האחרונות. אנא המתן.',
    errorEn: 'Too many booking requests in a short window. Please wait a moment.',
  },
  entity_create: {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
    errorHe: 'הגעת למגבלת פרסום האירועים/בתים לדקות הקרובות.',
    errorEn: 'Rate limit reached for creating listings. Please wait a few minutes.',
  },
  business_create: {
    maxRequests: 3,
    windowMs: 15 * 60 * 1000,
    errorHe: 'הגעת למגבלת רישום העסקים לדקות הקרובות.',
    errorEn: 'Rate limit reached for business registrations. Please wait.',
  },
  referral_dispatch: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 referrals per minute
    errorHe: 'קצב פניות גבוה מדי. אנא המתן מספר שניות.',
    errorEn: 'Referral rate limit reached. Please wait a few seconds.',
  },
  file_upload: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000,
    errorHe: 'הגעת למגבלת העלאת הקבצים. אנא המתן מספר דקות.',
    errorEn: 'File upload rate limit exceeded. Please wait a few minutes.',
  },
};

const RATE_LIMIT_STORAGE_PREFIX = 'luz_rl_v1_';
const memoryBuckets = new Map<string, number[]>();

export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  errorHe?: string;
  errorEn?: string;
}

/**
 * Enforces sliding-window rate limits per action.
 */
export function enforceRateLimit(action: RateLimitAction): RateLimitCheckResult {
  const policy = RATE_LIMIT_POLICIES[action];
  const now = Date.now();
  const key = `${RATE_LIMIT_STORAGE_PREFIX}${action}`;

  let timestamps: number[] = memoryBuckets.get(key) || [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        timestamps = parsed.filter((t) => typeof t === 'number');
      }
    }
  } catch {
    // Fallback to in-memory bucket
  }

  // Prune expired timestamps outside the sliding window
  const activeTimestamps = timestamps.filter((t) => now - t < policy.windowMs);

  if (activeTimestamps.length >= policy.maxRequests) {
    const oldest = activeTimestamps[0] || now;
    const retryAfterSeconds = Math.max(1, Math.ceil((policy.windowMs - (now - oldest)) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
      errorHe: policy.errorHe,
      errorEn: policy.errorEn,
    };
  }

  activeTimestamps.push(now);
  memoryBuckets.set(key, activeTimestamps);
  try {
    localStorage.setItem(key, JSON.stringify(activeTimestamps));
  } catch {
    // Ignore quota errors
  }

  return {
    allowed: true,
    remaining: Math.max(0, policy.maxRequests - activeTimestamps.length),
    retryAfterSeconds: 0,
  };
}

/**
 * Strips XSS vectors (<script>, event handlers, javascript: URIs, control chars) and clamps length.
 */
export function sanitizeInputText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/<\s*\/?\s*(script|iframe|object|embed|svg|link|style|meta)[^>]*>/gi, '')
    .replace(/on[a-z]+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates international / Indian / Israeli phone numbers strictly.
 */
export function sanitizeAndValidatePhone(phone: unknown): { valid: boolean; cleaned: string } {
  if (typeof phone !== 'string') return { valid: false, cleaned: '' };
  const cleaned = phone.replace(/[^\d+\-()\s]/g, '').trim().slice(0, 25);
  const digitsOnly = cleaned.replace(/\D/g, '');
  const valid = digitsOnly.length >= 7 && digitsOnly.length <= 15 && /^[+0-9()-\s]+$/.test(cleaned);
  return { valid, cleaned };
}

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB strict ceiling

export interface FileValidationResult {
  valid: boolean;
  errorHe?: string;
  errorEn?: string;
  sanitizedFileName?: string;
}

/**
 * Validates file upload size, MIME type, extension allowlist, and binary magic bytes
 * (prevents disguised .exe / .html / .svg files renamed to .jpg).
 */
export async function validateSafeImageUpload(
  file: File,
  maxBytes: number = MAX_UPLOAD_SIZE_BYTES
): Promise<FileValidationResult> {
  if (!file) {
    return {
      valid: false,
      errorHe: 'לא נבחר קובץ.',
      errorEn: 'No file selected.',
    };
  }

  // 1. Check file size ceiling
  if (file.size <= 0 || file.size > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      errorHe: `גודל הקובץ חורג מהמותר (מקסימום ${maxMb}MB).`,
      errorEn: `File size exceeds maximum limit (${maxMb}MB).`,
    };
  }

  // 2. Check strict MIME type allowlist (blocks image/svg+xml, text/html, application/*)
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      errorHe: 'סוג קובץ לא מורשה. מותרים רק קבצי תמונה מסוג JPG, PNG או WebP.',
      errorEn: 'Disallowed file type. Only JPG, PNG, and WebP images are permitted.',
    };
  }

  // 3. Check extension allowlist and sanitize file name
  const lowerName = file.name.toLowerCase().trim();
  const hasValidExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      errorHe: 'סיומת הקובץ אינה חוקית. השתמש ב-.jpg, .png או .webp בלבד.',
      errorEn: 'Invalid file extension. Use .jpg, .png, or .webp only.',
    };
  }

  // 4. Inspect binary Magic Bytes header to verify actual file signature
  try {
    const slice = file.slice(0, 12);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    const isWebp =
      bytes[0] === 0x52 && // 'R'
      bytes[1] === 0x49 && // 'I'
      bytes[2] === 0x46 && // 'F'
      bytes[3] === 0x46 && // 'F'
      bytes[8] === 0x57 && // 'W'
      bytes[9] === 0x45 && // 'E'
      bytes[10] === 0x42 && // 'B'
      bytes[11] === 0x50; // 'P'

    if (!isJpeg && !isPng && !isWebp) {
      return {
        valid: false,
        errorHe: 'חתימת הקובץ הבינארית אינה תואמת לתמונה תקינה (נחסם מטעמי אבטחה).',
        errorEn: 'Binary file signature does not match a valid image (blocked for security).',
      };
    }
  } catch {
    return {
      valid: false,
      errorHe: 'שגיאה באימות תקינות הקובץ.',
      errorEn: 'Failed to inspect file binary signature.',
    };
  }

  const sanitizedFileName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 100);

  return {
    valid: true,
    sanitizedFileName,
  };
}
