/**
 * ============================================================================
 * LUZ GOA — Google Apps Script Backend (Leads CRM + Gmail + Telegram + Bot)
 * ============================================================================
 * הוראות התקנה מהירות (2 דקות):
 * 1. היכנסו ל-Google Sheets ופתחו גיליון חדש (למשל: "לידים ופניות LUZ גואה"),
 *    או היכנסו ישירות לכתובת: https://script.new
 * 2. בתפריט העליון לחצו על: Extensions (תוספים) -> Apps Script
 * 3. מחקו את הקוד הקיים והדביקו את כל הקובץ הזה. שמרו (Ctrl+S).
 * 4. למעלה בסרגל הכלים בחרו בפונקציה `setupAndTestLuzAlerts` ולחצו על **Run (הפעלה)**
 *    אשרו הרשאות חד-פעמיות (Review Permissions -> Advanced -> Go to project -> Allow).
 *    הבדיקה תיצור את הלשונית בגיליון ותשלח אליכם מייל בדיקה מיידי!
 * 5. לחצו למעלה בצד ימין על **Deploy (פריסה) -> New deployment (פריסה חדשה)**:
 *    - לחצו על גלגל השיניים ובחרו: **Web app (אפליקציית אינטרנט)**
 *    - Execute as (הפעלה בתור): **Me (אני - naorbo@gmail.com)**
 *    - Who has access (למי יש גישה): **Anyone (כל אחד)**  <-- קריטי כדי שהאתר יוכל לשלוח!
 *    - לחצו **Deploy** והעתיקו את כתובת ה-Web App URL (מסתיימת ב-`/exec`).
 * 6. הדביקו את הכתובת בלשונית "אדמין ולידים" באתר (או שלחו אותה כאן בצ'אט כדי שנצרוב אותה קבוע בקוד הפרודקשן לכל המשתמשים!).
 * ============================================================================
 */

const CONFIG = {
  ADMIN_EMAIL: 'naorbo@gmail.com',
  SEND_EMAIL_ALERTS: true,

  // אופציונלי: התראה מיידית גם לטלגרם (הטוקן נשאר פרטי ומוגן בתוך חשבון גוגל שלך!)
  TELEGRAM_BOT_TOKEN: '', // למשל: '123456789:ABCdefGHIjklMNO...'
  TELEGRAM_CHAT_ID: '',   // למשל: '987654321' או '-100123456789'

  // אופציונלי: העברה אוטומטית גם לבוט הוואטסאפ "בן" (שי)
  BEN_WHATSAPP_WEBHOOK_URL: '',

  SHEET_TAB_NAME: 'פניות_ספקים_LUZ',
};

/**
 * הרץ פונקציה זו פעם אחת מתוך עורך ה-Apps Script כדי לאשר הרשאות ולבדוק שהכל עובד!
 */
function setupAndTestLuzAlerts() {
  const { spreadsheet, sheet } = getOrCreateLeadsSheet_();
  const samplePayload = {
    event: 'luz.provider_referral',
    referralCode: 'LUZ-TEST-GAS',
    environment: 'prod',
    createdAt: new Date().toISOString(),
    timestampLocal: new Date().toLocaleString('he-IL', { timeZone: 'Asia/Kolkata' }),
    actionType: 'whatsapp_click',
    actionLabelHe: 'בדיקת חיבור Google Apps Script',
    provider: {
      id: 'prod-biz-soli-rebirthing',
      nameHe: 'סולי — ריברסינג וטיפול רגשי (CBT)',
      nameEn: 'Soli — Rebirthing & CBT',
      ownerOrHost: 'סולי',
      phone: '+66 64 094 9859',
      categoryOrType: 'טיפולי גוף, מים ונשימה',
      area: 'Patnem',
      contactLang: 'he',
    },
    customer: {
      name: 'נאור (בדיקת מערכת)',
      phone: '+972-52-000-0000',
    },
    serviceOrDateSummary: 'בדיקת שמירה אוטומטית ל-Google Sheets ושליחת מייל/טלגרם',
  };

  processReferralEvent_(samplePayload, spreadsheet, sheet);
  Logger.log('הבדיקה הצליחה! קישור לגיליון הלידים: ' + spreadsheet.getUrl());
}

