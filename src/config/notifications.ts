import { NotificationChannelsConfig } from '../types/luz';
import { isGoogleAppsScriptUrl } from '../utils/appsScriptTemplate';

const NOTIFICATION_CONFIG_STORAGE_KEY = 'luz_notification_channels_v1';

/**
 * Paste the deployed Google Apps Script Web App URL (`https://script.google.com/macros/s/.../exec`)
 * here (or via `VITE_LUZ_WEBHOOK_URL`) to enable global zero-secret Google Sheets + Gmail + Telegram alerts
 * for all visitors across every device.
 */
const DEFAULT_GLOBAL_WEBHOOK_OR_GAS_URL =
  (import.meta as any).env?.VITE_LUZ_WEBHOOK_URL || '';

/**
 * Default global notification configuration for LUZ Goa.
 */
export const DEFAULT_NOTIFICATION_CONFIG: NotificationChannelsConfig = {
  enableEmail: !isGoogleAppsScriptUrl(DEFAULT_GLOBAL_WEBHOOK_OR_GAS_URL),
  adminEmail: (import.meta as any).env?.VITE_LUZ_ADMIN_EMAIL || 'naorbo@gmail.com',
  web3formsAccessKey: (import.meta as any).env?.VITE_LUZ_WEB3FORMS_KEY || '',
  enableWebhook: true,
  webhookUrl: DEFAULT_GLOBAL_WEBHOOK_OR_GAS_URL,
  enableTelegram: true,
  telegramBotToken: (import.meta as any).env?.VITE_LUZ_TELEGRAM_BOT_TOKEN || '',
  telegramChatId: (import.meta as any).env?.VITE_LUZ_TELEGRAM_CHAT_ID || '',
  sendRealAlertsInTestEnv: false,
};

export function loadNotificationConfig(): NotificationChannelsConfig {
  try {
    const raw = localStorage.getItem(NOTIFICATION_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_CONFIG;
    const parsed = JSON.parse(raw) as Partial<NotificationChannelsConfig>;
    return {
      ...DEFAULT_NOTIFICATION_CONFIG,
      ...parsed,
      // Ensure default email stays populated if empty
      adminEmail: parsed.adminEmail?.trim() || DEFAULT_NOTIFICATION_CONFIG.adminEmail,
    };
  } catch {
    return DEFAULT_NOTIFICATION_CONFIG;
  }
}

export function saveNotificationConfig(config: NotificationChannelsConfig): void {
  try {
    localStorage.setItem(NOTIFICATION_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}
