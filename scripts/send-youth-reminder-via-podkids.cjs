/**
 * Youth Center Goa — Morning WhatsApp Reminder Bot (09:30 IST)
 * Powered by the existing PodKids WhatsApp connection (C:\podkids\.wa-session).
 *
 * Uses on-demand `connectAndRun` so it never holds a competing socket open
 * and never disconnects PodKids.
 *
 * SAFETY LOCK:
 * - Target Group discovered: "Youth center parents" (120363430775078450@g.us)
 * - Current Mode: 'test_dm_only' -> Sends STRICTLY & ONLY to 972508878902@s.whatsapp.net
 *   until Naor explicitly approves enabling group sending.
 */

const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { connectAndRun, isLinked } = require('C:\\podkids\\scripts\\lib\\whatsapp.js');

const SAFE_TEST_RECIPIENT_PHONE = '972508878902';
const SAFE_TEST_RECIPIENT_JID = '972508878902@s.whatsapp.net';
const YOUTH_CENTER_GROUP_NAME = 'Youth center parents';
const YOUTH_CENTER_GROUP_JID = '120363430775078450@g.us';

// STRICT LOCK: Keep 'test_dm_only' until user explicitly approves!
const REMINDER_MODE = 'test_dm_only'; // 'test_dm_only' | 'live_group'
const DAILY_REMINDER_TIME_IST = '09:30';
const SENT_LOG_PATH = path.join(__dirname, '.youth-reminders-sent.json');

const YOUTH_CENTER_EVENTS = [
  {
    id: 'yc-2026-11-05-grand-opening',
    date: '2026-11-05',
    dayHe: 'יום חמישי, 5 בנובמבר',
    startTime: '16:30',
    endTime: '19:00',
    titleHe: 'פתיחה חגיגית של מרכז הנוער גואה!',
    descriptionHe:
      'פתיחה חגיגית של מרכז הנוער בקולום! משחקי היכרות וגיבוש, מוזיקה טובה, פינות צ׳יל במבוק, נשנושים והצגת תוכנית החוגים והאירועים לנוער בגילאי 8–15.',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=900',
  },
  {
    id: 'yc-2026-11-06-pottery',
    date: '2026-11-06',
    dayHe: 'יום שישי, 6 בנובמבר',
    startTime: '16:30',
    endTime: '18:30',
    titleHe: 'סדנת קדרות וחימר מקומי + קבלת שבת רגועה',
    descriptionHe:
      'יצירה בחימר טבעי ואובניים במרחב הבמבוק של מרכז הנוער, בליווי מוזיקה נעימה וכיבוד קל לקבלת שבת.',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&q=80&w=900',
  },
  {
    id: 'yc-2026-11-08-skate-surf',
    date: '2026-11-08',
    dayHe: 'יום ראשון, 8 בנובמבר',
    startTime: '16:30',
    endTime: '18:30',
    titleHe: 'אימון סקייטבורד, שיווי משקל וגלישה יבשה',
    descriptionHe:
      'מפגש אקסטרים ובטיחות על סקייטבורד ולוחות שיווי משקל (אינדו-בורד) להכנה לגלישת גלים ולחיזוק היציבה.',
    imageUrl: 'https://images.unsplash.com/photo-1547447134-cd3f5c716030?auto=format&fit=crop&q=80&w=900',
  },
  {
    id: 'yc-2026-11-10-open-space',
    date: '2026-11-10',
    dayHe: 'יום שלישי, 10 בנובמבר',
    startTime: '16:30',
    endTime: '19:00',
    titleHe: 'מרחב פתוח + פינג פונג ומוזיקה במרכז הנוער',
    descriptionHe:
      'מפגש אחר הצהריים פתוח לנוער בגילאי 8–15 במרכז הנוער קולום! שולחן פינג פונג, משחקי קופסה, מוזיקה, יצירה ופינות צ׳יל במבוק.',
    imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=900',
  },
  {
    id: 'yc-2026-11-12-jam-night',
    date: '2026-11-12',
    dayHe: 'יום חמישי, 12 בנובמבר',
    startTime: '17:00',
    endTime: '19:30',
    titleHe: 'ג׳אם סשן אקוסטי וערב כישרונות צעירים',
    descriptionHe:
      'מביאים גיטרות, יוקלילי, כלי הקשה ומיקרופון פתוח! ערב מוזיקה, שירה ויצירה חופשית במרכז הנוער.',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=900',
  },
  {
    id: 'yc-2026-11-13-pizza-movie',
    date: '2026-11-13',
    dayHe: 'יום שישי, 13 בנובמבר',
    startTime: '17:00',
    endTime: '19:30',
    titleHe: 'סדנת פיצות בטאבון + הקרנת סרט על מסך ענק',
    descriptionHe:
      'מכינים יחד בצק פיצות עם תוספות שוות, אופים במקום ומתיישבים להקרנת סרט קהילתית על פופים ומחצלות.',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=900',
  },
  {
    id: 'yc-2026-11-15-street-art',
    date: '2026-11-15',
    dayHe: 'יום ראשון, 15 בנובמבר',
    startTime: '16:30',
    endTime: '18:30',
    titleHe: 'סדנת גרפיטי, ציור על עץ ואמנות רחוב',
    descriptionHe:
      'עיצוב שלטים אישיים, שבלונות וצבעי אקריליק/ספריי ידידותיים לסביבה לקישוט מרחב הנוער.',
    imageUrl: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=900',
  },
  {
    id: 'yc-2026-11-17-board-games',
    date: '2026-11-17',
    dayHe: 'יום שלישי, 17 בנובמבר',
    startTime: '16:30',
    endTime: '19:00',
    titleHe: 'אליפות קטאן, שחמט וטורניר פינג פונג',
    descriptionHe:
      'טורניר נושא פרסים של משחקי אסטרטגיה, קטאן, שחמט ושולחן פינג פונג במרכז הנוער.',
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=900',
  },
  {
    id: 'yc-2026-11-19-bonfire',
    date: '2026-11-19',
    dayHe: 'יום חמישי, 19 בנובמבר',
    startTime: '17:30',
    endTime: '20:00',
    titleHe: 'ערב מדורה, מרשמלו, צ׳אי וסיפורים תחת הכוכבים',
    descriptionHe:
      'מפגש ערב מיוחד בחצר מרכז הנוער עם מדורה קטנה ובטוחה, מרשמלו על האש, צ׳אי מסאלה וגיטרה.',
    imageUrl: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&q=80&w=900',
  },
];