/**
 * נקודת קצה לבדיקת תקינות בדפדפן (GET)
 */
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      service: 'LUZ Goa Google Apps Script Webhook',
      status: 'active',
      timestamp: new Date().toISOString(),
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * נקודת קצה לקבלת התראות בזמן אמת מאתר LUZ גואה (POST)
 */
function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(rawBody);

    // מניעת כפילויות במקרה של שליחה חוזרת מהדפדפן תוך 15 שניות
    const dedupKey = 'luz_' + (data.referralCode || '') + '_' + (data.actionType || '');
    const cache = CacheService.getScriptCache();
    if (data.referralCode && data.referralCode !== 'LUZ-TEST-001' && cache.get(dedupKey)) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, deduplicated: true })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    cache.put(dedupKey, '1', 15);

    const { spreadsheet, sheet } = getOrCreateLeadsSheet_();
    processReferralEvent_(data, spreadsheet, sheet);

    return ContentService.createTextOutput(
      JSON.stringify({
        ok: true,
        referralCode: data.referralCode,
        sheetUrl: spreadsheet.getUrl(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        ok: false,
        error: String(err && err.message ? err.message : err),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function processReferralEvent_(data, spreadsheet, sheet) {
  const goaTime = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm:ss');
  const provider = data.provider || {};
  const customer = data.customer || {};

  // 1. תיעוד שורה חדשה בגיליון Google Sheets
  sheet.appendRow([
    goaTime,
    '#' + (data.referralCode || 'LUZ'),
    String(data.environment || 'prod').toUpperCase(),
    data.actionLabelHe || data.actionType || 'פנייה לספק',
    provider.nameHe || '',
    provider.ownerOrHost || '',
    provider.phone || '',
    provider.categoryOrType || '',
    provider.area || '',
    provider.contactLang === 'en' ? 'English' : 'עברית',
    customer.name || 'מבקר/ת באתר',
    customer.phone || 'לחיצה ישירה',
    data.serviceOrDateSummary || '—',
  ]);

  // 2. שליחת התראת אימייל מעוצבת בעברית (RTL) מ-Gmail שלך
  if (CONFIG.SEND_EMAIL_ALERTS && CONFIG.ADMIN_EMAIL) {
    const subject =
      'פנייה חדשה מ-LUZ גואה אל: ' +
      (provider.nameHe || 'ספק') +
      ' [#' +
      (data.referralCode || 'LUZ') +
      ']';

    const providerDigits = String(provider.phone || '').replace(/[^0-9]/g, '');
    const customerDigits = String(customer.phone || '').replace(/[^0-9]/g, '');

    const htmlBody = [
      '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:600px;background:#FAF6EE;padding:20px;border-radius:14px;border:1px solid #E5DCCB;color:#163024;">',
      '<h2 style="margin:0 0 12px 0;color:#163024;">פנייה חדשה לספק מתוך פלטפורמת LUZ גואה</h2>',
      '<div style="background:#FFFFFF;padding:16px;border-radius:10px;border:1px solid #E5DCCB;line-height:1.7;">',
      '<div><strong>מזהה הפניה (נשלח לספק):</strong> <span style="font-family:monospace;background:#163024;color:#EAB354;padding:2px 7px;border-radius:5px;">#' +
        (data.referralCode || '') +
        '</span></div>',
      '<div><strong>סוג פעולה:</strong> ' + (data.actionLabelHe || data.actionType || '') + '</div>',
      '<div><strong>ספק / שירות:</strong> ' +
        (provider.nameHe || '') +
        ' (' +
        (provider.ownerOrHost || '') +
        ')</div>',
      '<div><strong>קטגוריה ואזור:</strong> ' +
        (provider.categoryOrType || '') +
        ' | ' +
        (provider.area || '') +
        '</div>',
      '<div><strong>טלפון ספק:</strong> <span dir="ltr">' + (provider.phone || '') + '</span></div>',
      '<div><strong>שפת הודעת השיוך לספק:</strong> ' +
        (provider.contactLang === 'en' ? 'English (ספק מקומי/בינ"ל)' : 'עברית') +
        '</div>',
      '<hr style="border:none;border-top:1px solid #EEE5D5;margin:10px 0;" />',
      '<div><strong>פרטי הפונה:</strong> ' +
        (customer.name || 'מבקר/ת באתר') +
        (customer.phone ? ' (<span dir="ltr">' + customer.phone + '</span>)' : ' (לחיצה ישירה)') +
        '</div>',
      '<div><strong>פירוט תור / מועד:</strong> ' + (data.serviceOrDateSummary || '—') + '</div>',
      '<div><strong>זמן (שעון גואה) וסביבה:</strong> ' +
        goaTime +
        ' | ' +
        String(data.environment || 'prod').toUpperCase() +
        '</div>',
      '</div>',
      '<div style="margin-top:16px;">',
      '<a href="' +
        spreadsheet.getUrl() +
        '" style="display:inline-block;background:#163024;color:#FAF6EE;text-decoration:none;padding:9px 14px;border-radius:8px;font-weight:bold;margin-left:8px;">פתיחת גיליון הלידים המלא (Google Sheets)</a>',
      providerDigits
        ? '<a href="https://wa.me/' +
          providerDigits +
          '" style="display:inline-block;background:#C85A32;color:#FFFFFF;text-decoration:none;padding:9px 14px;border-radius:8px;font-weight:bold;margin-left:8px;">וואטסאפ לספק</a>'
        : '',
      customerDigits
        ? '<a href="https://wa.me/' +
          customerDigits +
          '" style="display:inline-block;background:#2A6F7B;color:#FFFFFF;text-decoration:none;padding:9px 14px;border-radius:8px;font-weight:bold;">וואטסאפ לפונה</a>'
        : '',
      '</div>',
      '</div>',
    ].join('');

    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      subject: subject,
      htmlBody: htmlBody,
    });
  }

  // 3. שליחת התראה מיידית לטלגרם (אם הוגדר למעלה ב-CONFIG)
  if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) {
    const tgText = [
      'פנייה חדשה לספק מתוך LUZ גואה!',
      '• מזהה: #' + (data.referralCode || ''),
      '• פעולה: ' + (data.actionLabelHe || data.actionType || ''),
      '• ספק: ' + (provider.nameHe || '') + ' (' + (provider.ownerOrHost || '') + ')',
      '• אזור וטלפון: ' + (provider.area || '') + ' | ' + (provider.phone || ''),
      '• פונה: ' + (customer.name || 'מבקר/ת באתר') + (customer.phone ? ' (' + customer.phone + ')' : ''),
      data.serviceOrDateSummary ? '• פירוט: ' + data.serviceOrDateSummary : '',
      '• זמן גואה: ' + goaTime,
    ]
      .filter(Boolean)
      .join('\n');

    UrlFetchApp.fetch(
      'https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage',
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id: CONFIG.TELEGRAM_CHAT_ID,
          text: tgText,
        }),
        muteHttpExceptions: true,
      }
    );
  }

  // 4. העברה אופציונלית לבוט "בן" בוואטסאפ
  if (CONFIG.BEN_WHATSAPP_WEBHOOK_URL) {
    UrlFetchApp.fetch(CONFIG.BEN_WHATSAPP_WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(data),
      muteHttpExceptions: true,
    });
  }
}

