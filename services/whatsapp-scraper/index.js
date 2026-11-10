import express from 'express';
import QRCode from 'qrcode';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';

const PORT = process.env.PORT || 8080;
const GAS_WEBHOOK_URL =
  process.env.GAS_WEBHOOK_URL ||
  'https://script.google.com/macros/s/AKfycbwGwt1q-aWG9CWNrCqDNBx2NG3w_cKQhNFTTxJ2XmIlHGNIh_aK2xM6jDIjq9Yj2LGp/exec';

// Secret Admin Token configured via `fly secrets set SCRAPER_ADMIN_TOKEN=...`
const SCRAPER_ADMIN_TOKEN = process.env.SCRAPER_ADMIN_TOKEN || '';

// Target Community Group Name (Scraper Listener)
const TARGET_GROUP_KEYWORD = 'הקהילה! חיים בדרום גואה';
const TARGET_GROUP_ALIASES = [
  'הקהילה! חיים בדרום גואה',
  'חיים בדרום גואה',
  'דרום גואה',
];

// ============================================================================
// Youth Center Event Reminder Bot Configuration
// ============================================================================
const YOUTH_REMINDER_GROUP_NAME = 'Youth center parents';
const SAFE_TEST_RECIPIENT_PHONE = '972508878902';
const SAFE_TEST_RECIPIENT_JID = `${SAFE_TEST_RECIPIENT_PHONE}@s.whatsapp.net`;
const DAILY_REMINDER_TIME_IST = '09:30'; // 09:30 AM India Standard Time
const SITE_PUBLIC_URL = 'https://naorbo.github.io/luz-goa';

// STRICT SAFETY LOCK: 'test_dm_only' sends ONLY to 972508878902 and NEVER to the group
// until the user explicitly approves switching to 'group_live'.
let youthReminderMode = 'test_dm_only';
let autoSendSampleOnConnect = true;
const sentReminderLog = []; // [{ id, timestamp, recipient, eventTitle, mode }]
const sentDailyKeys = new Set(); // Track 'YYYY-MM-DD:eventId' to avoid duplicate daily sends

// Determine storage path: /data if mounted on Fly.io volume, else local ./auth_info
const DATA_DIR = fs.existsSync('/data') ? '/data' : path.resolve('./auth_info');
const AUTH_DIR = path.join(DATA_DIR, 'auth_info');
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

// ============================================================================
// 1. Network Security & CORS Headers Middleware
// ============================================================================
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Luz-Api-Key');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none';"
  );
  next();
});

// ============================================================================
// 2. Sliding-Window IP Rate Limiter Middleware
// ============================================================================
const rateLimitStore = new Map();

function createRateLimiter({ windowMs, maxRequests, label }) {
  return (req, res, next) => {
    const clientIp =
      (req.headers['fly-client-ip'] ||
        req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        'unknown')
        .toString()
        .split(',')[0]
        .trim();

    const key = `${label}:${clientIp}`;
    const now = Date.now();
    const history = (rateLimitStore.get(key) || []).filter((t) => now - t < windowMs);

    if (history.length >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - history[0])) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'Too Many Requests',
        messageHe: 'חרגת ממגבלת הבקשות המותרת. אנא המתן ונסה שוב.',
        retryAfterSeconds: retryAfterSec,
      });
    }

    history.push(now);
    rateLimitStore.set(key, history);
    next();
  };
}

const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  label: 'api',
});

const strictAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  label: 'auth',
});

// ============================================================================
// 3. Constant-Time Caller Authentication & XSS Sanitization Helpers
// ============================================================================
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeCompareToken(provided, expected) {
  if (!expected || typeof provided !== 'string' || !provided) return false;
  const bufA = Buffer.from(provided.trim(), 'utf8');
  const bufB = Buffer.from(expected.trim(), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function parseCookies(cookieHeader = '') {
  const out = {};
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = decodeURIComponent(pair.slice(idx + 1).trim());
      out[k] = v;
    }
  });
  return out;
}

