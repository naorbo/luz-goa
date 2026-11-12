/**
 * ============================================================================
 * LUZ GOA — Reliable Google Cloud Trigger for Youth Center WhatsApp Reminders
 * ============================================================================
 * Triggers the GitHub Actions workflow (`youth-center-morning-reminder.yml`)
 * via `workflow_dispatch` twice daily on Google's infrastructure (Asia/Kolkata):
 *   1. Morning reminder (09:30 IST): checks events scheduled for TODAY.
 *   2. Evening-before reminder (20:00 IST): checks events scheduled for TOMORROW.
 *
 * One-time Setup (~2 minutes):
 * 1. Create a Fine-Grained GitHub PAT for repo `naorbo/luz-goa` with ONLY:
 *    Actions: Read and write (https://github.com/settings/personal-access-tokens/new)
 * 2. Open https://script.google.com (under luzschedu@gmail.com) -> New Project
 *    (or paste at the bottom of your existing LUZ Goa Apps Script project).
 * 3. Paste your token into `INITIAL_GITHUB_PAT` once OR set Script Property
 *    `GITHUB_DISPATCH_PAT`, then run `setupYouthReminderTriggers()` once and grant
 *    permissions. (After setup, you can clear `INITIAL_GITHUB_PAT` — it's saved
 *    securely in ScriptProperties!)
 * ============================================================================
 */

const GH_REMINDER_CONFIG = {
  OWNER: 'naorbo',
  REPO: 'luz-goa',
  WORKFLOW_FILE: 'youth-center-morning-reminder.yml',
  REF: 'master',
  // Paste token once before running setupYouthReminderTriggers(), then clear it:
  INITIAL_GITHUB_PAT: '',
};

function setupYouthReminderTriggers() {
  const props = PropertiesService.getScriptProperties();
  if (GH_REMINDER_CONFIG.INITIAL_GITHUB_PAT && GH_REMINDER_CONFIG.INITIAL_GITHUB_PAT.trim()) {
    props.setProperty('GITHUB_DISPATCH_PAT', GH_REMINDER_CONFIG.INITIAL_GITHUB_PAT.trim());
  }
  const token = props.getProperty('GITHUB_DISPATCH_PAT');
  if (!token) {
    throw new Error('Missing GITHUB_DISPATCH_PAT in Script Properties or INITIAL_GITHUB_PAT.');
  }

  // Remove old reminder triggers to avoid duplicates
  const existing = ScriptApp.getProjectTriggers();
  for (const t of existing) {
    const fn = t.getHandlerFunction();
    if (fn === 'triggerMorningYouthReminder' || fn === 'triggerEveningYouthReminder') {
      ScriptApp.deleteTrigger(t);
    }
  }

  // Morning trigger: ~09:30 IST (Asia/Kolkata)
  ScriptApp.newTrigger('triggerMorningYouthReminder')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .nearMinute(30)
    .inTimezone('Asia/Kolkata')
    .create();

  // Evening-before trigger: ~20:00 IST (Asia/Kolkata)
  ScriptApp.newTrigger('triggerEveningYouthReminder')
    .timeBased()
    .everyDays(1)
    .atHour(20)
    .nearMinute(0)
    .inTimezone('Asia/Kolkata')
    .create();

  Logger.log('✅ Youth Center Morning (09:30 IST) & Evening-Before (20:00 IST) triggers installed!');
}

function triggerMorningYouthReminder() {
  dispatchYouthReminderWorkflow_('morning');
}

function triggerEveningYouthReminder() {
  dispatchYouthReminderWorkflow_('evening');
}

function dispatchYouthReminderWorkflow_(timing) {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_DISPATCH_PAT');
  if (!token) {
    throw new Error('GITHUB_DISPATCH_PAT is not set in Script Properties.');
  }

  const url =
    'https://api.github.com/repos/' +
    GH_REMINDER_CONFIG.OWNER +
    '/' +
    GH_REMINDER_CONFIG.REPO +
    '/actions/workflows/' +
    GH_REMINDER_CONFIG.WORKFLOW_FILE +
    '/dispatches';

  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    payload: JSON.stringify({
      ref: GH_REMINDER_CONFIG.REF,
      inputs: {
        mode: 'cron-once',
        timing: timing,
      },
    }),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  if (code !== 204) {
    throw new Error('GitHub workflow_dispatch failed (' + code + '): ' + res.getContentText());
  }
  Logger.log('✅ Dispatched GitHub reminder workflow cleanly (timing=' + timing + ')');
}
