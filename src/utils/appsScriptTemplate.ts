export function isGoogleAppsScriptUrl(url: string): boolean {
  return /script\.google\.com\/macros\//i.test((url || '').trim());
}

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * LUZ GOA — Google Apps Script Backend (Leads CRM + Youth Center Roster + Alerts)
 * Official Runner & Sender Account: luzschedu@gmail.com
 * ============================================================================
 * 1. Sign in to Google as luzschedu@gmail.com and open https://script.new
 *    (or open your existing Apps Script project attached to your Google Sheet)
 * 2. Paste this file, save (Ctrl+S).
 * 3. Run \`setupAndTestLuzAlerts\` once to grant permissions.
 * 4. Deploy -> Manage deployments -> Edit -> New version -> Deploy.
 *    - Execute as: Me (luzschedu@gmail.com)
 *    - Who has access: Anyone
 * 5. All text stored in Google Sheets (Youth Center + Leads CRM) is in English!
 * ============================================================================
 */

const CONFIG = {
  SENDER_EMAIL: 'luzschedu@gmail.com',
  SENDER_NAME: 'LUZ Goa Platform',
  ADMIN_EMAIL: 'luzschedu@gmail.com',
  SEND_EMAIL_ALERTS: true,

  // Dedicated Youth Center Registrations Spreadsheet & Tab
  YOUTH_CENTER_SHEET_TITLE: 'LUZ Goa — Youth Center Registrations',
  YOUTH_CENTER_TAB_NAME: 'Youth_Center_Events',

  // Provider Referrals & Leads CRM Spreadsheet & Tab
  LEADS_SHEET_TITLE: 'LUZ Goa — Provider Referrals & Leads CRM',
  LEADS_TAB_NAME: 'LUZ_Referrals',

  // Optional: Private Telegram Bot token & Chat ID
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_CHAT_ID: '',

  // Optional: Forward payload to "Ben" WhatsApp Bot
  BEN_WHATSAPP_WEBHOOK_URL: '',
};

function setupAndTestLuzAlerts() {
  const { spreadsheet, sheet } = getOrCreateLeadsSheet_();
  processReferralEvent_(
    {
      referralCode: 'LUZ-TEST-GAS',
      environment: 'prod',
      actionType: 'whatsapp_click',
      actionLabelEn: 'Direct WhatsApp Inquiry',
      actionLabelHe: 'בדיקת חיבור Google Apps Script',
      provider: {
        nameHe: 'סולי — ריברסינג וטיפול רגשי (CBT)',
        nameEn: 'Soli — Rebirthing & CBT',
        ownerOrHost: 'Soli',
        phone: '+66 64 094 9859',
        categoryOrType: 'Bodywork & Healing',
        area: 'Patnem',
        contactLang: 'en',
      },
      customer: { name: 'LUZ System Test', phone: '+972-52-000-0000' },
      serviceOrDateSummary: 'Verification test from luzschedu@gmail.com (Google Sheets + Gmail)',
    },
    spreadsheet,
    sheet
  );
  Logger.log('Leads CRM Sheet URL: ' + spreadsheet.getUrl());
}

function setupAndTestYouthCenterSheet() {
  const { spreadsheet, sheet } = getOrCreateYouthCenterSheet_();
  processYouthCenterRegistration_(
    {
      referralCode: 'YC-TEST-001',
      environment: 'prod',
      actionType: 'youth_center_event_rsvp',
      actionLabelEn: 'Youth Center Event Registration',
      youthCenterEvent: {
        eventId: 'prod-wks-yc-colomb',
        titleEn: 'Pottery Workshop with Local Clay',
        titleHe: 'סדנת קרמיקה מחימר מקומי',
        schedule: 'Friday, Nov 6 · 16:30 – 18:30',
        location: 'Colomb Youth Center',
        participantName: 'Liam Boiarsky',
        isSubscriber: 'Yes (Subscriber)',
        parentName: 'Naor Boiarsky',
        parentPhone: '+972-52-478-0033',
        notes: 'Enthusiastic beginner',
      },
      customer: { name: 'Liam Boiarsky', phone: '+972-52-478-0033' },
      serviceOrDateSummary: 'Pottery Workshop | Friday, Nov 6 · 16:30 – 18:30 | Subscriber: Yes',
    },
    spreadsheet,
    sheet
  );
  Logger.log('Youth Center Sheet URL: ' + spreadsheet.getUrl());
}

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      service: 'LUZ Goa Apps Script Webhook',
      senderAccount: CONFIG.SENDER_EMAIL,
      status: 'active',
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(rawBody);

    const isYouthCenter =
      data.event === 'luz.youth_center_event_rsvp' ||
      data.actionType === 'youth_center_event_rsvp' ||
      data.actionType === 'youth_center_signup' ||
      Boolean(data.youthCenterEvent);

    const dedupKey = 'luz_' + (data.referralCode || '') + '_' + (data.actionType || '');
    const cache = CacheService.getScriptCache();
    if (data.referralCode && !String(data.referralCode).startsWith('TEST') && cache.get(dedupKey)) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, deduplicated: true })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    cache.put(dedupKey, '1', 15);

    if (isYouthCenter) {
      const { spreadsheet, sheet } = getOrCreateYouthCenterSheet_();
      processYouthCenterRegistration_(data, spreadsheet, sheet);
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, referralCode: data.referralCode, sheetUrl: spreadsheet.getUrl() })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const { spreadsheet, sheet } = getOrCreateLeadsSheet_();
    processReferralEvent_(data, spreadsheet, sheet);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, referralCode: data.referralCode, sheetUrl: spreadsheet.getUrl() })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function processYouthCenterRegistration_(data, spreadsheet, sheet) {
  const goaTime = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
  const yc = data.youthCenterEvent || {};
  const customer = data.customer || {};

  const isSubscriberBool =
    yc.isSubscriber === true ||
    yc.isSubscriber === 'true' ||
    String(yc.isSubscriber).toLowerCase().indexOf('yes') !== -1 ||
    String(yc.isSubscriber).indexOf('מנוי') !== -1;

  const subscriberText = isSubscriberBool ? 'Yes (Monthly Subscriber)' : 'No (Single Entry)';

  sheet.appendRow([
    goaTime,
    '#' + (data.referralCode || 'YC'),
    yc.titleEn || yc.titleHe || 'Youth Center Event',
    yc.schedule || data.serviceOrDateSummary || '—',
    yc.participantName || customer.name || '—',
    subscriberText,
    yc.parentName || '—',
    yc.parentPhone || customer.phone || '—',
    yc.notes || 'None',
    String(data.environment || 'prod').toUpperCase(),
  ]);

  if (CONFIG.SEND_EMAIL_ALERTS && CONFIG.ADMIN_EMAIL) {
    const subject =
      'LUZ Youth Center Registration: ' +
      (yc.titleEn || yc.titleHe || 'Event') +
      ' — ' +
      (yc.participantName || 'Participant') +
      ' [#' +
      (data.referralCode || 'YC') +
      ']';
    const parentDigits = String(yc.parentPhone || customer.phone || '').replace(/[^0-9]/g, '');

    const htmlBody = [
      '<div dir="ltr" style="font-family:Arial,sans-serif;max-width:600px;background:#FAF6EE;padding:20px;border-radius:14px;border:1px solid #E5DCCB;color:#163024;">',
      '<h2 style="margin:0 0 12px 0;color:#163024;">Youth Center Event Registration</h2>',
      '<div style="background:#FFFFFF;padding:16px;border-radius:10px;border:1px solid #E5DCCB;line-height:1.7;">',
      '<div><strong>Registration ID:</strong> <span style="font-family:monospace;background:#163024;color:#EAB354;padding:2px 7px;border-radius:5px;">#' +
        (data.referralCode || '') +
        '</span></div>',
      '<div><strong>Event Name:</strong> ' + (yc.titleEn || yc.titleHe || 'Youth Center Event') + '</div>',
      '<div><strong>Date & Schedule:</strong> ' + (yc.schedule || '—') + '</div>',
      '<div><strong>Participant Name:</strong> ' + (yc.participantName || '—') + '</div>',
      '<div><strong>Monthly Subscriber:</strong> ' + subscriberText + '</div>',
      '<div><strong>Parent Name:</strong> ' + (yc.parentName || '—') + '</div>',
      '<div><strong>Parent Phone:</strong> <span dir="ltr">' + (yc.parentPhone || customer.phone || '—') + '</span></div>',
      '<div><strong>Notes / Special Requests:</strong> ' + (yc.notes || 'None') + '</div>',
      '<hr style="border:none;border-top:1px solid #EEE5D5;margin:10px 0;" />',
      '<div><strong>Goa Time (IST):</strong> ' + goaTime + ' | ' + String(data.environment || 'prod').toUpperCase() + '</div>',
      '</div>',
      '<div style="margin-top:16px;">',
      '<a href="' + spreadsheet.getUrl() + '" style="display:inline-block;background:#163024;color:#FAF6EE;text-decoration:none;padding:9px 14px;border-radius:8px;font-weight:bold;margin-right:8px;">Open Youth Center Google Sheet</a>',
      parentDigits ? '<a href="https://wa.me/' + parentDigits + '" style="display:inline-block;background:#2A6F7B;color:#FFFFFF;text-decoration:none;padding:9px 14px;border-radius:8px;font-weight:bold;">WhatsApp Parent</a>' : '',
      '</div></div>',
    ].join('');

    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      replyTo: CONFIG.SENDER_EMAIL,
      name: CONFIG.SENDER_NAME,
      subject: subject,
      htmlBody: htmlBody,
    });
  }
}

function processReferralEvent_(data, spreadsheet, sheet) {
  const goaTime = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
  const provider = data.provider || {};
  const customer = data.customer || {};

  sheet.appendRow([
    goaTime,
    '#' + (data.referralCode || 'LUZ'),
    String(data.environment || 'prod').toUpperCase(),
    data.actionLabelEn || data.actionType || 'Provider Referral',
    provider.nameEn || provider.nameHe || '',
    provider.nameHe || provider.nameEn || '',
    provider.ownerOrHost || '',
    provider.phone || '',
    provider.categoryOrType || '',
    provider.area || '',
    provider.contactLang === 'en' ? 'English' : 'Hebrew',
    customer.name || 'Website Visitor',
    customer.phone || 'Direct Click',
    data.serviceOrDateSummary || '—',
  ]);

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
      '<h2 style="margin:0 0 12px 0;color:#163024;">פנייה חדשה לספק מתוך LUZ גואה</h2>',
      '<div style="background:#FFFFFF;padding:16px;border-radius:10px;border:1px solid #E5DCCB;line-height:1.7;">',
      '<div><strong>מזהה הפניה (נשלח לספק):</strong> <span style="font-family:monospace;background:#163024;color:#EAB354;padding:2px 7px;border-radius:5px;">#' +
        (data.referralCode || '') +
        '</span></div>',
      '<div><strong>סוג פעולה:</strong> ' + (data.actionLabelEn || data.actionLabelHe || data.actionType || '') + '</div>',
      '<div><strong>ספק / שירות:</strong> ' + (provider.nameHe || provider.nameEn || '') + ' (' + (provider.ownerOrHost || '') + ')</div>',
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

    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      replyTo: CONFIG.SENDER_EMAIL,
      name: CONFIG.SENDER_NAME,
      subject: subject,
      htmlBody: htmlBody,
    });
  }

  if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) {
    const tgText = [
      'New LUZ Goa Provider Lead!',
      '• Referral: #' + (data.referralCode || ''),
      '• Action: ' + (data.actionLabelEn || data.actionType || ''),
      '• Provider: ' + (provider.nameEn || provider.nameHe || '') + ' (' + (provider.ownerOrHost || '') + ')',
      '• Area & Phone: ' + (provider.area || '') + ' | ' + (provider.phone || ''),
      '• Customer: ' + (customer.name || 'Site Visitor') + (customer.phone ? ' (' + customer.phone + ')' : ''),
      data.serviceOrDateSummary ? '• Details: ' + data.serviceOrDateSummary : '',
      '• Goa IST Time: ' + goaTime,
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

function getOrCreateYouthCenterSheet_() {
  let ss = null;
  const props = PropertiesService.getScriptProperties();
  const savedId = props.getProperty('LUZ_YOUTH_CENTER_SPREADSHEET_ID');
  if (savedId) {
    try { ss = SpreadsheetApp.openById(savedId); } catch (e) { ss = null; }
  }
  if (!ss) {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active && active.getName().indexOf('Youth Center') !== -1) {
      ss = active;
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(CONFIG.YOUTH_CENTER_SHEET_TITLE);
    props.setProperty('LUZ_YOUTH_CENTER_SPREADSHEET_ID', ss.getId());
    try {
      DriveApp.getFileById(ss.getId()).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      // Ignore domain permission limitation
    }
  }

  let sheet = ss.getSheetByName(CONFIG.YOUTH_CENTER_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.YOUTH_CENTER_TAB_NAME);
    const headers = [
      'Timestamp (Goa IST)',
      'Registration ID',
      'Event Name',
      'Date & Schedule',
      'Participant Name',
      'Monthly Subscriber?',
      'Parent Name',
      'Parent WhatsApp Phone',
      'Notes / Special Requests',
      'Environment',
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

function getOrCreateLeadsSheet_() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    const props = PropertiesService.getScriptProperties();
    const savedId = props.getProperty('LUZ_GOA_SPREADSHEET_ID');
    if (savedId) {
      try { ss = SpreadsheetApp.openById(savedId); } catch (e) { ss = null; }
    }
    if (!ss) {
      ss = SpreadsheetApp.create(CONFIG.LEADS_SHEET_TITLE);
      props.setProperty('LUZ_GOA_SPREADSHEET_ID', ss.getId());
    }
  }

  let sheet = ss.getSheetByName(CONFIG.LEADS_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.LEADS_TAB_NAME);
    const headers = [
      'Timestamp (Goa IST)',
      'Referral Code',
      'Environment',
      'Action Type',
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
`;