function requireCallerAuth(req, res, next) {
  if (!SCRAPER_ADMIN_TOKEN) {
    return next();
  }

  const bearerHeader = req.headers.authorization || '';
  const bearerToken = bearerHeader.startsWith('Bearer ') ? bearerHeader.slice(7).trim() : '';
  const apiKeyHeader = (req.headers['x-luz-api-key'] || '').toString().trim();
  const queryToken = (req.query.token || '').toString().trim();
  const cookies = parseCookies(req.headers.cookie || '');
  const cookieToken = cookies.luz_admin_session || '';

  const candidate = bearerToken || apiKeyHeader || queryToken || cookieToken;

  if (safeCompareToken(candidate, SCRAPER_ADMIN_TOKEN)) {
    if (queryToken) {
      res.setHeader(
        'Set-Cookie',
        `luz_admin_session=${encodeURIComponent(SCRAPER_ADMIN_TOKEN)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
      );
    }
    return next();
  }

  if (req.accepts('html')) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8">
        <title>אימות אדמין — LUZ Goa Listener</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #1c2e24; color: #faf8f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .box { background: #263d30; padding: 32px; border-radius: 16px; width: 100%; max-width: 380px; box-shadow: 0 12px 32px rgba(0,0,0,0.3); text-align: center; }
          input { width: 100%; box-sizing: border-box; padding: 12px; border-radius: 10px; border: 1px solid #426b54; background: #15231b; color: #fff; margin: 16px 0; font-size: 14px; }
          button { width: 100%; padding: 12px; border-radius: 10px; border: none; background: #d46b54; color: #fff; font-weight: bold; cursor: pointer; font-size: 14px; }
        </style>
      </head>
      <body>
        <form class="box" method="POST" action="/auth">
          <h2>🔒 אימות מנהל מערכת — LUZ Goa</h2>
          <p style="font-size: 13px; color: #c8d6ce;">גישה למסך ה-QR ויומן ההודעות מוגנת באמצעות מפתח אדמין ומגבלת קצב (Rate Limit).</p>
          <input type="password" name="token" placeholder="הזן מפתח אדמין (SCRAPER_ADMIN_TOKEN)..." required autocomplete="off" />
          <button type="submit">כניסה מאובטחת</button>
        </form>
      </body>
      </html>
    `);
  }

  return res.status(401).json({
    error: 'Unauthorized',
    messageHe: 'נדרש אימות חוקי (Authorization Bearer / X-Luz-Api-Key) לגישה לנתיב זה.',
  });
}

app.post('/auth', strictAuthLimiter, (req, res) => {
  const token = (req.body?.token || '').toString().trim();
  if (!SCRAPER_ADMIN_TOKEN || safeCompareToken(token, SCRAPER_ADMIN_TOKEN)) {
    res.setHeader(
      'Set-Cookie',
      `luz_admin_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=86400`
    );
    return res.redirect('/qr');
  }
  return res.status(403).send('Invalid admin token.');
});

// ============================================================================
// State & Memory Storage
// ============================================================================
let currentQR = null;
let currentStatus = 'initializing';
let connectedUser = null;
let sockInstance = null;

// Group discovery cache
const groupCache = new Map(); // jid -> subject
let participatingGroups = []; // [{ id, subject, participantCount }]
let targetGroup = null; // { id, subject, participantCount } | null

// Rolling message log & event log
const recentMessages = []; // last 50 group messages
const recentEvents = [];   // last 30 parsed events

// Helper to check if a group matches the target group
function isTargetGroupSubject(subject = '') {
  if (!subject) return false;
  return TARGET_GROUP_ALIASES.some((alias) =>
    subject.toLowerCase().includes(alias.toLowerCase())
  );
}

// ============================================================================
// Event Text Parser (Goa Community Events — Extended for South Goa Community)
// ============================================================================
function parseEventFromText(text, senderNumber = '', groupName = '') {
  if (typeof text !== 'string') return null;
  const clean = text.trim().slice(0, 3000);

  // Keyword check: Extended to cover community events, gatherings, jams, wellness, etc.
  const isEvent =
    /אירוע|הופעה|סדנה|חוג|מפגש|יוגה|קונצרט|קבלת שבת|כרטיסים|כניסה|מוזמנים|שידור|ג'אם|גאם|מעגל שירה|מעגל|סאונד הילינג|קקאו|אקסטטיק|פילאטיס|צ'יקונג|מדיטציה|ארוחת שישי|קידוש|הקרנה|סרט|הרצאה|שוק|יריד|פסטיבל|טרק|טיול|אימון|טורניר|event|concert|workshop|gathering|acoustic|sunset|jam|music|ceremony|tickets|rsvp|ecstatic|kirtan|cacao|sound healing|meditation|circle/i.test(
      clean
    );

  if (!isEvent) return null;

  // Extract Area in South Goa
  let area = 'Patnem';
  if (/פטנם|פאטנם|patnem/i.test(clean)) area = 'Patnem';
  else if (/פאלולם|פלולם|palolem/i.test(clean)) area = 'Palolem';
  else if (/אגונדה|agonda/i.test(clean)) area = 'Agonda';
  else if (/גלגיבגה|galgibaga/i.test(clean)) area = 'Galgibaga';
  else if (/קולום|colomb/i.test(clean)) area = 'Colomb';

  // Extract Start Time
  const timeMatch = clean.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const startTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '18:00';

  // Extract Price
  let priceAmount = 0;
  let priceCurrency = 'FREE';
  const inrMatch = clean.match(/(\d[\d,]*)\s*(?:רופי|רופיות|rs|inr|₹)/i);
  const ilsMatch = clean.match(/(?:₪|ש"ח|שח)\s*(\d[\d,]*)|(\d[\d,]*)\s*(?:₪|ש"ח|שח)/i);
  if (inrMatch) {
    priceAmount = Math.min(500000, parseInt(inrMatch[1].replace(/,/g, ''), 10) || 0);
    priceCurrency = 'INR';
  } else if (ilsMatch) {
    const val = ilsMatch[1] || ilsMatch[2];
    priceAmount = Math.min(500000, parseInt(val.replace(/,/g, ''), 10) || 0);
    priceCurrency = 'ILS';
  }

  // Extract Title (Clean first line or first sentence)
  const lines = clean.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  let title = 'אירוע קהילתי בגואה';
  for (const line of lines) {
    const stripped = line.replace(/^[*-•~#\s]+/, '').trim();
    if (stripped.length >= 4 && !/^https?:\/\//i.test(stripped)) {
      title = stripped.length > 65 ? stripped.slice(0, 62) + '...' : stripped;
      break;
    }
  }

  // Extract Explicit Phone Number (if present in body); fallback to senderNumber
  const phoneMatch = clean.match(
    /(\+?\d{2,3}[-\s]?\d{2,4}[-\s]?\d{3}[-\s]?\d{3,4}|\b05\d[-\s]?\d{3}[-\s]?\d{4}\b)/
  );
  const hostPhone = phoneMatch ? phoneMatch[0].slice(0, 25) : senderNumber;

  return {
    title,
    area,
    startTime,
    priceAmount,
    priceCurrency,
    hostPhone,
    groupName: groupName || 'קבוצת וואטסאפ גואה',
    rawText: clean.slice(0, 1200),
    detectedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Webhook Dispatch to LUZ Google Apps Script (luzschedu@gmail.com)
// ============================================================================
async function forwardEventToGoogleCalendarAndSheets(eventData, groupInfo) {
  try {
    const isTarget = isTargetGroupSubject(groupInfo.groupName);
    const payload = {
      event: 'luz.whatsapp_scraper_event',
      referralCode: `WA-${isTarget ? 'COMMUNITY' : 'AUTO'}-${Date.now().toString().slice(-4)}`,
      environment: 'prod',
      actionType: isTarget ? 'target_community_group_event' : 'group_scraper_auto',
      actionLabelHe: isTarget
        ? `אירוע מקבוצת "${groupInfo.groupName}"`
        : `אירוע שנקלט אוטומטית מוואטסאפ (${groupInfo.groupName})`,
      provider: {
        nameHe: eventData.title,
        ownerOrHost: `קבוצת ${groupInfo.groupName || 'הקהילה! חיים בדרום גואה'}`,
        phone: eventData.hostPhone,
        area: eventData.area,
        contactLang: 'he',
      },
      customer: {
        name: `LUZ Scraper [${groupInfo.groupName || 'WhatsApp'}]`,
        phone: groupInfo.senderNumber || '',
      },
      serviceOrDateSummary: `${eventData.title} | ${eventData.area} בשעה ${eventData.startTime} | ${
        eventData.priceCurrency === 'FREE'
          ? 'כניסה חופשית'
          : `${eventData.priceAmount} ${eventData.priceCurrency}`
      }`,
      notes: eventData.rawText,
    };

    console.log(`[Webhook Dispatch] Forwarding event "${eventData.title}" from "${groupInfo.groupName}"...`);
    const res = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const resJson = await res.json().catch(() => ({}));
    console.log('[GAS Webhook Success]', resJson);
    return resJson;
  } catch (err) {
    console.error('[GAS Webhook Error]', err.message);
  }
}

// ============================================================================
// Group Metadata Discovery & Sync
// ============================================================================
async function refreshParticipatingGroups(sock) {
  if (!sock) return [];
  try {
    console.log('[Group Discovery] Fetching all participating groups from WhatsApp...');
    const rawGroups = await sock.groupFetchAllParticipating();
    const list = Object.entries(rawGroups).map(([id, g]) => {
      const subject = g.subject || 'ללא שם';
      groupCache.set(id, subject);
      return {
        id,
        subject,
        participantCount: Array.isArray(g.participants) ? g.participants.length : 0,
      };
    });

    participatingGroups = list;

    // Detect target group
    targetGroup =
      list.find((g) => isTargetGroupSubject(g.subject)) || null;

    if (targetGroup) {
      console.log(
        `[Target Group Found] ✅ "${targetGroup.subject}" (JID: ${targetGroup.id}, משתתפים: ${targetGroup.participantCount})`
      );
    } else {
      console.log(
        `[Target Group Alert] ⚠️ Target group "${TARGET_GROUP_KEYWORD}" not found among ${list.length} groups.`
      );
    }

    return list;
  } catch (err) {
    console.error('[Error fetching groups]', err.message);
    return participatingGroups;
  }
}

// ============================================================================
// Baileys WhatsApp Connection
// ============================================================================
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['LUZ Goa Community OS', 'Chrome', '1.0.0'],
  });

  sockInstance = sock;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      currentStatus = 'waiting_for_qr_scan';
      console.log('===> New QR Code ready at /qr');
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      currentStatus = 'disconnected';
      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        currentStatus = 'logged_out';
      }
    } else if (connection === 'open') {
      currentQR = null;
      currentStatus = 'connected';
      connectedUser = sock.user?.id || 'Connected';
      console.log('===> WhatsApp Connected successfully as:', connectedUser);

      // Fetch all participating groups & trigger queued sample reminder if requested
      setTimeout(async () => {
        await refreshParticipatingGroups(sock);
        if (autoSendSampleOnConnect) {
          autoSendSampleOnConnect = false;
          console.log(`[Youth Reminder Bot] Sending initial sample reminder to ${SAFE_TEST_RECIPIENT_PHONE}...`);
          await sendYouthEventReminder(YOUTH_CENTER_SCHEDULE[4] || YOUTH_CENTER_SCHEDULE[0], {
            forceTestDm: true,
          });
        }
      }, 3000);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid || '';
      const isGroup = remoteJid.endsWith('@g.us');

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        '';

      if (!text || text.length < 10 || text.length > 4000) continue;

      const senderNumber = (msg.key.participant || remoteJid).split('@')[0];

      // Resolve Group Subject
      let groupName = 'הודעה פרטית';
      if (isGroup) {
        groupName = groupCache.get(remoteJid) || '';
        if (!groupName) {
          try {
            const meta = await sock.groupMetadata(remoteJid);
            groupName = meta?.subject || 'קבוצה ללא שם';
            groupCache.set(remoteJid, groupName);
          } catch {
            groupName = 'קבוצת וואטסאפ';
          }
        }
      }

      const isTarget = isTargetGroupSubject(groupName);

      // Parse Event
      const parsed = parseEventFromText(text, senderNumber, groupName);

      // Log to recent messages buffer
      recentMessages.unshift({
        id: msg.key.id || String(Date.now()),
        timestamp: new Date().toISOString(),
        groupName,
        senderNumber,
        isGroup,
        isTargetGroup: isTarget,
        textSnippet: text.slice(0, 180),
        isEvent: !!parsed,
        eventTitle: parsed?.title || null,
      });
      if (recentMessages.length > 50) recentMessages.pop();

      // If parsed as event, register and forward
      if (parsed) {
        recentEvents.unshift({
          ...parsed,
          remoteJid,
          isGroup,
          isTargetGroup: isTarget,
        });
        if (recentEvents.length > 30) recentEvents.pop();

        console.log(`[Event Detected] "${parsed.title}" in "${groupName}" (Target: ${isTarget})`);

        await forwardEventToGoogleCalendarAndSheets(parsed, {
          groupName,
          senderNumber,
        });
      }
    }
  });
}

