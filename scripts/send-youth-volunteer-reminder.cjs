#!/usr/bin/env node
/**
 * ============================================================================
 * Youth Center Evening Volunteer Parent Reminder
 * Checks the next 3-4 upcoming Youth Center events.
 * If any event is missing a volunteer parent, sends a targeted reminder to:
 * "Youth center parents" WhatsApp group (120363430775078450@g.us)
 * with 1-click links for parents to sign up!
 * ============================================================================
 */

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const zlib = require('node:zlib');
const { execSync } = require('node:child_process');

const PROJECT_ID = 'my-luz-dc028';
const CANONICAL_SITE_URL = 'https://my-luz-dc028.web.app';
const YOUTH_PARENTS_GROUP_JID = '120363430775078450@g.us'; // "Youth center parents"
const SAFE_TEST_PHONE = '972508878902';
const SAFE_TEST_JID = `${SAFE_TEST_PHONE}@s.whatsapp.net`;

const LOCAL_LUZ_SESSION = path.resolve(process.cwd(), '.wa-luz-session');
const CLOUD_SESSION_DIR = path.resolve(process.cwd(), '.wa-session-cloud');
const SENT_CACHE_FILE = path.join(__dirname, '.youth-volunteer-reminders-sent.json');

// Baileys Loader
let baileysPkg;
try {
  baileysPkg = require('@whiskeysockets/baileys');
} catch {
  try {
    baileysPkg = require(path.resolve('services/whatsapp-scraper/node_modules/@whiskeysockets/baileys'));
  } catch {
    baileysPkg = require('C:\\podkids\\node_modules\\@whiskeysockets\\baileys');
  }
}

const makeWASocket = baileysPkg.default || baileysPkg;
const { useMultiFileAuthState, DisconnectReason, Browsers } = baileysPkg;

// Resolve Session Directory
function resolveSessionDir() {
  if (process.env.WA_SESSION_DIR) {
    return path.resolve(process.env.WA_SESSION_DIR);
  }
  const rawB64 = process.env.LUZ_WA_SESSION_GZ_B64 || process.env.WA_SESSION_GZ_B64;
  if (rawB64) {
    fs.mkdirSync(CLOUD_SESSION_DIR, { recursive: true });
    const buf = Buffer.from(rawB64.trim(), 'base64');
    let unpacked = false;
    try {
      const tarPath = path.resolve('.tmp-session.tar.gz');
      fs.writeFileSync(tarPath, buf);
      execSync(`tar -xzf "${tarPath}" -C "${CLOUD_SESSION_DIR}"`);
      fs.rmSync(tarPath, { force: true });
      unpacked = true;
    } catch {}
    if (!unpacked) {
      try {
        const rawJson = zlib.gunzipSync(buf).toString('utf8');
        const filesMap = JSON.parse(rawJson);
        for (const [fileName, content] of Object.entries(filesMap)) {
          fs.writeFileSync(path.join(CLOUD_SESSION_DIR, fileName), content, 'utf8');
        }
      } catch {}
    }
    return CLOUD_SESSION_DIR;
  }
  if (fs.existsSync(path.join(LOCAL_LUZ_SESSION, 'creds.json'))) {
    return LOCAL_LUZ_SESSION;
  }
  if (fs.existsSync(path.join(CLOUD_SESSION_DIR, 'creds.json'))) {
    return CLOUD_SESSION_DIR;
  }
  return LOCAL_LUZ_SESSION;
}