/**
 * מאתר את הגיליון הפעיל או יוצר אוטומטית גיליון Google Sheets חדש אם הסקריפט נוצר כקובץ עצמאי!
 */
function getOrCreateLeadsSheet_() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    const props = PropertiesService.getScriptProperties();
    const savedId = props.getProperty('LUZ_GOA_SPREADSHEET_ID');
    if (savedId) {
      try {
        ss = SpreadsheetApp.openById(savedId);
      } catch (e) {
        ss = null;
      }
    }
    if (!ss) {
      ss = SpreadsheetApp.create('LUZ Goa — יומן לידים ופניות לספקים');
      props.setProperty('LUZ_GOA_SPREADSHEET_ID', ss.getId());
    }
  }

  let sheet = ss.getSheetByName(CONFIG.SHEET_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_TAB_NAME);
    sheet.setRightToLeft(true);
    const headers = [
      'זמן פנייה (גואה)',
      'מזהה הפניה (#LUZ)',
      'סביבה',
      'סוג פעולה',
      'שם העסק / פעילות',
      'בעלים / מארח',
      'טלפון ספק',
      'קטגוריה',
      'אזור בגואה',
      'שפת שיוך לספק',
      'שם הפונה',
      'טלפון הפונה',
      'פירוט תור / מועד',
    ];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#163024');
    headerRange.setFontColor('#FAF6EE');
    headerRange.setFontWeight('bold');
  }

  return { spreadsheet: ss, sheet: sheet };
}
