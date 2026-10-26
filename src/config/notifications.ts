import { NotificationChannelsConfig } from '../types/luz';

const NOTIFICATION_CONFIG_STORAGE_KEY = 'luz_notification_channels_v1';

/**
 * Default global notification configuration for LUZ Goa.
 * - Email (`adminEmail`) works out-of-the-box across all visitors via FormSubmit AJAX.
 * - Webhook (`webhookUrl`) connects Make.com / n8n / Shai's "Ben" WhatsApp Bot.
 * - Telegram (`telegramBotToken` + `telegramChatId`) sends instant push alerts to Telegram.
 */
export const DEFAULT_NOTIFICATION_CONFIG: NotificationChannelsConfig = {
  enableEmail: true,
  adminEmail: (import.meta as any).env?.VITE_LUZ_ADMIN_EMAIL || 'naorbo@gmail.com',
  web3formsAccessKey: (import.meta as any).env?.VITE_LUZ_WEB3FORMS_KEY || '',
  enableWebhook: true,
  webhookUrl: (import.meta as any).env?.VITE_LUZ_WEBHOOK_URL || '',
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
