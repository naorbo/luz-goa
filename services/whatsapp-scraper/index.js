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

// Determine storage path: /data if mounted on Fly.io volume, else local ./auth_info
const DATA_DIR = fs.existsSync('/data') ? '/data' : path.resolve('./auth_info');
const AUTH_DIR = path.join(DATA_DIR, 'auth_info');
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// ============================================================================
// 1. Network Security Headers Middleware
// ============================================================================
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none';"
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
  maxRequests: 30,
  label: 'api',
});

const strictAuthLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 8,
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
  // If SCRAPER_ADMIN_TOKEN is configured in Fly secrets, strictly enforce caller verification
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

  // Render clean RTL login screen for browser requests, or 401 JSON for API requests
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

let currentQR = null;
let currentStatus = 'initializing';
let connectedUser = null;
const recentEvents = [];

// ============================================================================
// Event Text Parser (Goa Community Events — Server-Side Validated)
// ============================================================================
function parseEventFromText(text, senderNumber = '') {
  if (typeof text !== 'string') return null;
  const clean = text.trim().slice(0, 2000);

  // Keyword check: Is this message likely promoting an event, workshop or gathering?
  const isEvent =
    /אירוע|הופעה|סדנה|חוג|מפגש|יוגה|קונצרט|קבלת שבת|כרטיסים|כניסה|מוזמנים|שידור|ג'אם|גאם|event|concert|workshop|gathering|acoustic|sunset|jam|music|ceremony|tickets|rsvp/i.test(
      clean
    );

  if (!isEvent) return null;

  let area = 'Patnem';
  if (/פטנם|פאטנם|patnem/i.test(clean)) area = 'Patnem';
  else if (/פאלולם|פלולם|palolem/i.test(clean)) area = 'Palolem';
  else if (/אגונדה|agonda/i.test(clean)) area = 'Agonda';
  else if (/גלגיבגה|galgibaga/i.test(clean)) area = 'Galgibaga';
  else if (/קולום|colomb/i.test(clean)) area = 'Colomb';

  const timeMatch = clean.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const startTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '18:00';

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

  const firstLine = clean.split('\n')[0].replace(/^[*-•~#\s]+/, '').trim();
  const title =
    firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine || 'אירוע קהילתי בגואה';

  // Extract explicit phone number from text; never fall back to group sender / admin
  const phoneMatch = clean.match(
    /(\+?\d{2,3}[-\s]?\d{2,4}[-\s]?\d{3}[-\s]?\d{3,4}|\b05\d[-\s]?\d{3}[-\s]?\d{4}\b)/
  );
  const hostPhone = phoneMatch ? phoneMatch[0].slice(0, 25) : '';

  return {
    title,
    area,
    startTime,
    priceAmount,
    priceCurrency,
    hostPhone,
    rawText: clean.slice(0, 1000),
    detectedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Webhook Dispatch to LUZ Google Apps Script (luzschedu@gmail.com)
// ============================================================================
async function forwardEventToGoogleCalendarAndSheets(eventData, groupInfo) {
  try {
    const payload = {
      event: 'luz.whatsapp_scraper_event',
      referralCode: `WA-AUTO-${Date.now().toString().slice(-4)}`,
      environment: 'prod',
      actionType: 'group_scraper_auto',
      actionLabelHe: 'אירוע שנקלט אוטומטית מקבוצת וואטסאפ',
      provider: {
        nameHe: eventData.title,
        ownerOrHost: `קבוצת ${groupInfo.groupName || 'וואטסאפ גואה'}`,
        phone: eventData.hostPhone,
        area: eventData.area,
        contactLang: 'he',
      },
      customer: {
        name: 'LUZ Auto-Scraper Bot',
        phone: groupInfo.senderNumber || '',
      },
      serviceOrDateSummary: `${eventData.title} | ${eventData.area} בשעה ${eventData.startTime} | ${
        eventData.priceCurrency === 'FREE'
          ? 'כניסה חופשית'
          : `${eventData.priceAmount} ${eventData.priceCurrency}`
      }`,
      notes: eventData.rawText,
    };

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
      console.log('===> WhatsApp Connected successfully.');
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

      if (!text || text.length < 15 || text.length > 4000) continue;

      const senderNumber = (msg.key.participant || remoteJid).split('@')[0];

      const parsed = parseEventFromText(text, senderNumber);
      if (parsed) {
        recentEvents.unshift({
          ...parsed,
          remoteJid,
          isGroup,
        });
        if (recentEvents.length > 30) recentEvents.pop();

        await forwardEventToGoogleCalendarAndSheets(parsed, {
          groupName: isGroup ? 'Goa WhatsApp Group' : 'Direct Message',
          senderNumber,
        });
      }
    }
  });
}

// ============================================================================
// Express Routes (Rate-Limited + Caller-Authenticated + XSS-Escaped)
// ============================================================================
app.get('/health', generalApiLimiter, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok', waStatus: currentStatus });
});

app.get('/qr', strictAuthLimiter, requireCallerAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (currentStatus === 'connected') {
    return res.send(`
      <div dir="rtl" style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2 style="color: #2e7d32;">✅ הוואטסאפ מחובר ופעיל!</h2>
        <p>המאזין מחובר כעת ומאזין להודעות בקבוצות.</p>
        <p><a href="/">חזרה ללוח הבקרה</a></p>
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

app.get('/', generalApiLimiter, requireCallerAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.send(`
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="utf-8">
      <title>LUZ Goa — WhatsApp Group Listener</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #faf8f5; color: #1c2e24; margin: 0; padding: 24px; }
        .card { background: white; border-radius: 16px; padding: 24px; max-width: 800px; margin: 0 auto 20px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-weight: bold; font-size: 12px; }
        .badge-green { background: #e8f5e9; color: #2e7d32; }
        .badge-amber { background: #fff8e1; color: #f57f17; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th, td { text-align: right; padding: 10px; border-bottom: 1px solid #eee; }
        th { background: #f4f1eb; color: #325240; }
        a { color: #d46b54; font-weight: bold; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>🌴 LUZ Goa — מאזין קבוצות וואטסאפ (מאובטח)</h2>
        <p>
          סטטוס חיבור: 
          <span class="badge ${currentStatus === 'connected' ? 'badge-green' : 'badge-amber'}">
            ${currentStatus === 'connected' ? 'מחובר ומאזין לקבוצות ✅' : 'ממתין לסריקת QR ⏳'}
          </span>
        </p>
        ${
          currentStatus !== 'connected'
            ? `<p><a href="/qr" style="display: inline-block; background: #d46b54; color: white; padding: 8px 18px; border-radius: 8px;">לחץ כאן לסריקת קוד QR</a></p>`
            : `<p style="font-size: 12px; color: #666;">מחובר כמספר: <code>${escapeHtml(connectedUser || '')}</code></p>`
        }
      </div>

      <div class="card">
        <h3>אירועים אחרונים שנקלטו מהקבוצות ונשלחו ליומן:</h3>
        ${
          recentEvents.length === 0
            ? '<p style="color: #888;">טרם נקלטו הודעות אירועים. ברגע שתישלח הודעה בקבוצה, היא תופיע כאן ותסונכרן ישירות ליומן!</p>'
            : `
            <table>
              <thead>
                <tr>
                  <th>כותרת</th>
                  <th>אזור</th>
                  <th>שעה</th>
                  <th>מחיר</th>
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
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`LUZ WhatsApp Listener running on port ${PORT}`);
  connectToWhatsApp();
});
