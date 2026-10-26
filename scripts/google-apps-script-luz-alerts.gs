/**
 * ============================================================================
 * LUZ GOA — Google Apps Script Backend (Leads CRM + Gmail + Telegram + Bot)
 * ============================================================================
 * חשוב: יש להריץ ולפרוס את הסקריפט מתוך חשבון הגוגל הרשמי של המערכת:
 * Account / Sender: luzschedu@gmail.com
 *
 * הוראות התקנה מהירות (2 דקות):
 * 1. התחברו לחשבון luzschedu@gmail.com ופתחו Google Sheet חדש (או https://script.new)
 * 2. בתפריט העליון לחצו על: Extensions -> Apps Script
 * 3. מחקו את הקוד הקיים והדביקו את כל הקובץ הזה. שמרו (Ctrl+S).
 * 4. בסרגל הכלים בחרו בפונקציה `setupAndTestLuzAlerts` ולחצו על **Run**
 *    אשרו הרשאות חד-פעמיות (Review Permissions -> Advanced -> Go to project -> Allow).
 *    הבדיקה תיצור את הלשונית בגיליון ותשלח מייל בדיקה מ-luzschedu@gmail.com!
 * 5. לחצו למעלה על **Deploy -> New deployment**:
 *    - סוג: **Web app**
 *    - Execute as: **Me (luzschedu@gmail.com)**
 *    - Who has access: **Anyone**  <-- קריטי כדי שהאתר יוכל לשלוח מכל מכשיר!
 *    - לחצו **Deploy** והעתיקו את כתובת ה-Web App URL (מסתיימת ב-`/exec`).
 * 6. הדביקו את הכתובת בלשונית Admin & Leads באתר או שלחו אותה בצ'אט לצריבה קבועה!
 * ============================================================================
 */

const CONFIG = {
  // החשבון שממנו רץ הסקריפט וממנו נשלחים המיילים:
  SENDER_EMAIL: 'luzschedu@gmail.com',
  SENDER_NAME: 'LUZ Goa Platform',

  // כתובת המייל לקבלת התראות הלידים (ניתן להוסיף כתובות נוספות מופרדות בפסיק):
  ADMIN_EMAIL: 'luzschedu@gmail.com',
  SEND_EMAIL_ALERTS: true,

  // אופציונלי: התראה מיידית גם לטלגרם (הטוקן נשאר פרטי ומוגן בתוך חשבון גוגל!)
  TELEGRAM_BOT_TOKEN: '', // למשל: '123456789:ABCdefGHIjklMNO...'
  TELEGRAM_CHAT_ID: '',   // למשל: '987654321' או '-100123456789'

  // אופציונלי: העברה אוטומטית גם לבוט הוואטסאפ "בן"
  BEN_WHATSAPP_WEBHOOK_URL: '',

  SHEET_TAB_NAME: 'LUZ_Referrals',
};

/**
 * הרץ פונקציה זו פעם אחת מתוך עורך ה-Apps Script ( תחת luzschedu@gmail.com ) כדי לאשר הרשאות ולבדוק!
 */
function setupAndTestLuzAlerts() {
  const { spreadsheet, sheet } = getOrCreateLeadsSheet_();
  const samplePayload = {
    event: 'luz.provider_referral',
    referralCode: 'LUZ-TEST-GAS',
    environment: 'prod',
    createdAt: new Date().toISOString(),
    timestampLocal: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }),
    actionType: 'whatsapp_click',
    actionLabelHe: 'בדיקת חיבור Google Apps Script',
    provider: {
      id: 'prod-biz-soli-rebirthing',
      nameHe: 'סולי — ריברסינג וטיפול רגשי (CBT)',
      nameEn: 'Soli — Rebirthing & CBT',
      ownerOrHost: 'Soli / סולי',
      phone: '+66 64 094 9859',
      categoryOrType: 'Bodywork & Healing',
      area: 'Patnem',
      contactLang: 'he',
    },
    customer: {
      name: 'LUZ System Test',
      phone: '+972-52-000-0000',
    },
    serviceOrDateSummary: 'Verification test from luzschedu@gmail.com (Google Sheets + Gmail)',
  };

  processReferralEvent_(samplePayload, spreadsheet, sheet);
  Logger.log('Test succeeded! Leads Google Sheet URL: ' + spreadsheet.getUrl());
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      service: 'LUZ Goa Google Apps Script Webhook',
      senderAccount: CONFIG.SENDER_EMAIL,
      status: 'active',
      timestamp: new Date().toISOString(),
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(rawBody);

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

  // 1. Append lead row to Google Sheets
  sheet.appendRow([
    goaTime,
    '#' + (data.referralCode || 'LUZ'),
    String(data.environment || 'prod').toUpperCase(),
    data.actionLabelHe || data.actionType || 'Provider Referral',
    provider.nameEn || provider.nameHe || '',
    provider.nameHe || '',
    provider.ownerOrHost || '',
    provider.phone || '',
    provider.categoryOrType || '',
    provider.area || '',
    provider.contactLang === 'en' ? 'English' : 'Hebrew',
    customer.name || 'Website Visitor',
    customer.phone || 'Direct Click',
    data.serviceOrDateSummary || '—',
  ]);

  // 2. Send formatted Gmail alert from luzschedu@gmail.com
  if (CONFIG.SEND_EMAIL_ALERTS && CONFIG.ADMIN_EMAIL) {
    const subject =
      'LUZ Goa Lead: ' +
      (provider.nameEn || provider.nameHe || 'Provider') +
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
        (provider.nameHe || provider.nameEn || '') +
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
        (provider.contactLang === 'en' ? 'English' : 'עברית') +
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
        '" style="display:inline-block;background:#163024;color:#FAF6EE;text-decoration:none;padding:9px 14px;border-radius:8px;font-weight:bold;margin-left:8px;">פתיחת גיליון הלידים (Google Sheets)</a>',
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
      replyTo: CONFIG.SENDER_EMAIL,
      name: CONFIG.SENDER_NAME,
      subject: subject,
      htmlBody: htmlBody,
    });
  }

  // 3. Optional Telegram Bot Push
  if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) {
    const tgText = [
      'פנייה חדשה לספק מתוך LUZ גואה!',
      '• מזהה: #' + (data.referralCode || ''),
      '• פעולה: ' + (data.actionLabelHe || data.actionType || ''),
      '• ספק: ' + (provider.nameHe || provider.nameEn || '') + ' (' + (provider.ownerOrHost || '') + ')',
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

  // 4. Optional forward to "Ben" WhatsApp Bot
  if (CONFIG.BEN_WHATSAPP_WEBHOOK_URL) {
    UrlFetchApp.fetch(CONFIG.BEN_WHATSAPP_WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(data),
      muteHttpExceptions: true,
    });
  }
}

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
      ss = SpreadsheetApp.create('LUZ Goa — Provider Referrals & Leads CRM');
      props.setProperty('LUZ_GOA_SPREADSHEET_ID', ss.getId());
    }
  }

  let sheet = ss.getSheetByName(CONFIG.SHEET_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_TAB_NAME);
    const headers = [
      'Goa Timestamp',
      'LUZ Referral Code',
      'Environment',
      'Action',
      'Provider (EN)',
      'Provider (HE)',
      'Owner / Host',
      'Provider Phone',
      'Category',
      'Area',
      'Provider Msg Lang',
      'Customer Name',
      'Customer Phone',
      'Service / Schedule Details',
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
