/**
 * Youth Center Goa — Morning WhatsApp Reminder Bot (09:30 IST)
 * Powered by the existing PodKids WhatsApp connection (C:\podkids\.wa-session).
 *
 * Project Rules Enforced:
 * 1. Canonical URL is strictly https://my-luz-dc028.web.app/ (never github.io).
 * 2. All WhatsApp reminder text is 100% in English.
 * 3. Renders an English Poster Overlay (Event Title, Date & Time, Location)
 *    directly onto the event image using `sharp` before sending to WhatsApp.
 * 4. SAFETY LOCK: Sends ONLY to 972508878902@s.whatsapp.net until user approves
 *    enabling the "Youth center parents" group (120363430775078450@g.us).
 */

const https = require('node:https');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

let sharp;
try {
  sharp = require('sharp');
} catch {
  sharp = require('C:\\podkids\\node_modules\\sharp');
}

const LOCAL_PODKIDS_SESSION = 'C:\\podkids\\.wa-session';
const CLOUD_SESSION_DIR = path.resolve(process.cwd(), '.wa-session-cloud');

function resolveSessionDir() {
  if (process.env.WA_SESSION_DIR) {
    return path.resolve(process.env.WA_SESSION_DIR);
  }
  if (process.env.WA_SESSION_GZ_B64) {
    fs.mkdirSync(CLOUD_SESSION_DIR, { recursive: true });
    const rawJson = zlib
      .gunzipSync(Buffer.from(process.env.WA_SESSION_GZ_B64.trim(), 'base64'))
      .toString('utf8');
    const filesMap = JSON.parse(rawJson);
    for (const [fileName, content] of Object.entries(filesMap)) {
      const targetPath = path.join(CLOUD_SESSION_DIR, fileName);
      let needsWrite = !fs.existsSync(targetPath);
      if (!needsWrite) {
        try {
          const stat = fs.statSync(targetPath);
          if (stat.size === 0) needsWrite = true;
          else if (fileName === 'creds.json') JSON.parse(fs.readFileSync(targetPath, 'utf8'));
        } catch {
          needsWrite = true;
        }
      }
      if (needsWrite) {
        fs.writeFileSync(targetPath, content, 'utf8');
      }
    }
    return CLOUD_SESSION_DIR;
  }
  if (fs.existsSync(path.join(CLOUD_SESSION_DIR, 'creds.json'))) {
    return CLOUD_SESSION_DIR;
  }
  return LOCAL_PODKIDS_SESSION;
}

function isLinked() {
  try {
    const dir = resolveSessionDir();
    return fs.existsSync(path.join(dir, 'creds.json'));
  } catch {
    return false;
  }
}

async function connectAndRun(fn) {
  const sessionDir = resolveSessionDir();
  if (sessionDir === LOCAL_PODKIDS_SESSION && fs.existsSync('C:\\podkids\\scripts\\lib\\whatsapp.js')) {
    const podkidsWa = require('C:\\podkids\\scripts\\lib\\whatsapp.js');
    return podkidsWa.connectAndRun(fn);
  }

  let baileys;
  try {
    baileys = require('@whiskeysockets/baileys');
  } catch {
    baileys = require('C:\\podkids\\node_modules\\@whiskeysockets\\baileys');
  }

  const makeWASocket = baileys.default || baileys;
  const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys;
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {}

  const SILENT = {
    level: 'silent',
    child: () => SILENT,
    trace() {},
    debug() {},
    info() {},
    warn() {},
    error() {},
    fatal() {},
  };

  const MAX_RESTARTS = 5;
  let restarts = 0;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err, val) => {
      if (settled) return;
      settled = true;
      err ? reject(err) : resolve(val);
    };

    function start() {
      const sock = makeWASocket({
        version,
        auth: state,
        logger: SILENT,
        browser: Browsers.ubuntu('Chrome'),
      });
      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect } = u;
        if (connection === 'open') {
          let result;
          let runErr = null;
          try {
            result = await fn(sock);
          } catch (e) {
            runErr = e;
          }
          setTimeout(() => {
            try {
              sock.end();
            } catch {}
            setTimeout(() => finish(runErr, result), 1000);
          }, 1500);
        } else if (connection === 'close') {
          const code = lastDisconnect?.error?.output?.statusCode;
          if (code === DisconnectReason.loggedOut) {
            finish(new Error('WhatsApp session logged out — please refresh WA_SESSION_GZ_B64 secret'));
          } else if (!settled && restarts < MAX_RESTARTS) {
            restarts++;
            setTimeout(start, 1000);
          } else {
            finish(new Error('WhatsApp connection closed (code ' + code + ')'));
          }
        }
      });
    }

    start();
  });
}