function getIstNow() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  return {
    dateStr: `${map.year}-${map.month}-${map.day}`,
    timeStr: `${map.hour}:${map.minute}`,
  };
}

function loadSentLog() {
  try {
    if (fs.existsSync(SENT_LOG_PATH)) {
      return JSON.parse(fs.readFileSync(SENT_LOG_PATH, 'utf8'));
    }
  } catch {}
  return {};
}

function saveSentLog(log) {
  try {
    fs.writeFileSync(SENT_LOG_PATH, JSON.stringify(log, null, 2));
  } catch {}
}

function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchImageBuffer(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

function buildCaption(ev) {
  const eventUrl = `https://naorbo.github.io/luz-goa/?tab=youth_center&event=${encodeURIComponent(ev.id)}`;
  const scheduleLabel = ev.dayHe
    ? `${ev.dayHe} · ${ev.startTime || '16:30'}${ev.endTime ? ` – ${ev.endTime}` : ''}`
    : `${ev.date || ''} · ${ev.startTime || '16:30'}${ev.endTime ? ` – ${ev.endTime}` : ''}`;
  const volunteerLine = ev.volunteerParent
    ? `🤝 *הורה מתנדב/ת במפגש:* ${ev.volunteerParent}\n`
    : `🙋 *הורה מתנדב/ת:* נשמח להורה תורן שירשום את עצמו בקישור!\n`;

  return (
    `☀️ *בוקר טוב הורים יקרים! תזכורת לאירוע היום במרכז הנוער גואה (Goa Teens House)* 🌿\n\n` +
    `🎯 *${ev.titleHe}*\n` +
    `📅 *מתי:* היום (${scheduleLabel})\n` +
    `📍 *מיקום:* מרכז הנוער קולום (ליד שייליש)\n` +
    volunteerLine +
    `\n📝 *על הפעילות:*\n${ev.descriptionHe || ev.titleHe}\n\n` +
    `👇 *להרשמה מהירה לאירוע ולשיבוץ הורה מתנדב:*\n` +
    `${eventUrl}`
  );
}

async function sendReminderViaPodkids(ev, { forceTestDm = false } = {}) {
  if (!isLinked()) {
    throw new Error('PodKids WhatsApp session is not linked');
  }

  // Strict safety check: never send to group while REMINDER_MODE !== 'live_group' or forceTestDm is true
  const recipientJid =
    forceTestDm || REMINDER_MODE !== 'live_group'
      ? SAFE_TEST_RECIPIENT_JID
      : YOUTH_CENTER_GROUP_JID;

  let imgBuffer = null;
  if (ev.imageUrl) {
    try {
      imgBuffer = await fetchImageBuffer(ev.imageUrl);
    } catch (err) {
      console.warn('⚠️ Could not download image, sending text only:', err.message);
    }
  }

  const caption = buildCaption(ev);

  await connectAndRun(async (sock) => {
    if (imgBuffer) {
      await sock.sendMessage(recipientJid, {
        image: imgBuffer,
        caption,
      });
    } else {
      await sock.sendMessage(recipientJid, {
        text: caption,
      });
    }
  });

  return {
    ok: true,
    eventId: ev.id,
    titleHe: ev.titleHe,
    recipientJid,
    mode: REMINDER_MODE,
    groupBlocked: recipientJid === SAFE_TEST_RECIPIENT_JID,
  };
}

// Mode 1: Immediate sample send (`node send-youth-reminder-via-podkids.cjs --sample`)
if (process.argv.includes('--sample')) {
  const sampleEv = YOUTH_CENTER_EVENTS[3] || YOUTH_CENTER_EVENTS[0];
  sendReminderViaPodkids(sampleEv, { forceTestDm: true })
    .then((res) => {
      console.log(`✅ נשלחה הודעה לדוגמא (עם תמונה וקישור) אל ${res.recipientJid}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ שגיאה:', err.message);
      process.exit(1);
    });
} else if (process.argv.includes('--daemon')) {
  // Mode 2: Lightweight HTTP + 09:30 IST Cron Daemon using PodKids on-demand connectAndRun
  const PORT = process.env.PORT || 8080;

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/health') {
      const { dateStr, timeStr } = getIstNow();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          status: 'ok',
          connectionSource: 'PodKids (.wa-session)',
          isLinked: isLinked(),
          reminderMode: REMINDER_MODE,
          safeTestRecipient: SAFE_TEST_RECIPIENT_PHONE,
          futureTargetGroup: YOUTH_CENTER_GROUP_NAME,
          futureTargetGroupJid: YOUTH_CENTER_GROUP_JID,
          scheduleTimeIst: DAILY_REMINDER_TIME_IST,
          currentIst: `${dateStr} ${timeStr}`,
        })
      );
      return;
    }

    if (req.url === '/send-youth-reminder' && req.method === 'POST') {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const ev =
            parsed.event ||
            YOUTH_CENTER_EVENTS.find((e) => e.id === parsed.eventId) ||
            YOUTH_CENTER_EVENTS[3] ||
            YOUTH_CENTER_EVENTS[0];
          const result = await sendReminderViaPodkids(ev, { forceTestDm: true });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(result));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
      return;
    }

    if (req.url.startsWith('/send-sample-youth-reminder')) {
      try {
        const sampleEv = YOUTH_CENTER_EVENTS[3] || YOUTH_CENTER_EVENTS[0];
        const result = await sendReminderViaPodkids(sampleEv, { forceTestDm: true });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Youth Center Morning Reminder Bot (PodKids WhatsApp Connection) is running.');
  });

  server.listen(PORT, () => {
    console.log(`🚀 Youth Center Reminder Bot (PodKids WhatsApp) listening on http://localhost:${PORT}`);
    console.log(`🔒 Mode: ${REMINDER_MODE} -> Sending ONLY to ${SAFE_TEST_RECIPIENT_PHONE} (Group "${YOUTH_CENTER_GROUP_NAME}" is locked)`);
    console.log(`⏰ Daily schedule: ${DAILY_REMINDER_TIME_IST} IST (Asia/Kolkata)`);
  });

  // Check every 45 seconds if it is 09:30 IST on an event day
  setInterval(async () => {
    try {
      const { dateStr, timeStr } = getIstNow();
      if (timeStr !== DAILY_REMINDER_TIME_IST) return;

      const todaysEvents = YOUTH_CENTER_EVENTS.filter((e) => e.date === dateStr);
      if (todaysEvents.length === 0) return;

      const sentLog = loadSentLog();
      for (const ev of todaysEvents) {
        const key = `${dateStr}_${ev.id}`;
        if (sentLog[key]) continue;
        sentLog[key] = new Date().toISOString();
        saveSentLog(sentLog);
        console.log(`⏰ [09:30 IST] Sending morning reminder for ${ev.titleHe}...`);
        await sendReminderViaPodkids(ev);
      }
    } catch (err) {
      console.error('❌ [09:30 Scheduler Error]:', err.message);
    }
  }, 45 * 1000);
}