// ============================================================================
// Youth Center Events Schedule & 09:30 IST Automated Reminder Engine
// ============================================================================
const YOUTH_CENTER_SCHEDULE = [
  {
    id: 'yc-2026-11-06-odt-opening',
    titleHe: 'פתיחה חגיגית — Goa Teens House | משחק הכדור עם אילן',
    titleEn: 'Grand Opening — Goa Teens House | The Ball Game with Ilan',
    descriptionHe: 'מפגש היכרות וגיבוש לנוער: משחק הכדור עם אילן, בחירת שם למרחב, פירות מרעננים ולימונדה צוננת!',
    date: '2026-11-06',
    startTime: '10:00',
    endTime: '13:00',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: `${SITE_PUBLIC_URL}/images/events/goa-teens-opening-nov6.jpg`,
  },
  {
    id: 'yc-2026-11-07-movie',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe: 'ערב סרט קהילתי על מסך ענק עם פופקורן, שתייה ואווירה כיפית לנוער במתחם הבמבוק בקולום.',
    date: '2026-11-07',
    startTime: '18:00',
    endTime: '20:30',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-08-open-space',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Hangout',
    descriptionHe: 'זמן חופשי לבני נוער להיפגש, לבלות, לשחק, להאזין למוזיקה וליצור יחד במרחב הבמבוק הפתוח.',
    date: '2026-11-08',
    startTime: '16:30',
    endTime: '19:30',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-09-jam',
    titleHe: 'פעילות ג׳אם',
    titleEn: 'Sunset Music Jam Session',
    descriptionHe: 'ג׳אם מוזיקלי פתוח לנוער: גיטרות, כלי הקשה, שירה ואלתור משותף לקראת השקיעה.',
    date: '2026-11-09',
    startTime: '17:00',
    endTime: '19:30',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-12-board-games',
    titleHe: 'משחקי קופסה ואסטרטגיה',
    titleEn: 'Strategy Board Games & Tournaments',
    descriptionHe: 'אחר צהריים של משחקי אסטרטגיה, קטאן, שחמט, משחקי שולחן וטורנירים מהנים.',
    date: '2026-11-12',
    startTime: '16:30',
    endTime: '19:00',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-14-movie',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe: 'הקרנת סרט מרתק על מסך גדול עם פופקורן ושיחה משותפת אחרי הסרט.',
    date: '2026-11-14',
    startTime: '18:00',
    endTime: '20:30',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-15-open-space',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Hangout',
    descriptionHe: 'מרחב פתוח וחופשי לנוער: מפגש חברים, עבודה על פרויקטים אישיים, משחקים ושיח.',
    date: '2026-11-15',
    startTime: '16:30',
    endTime: '19:30',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-16-guest-talk',
    titleHe: 'הרצאת אורח',
    titleEn: 'Guest Speaker & Inspiring Stories',
    descriptionHe: 'הרצאת אורח מעוררת השראה ומפגש בגובה העיניים עם אורח מיוחד מהקהילה על מסעות חיים, יצירה ומדע.',
    date: '2026-11-16',
    startTime: '17:00',
    endTime: '18:45',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-19-art',
    titleHe: 'סדנת אומנות',
    titleEn: 'Youth Art & Creative Studio',
    descriptionHe: 'סדנת אומנות ויצירה מעשית: ציור, חומרים טבעיים ויצירה מקורית בהנחיית יוצרים מהקהילה.',
    date: '2026-11-19',
    startTime: '16:30',
    endTime: '19:00',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-21-movie',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe: 'ערב סרט קולנוע ופופקורן לנוער במתחם הבמבוק בקולום.',
    date: '2026-11-21',
    startTime: '18:00',
    endTime: '20:30',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-22-open-space',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Hangout',
    descriptionHe: 'מרחב פתוח למפגש, שיחה חופשית, משחקי שולחן ומוזיקה.',
    date: '2026-11-22',
    startTime: '16:30',
    endTime: '19:30',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-23-jam',
    titleHe: 'פעילות ג׳אם',
    titleEn: 'Acoustic Jam Session',
    descriptionHe: 'פעילות ג׳אם מוזיקלי פתוח: הביאו כלי נגינה או בואו להקשיב ולהשתתף בשירה ואלתור.',
    date: '2026-11-23',
    startTime: '17:00',
    endTime: '19:30',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-26-board-games',
    titleHe: 'משחקי קופסה',
    titleEn: 'Strategy Board Games & Challenges',
    descriptionHe: 'מפגש משחקי קופסה ואסטרטגיה: שחמט, קטאן, משחקי קלפים וטורניר קבוצתי מהנה.',
    date: '2026-11-26',
    startTime: '16:30',
    endTime: '19:00',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-28-movie',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe: 'הקרנת סרט סוף שבוע על מסך ענק עם כיבוד ופופקורן חם.',
    date: '2026-11-28',
    startTime: '18:00',
    endTime: '20:30',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-29-open-space',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Chill',
    descriptionHe: 'מרחב פתוח לנוער: זמן חופשי, פינת יצירה, מוזיקה ומפגש חברים.',
    date: '2026-11-29',
    startTime: '16:30',
    endTime: '19:30',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-30-guest-talk',
    titleHe: 'הרצאת אורח',
    titleEn: 'Guest Speaker & Youth Dialogue',
    descriptionHe: 'הרצאת אורח מרתקת בנושאי מדע, יצירתיות וסיפורי חיים מעוררי השראה.',
    date: '2026-11-30',
    startTime: '17:00',
    endTime: '18:45',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000',
  },
];