const CANONICAL_SITE_URL = 'https://my-luz-dc028.web.app';
const SAFE_TEST_RECIPIENT_PHONE = '972508878902';
const SAFE_TEST_RECIPIENT_JID = '972508878902@s.whatsapp.net';
const YOUTH_CENTER_GROUP_NAME = 'Youth center parents';
const YOUTH_CENTER_GROUP_JID = '120363430775078450@g.us';

// Approved by user (2026-11-12): live reminders go to "Youth center parents" (120363430775078450@g.us)
const REMINDER_MODE = 'live_group'; // 'test_dm_only' | 'live_group'
const DAILY_REMINDER_TIME_IST = '09:30';
const EVENING_REMINDER_TIME_IST = '20:00';
const SENT_LOG_PATH = path.join(__dirname, '.youth-reminders-sent.json');

const YOUTH_CENTER_EVENTS = [
  {
    id: 'yc-2026-11-06-odt-opening',
    date: '2026-11-06',
    dayEn: 'Friday, Nov 6',
    startTime: '10:00',
    endTime: '13:00',
    titleEn: 'Grand Opening — Goa Teens House | The Ball Game with Ilan',
    descriptionEn:
      'Kick-off get-together at Goa Teens House! The Ball Game with Ilan, choosing a name for our space, ping pong, board games, fresh fruits & ice-cold lemonade.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-07-movie',
    date: '2026-11-07',
    dayEn: 'Saturday, Nov 7',
    startTime: '18:00',
    endTime: '20:30',
    titleEn: 'Youth Movie Night Screening',
    descriptionEn:
      'Big-screen movie screening night with popcorn, cold drinks, and cozy youth hangout atmosphere.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-08-open-space',
    date: '2026-11-08',
    dayEn: 'Sunday, Nov 8',
    startTime: '16:30',
    endTime: '19:30',
    titleEn: 'Open Youth Space & Hangout',
    descriptionEn:
      'Open youth space to connect, relax, play games, listen to music, and spend time together in Colomb.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-09-jam',
    date: '2026-11-09',
    dayEn: 'Monday, Nov 9',
    startTime: '17:00',
    endTime: '19:30',
    titleEn: 'Sunset Music Jam Session',
    descriptionEn:
      'Open sunset music jam: guitars, drums, percussion, vocals, and spontaneous live improvisation.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-12-board-games',
    date: '2026-11-12',
    dayEn: 'Thursday, Nov 12',
    startTime: '16:30',
    endTime: '19:00',
    titleEn: 'Strategy Board Games & Tournaments',
    descriptionEn:
      'Afternoon of board games, Catan, chess, strategy tabletop games, and friendly team competitions.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-14-movie',
    date: '2026-11-14',
    dayEn: 'Saturday, Nov 14',
    startTime: '18:00',
    endTime: '20:30',
    titleEn: 'Youth Movie Night Screening',
    descriptionEn:
      'Feature youth film screening on big screen with fresh popcorn and post-film discussion.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-15-open-space',
    date: '2026-11-15',
    dayEn: 'Sunday, Nov 15',
    startTime: '16:30',
    endTime: '19:30',
    titleEn: 'Open Youth Space & Hangout',
    descriptionEn:
      'Open community space for teens: social time, personal projects, board games, and chill vibe.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-16-guest-talk',
    date: '2026-11-16',
    dayEn: 'Monday, Nov 16',
    startTime: '17:00',
    endTime: '18:45',
    titleEn: 'Guest Speaker & Inspiring Stories',
    descriptionEn:
      'Inspiring guest speaker session and friendly youth discussion on life journeys and creative exploration.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-19-art',
    date: '2026-11-19',
    dayEn: 'Thursday, Nov 19',
    startTime: '16:30',
    endTime: '19:00',
    titleEn: 'Youth Art & Creative Studio',
    descriptionEn:
      'Hands-on creative art studio: painting, sculpture with natural materials, and self-expression.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-21-movie',
    date: '2026-11-21',
    dayEn: 'Saturday, Nov 21',
    startTime: '18:00',
    endTime: '20:30',
    titleEn: 'Youth Movie Night Screening',
    descriptionEn:
      'Cinema movie night and popcorn for youth in the bamboo pavilion.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-22-open-space',
    date: '2026-11-22',
    dayEn: 'Sunday, Nov 22',
    startTime: '16:30',
    endTime: '19:30',
    titleEn: 'Open Youth Space & Hangout',
    descriptionEn:
      'Open space for hanging out, open conversations, board games, and relaxing with friends.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-23-jam',
    date: '2026-11-23',
    dayEn: 'Monday, Nov 23',
    startTime: '17:00',
    endTime: '19:30',
    titleEn: 'Acoustic Jam Session',
    descriptionEn:
      'Open youth music jam: bring instruments or join in with vocals, rhythm, and acoustic melodies.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-26-board-games',
    date: '2026-11-26',
    dayEn: 'Thursday, Nov 26',
    startTime: '16:30',
    endTime: '19:00',
    titleEn: 'Strategy Board Games & Challenges',
    descriptionEn:
      'Strategy board games, chess, Catan, card games, and fun team challenges.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-28-movie',
    date: '2026-11-28',
    dayEn: 'Saturday, Nov 28',
    startTime: '18:00',
    endTime: '20:30',
    titleEn: 'Youth Movie Night Screening',
    descriptionEn:
      'Weekend big screen movie night with warm popcorn and cinema treats.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-29-open-space',
    date: '2026-11-29',
    dayEn: 'Sunday, Nov 29',
    startTime: '16:30',
    endTime: '19:30',
    titleEn: 'Open Youth Space & Chill',
    descriptionEn:
      'Open youth space: free time, creative corner, music, and socializing.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
  },
  {
    id: 'yc-2026-11-30-guest-talk',
    date: '2026-11-30',
    dayEn: 'Monday, Nov 30',
    startTime: '17:00',
    endTime: '18:45',
    titleEn: 'Guest Speaker & Youth Dialogue',
    descriptionEn:
      'Fascinating guest speaker session touching upon science, creativity, and inspiring life stories.',
    locationEn: 'Colomb Youth Center (near Shailish)',
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000',
  },
];