// Core Youth Center Schedule
const CORE_YOUTH_EVENTS = [
  {
    id: 'yc-2026-11-06-odt-opening',
    date: '2026-11-06',
    dayEn: 'Friday, Nov 6',
    startTime: '10:00',
    endTime: '13:00',
    titleEn: 'Grand Opening — Goa Teens House | The Ball Game with Ilan',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-07-movie',
    date: '2026-11-07',
    dayEn: 'Saturday, Nov 7',
    startTime: '18:00',
    endTime: '20:30',
    titleEn: 'Youth Movie Night Screening',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-08-open-space',
    date: '2026-11-08',
    dayEn: 'Sunday, Nov 8',
    startTime: '16:30',
    endTime: '19:30',
    titleEn: 'Open Youth Space & Hangout',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-09-jam',
    date: '2026-11-09',
    dayEn: 'Monday, Nov 9',
    startTime: '17:00',
    endTime: '19:30',
    titleEn: 'Sunset Music Jam Session',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-12-board-games',
    date: '2026-11-12',
    dayEn: 'Thursday, Nov 12',
    startTime: '17:00',
    endTime: '18:30',
    titleEn: 'Strategy Board Games & Tournaments',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-14-movie',
    date: '2026-11-14',
    dayEn: 'Saturday, Nov 14',
    startTime: '18:00',
    endTime: '20:30',
    titleEn: 'Youth Movie Night Screening',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-15-open-space',
    date: '2026-11-15',
    dayEn: 'Sunday, Nov 15',
    startTime: '16:30',
    endTime: '19:30',
    titleEn: 'Open Youth Space & Hangout',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-16-guest-talk',
    date: '2026-11-16',
    dayEn: 'Monday, Nov 16',
    startTime: '17:00',
    endTime: '18:45',
    titleEn: 'Guest Speaker & Inspiring Stories',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-19-art',
    date: '2026-11-19',
    dayEn: 'Thursday, Nov 19',
    startTime: '16:30',
    endTime: '19:00',
    titleEn: 'Youth Art & Creative Studio',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-21-movie',
    date: '2026-11-21',
    dayEn: 'Saturday, Nov 21',
    startTime: '18:00',
    endTime: '20:30',
    titleEn: 'Youth Movie Night Screening',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-22-open-space',
    date: '2026-11-22',
    dayEn: 'Sunday, Nov 22',
    startTime: '16:30',
    endTime: '19:30',
    titleEn: 'Open Youth Space & Hangout',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-23-jam',
    date: '2026-11-23',
    dayEn: 'Monday, Nov 23',
    startTime: '17:00',
    endTime: '19:30',
    titleEn: 'Acoustic Jam Session',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-26-board-games',
    date: '2026-11-26',
    dayEn: 'Thursday, Nov 26',
    startTime: '16:30',
    endTime: '19:00',
    titleEn: 'Strategy Board Games & Tournaments',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-28-movie',
    date: '2026-11-28',
    dayEn: 'Saturday, Nov 28',
    startTime: '18:00',
    endTime: '20:30',
    titleEn: 'Youth Movie Night Screening',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-29-open-space',
    date: '2026-11-29',
    dayEn: 'Sunday, Nov 29',
    startTime: '16:30',
    endTime: '19:30',
    titleEn: 'Open Youth Space & Hangout',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
  {
    id: 'yc-2026-11-30-guest-talk',
    date: '2026-11-30',
    dayEn: 'Monday, Nov 30',
    startTime: '17:00',
    endTime: '18:45',
    titleEn: 'Guest Speaker & Inspiring Stories',
    locationEn: 'Colomb Youth Center (near Shailish)',
  },
];

function fetchJsonHttps(url, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'LUZ-Volunteer-Bot/1.0' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(null);
    });
  });
}

function parseVolunteers(fields) {
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

async function fetchLiveFirestoreEvents() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/envs/prod/entities?pageSize=200`;
  const res = await fetchJsonHttps(url);
  const map = new Map();

  for (const doc of res?.documents || []) {
    const f = doc.fields;
    if (!f) continue;
    const isYc = f.isYouthCenter?.booleanValue || doc.name?.includes('yc-');
    if (!isYc) continue;

    const id = f.id?.stringValue || doc.name.split('/').pop();
    const volunteerName = parseVolunteers(f);
    map.set(id, {
      id,
      titleEn: f.titleEn?.stringValue || f.titleHe?.stringValue,
      titleHe: f.titleHe?.stringValue,
      date: f.date?.stringValue,
      startTime: f.startTime?.stringValue,
      endTime: f.endTime?.stringValue,
      locationEn: f.locationDetailsEn?.stringValue || f.locationDetailsHe?.stringValue,
      volunteerParent: volunteerName,
    });
  }
  return map;
}

function getIstDateAndTime() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const yyyy = ist.getUTCFullYear();
  const mm = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(ist.getUTCDate()).padStart(2, '0');
  const hh = String(ist.getUTCHours()).padStart(2, '0');
  const min = String(ist.getUTCMinutes()).padStart(2, '0');
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
    hours: ist.getUTCHours(),
  };
}

function formatDayName(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[dt.getUTCDay()]}, ${months[dt.getUTCMonth()]} ${d}`;
}

async function getUpcomingEventsNeedingVolunteers(limit = 4) {
  const liveMap = await fetchLiveFirestoreEvents();
  const { date: todayIst, hours: istHours } = getIstDateAndTime();

  // If running late in the evening (after 19:30), start looking from tomorrow
  const cutoffDate = istHours >= 20 ? todayIst : todayIst;

  // Merge core schedule with live Firestore
  const allMerged = CORE_YOUTH_EVENTS.map((core) => {
    const live = liveMap.get(core.id);
    return {
      ...core,
      ...(live || {}),
      dayEn: core.dayEn || formatDayName(core.date),
      volunteerParent: live?.volunteerParent || core.volunteerParent || null,
    };
  });

  // Sort upcoming chronologically
  const upcoming = allMerged
    .filter((e) => e.date && (istHours >= 20 ? e.date > cutoffDate : e.date >= cutoffDate))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .slice(0, limit);

  console.log(`\n📅 Next ${upcoming.length} upcoming Youth Center events:`);
  upcoming.forEach((e) => {
    const vol = e.volunteerParent;
    console.log(`- [${e.date}] ${e.titleEn} ➜ Volunteer: ${vol ? `✅ ${vol}` : '❌ MISSING'}`);
  });

  const needingVolunteers = upcoming.filter((e) => !e.volunteerParent);
  return { upcoming, needingVolunteers };
}

