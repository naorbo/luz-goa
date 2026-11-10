export function isGoogleAppsScriptUrl(url: string): boolean {
  return /script\.google\.com\/macros\//i.test((url || '').trim());
}

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ============================================================================
 * LUZ GOA — Google Apps Script Backend
 * (1) Site Log CRM + (2) Dedicated Youth Center + (3) Dedicated Beit BINA Goa
 * Official Runner & Sender Account: luzschedu@gmail.com
 * ============================================================================
 * 1. Sign in to Google as luzschedu@gmail.com and open https://script.new
 *    (or open your existing Apps Script project attached to your Google Sheet)
 * 2. Paste this file, save (Ctrl+S).
 * 3. Run \`setupAndTestBeitBinaSheet\` in the top toolbar:
 *    - Creates a dedicated Google Sheet strictly for Beit BINA Goa
 *      named "LUZ Goa — בית בינ״ה בגואה (הרשמות ונוכחות)"
 *    - Features a Master Tab ("כל_ההרשמות") + AUTOMATICALLY opens a new Tab
 *      for each individual event (e.g. "08.11 - אימון Movement")!
 *    - Updates attendance ("הגיע ✅" / "טרם הגיע ⏳") in real time from the Gate!
 * 4. Deploy -> Manage deployments -> Edit -> New version -> Deploy:
 *    - Execute as: Me (luzschedu@gmail.com)
 *    - Who has access: Anyone
 * ============================================================================
 */

const CONFIG = {
  SENDER_EMAIL: 'luzschedu@gmail.com',
  SENDER_NAME: 'LUZ Goa Platform',
  ADMIN_EMAIL: 'luzschedu@gmail.com',
  SEND_EMAIL_ALERTS: true,

  // 1. Existing Google Sheet strictly for Site Log / Provider Referrals & Leads CRM
  LEADS_SPREADSHEET_ID: '1Wy_m63Rrsux7XIpn_gpVPQufGWvbYKOu0YAPZzuLW6k',
  LEADS_SHEET_TITLE: 'LUZ Goa — Site Log & Provider Leads CRM',
  LEADS_TAB_NAME: 'LUZ_Referrals',

  // 2. Dedicated Google Sheet strictly for Youth Center Registrations
  YOUTH_CENTER_SPREADSHEET_ID: '1I3EEIlSbA83KK_t-ElZVb5ILACKs598FhjkR7pOASH4',
  YOUTH_CENTER_SHEET_TITLE: 'LUZ Goa — Youth Center Registrations',
  YOUTH_CENTER_TAB_NAME: 'Youth_Center_Events',

  // 3. Dedicated Google Sheet strictly for Beit BINA Goa (Auto-Tab per Event + Live Check-In)
  BEIT_BINA_SPREADSHEET_ID: '1BYBN6bJIAFR0wN8_aX1LlsoiQ8jlevExlrCbn-lr5Pg',
  BEIT_BINA_SHEET_TITLE: 'LUZ Goa — בית בינ"ה בגואה (הרשמות ונוכחות)',
  BEIT_BINA_MASTER_TAB_NAME: 'כל_ההרשמות',

  // Optional: Private Telegram Bot token & Chat ID
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_CHAT_ID: '',

  // Optional: Forward payload to "Ben" WhatsApp Bot
  BEN_WHATSAPP_WEBHOOK_URL: '',
};

function setupAndTestBeitBinaSheet() {
  const props = PropertiesService.getScriptProperties();
  if (CONFIG.BEIT_BINA_SPREADSHEET_ID) {
    props.setProperty('LUZ_BEIT_BINA_SPREADSHEET_ID', CONFIG.BEIT_BINA_SPREADSHEET_ID);
  }
  const { spreadsheet, masterSheet } = getOrCreateBeitBinaSheet_();
  processBeitBinaRegistration_(
    {
      referralCode: 'BINA-TEST-001',
      environment: 'prod',
      actionType: 'beit_bina_event_rsvp',
      beitBinaEvent: {
        registrationId: 'bina-reg-test-001',
        eventId: 'bina-2026-11-08-movement',
        titleHe: 'אימון Movement עם אוריאל וירין',
        titleEn: 'Evening Movement Training with Uriel & Yarin',
        eventTabName: '08.11 - אימון Movement',
        scheduleHe: 'יום ראשון, 8 בנובמבר · 21:00 – 22:30',
        participantName: 'דניאל לוי',
        participantPhone: '+972-54-000-0000',
        participantsCount: 1,
        notes: 'בדיקת פתיחת כרטיסייה אוטומטית לאירוע בבית בינ"ה',
        attended: false,
      },
    },
    spreadsheet,
    masterSheet
  );
  Logger.log('Dedicated Beit BINA Goa Sheet URL: ' + spreadsheet.getUrl());
}

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
      serviceOrDateSummary: 'Verification test from luzschedu@gmail.com (Site Log CRM)',
    },
    spreadsheet,
    sheet
  );
  Logger.log('Site Log CRM Sheet URL: ' + spreadsheet.getUrl());
}

function setupAndTestYouthCenterSheet() {
  const props = PropertiesService.getScriptProperties();
  const currentYcId = props.getProperty('LUZ_YOUTH_CENTER_SPREADSHEET_ID');
  if (currentYcId === CONFIG.LEADS_SPREADSHEET_ID) {
    props.deleteProperty('LUZ_YOUTH_CENTER_SPREADSHEET_ID');
  }

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
  Logger.log('Brand-New Dedicated Youth Center Sheet URL: ' + spreadsheet.getUrl());
}

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : '';
  if (action === 'createBeitBinaSheet') {
    const { spreadsheet } = getOrCreateBeitBinaSheet_();
    return ContentService.createTextOutput(
      JSON.stringify({
        ok: true,
        beitBinaSheetUrl: spreadsheet.getUrl(),
        beitBinaSheetId: spreadsheet.getId(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
  if (action === 'createYouthCenterSheet') {
    const { spreadsheet } = getOrCreateYouthCenterSheet_();
    return ContentService.createTextOutput(
      JSON.stringify({
        ok: true,
        youthCenterSheetUrl: spreadsheet.getUrl(),
        youthCenterSheetId: spreadsheet.getId(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      service: 'LUZ Goa Apps Script Webhook (Site Log + Youth Center + Beit BINA)',
      senderAccount: CONFIG.SENDER_EMAIL,
      siteLogSheetUrl: 'https://docs.google.com/spreadsheets/d/' + CONFIG.LEADS_SPREADSHEET_ID + '/edit',
      status: 'active',
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const data = JSON.parse(rawBody);

    // 1. Check if this is a Beit BINA live attendance toggle from the Gate
    const isBeitBinaAttendanceUpdate =
      data.event === 'luz.beit_bina_attendance_update' ||
      data.actionType === 'beit_bina_attendance_update';

    if (isBeitBinaAttendanceUpdate) {
      const { spreadsheet, masterSheet } = getOrCreateBeitBinaSheet_(data.spreadsheetId);
      const updated = processBeitBinaAttendanceUpdate_(data, spreadsheet, masterSheet);
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, updated: updated, sheetUrl: spreadsheet.getUrl() })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Check if this is a Beit BINA event registration or Gate Walk-In
    const isBeitBina =
      data.event === 'luz.beit_bina_event_rsvp' ||
      data.actionType === 'beit_bina_event_rsvp' ||
      data.actionType === 'beit_bina_walkin_attendance' ||
      data.actionType === 'beit_bina_signup' ||
      Boolean(data.beitBinaEvent);

    const dedupKey = 'luz_' + (data.referralCode || '') + '_' + (data.actionType || '');
    const cache = CacheService.getScriptCache();
    if (data.referralCode && !String(data.referralCode).startsWith('TEST') && cache.get(dedupKey)) {
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, deduplicated: true })
      ).setMimeType(ContentService.MimeType.JSON);
    }
    cache.put(dedupKey, '1', 15);

    if (isBeitBina) {
      const { spreadsheet, masterSheet } = getOrCreateBeitBinaSheet_(data.spreadsheetId);
      const result = processBeitBinaRegistration_(data, spreadsheet, masterSheet);
      return ContentService.createTextOutput(
        JSON.stringify({
          ok: true,
          referralCode: data.referralCode,
          sheetUrl: spreadsheet.getUrl(),
          eventTabName: result.eventTabName,
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Check if this is a Youth Center registration
    const isYouthCenter =
      data.event === 'luz.youth_center_event_rsvp' ||
      data.actionType === 'youth_center_event_rsvp' ||
      data.actionType === 'youth_center_signup' ||
      Boolean(data.youthCenterEvent);

    if (isYouthCenter) {
      const { spreadsheet, sheet } = getOrCreateYouthCenterSheet_();
      processYouthCenterRegistration_(data, spreadsheet, sheet);
      return ContentService.createTextOutput(
        JSON.stringify({ ok: true, referralCode: data.referralCode, sheetUrl: spreadsheet.getUrl() })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Default: Site Log & Provider Leads CRM
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

// ============================================================================
// BEIT BINA GOA — AUTO-TAB PER EVENT + MASTER TAB + REAL-TIME ATTENDANCE SYNC
// ============================================================================

function sanitizeSheetTabName_(rawName) {
  const cleaned = String(rawName || 'אירוע בית בינ"ה')
    .replace(/[:\\\\/?*\\[\\]]/g, '-')
    .replace(/\\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 90) || 'אירוע בית בינ"ה';
}

function getBeitBinaHeaders_() {
  return [
    'זמן רישום (גואה IST)',
    'מזהה רישום',
    'שם האירוע',
    'יום ושעה',
    'שם המשתתף/ת',
    'טלפון וואטסאפ',
    'כמות משתתפים',
    'סטטוס הגעה (שער נוכחות)',
    'זמן הגעה וצוות מאשר',
    'סוג רישום',
    'הערות',
  ];
}

function styleBeitBinaSheetHeader_(sheet, headers) {
  try {
    sheet.setRightToLeft(true);
  } catch (e) {}
  sheet.setFrozenRows(1);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#4A154B');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
}

function getOrCreateBeitBinaSheet_(overrideSpreadsheetId) {
  let ss = null;
  const props = PropertiesService.getScriptProperties();
  const configuredId = String(overrideSpreadsheetId || CONFIG.BEIT_BINA_SPREADSHEET_ID || '').trim();
  const savedId = String(props.getProperty('LUZ_BEIT_BINA_SPREADSHEET_ID') || '').trim();
  const targetId = configuredId || savedId;

  // 1. If script is container-bound to the Beit BINA Google Sheet itself:
  try {
    const activeSs = SpreadsheetApp.getActiveSpreadsheet();
    if (
      activeSs &&
      activeSs.getId() !== CONFIG.LEADS_SPREADSHEET_ID &&
      activeSs.getId() !== CONFIG.YOUTH_CENTER_SPREADSHEET_ID
    ) {
      ss = activeSs;
    }
  } catch (e) {}

  // 2. Open by configured or requested spreadsheet ID:
  if (
    !ss &&
    targetId &&
    targetId !== CONFIG.LEADS_SPREADSHEET_ID &&
    targetId !== CONFIG.YOUTH_CENTER_SPREADSHEET_ID
  ) {
    try {
      ss = SpreadsheetApp.openById(targetId);
    } catch (e) {
      ss = null;
    }
  }

  // 3. Fallback: create new sheet in drive if none found
  if (!ss) {
    ss = SpreadsheetApp.create(CONFIG.BEIT_BINA_SHEET_TITLE);
    props.setProperty('LUZ_BEIT_BINA_SPREADSHEET_ID', ss.getId());
    try {
      DriveApp.getFileById(ss.getId()).setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.EDIT
      );
    } catch (e) {}
  }

  const headers = getBeitBinaHeaders_();
  let masterSheet = ss.getSheetByName(CONFIG.BEIT_BINA_MASTER_TAB_NAME);
  if (!masterSheet) {
    masterSheet = ss.insertSheet(CONFIG.BEIT_BINA_MASTER_TAB_NAME, 0);
    masterSheet.appendRow(headers);
    styleBeitBinaSheetHeader_(masterSheet, headers);
    try {
      const sheet1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('גיליון1');
      if (sheet1 && ss.getSheets().length > 1) {
        ss.deleteSheet(sheet1);
      }
    } catch (e) {}
  }

  return { spreadsheet: ss, masterSheet: masterSheet };
}

function getOrCreateBeitBinaEventTab_(spreadsheet, rawTabName) {
  const tabName = sanitizeSheetTabName_(rawTabName);
  let eventSheet = spreadsheet.getSheetByName(tabName);
  if (!eventSheet) {
    eventSheet = spreadsheet.insertSheet(tabName);
    const headers = getBeitBinaHeaders_();
    eventSheet.appendRow(headers);
    styleBeitBinaSheetHeader_(eventSheet, headers);
  }
  return { eventSheet: eventSheet, tabName: tabName };
}

function processBeitBinaRegistration_(data, spreadsheet, masterSheet) {
  const goaTime = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
  const bb = data.beitBinaEvent || {};
  const regId = bb.registrationId || data.referralCode || ('BINA-' + new Date().getTime());
  const eventTitle = bb.titleHe || bb.titleEn || 'אירוע בית בינ"ה';
  const scheduleStr = bb.scheduleHe || bb.schedule || '—';
  const participantName = bb.participantName || '—';
  const participantPhone = bb.participantPhone || '—';
  const count = Number(bb.participantsCount) || 1;
  const isAttended = Boolean(bb.attended);
  const attendanceStatus = isAttended ? 'הגיע ✅' : 'טרם הגיע ⏳';
  const checkInDetails = isAttended
    ? (bb.attendedAt || goaTime) + (bb.checkedInBy ? ' (' + bb.checkedInBy + ')' : '')
    : '—';
  const regType = bb.isWalkIn ? 'הגיע בשער (Walk-in)' : 'הרשמה מראש באתר';
  const notes = bb.notes || '—';

  const rowValues = [
    goaTime,
    regId,
    eventTitle,
    scheduleStr,
    participantName,
    participantPhone,
    count,
    attendanceStatus,
    checkInDetails,
    regType,
    notes,
  ];

  // 1. Append to Master Tab ("כל_ההרשמות")
  masterSheet.appendRow(rowValues);

  // 2. Automatically open/create dedicated Tab for this specific Event and append row
  const desiredTabName = bb.eventTabName || ((bb.dateShort ? bb.dateShort + ' - ' : '') + eventTitle);
  const { eventSheet, tabName } = getOrCreateBeitBinaEventTab_(spreadsheet, desiredTabName);
  eventSheet.appendRow(rowValues);

  return { eventTabName: tabName };
}

function updateAttendanceInSheetTab_(sheet, regId, participantName, statusText, checkInDetails) {
  if (!sheet) return false;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  let updated = false;
  for (let i = dataRange.length - 1; i >= 0; i--) {
    const rowRegId = String(dataRange[i][1] || '').trim();
    const rowName = String(dataRange[i][4] || '').trim();
    if ((regId && rowRegId === String(regId).trim()) || (participantName && rowName === String(participantName).trim())) {
      const targetRowNumber = i + 2;
      sheet.getRange(targetRowNumber, 8).setValue(statusText);
      sheet.getRange(targetRowNumber, 9).setValue(checkInDetails);
      updated = true;
      break;
    }
  }
  return updated;
}

function processBeitBinaAttendanceUpdate_(data, spreadsheet, masterSheet) {
  const goaTime = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');
  const bb = data.beitBinaEvent || {};
  const regId = bb.registrationId || '';
  const participantName = bb.participantName || '';
  const isAttended = Boolean(bb.attended);
  const statusText = isAttended ? 'הגיע ✅' : 'טרם הגיע ⏳';
  const checkInDetails = isAttended
    ? goaTime + (bb.checkedInBy ? ' (' + bb.checkedInBy + ')' : '')
    : 'בוטל סימון (' + goaTime + ')';

  const updatedMaster = updateAttendanceInSheetTab_(
    masterSheet,
    regId,
    participantName,
    statusText,
    checkInDetails
  );

  const eventTitle = bb.titleHe || bb.titleEn || 'אירוע בית בינ"ה';
  const desiredTabName = bb.eventTabName || ((bb.dateShort ? bb.dateShort + ' - ' : '') + eventTitle);
  const { eventSheet } = getOrCreateBeitBinaEventTab_(spreadsheet, desiredTabName);
  const updatedEventTab = updateAttendanceInSheetTab_(
    eventSheet,
    regId,
    participantName,
    statusText,
    checkInDetails
  );

  // If the record wasn't in the sheet yet (e.g. created offline), append it now
  if (!updatedMaster && !updatedEventTab && participantName) {
    processBeitBinaRegistration_(data, spreadsheet, masterSheet);
    return true;
  }

  return updatedMaster || updatedEventTab;
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
      '<a href="' + spreadsheet.getUrl() + '" style="display:inline-block;background:#163024;color:#FAF6EE;text-decoration:none;padding:9px 14px;border-radius:8px;font-weight:bold;margin-right:8px;">Open Dedicated Youth Center Sheet</a>',
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
      '<h2 style="margin:0 0 12px 0;color:#163024;">פנייה חדשה לספק מתוך LUZ גואה (Site Log)</h2>',
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
      '<a href="' + spreadsheet.getUrl() + '" style="display:inline-block;background:#163024;color:#FAF6EE;text-decoration:none;padding:9px 14px;border-radius:8px;font-weight:bold;margin-left:8px;">פתיחת גיליון הלידים של האתר (Google Sheets)</a>',
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
  const configuredId = (CONFIG.YOUTH_CENTER_SPREADSHEET_ID || '').trim();
  const savedId = (props.getProperty('LUZ_YOUTH_CENTER_SPREADSHEET_ID') || '').trim();
  const targetId = configuredId || savedId;

  if (targetId && targetId !== CONFIG.LEADS_SPREADSHEET_ID) {
    try {
      ss = SpreadsheetApp.openById(targetId);
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create(CONFIG.YOUTH_CENTER_SHEET_TITLE);
    props.setProperty('LUZ_YOUTH_CENTER_SPREADSHEET_ID', ss.getId());
    try {
      DriveApp.getFileById(ss.getId()).setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
      );
    } catch (e) {}
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

    try {
      const sheet1 = ss.getSheetByName('Sheet1');
      if (sheet1 && ss.getSheets().length > 1) {
        ss.deleteSheet(sheet1);
      }
    } catch (e) {}
  }

  return { spreadsheet: ss, sheet: sheet };
}

function getOrCreateLeadsSheet_() {
  let ss = null;
  const props = PropertiesService.getScriptProperties();
  const targetId = (CONFIG.LEADS_SPREADSHEET_ID || props.getProperty('LUZ_GOA_SPREADSHEET_ID') || '').trim();

  if (targetId) {
    try { ss = SpreadsheetApp.openById(targetId); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  if (!ss) {
    ss = SpreadsheetApp.create(CONFIG.LEADS_SHEET_TITLE);
    props.setProperty('LUZ_GOA_SPREADSHEET_ID', ss.getId());
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