function addDaysIso(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

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
  const dateStr = `${map.year}-${map.month}-${map.day}`;
  return {
    dateStr,
    tomorrowDateStr: addDaysIso(dateStr, 1),
    timeStr: `${map.hour}:${map.minute}`,
    hour: Number(map.hour),
  };
}

function formatDayEnFromIso(dateStr) {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }).format(new Date(Date.UTC(y, m - 1, d)));
  } catch {
    return dateStr;
  }
}

function getNextUpcomingEvent() {
  const { dateStr } = getIstNow();
  return (
    YOUTH_CENTER_EVENTS.find((e) => e.date >= dateStr) ||
    YOUTH_CENTER_EVENTS[4] ||
    YOUTH_CENTER_EVENTS[0]
  );
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

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapTextLines(text, maxCharsPerLine = 30) {
  const words = String(text || '').trim().split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= maxCharsPerLine) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

/**
 * Renders a crisp English Event Title, Date & Time, and Venue badge directly onto the image buffer.
 */
async function renderEnglishPosterOverlay(rawImageBuffer, ev, timing = 'morning') {
  const width = 1000;
  const height = 680;

  const titleEn = ev.titleEn || ev.titleHe || 'Youth Center Session';
  const titleLines = wrapTextLines(titleEn, 28);
  const timeRange = `${ev.startTime || '16:30'}${ev.endTime ? ` - ${ev.endTime}` : ''}`;
  const prefix = timing === 'evening' ? 'TOMORROW  •  ' : 'TODAY  •  ';
  const dayLabel = (ev.dayEn || ev.date || 'Today').toUpperCase();
  const scheduleBanner = `${prefix}${dayLabel}  •  ${timeRange}`;
  const locationText = ev.locationEn || 'Colomb Youth Center (near Shailish)  •  Ages 8-15';

  const titleSvgLines =
    titleLines.length === 1
      ? `<text x="52" y="545" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="bold" fill="#FFFFFF">${escapeXml(
          titleLines[0]
        )}</text>`
      : `<text x="52" y="502" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="bold" fill="#FFFFFF">${escapeXml(
          titleLines[0]
        )}</text>
         <text x="52" y="554" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="bold" fill="#FFFFFF">${escapeXml(
          titleLines[1]
        )}</text>`;

  const svgOverlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="darkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.45" />
          <stop offset="35%" stop-color="#000000" stop-opacity="0.15" />
          <stop offset="62%" stop-color="#0b1711" stop-opacity="0.78" />
          <stop offset="100%" stop-color="#07110c" stop-opacity="0.96" />
        </linearGradient>
      </defs>

      <!-- Gradient Scrim -->
      <rect x="0" y="0" width="${width}" height="${height}" fill="url(#darkGrad)" />

      <!-- Top-Left Brand Pill -->
      <rect x="44" y="38" width="380" height="46" rx="23" fill="#15803d" />
      <text x="234" y="68" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="bold" fill="#FFFFFF" letter-spacing="1.2">
        GOA TEENS HOUSE • YOUTH CENTER
      </text>

      <!-- Top-Right Time Pill -->
      <rect x="700" y="38" width="256" height="46" rx="23" fill="#f59e0b" />
      <text x="828" y="68" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="bold" fill="#111827">
        ⏰ ${escapeXml(timeRange)}
      </text>

      <!-- Accent Bar -->
      <rect x="52" y="418" width="84" height="6" rx="3" fill="#fbbf24" />

      <!-- Date & Time Line -->
      <text x="52" y="454" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="bold" fill="#fbbf24" letter-spacing="1">
        📅 ${escapeXml(scheduleBanner)}
      </text>

      <!-- Main Event Title (1-2 lines) -->
      ${titleSvgLines}

      <!-- Footer Location & URL Bar -->
      <text x="52" y="612" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="bold" fill="#d1fae5">
        📍 ${escapeXml(locationText)}
      </text>
      <text x="52" y="644" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#9ca3af">
        Register &amp; Volunteer: my-luz-dc028.web.app
      </text>
    </svg>
  `);

  return sharp(rawImageBuffer)
    .resize(width, height, { fit: 'cover', position: 'center' })
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}

function buildEnglishCaption(ev, timing = 'morning') {
  const eventUrl = `${CANONICAL_SITE_URL}/?tab=youth_center&event=${encodeURIComponent(ev.id)}`;
  const titleEn = ev.titleEn || ev.titleHe || 'Youth Center Session';
  const descEn = ev.descriptionEn || ev.descriptionHe || titleEn;
  const locEn = ev.locationEn || 'Colomb Youth Center (near Shailish)';
  const timeStr = `${ev.startTime || '16:30'}${ev.endTime ? ` – ${ev.endTime}` : ''}`;
  const dateLabel = ev.dayEn || formatDayEnFromIso(ev.date) || ev.date || 'Today';

  const volunteerLine = ev.volunteerParent
    ? `🤝 *Volunteer Parent on Duty:* ${ev.volunteerParent}\n`
    : `🙋 *Volunteer Parent:* We need a volunteer parent on duty for this session — sign up via the link below!\n`;

  const isEvening = timing === 'evening';
  const header = isEvening
    ? `🌙 *Good evening dear parents! Tomorrow at Goa Teens House (Youth Center)* 🌿\n\n`
    : `☀️ *Good morning dear parents! Goa Teens House (Youth Center) Reminder* 🌿\n\n`;
  const whenLabel = isEvening ? `Tomorrow (${dateLabel})` : `Today (${dateLabel})`;

  return (
    header +
    `🎯 *${titleEn}*\n` +
    `📅 *When:* ${whenLabel} · ${timeStr}\n` +
    `📍 *Location:* ${locEn}\n` +
    volunteerLine +
    `\n📝 *About the session:*\n${descEn}\n\n` +
    `👇 *Register your teen & sign up as volunteer parent:*\n` +
    `${eventUrl}`
  );
}

function fetchJsonHttps(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

function parseVolunteerNames(fields) {
  const arr = fields?.volunteers?.arrayValue?.values;
  if (Array.isArray(arr) && arr.length > 0) {
    const names = arr
      .map((item) => item?.mapValue?.fields?.name?.stringValue?.trim())
      .filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }
  const legacy = fields?.volunteerParent?.stringValue?.trim();
  return legacy || null;
}

function parseFirestoreYouthEntity(doc) {
  const f = doc?.fields;
  if (!f || !f.isYouthCenter?.booleanValue) return null;
  const id = f.id?.stringValue?.trim();
  if (!id || id === 'prod-wks-yc-colomb') return null;
  const date = f.date?.stringValue?.trim();
  return {
    id,
    date: date || undefined,
    dayEn: date ? formatDayEnFromIso(date) : undefined,
    startTime: f.startTime?.stringValue?.trim() || undefined,
    endTime: f.endTime?.stringValue?.trim() || undefined,
    titleEn: f.titleEn?.stringValue?.trim() || undefined,
    titleHe: f.titleHe?.stringValue?.trim() || undefined,
    descriptionEn: f.descriptionEn?.stringValue?.trim() || undefined,
    descriptionHe: f.descriptionHe?.stringValue?.trim() || undefined,
    locationEn: f.locationDetailsEn?.stringValue?.trim() || undefined,
    imageUrl: f.imageUrl?.stringValue?.trim() || undefined,
    volunteerParent: parseVolunteerNames(f),
  };
}

async function getMergedYouthCenterEvents() {
  const map = new Map(YOUTH_CENTER_EVENTS.map((ev) => [ev.id, { ...ev }]));
  const res = await fetchJsonHttps(
    'https://firestore.googleapis.com/v1/projects/my-luz-dc028/databases/(default)/documents/envs/prod/entities?pageSize=200'
  );
  for (const doc of res?.documents || []) {
    const live = parseFirestoreYouthEntity(doc);
    if (!live) continue;
    const prev = map.get(live.id) || {};
    const merged = { ...prev };
    for (const [k, v] of Object.entries(live)) {
      if (v !== undefined && v !== null && v !== '') merged[k] = v;
    }
    map.set(live.id, merged);
  }
  return Array.from(map.values());
}

async function fetchVolunteerFromFirestore(eventId) {
  const url = `https://firestore.googleapis.com/v1/projects/my-luz-dc028/databases/(default)/documents/envs/prod/entities/${encodeURIComponent(
    eventId
  )}`;
  const doc = await fetchJsonHttps(url, 4000);
  return parseVolunteerNames(doc?.fields);
}

async function sendReminderViaPodkids(ev, { forceTestDm = false, timing = 'morning' } = {}) {
  if (!isLinked()) {
    throw new Error('PodKids WhatsApp session is not linked');
  }

  // Enrich with live volunteer parent from Firestore if available
  const liveVolunteer = ev.volunteerParent || (await fetchVolunteerFromFirestore(ev.id));
  const enrichedEv = liveVolunteer ? { ...ev, volunteerParent: liveVolunteer } : ev;

  // Strict safety check: never send to group while REMINDER_MODE !== 'live_group' or forceTestDm is true
  const recipientJid =
    forceTestDm || REMINDER_MODE !== 'live_group'
      ? SAFE_TEST_RECIPIENT_JID
      : YOUTH_CENTER_GROUP_JID;

  let finalImageBuffer = null;
  if (enrichedEv.imageUrl && enrichedEv.imageUrl.startsWith('http')) {
    try {
      const rawBuffer = await fetchImageBuffer(enrichedEv.imageUrl);
      finalImageBuffer = await renderEnglishPosterOverlay(rawBuffer, enrichedEv, timing);
    } catch (err) {
      console.warn('⚠️ Could not process image overlay:', err.message);
    }
  }

  const caption = buildEnglishCaption(enrichedEv, timing);

  await connectAndRun(async (sock) => {
    if (finalImageBuffer) {
      await sock.sendMessage(recipientJid, {
        image: finalImageBuffer,
        caption,
      });
    } else {
      await sock.sendMessage(recipientJid, {
        text: caption,
      });
    }
  });

  // Allow PodKids shared whatsapp.js socket close (1500ms) + creds.json write to flush cleanly
  await new Promise((r) => setTimeout(r, 2600));

  return {
    ok: true,
    eventId: enrichedEv.id,
    titleEn: enrichedEv.titleEn || enrichedEv.titleHe,
    recipientJid,
    mode: REMINDER_MODE,
    timing,
    groupBlocked: recipientJid === SAFE_TEST_RECIPIENT_JID,
  };
}

function getCliArgValue(prefix) {
  const arg = process.argv.find((a) => a.startsWith(`${prefix}=`));
  return arg ? arg.slice(prefix.length + 1).trim() : '';
}

function resolveSlotTiming() {
  const raw = (
    getCliArgValue('--timing') ||
    process.env.REMINDER_TIMING ||
    'auto'
  ).toLowerCase();
  if (raw === 'morning' || raw === 'evening') return raw;
  const { hour } = getIstNow();
  return hour >= 15 ? 'evening' : 'morning';
}

async function dispatchScheduledSlot({ timing, targetDateOverride = '', forceResend = false }) {
  const ist = getIstNow();
  const defaultTargetDate = timing === 'evening' ? ist.tomorrowDateStr : ist.dateStr;
  const targetDate = targetDateOverride.trim() || defaultTargetDate;
  const label = timing === 'evening' ? 'evening-before (20:00 IST)' : 'morning (09:30 IST)';

  console.log(
    `☁️ [Scheduler Check] Current IST: ${ist.dateStr} ${ist.timeStr} | Slot: ${timing} (${label}) | Target event date: ${targetDate}`
  );

  const allEvents = await getMergedYouthCenterEvents();
  const matchingEvents = allEvents.filter((e) => e.date === targetDate);
  if (matchingEvents.length === 0) {
    console.log(`ℹ️ No Youth Center event scheduled for ${targetDate} (${timing} slot). Exiting cleanly.`);
    return { sentCount: 0, targetDate, timing };
  }

  const sentLog = loadSentLog();
  let sentCount = 0;
  for (const ev of matchingEvents) {
    const key = `${REMINDER_MODE}_${timing}_${targetDate}_${ev.id}`;
    if (sentLog[key] && !forceResend) {
      console.log(`⏭️ Already sent ${timing} reminder for ${key} at ${sentLog[key]}. Skipping.`);
      continue;
    }
    console.log(`⏰ Sending ${label} English reminder for "${ev.titleEn}" (${targetDate})...`);
    const res = await sendReminderViaPodkids(ev, { timing });
    sentLog[key] = new Date().toISOString();
    saveSentLog(sentLog);
    sentCount++;
    console.log(`✅ Sent ${timing} reminder for "${ev.titleEn}" to ${res.recipientJid} (mode: ${res.mode})`);
  }
  return { sentCount, targetDate, timing };
}

// Mode 1: Immediate sample send (`node send-youth-reminder-via-podkids.cjs --sample [--timing=morning|evening]`)
if (process.argv.includes('--sample')) {
  const timing = getCliArgValue('--timing') === 'evening' ? 'evening' : 'morning';
  (async () => {
    try {
      const allEvents = await getMergedYouthCenterEvents();
      const { dateStr } = getIstNow();
      const sampleEv =
        allEvents.find((e) => e.date >= dateStr) || getNextUpcomingEvent();
      console.log(
        `🎨 Generating English poster overlay (${timing}) & sending sample for: "${sampleEv.titleEn}" (${sampleEv.dayEn} · ${sampleEv.startTime}–${sampleEv.endTime})...`
      );
      const res = await sendReminderViaPodkids(sampleEv, { forceTestDm: true, timing });
      console.log(
        `✅ Sent English sample reminder (with overlaid image & ${CANONICAL_SITE_URL} link) to ${res.recipientJid}`
      );
      process.exit(0);
    } catch (err) {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  })();
} else if (process.argv.includes('--cron-once')) {
  // Mode 2: Cloud Scheduled Run (GitHub Actions 09:30 IST morning / 20:00 IST evening-before)
  (async () => {
    try {
      const timing = resolveSlotTiming();
      const targetDateOverride = getCliArgValue('--date') || process.env.TARGET_DATE_IST || '';
      const forceResend = process.argv.includes('--force') || Boolean(process.env.FORCE_RESEND);
      await dispatchScheduledSlot({ timing, targetDateOverride, forceResend });
      process.exit(0);
    } catch (err) {
      console.error('❌ [Cloud Cron Error]:', err.message);
      process.exit(1);
    }
  })();
} else if (process.argv.includes('--daemon')) {
  // Mode 3: Lightweight HTTP + 09:30 IST Morning & 20:00 IST Evening-Before Cron Daemon
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
          canonicalSiteUrl: CANONICAL_SITE_URL,
          language: 'en',
          imageOverlay: true,
          isLinked: isLinked(),
          reminderMode: REMINDER_MODE,
          safeTestRecipient: SAFE_TEST_RECIPIENT_PHONE,
          futureTargetGroup: YOUTH_CENTER_GROUP_NAME,
          futureTargetGroupJid: YOUTH_CENTER_GROUP_JID,
          morningTimeIst: DAILY_REMINDER_TIME_IST,
          eveningBeforeTimeIst: EVENING_REMINDER_TIME_IST,
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
            getNextUpcomingEvent();
          const timing = parsed.timing === 'evening' ? 'evening' : 'morning';
          const result = await sendReminderViaPodkids(ev, { forceTestDm: true, timing });
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
        const sampleEv = getNextUpcomingEvent();
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
    res.end('Youth Center Reminder Bot (Morning 09:30 & Evening-Before 20:00 IST) is running.');
  });

  server.listen(PORT, () => {
    console.log(`🚀 Youth Center Reminder Bot (PodKids WhatsApp) listening on http://localhost:${PORT}`);
    const targetSummary =
      REMINDER_MODE === 'live_group'
        ? `LIVE GROUP "${YOUTH_CENTER_GROUP_NAME}" (${YOUTH_CENTER_GROUP_JID})`
        : `ONLY ${SAFE_TEST_RECIPIENT_PHONE} (Group "${YOUTH_CENTER_GROUP_NAME}" is locked)`;
    console.log(`🔒 Mode: ${REMINDER_MODE} -> Sending scheduled reminders to ${targetSummary}`);
    console.log(`🌐 Canonical URL: ${CANONICAL_SITE_URL}`);
    console.log(`⏰ Daily schedules (Asia/Kolkata): Morning ${DAILY_REMINDER_TIME_IST} IST & Evening-before ${EVENING_REMINDER_TIME_IST} IST`);
  });

  // Check every 45 seconds for 09:30 IST (today) or 20:00 IST (tomorrow)
  setInterval(async () => {
    try {
      const { timeStr } = getIstNow();
      if (timeStr === DAILY_REMINDER_TIME_IST) {
        await dispatchScheduledSlot({ timing: 'morning' });
      } else if (timeStr === EVENING_REMINDER_TIME_IST) {
        await dispatchScheduledSlot({ timing: 'evening' });
      }
    } catch (err) {
      console.error('❌ [Scheduler Error]:', err.message);
    }
  }, 45 * 1000);
}
