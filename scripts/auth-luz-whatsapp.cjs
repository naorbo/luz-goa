const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const QRCode = require(path.resolve('services/whatsapp-scraper/node_modules/qrcode'));
const baileysPkg = require(path.resolve('services/whatsapp-scraper/node_modules/@whiskeysockets/baileys'));

const makeWASocket = baileysPkg.default || baileysPkg;
const {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = baileysPkg;

const SESSION_DIR = path.resolve('c:/Antigravity/GOA/.wa-luz-session');
const PORT = 4040;

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

let latestQrDataUrl = null;
let connectionState = 'waiting_qr'; // 'waiting_qr' | 'connected' | 'error'
let connectedUser = null;
let participatingGroups = [];

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      state: connectionState,
      user: connectedUser,
      groupsCount: participatingGroups.length,
    }));
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

  if (connectionState === 'connected') {
    return res.end(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8">
        <title>LUZ Goa — הוואטסאפ מחובר בהצלחה!</title>
        <style>
          body { font-family: system-ui, sans-serif; background: #163024; color: #FAF6EE; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
          .card { background: #1f3e30; border: 1px solid #2d5a46; border-radius: 20px; padding: 40px; text-align: center; max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
          h1 { color: #84cc16; margin: 0 0 16px 0; font-size: 28px; }
          p { color: #c8ded4; line-height: 1.6; font-size: 16px; margin: 8px 0; }
          .badge { display: inline-block; background: #2d5a46; color: #FAF6EE; padding: 8px 16px; border-radius: 999px; font-weight: bold; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>✅ הוואטסאפ של LUZ מחובר בהצלחה!</h1>
          <p>חשבון מחובר: <strong>${connectedUser?.name || 'LUZ Bot'} (${connectedUser?.id?.split(':')[0] || ''})</strong></p>
          <p>נמצאו <strong>${participatingGroups.length}</strong> קבוצות פעילות בחשבון זה.</p>
          <div class="badge">הסשן נשמר במערכת העצמאית של LUZ Goa</div>
        </div>
      </body>
      </html>
    `);
  }

  if (latestQrDataUrl) {
    return res.end(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>חיבור וואטסאפ ייעודי — LUZ Goa</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #12221a; color: #FAF6EE; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1a3327; border: 1px solid #2a523e; border-radius: 24px; padding: 36px; text-align: center; max-width: 440px; width: 100%; box-shadow: 0 24px 48px rgba(0,0,0,0.4); }
          h1 { color: #FAF6EE; margin: 0 0 10px 0; font-size: 24px; }
          .sub { color: #9abfb0; font-size: 14px; margin-bottom: 24px; }
          .qr-box { background: #FFFFFF; padding: 20px; border-radius: 16px; display: inline-block; margin-bottom: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
          .qr-box img { width: 260px; height: 260px; display: block; }
          .instructions { background: #13271e; border-radius: 12px; padding: 14px 18px; text-align: right; font-size: 13px; color: #c4ded3; line-height: 1.7; }
          ol { margin: 6px 0; padding-right: 20px; }
          .pulse { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-left: 8px; animation: blink 1.4s infinite; }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        </style>
        <script>
          setInterval(async () => {
            try {
              const res = await fetch('/status');
              const data = await res.json();
              if (data.state === 'connected') {
                location.reload();
              }
            } catch (e) {}
          }, 2500);
        </script>
      </head>
      <body>
        <div class="card">
          <h1>🌴 LUZ Goa — חיבור וואטסאפ</h1>
          <div class="sub"><span class="pulse"></span>ממתין לסריקת קוד QR</div>
          <div class="qr-box">
            <img src="${latestQrDataUrl}" alt="WhatsApp QR Code" />
          </div>
          <div class="instructions">
            <strong>איך לסרוק בטלפון:</strong>
            <ol>
              <li>פתח את <strong>WhatsApp</strong> בטלפון של LUZ</li>
              <li>הגדרות (Settings) ➜ <strong>מכשירים מקושרים (Linked Devices)</strong></li>
              <li>לחץ על <strong>קשר מכשיר (Link a Device)</strong></li>
              <li>כוון את המצלמה לקוד שמופיע כאן</li>
            </ol>
          </div>
        </div>
      </body>
      </html>
    `);
  }

  return res.end(`
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head><meta charset="utf-8"><title>מאתחל...</title><meta http-equiv="refresh" content="2"></head>
    <body style="background:#12221a;color:#fff;font-family:sans-serif;text-align:center;padding-top:80px;">
      <h2>מייצר קוד QR לחיבור... אנא המתן שניה אחת...</h2>
    </body>
    </html>
  `);
});

server.listen(PORT, async () => {
  console.log(`\n============================================================`);
  console.log(`🌴 LUZ Goa — WhatsApp Authentication Server`);
  console.log(`🌐 Web UI: http://localhost:${PORT}`);
  console.log(`📁 Session directory: ${SESSION_DIR}`);
  console.log(`============================================================\n`);

  try {
    execSync(`start http://localhost:${PORT}`);
  } catch (e) {}

  await startBaileys();
});

async function startBaileys() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  let version = [2, 3000, 1015901307];
  try {
    const v = await fetchLatestBaileysVersion();
    if (v && v.version) version = v.version;
  } catch (e) {}

  const sock = makeWASocket({
    version,
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
    auth: state,
    browser: ['LUZ Goa Platform', 'Chrome', '124.0.0'],
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      latestQrDataUrl = await QRCode.toDataURL(qr, { margin: 1 });
      console.log(`\n📲 קוד QR חדש נוצר! סרוק אותו מתוך: http://localhost:${PORT}`);
      try {
        const terminalQr = await QRCode.toString(qr, { type: 'terminal', small: true });
        console.log(terminalQr);
      } catch (e) {}
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[Connection Closed] statusCode=${statusCode}, shouldReconnect=${shouldReconnect}`);

      if (shouldReconnect) {
        setTimeout(startBaileys, 3000);
      } else {
        console.log('Logged out. Please re-run to scan a fresh QR.');
        connectionState = 'error';
      }
    } else if (connection === 'open') {
      connectionState = 'connected';
      connectedUser = sock.user;
      console.log(`\n============================================================`);
      console.log(`✅ חיבור הוואטסאפ של LUZ Goa הושלם בהצלחה!`);
      console.log(`📱 טלפון: ${connectedUser?.id}`);
      console.log(`👤 שם: ${connectedUser?.name || 'LUZ User'}`);
      console.log(`============================================================\n`);

      try {
        console.log('טוען רשימת קבוצות...');
        const groups = await sock.groupFetchAllParticipating();
        participatingGroups = Object.values(groups).map((g) => ({
          id: g.id,
          subject: g.subject,
          participants: g.participants?.length || 0,
        }));
        console.log(`נמצאו ${participatingGroups.length} קבוצות:`);
        participatingGroups.forEach((g) => {
          if (/גואה|goa|קהילה|נוער|youth|bina|בינה|luz/i.test(g.subject)) {
            console.log(`  ⭐ [התאמה לגואה] ${g.subject} (${g.participants} משתתפים, JID: ${g.id})`);
          } else {
            console.log(`  - ${g.subject} (${g.participants} משתתפים)`);
          }
        });
      } catch (err) {
        console.warn('שגיאה בטעינת קבוצות:', err.message);
      }

      // Automatically package session to base64
      try {
        console.log('\nאורז את קובצי הסשן של LUZ לענן...');
        const tarPath = path.resolve('c:/Antigravity/GOA/.wa-luz-session.tar.gz');
        execSync(`tar -czf "${tarPath}" -C "${SESSION_DIR}" .`);
        const tarBuf = fs.readFileSync(tarPath);
        const b64 = tarBuf.toString('base64');
        const b64File = path.resolve('c:/Antigravity/GOA/.wa-luz-session.b64');
        fs.writeFileSync(b64File, b64);
        console.log(`קובץ סשן נשמר בהצלחה: ${b64File} (${Math.round(b64.length / 1024)} KB)`);

        try {
          execSync(`gh secret set LUZ_WA_SESSION_GZ_B64 --body "${b64}" --repo naorbo/luz-goa`);
          console.log(`🚀 ה-Secret הועלה בהצלחה ל-GitHub Actions (LUZ_WA_SESSION_GZ_B64)!`);
        } catch (ghErr) {
          console.warn('הערה: לא ניתן להעלות ישירות דרך gh CLI:', ghErr.message);
        }
      } catch (packErr) {
        console.warn('שגיאה באריזת הסשן:', packErr.message);
      }

      console.log('\nהמערכת מוכנה! תוכל לסגור את החלון.');
    }
  });
}
