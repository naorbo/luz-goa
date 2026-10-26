export function isGoogleAppsScriptUrl(url: string): boolean {
  return /script\.google\.com\/macros\//i.test((url || '').trim());
}

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * LUZ GOA — Google Apps Script Backend (Leads CRM + Gmail + Telegram + Bot)
 * ============================================================================
 * 1. פתחו Google Sheet חדש (למשל "לידים ופניות LUZ גואה") -> Extensions -> Apps Script
 *    (או היכנסו ישירות לכתובת https://script.new)
 * 2. הדביקו את הקוד הזה, שמרו (Ctrl+S), בחרו למעלה בפונקציה setupAndTestLuzAlerts ולחצו Run
 *    כדי לאשר הרשאות חד-פעמיות וליצור את לשונית הלידים + לקבל מייל בדיקה.
 * 3. לחצו Deploy -> New deployment -> Web app:
 *    - Execute as: Me (naorbo@gmail.com)
 *    - Who has access: Anyone (כל אחד)
 * 4. העתיקו את כתובת ה-Web App (.../exec) והדביקו אותה באתר או שלחו בצ'אט לצריבה קבועה!
 * ============================================================================
 */

const CONFIG = {
  ADMIN_EMAIL: 'naorbo@gmail.com',
  SEND_EMAIL_ALERTS: true,

  // אופציונלי: התראה מיידית גם לטלגרם (הטוקן נשאר פרטי ומוגן בתוך גוגל!)
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_CHAT_ID: '',

  // אופציונלי: העברה אוטומטית גם לבוט הוואטסאפ "בן"
  BEN_WHATSAPP_WEBHOOK_URL: '',

  SHEET_TAB_NAME: 'פניות_ספקים_LUZ',
};

function setupAndTestLuzAlerts() {
  const { spreadsheet, sheet } = getOrCreateLeadsSheet_();
  processReferralEvent_(
    {
      referralCode: 'LUZ-TEST-GAS',
      environment: 'prod',
      actionType: 'whatsapp_click',
      actionLabelHe: 'בדיקת חיבור Google Apps Script',
      provider: {
        nameHe: 'סולי — ריברסינג וטיפול רגשי (CBT)',
        ownerOrHost: 'סולי',
        phone: '+66 64 094 9859',
        categoryOrType: 'טיפולי גוף, מים ונשימה',
        area: 'Patnem',
        contactLang: 'he',
      },
      customer: { name: 'נאור (בדיקת מערכת)', phone: '+972-52-000-0000' },
      serviceOrDateSummary: 'בדיקת שמירה אוטומטית ל-Google Sheets ושליחת מייל/טלגרם',
    },
    spreadsheet,
    sheet
  );
  Logger.log('הבדיקה הצליחה! קישור לגיליון: ' + spreadsheet.getUrl());
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, service: 'LUZ Goa Apps Script Webhook', status: 'active' })
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
      JSON.stringify({ ok: true, referralCode: data.referralCode })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function processReferralEvent_(data, spreadsheet, sheet) {
  const goaTime = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm:ss');
  const provider = data.provider || {};
  const customer = data.customer || {};

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
      '<h2 style="margin:0 0 12px 0;color:#163024;">פנייה חדשה לספק מתוך LUZ גואה</h2>',
      '<div style="background:#FFFFFF;padding:16px;border-radius:10px;border:1px solid #E5DCCB;line-height:1.7;">',
      '<div><strong>מזהה הפניה (נשלח לספק):</strong> <span style="font-family:monospace;background:#163024;color:#EAB354;padding:2px 7px;border-radius:5px;">#' +
        (data.referralCode || '') +
        '</span></div>',
      '<div><strong>סוג פעולה:</strong> ' + (data.actionLabelHe || data.actionType || '') + '</div>',
      '<div><strong>ספק / שירות:</strong> ' + (provider.nameHe || '') + ' (' + (provider.ownerOrHost || '') + ')</div>',
      '<div><strong>קטגוריה ואזור:</strong> ' + (provider.categoryOrType || '') + ' | ' + (provider.area || '') + '</div>',
      '<div><strong>טלפון ספק:</strong> <span dir="ltr">' + (provider.phone || '') + '</span></div>',
      '<div><strong>שפת הודעת השיוך לספק:</strong> ' + (provider.contactLang === 'en' ? 'English' : 'עברית') + '</div>',
      '<hr style="border:none;border-top:1px solid #EEE5D5;margin:10px 0;" />',
      '<div><strong>פרטי הפונה:</strong> ' +
        (customer.name || 'מבקר/ת באתר') +
        (customer.phone ? ' (<span dir="ltr">' + customer.phone + '</span>)' : ' (לחיצה ישירה)') +
        '</div>',
      '<div><strong>פירוט תור / מועד:</strong> ' + (data.serviceOrDateSummary || '—') + '</div>',
      '<div><strong>זמן (גואה) וסביבה:</strong> ' + goaTime + ' | ' + String(data.environment || 'prod').toUpperCase() + '</div>',
      '</div>',
      '<div style="margin-top:16px;">',
      '<a href="' + spreadsheet.getUrl() + '" style="display:inline-block;background:#163024;color:#FAF6EE;text-decoration:none;padding:9px 14px;border-radius:8px;font-weight:bold;margin-left:8px;">פתיחת גיליון הלידים (Google Sheets)</a>',
      providerDigits ? '<a href="https://wa.me/' + providerDigits + '" style="display:inline-block;background:#C85A32;color:#FFFFFF;text-decoration:none;padding:9px 14px;border-radius:8px;font-weight:bold;margin-left:8px;">וואטסאפ לספק</a>' : '',
      customerDigits ? '<a href="https://wa.me/' + customerDigits + '" style="display:inline-block;background:#2A6F7B;color:#FFFFFF;text-decoration:none;padding:9px 14px;border-radius:8px;font-weight:bold;">וואטסאפ לפונה</a>' : '',
      '</div></div>',
    ].join('');

    MailApp.sendEmail({ to: CONFIG.ADMIN_EMAIL, subject: subject, htmlBody: htmlBody });
  }

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
    ].filter(Boolean).join('\\n');

    UrlFetchApp.fetch('https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: CONFIG.TELEGRAM_CHAT_ID, text: tgText }),
      muteHttpExceptions: true,
    });
  }

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
      try { ss = SpreadsheetApp.openById(savedId); } catch (e) { ss = null; }
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
      'זמן פנייה (גואה)', 'מזהה הפניה (#LUZ)', 'סביבה', 'סוג פעולה',
      'שם העסק / פעילות', 'בעלים / מארח', 'טלפון ספק', 'קטגוריה',
      'אזור בגואה', 'שפת שיוך לספק', 'שם הפונה', 'טלפון הפונה', 'פירוט תור / מועד',
    ];
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#163024');
    headerRange.setFontColor('#FAF6EE');
    headerRange.setFontWeight('bold');
  }

  return { spreadsheet: ss, sheet: sheet };
}`;