function buildVolunteerCalloutMessage(eventsNeedingVolunteers) {
  const lines = [
    `🌴 *Goa Teens House — Volunteer Parents Callout* 🌴`,
    ``,
    `Dear Parents,`,
    `Our community Youth Center is powered by parent volunteers! We need a volunteer parent on duty for the following upcoming sessions:`,
    ``,
  ];

  eventsNeedingVolunteers.forEach((ev, idx) => {
    const dayStr = ev.dayEn || formatDayName(ev.date);
    const timeStr = `${ev.startTime || '16:30'}${ev.endTime ? ` – ${ev.endTime}` : ''}`;
    const volUrl = `${CANONICAL_SITE_URL}/?tab=youth_center&event=${encodeURIComponent(ev.id)}&action=volunteer`;

    lines.push(`🎯 *${idx + 1}. ${ev.titleEn}*`);
    lines.push(`📅 ${dayStr} • ${timeStr}`);
    lines.push(`📍 ${ev.locationEn || 'Colomb Youth Center (near Shailish)'}`);
    lines.push(`👉 *Click to sign up as volunteer parent:*`);
    lines.push(`${volUrl}`);
    lines.push(``);
  });

  lines.push(`🤝 *Taking a shift is easy & meaningful:*`);
  lines.push(`• Be a welcoming presence at the entrance`);
  lines.push(`• Check in teens upon arrival`);
  lines.push(`• Support a safe, vibrant space for our kids`);
  lines.push(``);
  lines.push(`Thank you for helping keep our teen community thriving! 🙏✨`);

  return lines.join('\n');
}

async function connectAndSend(recipientJid, messageText) {
  const sessionDir = resolveSessionDir();
  console.log(`[Session] Using: ${sessionDir}`);

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  return new Promise((resolve, reject) => {
    const sock = makeWASocket({
      auth: state,
      logger: {
        level: 'silent',
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        child: () => ({ trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {} }),
      },
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      connectTimeoutMs: 45000,
    });

    sock.ev.on('creds.update', saveCreds);

    let sent = false;

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        console.log(`✅ WhatsApp Connected as: ${sock.user.id}`);
        try {
          console.log(`📤 Sending evening volunteer callout to: ${recipientJid}...`);
          const result = await sock.sendMessage(recipientJid, { text: messageText });
          console.log(`🎉 Message sent successfully! Msg ID: ${result?.key?.id}`);
          sent = true;

          setTimeout(() => {
            try { sock.end(); } catch {}
            resolve(true);
          }, 1500);
        } catch (err) {
          console.error('[Send Error]', err.message);
          try { sock.end(); } catch {}
          reject(err);
        }
      } else if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (!sent && statusCode === DisconnectReason.loggedOut) {
          reject(new Error('WhatsApp session logged out.'));
        }
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isTestDm = args.includes('--test-dm');

  console.log('============================================================');
  console.log('🌴 LUZ Goa — Youth Center Evening Volunteer Reminder');
  console.log(`Mode: ${isDryRun ? 'DRY RUN' : isTestDm ? `TEST DM (${SAFE_TEST_PHONE})` : `LIVE GROUP (${YOUTH_PARENTS_GROUP_JID})`}`);
  console.log('============================================================');

  const { upcoming, needingVolunteers } = await getUpcomingEventsNeedingVolunteers(4);

  if (needingVolunteers.length === 0) {
    console.log(`\n🎉 Wonderful news! All ${upcoming.length} upcoming events already have volunteer parents assigned.`);
    console.log('No reminder message needed tonight.');
    process.exit(0);
  }

  console.log(`\n⚠️ Found ${needingVolunteers.length} upcoming event(s) missing a volunteer parent!`);

  const messageText = buildVolunteerCalloutMessage(needingVolunteers);
  console.log('\n--- Message Preview ---');
  console.log(messageText);
  console.log('-----------------------\n');

  if (isDryRun) {
    console.log('Dry run complete. No message sent.');
    process.exit(0);
  }

  const targetRecipient = isTestDm ? SAFE_TEST_JID : YOUTH_PARENTS_GROUP_JID;
  await connectAndSend(targetRecipient, messageText);
  console.log('\nDone!');
  process.exit(0);
}

main().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
