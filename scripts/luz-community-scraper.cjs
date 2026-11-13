/**
 * ============================================================================
 * LUZ Goa — Multi-Group Community WhatsApp Scraper & Data Ingestion
 * 100% Free ($0) Cloud & Local Runner for luzschedu@gmail.com
 * Project ID: my-luz-dc028 | Database: (default)
 *
 * Target Groups:
 * 1. (SGC1) South Goa Community Collective (120363429760018768@g.us) -> Events, wellness, workshops
 * 2. Parents with Children in South Goa Group (120363182876398895@g.us) -> Kids/family activities & gear
 * 3. House Hunt Canacona (120363040585010698@g.us) -> House rentals, sublets, villas, rooms
 * 4. הקהילה! חיים בדרום גואה❤ (120363203819891865@g.us) -> Community events & services
 * 5. Community Collective South Goa (120363046524039125@g.us) -> Community events
 *
 * EXCLUDED: Youth center parents (120363430775078450@g.us)
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

// Target Groups Registry
const TARGET_GROUPS = {
  // 1. SGC1 South Goa Community
  '120363429760018768@g.us': {
    name: '(SGC1) South Goa Community Collective',
    type: 'community_general',
    category: 'community',
  },
  // 2. Parents with Children
  '120363182876398895@g.us': {
    name: 'Parents with Children in South Goa Group',
    type: 'parents_kids',
    category: 'kids_family',
  },
  // 3. House Hunt Canacona
  '120363040585010698@g.us': {
    name: 'House Hunt Canacona 🏘🏘🛖🪴',
    type: 'house_rentals',
    category: 'rentals',
  },
  // 4. Hebrew Community Group
  '120363203819891865@g.us': {
    name: 'הקהילה! חיים בדרום גואה❤',
    type: 'community_general',
    category: 'community',
  },
  // 5. Large South Goa Collective
  '120363046524039125@g.us': {
    name: 'Community Collective South Goa',
    type: 'community_general',
    category: 'community',
  },
};

// Excluded from scraping (Internal Youth Center communications)
const EXCLUDED_GROUPS = new Set([
  '120363430775078450@g.us', // Youth center parents
]);

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
// Area & Location Normalizer for South Goa
// ============================================================================
function extractSouthGoaArea(text) {
  if (/פטנם|פאטנם|patnem/i.test(text)) return 'Patnem';
  if (/פאלולם|פלולם|palolem/i.test(text)) return 'Palolem';
  if (/אגונדה|agonda/i.test(text)) return 'Agonda';
  if (/גלגיבגה|galgibaga/i.test(text)) return 'Galgibaga';
  if (/קולום|colomb/i.test(text)) return 'Colomb';
  if (/צ'אודי|chaudi/i.test(text)) return 'Chaudi';
  if (/טלפונה|talpona/i.test(text)) return 'Talpona';
  if (/קנאקונה|canacona/i.test(text)) return 'Canacona';
  return 'South Goa';
}

function extractPhoneNumber(text, fallback = '') {
  const match = text.match(
    /(\+?\d{2,3}[-\s]?\d{2,4}[-\s]?\d{3}[-\s]?\d{3,4}|\b05\d[-\s]?\d{3}[-\s]?\d{4}\b|\b[6-9]\d{9}\b)/
  );
  return match ? match[0].slice(0, 25) : fallback;
}

function extractPrice(text) {
  let priceAmount = 0;
  let priceCurrency = 'FREE';
  const inrMatch = text.match(/(\d[\d,]*)\s*(?:k|thousand|רופי|רופיות|rs|inr|₹|\/-)/i);
  const ilsMatch = text.match(/(?:₪|ש"ח|שח)\s*(\d[\d,]*)|(\d[\d,]*)\s*(?:₪|ש"ח|שח)/i);

  if (inrMatch) {
    let num = parseInt(inrMatch[1].replace(/,/g, ''), 10) || 0;
    if (num < 100 && /k\b/i.test(inrMatch[0])) num *= 1000;
    if (num > 0) {
      priceAmount = Math.min(500000, num);
      priceCurrency = 'INR';
    }
  } else if (ilsMatch) {
    const val = ilsMatch[1] || ilsMatch[2];
    priceAmount = Math.min(500000, parseInt(val.replace(/,/g, ''), 10) || 0);
    priceCurrency = 'ILS';
  } else if (/free|חופשי|חינם|donation|דאנא|תרומה/i.test(text)) {
    priceAmount = 0;
    priceCurrency = 'FREE';
  } else {
    priceCurrency = 'CONTACT';
  }

  return { priceAmount, priceCurrency };
}

// ============================================================================
// 1. House / Rental Parser (for House Hunt Canacona)
// ============================================================================
function parseRentalFromText(text, senderNumber = '', groupName = '') {
  if (typeof text !== 'string') return null;
  const clean = text.trim().slice(0, 3000);

  const isRental =
    /1\s*bhk|2\s*bhk|3\s*bhk|4\s*bhk|bhk|house|villa|apartment|flat|studio|cottage|room|sublet|rent|available|for rent|lease|looking for rent|דירה|בית|להשכרה|סאבלט|חדר|וילה|קוטג'/i.test(
      clean
    );

  if (!isRental) return null;

  const area = extractSouthGoaArea(clean);
  const { priceAmount, priceCurrency } = extractPrice(clean);
  const hostPhone = extractPhoneNumber(clean, senderNumber);

  // BHK type
  let bhk = '';
  const bhkMatch = clean.match(/\b([1-4])\s*bhk\b/i);
  if (bhkMatch) bhk = `${bhkMatch[1]}BHK `;

  const lines = clean.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  let title = `${bhk}Rental in ${area}`;
  for (const line of lines) {
    const stripped = line.replace(/^[*-•~#\s]+/, '').trim();
    if (stripped.length >= 6 && !/^https?:\/\//i.test(stripped)) {
      title = stripped.length > 65 ? stripped.slice(0, 62) + '...' : stripped;
      break;
    }
  }

  return {
    title,
    titleEn: title,
    titleHe: title,
    area,
    date: '',
    startTime: '',
    priceAmount,
    priceCurrency,
    hostPhone,
    groupName,
    detectedType: 'rental',
    category: 'rentals',
    confidenceScore: 88,
    rawText: clean.slice(0, 1500),
    detectedAt: new Date().toISOString(),
  };
}

// ============================================================================
// 2. Kids & Family Activity Parser (for Parents with Children)
// ============================================================================
function parseKidsActivityFromText(text, senderNumber = '', groupName = '') {
  if (typeof text !== 'string') return null;
  const clean = text.trim().slice(0, 3000);

  const isKids =
    /ילדים|פעוטות|תינוקות|הורים|נוער|משפחות|חוג|סדנת ילדים|חינוך יער|kids|children|baby|toddler|family|playgroup|playdate|camp|nature|school|forest school|workshop|homeschool/i.test(
      clean
    );

  if (!isKids) return null;

  // Try parsing as standard event first
  const asEvent = parseEventFromText(clean, senderNumber, groupName);
  if (asEvent) {
    asEvent.category = 'kids_family';
    asEvent.detectedType = 'kids_activity';
    asEvent.audience = 'families';
    return asEvent;
  }

  // Fallback for informal playdates / meetups
  const area = extractSouthGoaArea(clean);
  const { priceAmount, priceCurrency } = extractPrice(clean);
  const hostPhone = extractPhoneNumber(clean, senderNumber);
  const firstLine = clean.split('\n').find((l) => l.trim().length > 5) || 'Kids Activity in South Goa';

  return {
    title: firstLine.slice(0, 65).trim(),
    titleEn: firstLine.slice(0, 65).trim(),
    titleHe: firstLine.slice(0, 65).trim(),
    area,
    date: '',
    startTime: '16:00',
    priceAmount,
    priceCurrency,
    hostPhone,
    groupName,
    detectedType: 'kids_activity',
    category: 'kids_family',
    confidenceScore: 82,
    rawText: clean.slice(0, 1500),
    detectedAt: new Date().toISOString(),
  };
}

// ============================================================================
// 3. General Community Events & Gatherings Parser
// ============================================================================
function parseEventFromText(text, senderNumber = '', groupName = '') {
  if (typeof text !== 'string') return null;
  const clean = text.trim().slice(0, 3000);

  const isEvent =
    /אירוע|הופעה|סדנה|חוג|מפגש|יוגה|קונצרט|קבלת שבת|כרטיסים|כניסה|מוזמנים|שידור|ג'אם|גאם|מעגל שירה|מעגל|סאונד הילינג|קקאו|אקסטטיק|פילאטיס|צ'יקונג|מדיטציה|ארוחת שישי|קידוש|הקרנה|סרט|הרצאה|שוק|יריד|פסטיבל|טרק|טיול|אימון|טורניר|event|concert|workshop|gathering|acoustic|sunset|jam|music|ceremony|tickets|rsvp|ecstatic|kirtan|cacao|sound healing|meditation|circle/i.test(
      clean
    );

  if (!isEvent) return null;

  const area = extractSouthGoaArea(clean);

  // Extract Start Time
  const timeMatch = clean.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const startTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '18:00';

  // Extract Date if mentioned
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

  const { priceAmount, priceCurrency } = extractPrice(clean);
  const hostPhone = extractPhoneNumber(clean, senderNumber);

  // Extract Title
  const lines = clean.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  let title = 'Community Event in South Goa';
  for (const line of lines) {
    const stripped = line.replace(/^[*-•~#\s]+/, '').trim();
    if (stripped.length >= 4 && !/^https?:\/\//i.test(stripped)) {
      title = stripped.length > 65 ? stripped.slice(0, 62) + '...' : stripped;
      break;
    }
  }

  return {
    title,
    titleEn: title,
    titleHe: title,
    area,
    date,
    startTime,
    priceAmount,
    priceCurrency,
    hostPhone,
    groupName,
    detectedType: 'event',
    category: 'community',
    confidenceScore: 85,
    rawText: clean.slice(0, 1500),
    detectedAt: new Date().toISOString(),
  };
}

// Master Router Parser by Group
function routeAndParse(text, senderNumber, groupJid, groupSubject) {
  const groupConfig = TARGET_GROUPS[groupJid];
  const groupName = groupConfig?.name || groupSubject || 'South Goa Group';
  const groupType = groupConfig?.type || 'community_general';

  if (groupType === 'house_rentals') {
    return parseRentalFromText(text, senderNumber, groupName);
  }
  if (groupType === 'parents_kids') {
    return parseKidsActivityFromText(text, senderNumber, groupName);
  }
  // Default: check rental first (if someone posted a house in community), then event
  const rental = parseRentalFromText(text, senderNumber, groupName);
  if (rental && /rent|house|bhk|villa|cottage|דירה/i.test(text)) return rental;

  return parseEventFromText(text, senderNumber, groupName);
}

// ============================================================================
// Firestore Duplicate Checking & Direct Push
// ============================================================================
async function fetchExistingTitles() {
  const existingTitles = new Set();
  try {
    const [entitiesRes, queueRes] = await Promise.all([
      fetch(`${FIRESTORE_BASE}/entities?pageSize=200`).then((r) => r.json()).catch(() => ({})),
      fetch(`${FIRESTORE_BASE}/moderation_queue?pageSize=200`).then((r) => r.json()).catch(() => ({})),
    ]);

    const allDocs = [...(entitiesRes.documents || []), ...(queueRes.documents || [])];
    for (const d of allDocs) {
      const f = d.fields || {};
      const t = (f.titleHe?.stringValue || f.titleEn?.stringValue || f.title?.stringValue || '').trim().toLowerCase();
      if (t) existingTitles.add(t);
    }
  } catch (err) {
    console.warn('[Firestore] Warning reading existing titles:', err.message);
  }
  return existingTitles;
}

async function pushToFirestoreQueue(item) {
  const docId = `draft-${item.detectedType || 'wa'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const url = `${FIRESTORE_BASE}/moderation_queue?documentId=${docId}`;

  const fields = {
    id: { stringValue: docId },
    titleHe: { stringValue: item.titleHe || item.title },
    titleEn: { stringValue: item.titleEn || item.title },
    area: { stringValue: item.area },
    date: { stringValue: item.date || '' },
    startTime: { stringValue: item.startTime || '' },
    priceAmount: { integerValue: String(item.priceAmount || 0) },
    priceCurrency: { stringValue: item.priceCurrency || 'CONTACT' },
    senderPhone: { stringValue: item.hostPhone || '' },
    sourceGroupName: { stringValue: item.groupName },
    detectedType: { stringValue: item.detectedType || 'event' },
    category: { stringValue: item.category || 'community' },
    status: { stringValue: 'pending' },
    confidenceScore: { integerValue: String(item.confidenceScore || 85) },
    rawText: { stringValue: item.rawText },
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
  console.log(`[Firestore Push Success] Ingested into moderation_queue (${item.detectedType}): "${item.title}"`);
  return true;
}

async function forwardToGoogleAppsScript(item) {
  try {
    const payload = {
      event: 'luz.whatsapp_scraper_event',
      referralCode: `WA-${item.detectedType.toUpperCase()}-${Date.now().toString().slice(-4)}`,
      environment: 'prod',
      actionType: `${item.detectedType}_ingestion`,
      actionLabelHe: `פריט מקבוצת "${item.groupName}" (${item.detectedType})`,
      provider: {
        nameHe: item.title,
        ownerOrHost: `קבוצת ${item.groupName}`,
        phone: item.hostPhone,
        area: item.area,
        contactLang: 'en',
      },
      customer: {
        name: `LUZ Scraper [${item.groupName}]`,
        phone: item.hostPhone || '',
      },
      serviceOrDateSummary: `${item.title} | ${item.area} | ${item.priceCurrency === 'FREE' ? 'Free Entry' : item.priceAmount + ' ' + item.priceCurrency}`,
      notes: item.rawText,
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
  console.log('🌴 LUZ Goa — Starting Multi-Group WhatsApp Ingestion...');
  console.log('Configured Target Groups:');
  Object.entries(TARGET_GROUPS).forEach(([jid, g]) => {
    console.log(`  - [${g.type}] ${g.name} (${jid})`);
  });

  const sessionDir = resolveSessionDir();
  const existingTitles = await fetchExistingTitles();
  console.log(`[Firestore] Loaded ${existingTitles.size} existing items/drafts to prevent duplicates.`);

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

  let newItemsCount = 0;

  // Listen to message upserts during startup sync
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    for (const msg of messages) {
      const fromJid = msg.key?.remoteJid || '';

      // Skip non-group messages or excluded Youth Center group
      if (!fromJid.endsWith('@g.us') || EXCLUDED_GROUPS.has(fromJid)) continue;

      // Check if target group or recognized South Goa community group
      const targetConfig = TARGET_GROUPS[fromJid];
      if (!targetConfig) continue;

      const senderNumber = (msg.key?.participant || msg.participant || fromJid).split('@')[0];
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        '';

      if (!text || text.length < 15) continue;

      const parsed = routeAndParse(text, senderNumber, fromJid, targetConfig.name);
      if (!parsed) continue;

      const titleNorm = parsed.title.trim().toLowerCase();
      if (existingTitles.has(titleNorm)) {
        continue;
      }

      console.log(
        `\n⭐ [New Item Detected (${parsed.detectedType.toUpperCase()})] "${parsed.title}"` +
        `\n   Group: ${parsed.groupName} | Area: ${parsed.area} | Price: ${parsed.priceAmount} ${parsed.priceCurrency}`
      );

      existingTitles.add(titleNorm);
      newItemsCount++;

      await pushToFirestoreQueue(parsed);
      await forwardToGoogleAppsScript(parsed);
    }
  });

  // Wait for connection and sync
  await new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.log('[Timeout] Finished message sync window.');
      resolve();
    }, 28000);

    sock.ev.on('connection.update', (update) => {
      if (update.connection === 'open') {
        console.log(`✅ WhatsApp Connected as: ${sock.user.id}`);
        console.log(`📥 Syncing recent messages from all 5 target groups (listening for 25s)...`);
      } else if (update.connection === 'close') {
        clearTimeout(timer);
        resolve();
      }
    });
  });

  console.log(`\n============================================================`);
  console.log(`🏁 Ingestion Complete. Total new items pushed: ${newItemsCount}`);
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
