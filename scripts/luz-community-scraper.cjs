/**
 * ============================================================================
 * LUZ Goa — Community WhatsApp Scraper & Event Ingestion
 * 100% Free ($0) Cloud & Local Runner for luzschedu@gmail.com
 * Project ID: my-luz-dc028 | Database: (default)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ID = 'my-luz-dc028';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/envs/prod`;
const GAS_WEBHOOK_URL =
  process.env.GAS_WEBHOOK_URL ||
  'https://script.google.com/macros/s/AKfycbwGwt1q-aWG9CWNrCqDNBx2NG3w_cKQhNFTTxJ2XmIlHGNIh_aK2xM6jDIjq9Yj2LGp/exec';

const TARGET_GROUP_JID = '120363203819891865@g.us'; // "הקהילה! חיים בדרום גואה❤"
const TARGET_GROUP_NAME = 'הקהילה! חיים בדרום גואה❤';

// Resolve Baileys from local scraper node_modules or system
let baileysPkg;
try {
  baileysPkg = require(path.resolve('services/whatsapp-scraper/node_modules/@whiskeysockets/baileys'));
} catch (e) {
  try {
    baileysPkg = require('@whiskeysockets/baileys');
  } catch (e2) {
    baileysPkg = require('c:/Antigravity/GOA/services/whatsapp-scraper/node_modules/@whiskeysockets/baileys');
  }
}

const makeWASocket = baileysPkg.default || baileysPkg;
const { useMultiFileAuthState } = baileysPkg;

// Session management (Local folder or unpacked from GitHub Secret LUZ_WA_SESSION_GZ_B64)
function resolveSessionDir() {
  if (process.env.LUZ_WA_SESSION_GZ_B64) {
    const cloudDir = path.resolve('.wa-luz-session-cloud');
    if (fs.existsSync(cloudDir)) fs.rmSync(cloudDir, { recursive: true, force: true });
    fs.mkdirSync(cloudDir, { recursive: true });
    const tarPath = path.resolve('.wa-cloud.tar.gz');
    fs.writeFileSync(tarPath, Buffer.from(process.env.LUZ_WA_SESSION_GZ_B64.trim(), 'base64'));
    execSync(`tar -xzf "${tarPath}" -C "${cloudDir}"`);
    fs.rmSync(tarPath, { force: true });
    console.log(`[Session] Unpacked LUZ session from GitHub Secret into ${cloudDir}`);
    return cloudDir;
  }

  const localCandidates = [
    path.resolve('.wa-luz-session'),
    path.resolve('c:/Antigravity/GOA/.wa-luz-session'),
  ];
  for (const c of localCandidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('No LUZ WhatsApp session found! Run `node scripts/auth-luz-whatsapp.cjs` first.');
}

// ============================================================================
// Event Text Parser (Goa Community Events)
// ============================================================================
function parseEventFromText(text, senderNumber = '', groupName = '') {
  if (typeof text !== 'string') return null;
  const clean = text.trim().slice(0, 3000);

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

  // Extract Date if mentioned (e.g. 15.11 or 15/11 or 2026-11-15)
  let date = '';
  const dateMatch = clean.match(/\b(202\d[-/.](?:0[1-9]|1[0-2])[-/.](?:0[1-9]|[12]\d|3[01]))\b/) ||
                    clean.match(/\b([0-3]?\d)[/.](0[1-9]|1[0-2])\b/);
  if (dateMatch) {
    if (dateMatch[1] && dateMatch[1].length > 5) {
      date = dateMatch[1].replace(/[/.]/g, '-');
    } else if (dateMatch[1] && dateMatch[2]) {
      const year = new Date().getFullYear();
      date = `${year}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
    }
  }

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

  // Extract Phone Number
  const phoneMatch = clean.match(
    /(\+?\d{2,3}[-\s]?\d{2,4}[-\s]?\d{3}[-\s]?\d{3,4}|\b05\d[-\s]?\d{3}[-\s]?\d{4}\b)/
  );
  const hostPhone = phoneMatch ? phoneMatch[0].slice(0, 25) : senderNumber;

  return {
    title,
    area,
    date,
    startTime,
    priceAmount,
    priceCurrency,
    hostPhone,
    groupName: groupName || TARGET_GROUP_NAME,
    rawText: clean.slice(0, 1500),
    detectedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Firestore Duplicate Checking & Direct Push
// ============================================================================
async function fetchExistingTitles() {
  const existingTitles = new Set();
  try {
    const [entitiesRes, queueRes] = await Promise.all([
      fetch(`${FIRESTORE_BASE}/entities`).then((r) => r.json()).catch(() => ({})),
      fetch(`${FIRESTORE_BASE}/moderation_queue`).then((r) => r.json()).catch(() => ({})),
    ]);

    const allDocs = [...(entitiesRes.documents || []), ...(queueRes.documents || [])];
    for (const d of allDocs) {
      const f = d.fields || {};
      const t = (f.titleHe?.stringValue || f.title?.stringValue || '').trim().toLowerCase();
      if (t) existingTitles.add(t);
    }
  } catch (err) {
    console.warn('[Firestore] Warning reading existing titles:', err.message);
  }
  return existingTitles;
}

async function pushToFirestoreQueue(eventData) {
  const docId = `draft-wa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const url = `${FIRESTORE_BASE}/moderation_queue?documentId=${docId}`;

  const fields = {
    id: { stringValue: docId },
    titleHe: { stringValue: eventData.title },
    titleEn: { stringValue: eventData.title },
    area: { stringValue: eventData.area },
    date: { stringValue: eventData.date || '' },
    startTime: { stringValue: eventData.startTime },
    priceAmount: { integerValue: String(eventData.priceAmount) },
    priceCurrency: { stringValue: eventData.priceCurrency },
    senderPhone: { stringValue: eventData.hostPhone },
    sourceGroupName: { stringValue: eventData.groupName },
    detectedType: { stringValue: 'event' },
    status: { stringValue: 'pending' },
    confidenceScore: { integerValue: '85' },
    rawText: { stringValue: eventData.rawText },
    createdAt: { stringValue: new Date().toISOString() },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[Firestore Push Error] ${res.status}: ${errText}`);
    return false;
  }
  console.log(`[Firestore Push Success] Ingested into moderation_queue: ${docId}`);
  return true;
}

async function forwardToGoogleAppsScript(eventData) {
  try {
    const payload = {
      event: 'luz.whatsapp_scraper_event',
      referralCode: `WA-COMMUNITY-${Date.now().toString().slice(-4)}`,
      environment: 'prod',
      actionType: 'community_group_event',
      actionLabelHe: `אירוע מקבוצת "${eventData.groupName}"`,
      provider: {
        nameHe: eventData.title,
        ownerOrHost: `קבוצת ${eventData.groupName}`,
        phone: eventData.hostPhone,
        area: eventData.area,
        contactLang: 'he',
      },
      customer: {
        name: `LUZ Scraper [${eventData.groupName}]`,
        phone: eventData.hostPhone || '',
      },
      serviceOrDateSummary: `${eventData.title} | ${eventData.area} | ${eventData.priceCurrency === 'FREE' ? 'כניסה חופשית' : eventData.priceAmount + ' ' + eventData.priceCurrency}`,
      notes: eventData.rawText,
    };

    const res = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    console.log('[GAS Webhook Success]', data);
  } catch (err) {
    console.warn('[GAS Webhook Error]', err.message);
  }
}

// ============================================================================
// Main Execution
// ============================================================================
async function run() {
  console.log('🌴 LUZ Goa — Starting Community WhatsApp Ingestion...');
  const sessionDir = resolveSessionDir();
  const existingTitles = await fetchExistingTitles();
  console.log(`[Firestore] Loaded ${existingTitles.size} existing events/drafts to prevent duplicates.`);

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

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
    browser: ['LUZ Goa Platform', 'Chrome', '124.0.0'],
    connectTimeoutMs: 45000,
    keepAliveIntervalMs: 25000,
  });

  sock.ev.on('creds.update', saveCreds);

  let newEventsCount = 0;

  // Listen to message upserts during startup sync
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      const fromJid = msg.key?.remoteJid || '';
      // Check if from target group or community group
      if (fromJid !== TARGET_GROUP_JID && !/g\.us$/i.test(fromJid)) continue;

      const senderNumber = (msg.key?.participant || msg.participant || fromJid).split('@')[0];
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';

      if (!text || text.length < 15) continue;

      const parsed = parseEventFromText(text, senderNumber, TARGET_GROUP_NAME);
      if (!parsed) continue;

      const titleNorm = parsed.title.trim().toLowerCase();
      if (existingTitles.has(titleNorm)) {
        continue;
      }

      console.log(`\n⭐ [New Event Detected] "${parsed.title}" (Area: ${parsed.area}, Time: ${parsed.startTime})`);
      existingTitles.add(titleNorm);
      newEventsCount++;

      await pushToFirestoreQueue(parsed);
      await forwardToGoogleAppsScript(parsed);
    }
  });

  // Wait for connection
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.log('[Timeout] Finished message sync window.');
      resolve();
    }, 25000);

    sock.ev.on('connection.update', (update) => {
      if (update.connection === 'open') {
        console.log(`✅ WhatsApp Connected as: ${sock.user.id}`);
        console.log(`📥 Syncing recent messages from Goa groups (listening for 20s)...`);
      } else if (update.connection === 'close') {
        clearTimeout(timer);
        resolve();
      }
    });
  });

  console.log(`\n============================================================`);
  console.log(`🏁 Ingestion Complete. Total new events pushed: ${newEventsCount}`);
  console.log(`============================================================\n`);

  try {
    sock.end();
  } catch (e) {}

  process.exit(0);
}

run().catch((err) => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