function buildYouthReminderCaption(ev) {
  const link = `${SITE_PUBLIC_URL}/?tab=youth_center&event=${encodeURIComponent(ev.id)}`;
  const volunteersList =
    Array.isArray(ev.volunteers) && ev.volunteers.length > 0
      ? ev.volunteers.map((v) => v.name || v).join(', ')
      : 'טרם שובץ — נשמח להורה מתנדב/ת דרך הקישור למטה! 🙏';

  return [
    `🌴 *תזכורת להיום במרכז הנוער גואה (Goa Teens House)* 🌴`,
    ``,
    `🎯 *פעילות:* ${ev.titleHe}${ev.titleEn ? ` (${ev.titleEn})` : ''}`,
    `📅 *תאריך:* ${ev.date || 'היום'}`,
    `🕒 *שעות:* ${ev.startTime || '16:30'}${ev.endTime ? ` – ${ev.endTime}` : ''}`,
    `📍 *מיקום:* ${ev.locationDetailsHe || 'מרכז הנוער קולום (ליד שייליש)'}`,
    `🤝 *הורה מתנדב/ת:* ${volunteersList}`,
    ``,
    `📝 *פרטי המפגש:*`,
    `${ev.descriptionHe || ''}`,
    ``,
    `👇 *להרשמה מהירה לאירוע ולשיבוץ הורה מתנדב:*`,
    link,
  ].join('\n');
}

