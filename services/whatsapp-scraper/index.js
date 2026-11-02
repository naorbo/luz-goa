import express from 'express';
import QRCode from 'qrcode';
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

// Determine storage path: /data if mounted on Fly.io volume, else local ./auth_info
const DATA_DIR = fs.existsSync('/data') ? '/data' : path.resolve('./auth_info');
const AUTH_DIR = path.join(DATA_DIR, 'auth_info');
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

const app = express();
app.use(express.json());

let currentQR = null;
let currentStatus = 'initializing';
let connectedUser = null;
const recentEvents = [];

// ============================================================================
// Event Text Parser (Goa Community Events)
// ============================================================================
function parseEventFromText(text, senderNumber = '') {
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // Keyword check: Is this message likely promoting an event, workshop or gathering?
  const isEvent =
    /אירוע|הופעה|סדנה|חוג|מפגש|יוגה|קונצרט|קבלת שבת|כרטיסים|כניסה|מוזמנים|שידור|ג'אם|גאם|event|concert|workshop|gathering|acoustic|sunset|jam|music|ceremony|tickets|rsvp/i.test(
      clean
    );

  if (!isEvent) return null;

  // Extract Area in South Goa
  let area = 'South Goa';
  if (/פטנם|פאטנם|patnem/i.test(clean)) area = 'Patnem';
  else if (/פאלולם|פלולם|palolem/i.test(clean)) area = 'Palolem';
  else if (/אגונדה|agonda/i.test(clean)) area = 'Agonda';
  else if (/גלגיבגה|galgibaga/i.test(clean)) area = 'Galgibaga';
  else if (/קולום|colomb/i.test(clean)) area = 'Colomb';

  // Extract Time (HH:MM or "בשעה 20:00")
  const timeMatch = clean.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const startTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '18:00';

  // Extract Price
  let priceAmount = 0;
  let priceCurrency = 'FREE';
  const inrMatch = clean.match(/(\d[\d,]*)\s*(?:רופי|רופיות|rs|inr|₹)/i);
  const ilsMatch = clean.match(/(?:₪|ש"ח|שח)\s*(\d[\d,]*)|(\d[\d,]*)\s*(?:₪|ש"ח|שח)/i);
  if (inrMatch) {
    priceAmount = parseInt(inrMatch[1].replace(/,/g, ''), 10);
    priceCurrency = 'INR';
  } else if (ilsMatch) {
    const val = ilsMatch[1] || ilsMatch[2];
    priceAmount = parseInt(val.replace(/,/g, ''), 10);
    priceCurrency = 'ILS';
  }

  // Extract Title (First non-empty line or first 60 chars)
  const firstLine = clean.split('\n')[0].replace(/^[*-•~#\s]+/, '').trim();
  const title = firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine || 'אירוע קהילתי בגואה';

  // Extract Phone Number
  const phoneMatch = clean.match(/(\+?\d{2,3}[-\s]?\d{2,4}[-\s]?\d{3}[-\s]?\d{3,4}|\b05\d[-\s]?\d{3}[-\s]?\d{4}\b)/);
  const hostPhone = phoneMatch ? phoneMatch[0] : senderNumber || '+972-52-478-0033';

  return {
    title,
    area,
    startTime,
    priceAmount,
    priceCurrency,
    hostPhone,
    rawText: clean,
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
      serviceOrDateSummary: `${eventData.title} | ${eventData.area} בשעה ${eventData.startTime} | ${eventData.priceCurrency === 'FREE' ? 'כניסה חופשית' : `${eventData.priceAmount} ${eventData.priceCurrency}`}`,
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
    printQRInTerminal: true,
    auth: state,
    browser: ['LUZ Goa Community OS', 'Chrome', '1.0.0'],
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      currentStatus = 'waiting_for_qr_scan';
      console.log('===> New QR Code received! Open /qr in your browser to scan.');
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed. Reconnecting:', shouldReconnect);
      currentStatus = 'disconnected';
      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        currentStatus = 'logged_out';
        console.log('Logged out. Please delete auth_info and rescan QR.');
      }
    } else if (connection === 'open') {
      currentQR = null;
      currentStatus = 'connected';
      connectedUser = sock.user?.id || 'Connected';
      console.log('===> WhatsApp Connected successfully as:', connectedUser);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // Listen to incoming messages in real time!
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid || '';
      const isGroup = remoteJid.endsWith('@g.us');

      // Extract message text (standard text or photo caption)
      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        '';

      if (!text || text.length < 15) continue;

      const senderNumber = (msg.key.participant || remoteJid).split('@')[0];

      // Parse event
      const parsed = parseEventFromText(text, senderNumber);
      if (parsed) {
        console.log('\n[EVENT DETECTED IN GROUP!]', parsed.title, `(${parsed.area})`);
        recentEvents.unshift({
          ...parsed,
          remoteJid,
          isGroup,
        });
        if (recentEvents.length > 30) recentEvents.pop();

        // Forward to LUZ Google Apps Script -> Calendar & Sheets!
        await forwardEventToGoogleCalendarAndSheets(parsed, {
          groupName: isGroup ? 'Goa WhatsApp Group' : 'Direct Message',
          senderNumber,
        });
      }
    }
  });
}

// ============================================================================
// Express Web Dashboard & QR Display
// ============================================================================
app.get('/health', (req, res) => res.json({ status: 'ok', waStatus: currentStatus }));

app.get('/qr', async (req, res) => {
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
        <script>setTimeout(() => location.reload(), 3000);</script>
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
          }, 3000);
        </script>
      </div>
    `);
  } catch (err) {
    res.status(500).send('Error rendering QR');
  }
});

app.get('/', (req, res) => {
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
        <h2>🌴 LUZ Goa — מאזין קבוצות וואטסאפ</h2>
        <p>
          סטטוס חיבור: 
          <span class="badge ${currentStatus === 'connected' ? 'badge-green' : 'badge-amber'}">
            ${currentStatus === 'connected' ? 'מחובר ומאזין לקבוצות ✅' : 'ממתין לסריקת QR ⏳'}
          </span>
        </p>
        ${
          currentStatus !== 'connected'
            ? `<p><a href="/qr" style="display: inline-block; background: #d46b54; color: white; padding: 8px 18px; border-radius: 8px;">לחץ כאן לסריקת קוד QR</a></p>`
            : `<p style="font-size: 12px; color: #666;">מחובר כמספר: <code>${connectedUser}</code></p>`
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
                    <td><strong>${e.title}</strong></td>
                    <td>${e.area}</td>
                    <td>${e.startTime}</td>
                    <td>${e.priceCurrency === 'FREE' ? 'חינם' : `${e.priceAmount} ${e.priceCurrency}`}</td>
                    <td>${new Date(e.detectedAt).toLocaleTimeString('he-IL')}</td>
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