async function fetchImageBuffer(imageUrl) {
  if (!imageUrl) return null;
  try {
    let resolvedUrl = imageUrl;
    if (imageUrl.startsWith('/')) {
      const localPath = path.resolve('../../public', imageUrl.slice(1));
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
      resolvedUrl = `${SITE_PUBLIC_URL}${imageUrl}`;
    } else if (imageUrl.startsWith('data:image/')) {
      const base64Part = imageUrl.split(',')[1];
      if (base64Part) return Buffer.from(base64Part, 'base64');
    }
    const res = await fetch(resolvedUrl);
    if (!res.ok) return null;
    const arrBuf = await res.arrayBuffer();
    return Buffer.from(arrBuf);
  } catch (err) {
    console.warn('[Youth Reminder Bot] Could not fetch image buffer:', err.message);
    return null;
  }
}

async function sendYouthEventReminder(ev, { forceTestDm = false } = {}) {
  if (!sockInstance || currentStatus !== 'connected') {
    return {
      ok: false,
      queued: true,
      message: 'הבוט ממתין לחיבור וואטסאפ (סריקת QR ב-/qr). ההודעה תישלח אוטומטית מיד עם החיבור!',
    };
  }

  // SAFETY ENFORCEMENT: Always send ONLY to 972508878902 unless explicitly unlocked to 'group_live'
  let targetJid = SAFE_TEST_RECIPIENT_JID;
  let recipientLabel = `בדיקה אישית (${SAFE_TEST_RECIPIENT_PHONE})`;

  if (!forceTestDm && youthReminderMode === 'group_live') {
    const youthGroup = participatingGroups.find(
      (g) => g.subject && g.subject.trim().toLowerCase() === YOUTH_REMINDER_GROUP_NAME.toLowerCase()
    );
    if (!youthGroup) {
      return {
        ok: false,
        message: `קבוצת "${YOUTH_REMINDER_GROUP_NAME}" לא נמצאה ברשימת הקבוצות המחוברות.`,
      };
    }
    targetJid = youthGroup.id;
    recipientLabel = `קבוצת "${youthGroup.subject}"`;
  }

  const caption = buildYouthReminderCaption(ev);
  const imgBuf = await fetchImageBuffer(ev.imageUrl);

  try {
    if (imgBuf) {
      await sockInstance.sendMessage(targetJid, {
        image: imgBuf,
        caption,
      });
    } else {
      await sockInstance.sendMessage(targetJid, {
        text: caption,
      });
    }

    const logItem = {
      id: `rem-${Date.now()}`,
      timestamp: new Date().toISOString(),
      recipient: recipientLabel,
      eventTitle: ev.titleHe,
      mode: forceTestDm ? 'test_dm_only' : youthReminderMode,
      withImage: !!imgBuf,
    };
    sentReminderLog.unshift(logItem);
    if (sentReminderLog.length > 30) sentReminderLog.pop();

    console.log(`[Youth Reminder Sent] ✅ "${ev.titleHe}" -> ${recipientLabel}`);
    return { ok: true, logItem, caption };
  } catch (err) {
    console.error('[Youth Reminder Error]', err.message);
    return { ok: false, message: err.message };
  }
}

// Daily 09:30 IST Scheduler (Checks every 45 seconds)
setInterval(async () => {
  if (!sockInstance || currentStatus !== 'connected') return;
  try {
    const nowIst = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
    );
    const yyyy = nowIst.getFullYear();
    const mm = String(nowIst.getMonth() + 1).padStart(2, '0');
    const dd = String(nowIst.getDate()).padStart(2, '0');
    const hh = String(nowIst.getHours()).padStart(2, '0');
    const min = String(nowIst.getMinutes()).padStart(2, '0');

    const dateStr = `${yyyy}-${mm}-${dd}`;
    const timeStr = `${hh}:${min}`;

    if (timeStr === DAILY_REMINDER_TIME_IST) {
      const todaysEvents = YOUTH_CENTER_SCHEDULE.filter((e) => e.date === dateStr);
      for (const ev of todaysEvents) {
        const key = `${dateStr}:${ev.id}`;
        if (!sentDailyKeys.has(key)) {
          sentDailyKeys.add(key);
          console.log(`[09:30 IST Scheduler] Sending daily reminder for ${ev.titleHe} (${dateStr})...`);
          await sendYouthEventReminder(ev);
        }
      }
    }
  } catch (err) {
    console.warn('[09:30 IST Scheduler Error]', err.message);
  }
}, 45 * 1000);

// ============================================================================
// Express Routes
// ============================================================================
app.get('/health', generalApiLimiter, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    status: 'ok',
    waStatus: currentStatus,
    connectedUser,
    youthReminderGroupName: YOUTH_REMINDER_GROUP_NAME,
    youthReminderMode,
    safeTestRecipientPhone: SAFE_TEST_RECIPIENT_PHONE,
    dailyReminderTimeIst: DAILY_REMINDER_TIME_IST,
    sentRemindersCount: sentReminderLog.length,
    targetGroupName: TARGET_GROUP_KEYWORD,
    targetGroupFound: !!targetGroup,
    targetGroupSubject: targetGroup?.subject || null,
    targetGroupId: targetGroup?.id || null,
    totalParticipatingGroups: participatingGroups.length,
    recentEventsCount: recentEvents.length,
    recentMessagesCount: recentMessages.length,
  });
});

// Trigger a sample or specific Youth Center event reminder (strictly to 972508878902 in test mode)
app.post('/send-youth-reminder', generalApiLimiter, async (req, res) => {
  const customEvent = req.body?.event;
  const targetEvent =
    customEvent && customEvent.titleHe
      ? customEvent
      : YOUTH_CENTER_SCHEDULE.find((e) => e.id === req.body?.eventId) ||
        YOUTH_CENTER_SCHEDULE[4] ||
        YOUTH_CENTER_SCHEDULE[0];

  if (!sockInstance || currentStatus !== 'connected') {
    autoSendSampleOnConnect = true;
    return res.json({
      ok: false,
      queued: true,
      waStatus: currentStatus,
      caption: buildYouthReminderCaption(targetEvent),
      message: 'הבוט ממתין לסריקת QR. התזכורת נכנסה לתור ותישלח אוטומטית ל-972508878902 מיד עם החיבור!',
    });
  }

  const result = await sendYouthEventReminder(targetEvent, { forceTestDm: true });
  return res.json(result);
});

app.get('/send-sample-youth-reminder', generalApiLimiter, async (req, res) => {
  const eventId = (req.query.eventId || '').toString().trim();
  const targetEvent =
    YOUTH_CENTER_SCHEDULE.find((e) => e.id === eventId) ||
    YOUTH_CENTER_SCHEDULE[4] ||
    YOUTH_CENTER_SCHEDULE[0];

  if (!sockInstance || currentStatus !== 'connected') {
    autoSendSampleOnConnect = true;
    return res.redirect('/qr');
  }

  await sendYouthEventReminder(targetEvent, { forceTestDm: true });
  return res.redirect('/');
});

app.get('/groups', generalApiLimiter, requireCallerAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (sockInstance && currentStatus === 'connected') {
    await refreshParticipatingGroups(sockInstance);
  }
  res.json({
    targetGroupKeyword: TARGET_GROUP_KEYWORD,
    targetGroupFound: !!targetGroup,
    targetGroup,
    groups: participatingGroups,
  });
});

app.get('/refresh-groups', generalApiLimiter, requireCallerAuth, async (req, res) => {
  if (sockInstance && currentStatus === 'connected') {
    await refreshParticipatingGroups(sockInstance);
  }
  res.redirect('/');
});

app.get('/qr', strictAuthLimiter, requireCallerAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (currentStatus === 'connected') {
    return res.send(`
      <div dir="rtl" style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2 style="color: #2e7d32;">✅ הוואטסאפ מחובר ופעיל!</h2>
        <p>המאזין מחובר כעת ומאזין לקבוצות.</p>
        <p><a href="/" style="display:inline-block;padding:10px 20px;background:#1c2e24;color:#fff;border-radius:8px;text-decoration:none;">חזרה ללוח הבקרה</a></p>
      </div>
    `);
  }

  if (!currentQR) {
    return res.send(`
      <div dir="rtl" style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2>מייצר קוד QR חדש...</h2>
        <p>רענן את הדף בעוד מספר שניות.</p>
        <script>setTimeout(() => location.reload(), 3500);</script>
      </div>
    `);
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(currentQR);
    res.send(`
      <div dir="rtl" style="font-family: sans-serif; text-align: center; padding: 40px; background: #faf8f5;">
        <h1 style="color: #1C2E24;">סריקת חיבור וואטסאפ — LUZ Goa</h1>
        <p style="color: #426B54; font-size: 16px;">
          פתח את הוואטסאפ בטלפון -> מכשירים מקושרים (Linked Devices) -> קשר מכשיר -> וסרוק את הקוד:
        </p>
        <div style="margin: 24px auto; padding: 16px; background: white; display: inline-block; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
          <img src="${qrDataUrl}" alt="WhatsApp QR Code" style="width: 280px; height: 280px;" />
        </div>
        <p style="color: #666; font-size: 12px;">הדף יתרענן אוטומטית ברגע שהחיבור יאושר.</p>
        <script>
          setInterval(async () => {
            const res = await fetch('/health');
            const data = await res.json();
            if (data.waStatus === 'connected') {
              location.href = '/';
            }
          }, 3500);
        </script>
      </div>
    `);
  } catch {
    res.status(500).send('Error rendering QR');
  }
});

// Main Dashboard
app.get('/', generalApiLimiter, requireCallerAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const isConnected = currentStatus === 'connected';

  res.send(`
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>LUZ Goa — מאזין קבוצת הקהילה בוואטסאפ</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #faf8f5; color: #1c2e24; margin: 0; padding: 20px; line-height: 1.5; }
        .container { max-width: 900px; margin: 0 auto; }
        .card { background: white; border-radius: 14px; padding: 22px; margin-bottom: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); border: 1px solid #ede8e0; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 12px; }
        .badge-green { background: #e8f5e9; color: #2e7d32; }
        .badge-amber { background: #fff8e1; color: #b78103; }
        .badge-red { background: #ffebee; color: #c62828; }
        .target-box { border-radius: 12px; padding: 18px; margin-top: 14px; }
        .target-box-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
        .target-box-warning { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
        th, td { text-align: right; padding: 10px; border-bottom: 1px solid #f0ebe1; }
        th { background: #f7f4ed; color: #2d4d3c; font-weight: 600; }
        .btn { display: inline-block; background: #1c2e24; color: white; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 500; cursor: pointer; border: none; }
        .btn-accent { background: #d46b54; }
        .btn:hover { opacity: 0.9; }
        .feed-msg { padding: 10px; border-bottom: 1px solid #f5efe6; font-size: 12px; }
        .feed-msg:last-child { border-bottom: none; }
        .tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; margin-left: 6px; }
        .tag-event { background: #dcfce7; color: #15803d; }
        .tag-target { background: #dbeafe; color: #1e40af; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header & Connection Status -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h2 style="margin: 0 0 6px 0;">🌴 LUZ Goa — מאזין הודעות ואירועים בוואטסאפ</h2>
              <div style="font-size: 13px; color: #5a7566;">מערכת סריקה, זיהוי וסנכרון אירועים ליומן ולדשבורד האדמין</div>
            </div>
            <div>
              <span class="badge ${isConnected ? 'badge-green' : 'badge-amber'}">
                ${isConnected ? 'מחובר לוואטסאפ ✅' : 'ממתין לסריקת QR ⏳'}
              </span>
            </div>
          </div>

          <div style="margin-top: 14px; font-size: 13px; color: #444;">
            ${
              isConnected
                ? `<span>מחובר כמספר: <code>${escapeHtml(connectedUser || '')}</code></span> | <span>קבוצות מנוטרות: <strong>${participatingGroups.length}</strong></span>`
                : `<a href="/qr" class="btn btn-accent">לחץ כאן לסריקת קוד QR לחיבור הוואטסאפ</a>`
            }
          </div>

          <!-- Target Group Status Banner -->
          <div class="target-box ${targetGroup ? 'target-box-success' : 'target-box-warning'}">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <strong>🎯 קבוצת היעד להאזנה: "${escapeHtml(TARGET_GROUP_KEYWORD)}"</strong>
                <div style="font-size: 13px; margin-top: 4px;">
                  ${
                    targetGroup
                      ? `✅ <strong>הקבוצה מנוטרת כעת בהצלחה!</strong> (שם: "${escapeHtml(
                          targetGroup.subject
                        )}", מזהה: <code>${escapeHtml(targetGroup.id)}</code>, משתתפים: ${
                          targetGroup.participantCount
                        })`
                      : `⚠️ <strong>הקבוצה טרם זוהתה בחשבון המחובר!</strong> ודא שהמספר המחובר (<code>${escapeHtml(
                          connectedUser || '...'
                        )}</code>) צורף לקבוצה "הקהילה! חיים בדרום גואה" בוואטסאפ.`
                  }
                </div>
              </div>
              <div>
                <a href="/refresh-groups" class="btn" style="background: #3b5f4c;">רענן קבוצות עכשיו 🔄</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Youth Center Morning Reminder Bot Card -->
        <div class="card" style="border: 2px solid #2e4a3b; background: #f4f9f5;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 style="margin: 0 0 6px 0; color: #1f3529;">🤖 בוט תזכורות בוקר למרכז הנוער (${escapeHtml(DAILY_REMINDER_TIME_IST)} שעון הודו)</h3>
              <p style="font-size: 13px; color: #3b5f4c; margin: 0 0 8px 0;">
                שולח אוטומטית בכל בוקר של אירוע בשעה <strong>09:30 (IST)</strong> תזכורת מעוצבת עם <strong>התמונה הרלוונטית של האירוע</strong>, פרטי האירוע וקישור ישיר להרשמה.
              </p>
              <div style="background: #fff8eb; border: 1px solid #f0d8a8; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #8a5300; display: inline-block;">
                🔒 <strong>מצב בדיקה בטוח פעיל:</strong> הקבוצה <code>${escapeHtml(YOUTH_REMINDER_GROUP_NAME)}</code> <strong>נעולה ולא תקבל שום הודעה</strong> עד לאישורך! כל ההודעות נשלחות אך ורק למספר האישי שלך: <code>${escapeHtml(SAFE_TEST_RECIPIENT_PHONE)}</code>.
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
              <a href="/send-sample-youth-reminder" class="btn btn-accent" style="font-size: 14px; padding: 10px 18px;">
                📲 שלח עכשיו הודעה לדוגמא (עם תמונה) ל-${escapeHtml(SAFE_TEST_RECIPIENT_PHONE)}
              </a>
              <span style="font-size: 11px; color: #555;">
                שולח מיד את האירוע הקרוב של מרכז הנוער לווטסאפ ${escapeHtml(SAFE_TEST_RECIPIENT_PHONE)}
              </span>
            </div>
          </div>
        </div>

        <!-- Detected Events Card -->
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0;">📅 אירועים שנקלטו מהוואטסאפ וסונכרנו ל-Google Sheets</h3>
            <span class="badge ${recentEvents.length > 0 ? 'badge-green' : 'badge-amber'}">
              ${recentEvents.length} אירועים
            </span>
          </div>

          ${
            recentEvents.length === 0
              ? '<p style="color: #777; font-size: 13px; margin-top: 14px;">טרם נקלטו הודעות אירועים. ברגע שתישלח הודעה בקבוצה "הקהילה! חיים בדרום גואה" (או בקבוצות נוספות), המערכת תזהה את האירוע, תחלץ שעה, אזור ומחיר, ותשלח התראה!</p>'
              : `
              <table>
                <thead>
                  <tr>
                    <th>כותרת</th>
                    <th>אזור</th>
                    <th>שעה</th>
                    <th>מחיר</th>
                    <th>קבוצה מקורית</th>
                    <th>זמן זיהוי</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentEvents
                    .map(
                      (e) => `
                    <tr>
                      <td><strong>${escapeHtml(e.title)}</strong></td>
                      <td>${escapeHtml(e.area)}</td>
                      <td>${escapeHtml(e.startTime)}</td>
                      <td>${
                        e.priceCurrency === 'FREE'
                          ? 'חינם'
                          : `${Number(e.priceAmount) || 0} ${escapeHtml(e.priceCurrency)}`
                      }</td>
                      <td>${escapeHtml(e.groupName || 'קבוצה')}</td>
                      <td>${escapeHtml(new Date(e.detectedAt).toLocaleTimeString('he-IL'))}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
          }
        </div>

        <!-- Recent Incoming Messages Feed -->
        <div class="card">
          <h3 style="margin: 0 0 10px 0;">💬 יומן הודעות אחרונות שנקלטו מקבוצות (Live Feed)</h3>
          <p style="font-size: 12px; color: #666; margin: 0 0 14px 0;">
            יומן זה מאפשר לוודא בזמן אמת שהמאזין קורא הודעות מקבוצת הקהילה.
          </p>

          ${
            recentMessages.length === 0
              ? '<p style="color: #888; font-size: 13px;">עדיין לא הגיעו הודעות חדשות מאז ההפעלה.</p>'
              : `
              <div style="background: #faf8f5; border-radius: 8px; border: 1px solid #ede8e0; max-height: 380px; overflow-y: auto;">
                ${recentMessages
                  .map(
                    (m) => `
                  <div class="feed-msg">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <div>
                        <strong>${escapeHtml(m.groupName)}</strong>
                        ${m.isTargetGroup ? '<span class="tag tag-target">קבוצת היעד 🎯</span>' : ''}
                        ${m.isEvent ? '<span class="tag tag-event">אירוע זוהה ✨</span>' : ''}
                      </div>
                      <span style="color: #999; font-size: 11px;">
                        ${escapeHtml(new Date(m.timestamp).toLocaleTimeString('he-IL'))}
                      </span>
                    </div>
                    <div style="color: #333;">${escapeHtml(m.textSnippet)}</div>
                    ${
                      m.eventTitle
                        ? `<div style="color: #15803d; font-size: 11px; margin-top: 2px;">👈 נשלח כאירוע: "${escapeHtml(
                            m.eventTitle
                          )}"</div>`
                        : ''
                    }
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
          }
        </div>

        <!-- Participating Groups List -->
        <div class="card">
          <h3 style="margin: 0 0 10px 0;">👥 רשימת כל הקבוצות שבהן החשבון חבר כרגע (${participatingGroups.length})</h3>
          ${
            participatingGroups.length === 0
              ? '<p style="color: #888; font-size: 13px;">טרם נטענה רשימת הקבוצות. לחץ על "רענן קבוצות" למעלה.</p>'
              : `
              <table>
                <thead>
                  <tr>
                    <th>שם הקבוצה</th>
                    <th>מזהה (JID)</th>
                    <th>משתתפים</th>
                    <th>סטטוס</th>
                  </tr>
                </thead>
                <tbody>
                  ${participatingGroups
                    .map(
                      (g) => `
                    <tr style="${isTargetGroupSubject(g.subject) ? 'background: #f0fdf4;' : ''}">
                      <td><strong>${escapeHtml(g.subject)}</strong></td>
                      <td><code>${escapeHtml(g.id)}</code></td>
                      <td>${g.participantCount}</td>
                      <td>
                        ${
                          isTargetGroupSubject(g.subject)
                            ? '<span class="badge badge-green">קבוצת יעד מנוטרת 🎯</span>'
                            : '<span style="color: #888;">קבוצה רגילה</span>'
                        }
                      </td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            `
          }
        </div>
      </div>
    </body>
    </html>
  `);
});

// Start Server & Connect WhatsApp
app.listen(PORT, () => {
  console.log(`LUZ WhatsApp Listener running on port ${PORT}`);
  console.log(`Target Community Group set to: "${TARGET_GROUP_KEYWORD}"`);
  connectToWhatsApp();
});
