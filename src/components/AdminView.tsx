import React, { useState } from 'react';
import {
  Activity,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  Database,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  ShieldCheck,
  FlaskConical,
  Briefcase,
  Bell,
  Mail,
  Webhook,
  Send,
  Hash,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  LuzEntity,
  CommunityBusiness,
  BookingRecord,
  YouthCenterFamily,
  Language,
  AppEnvironment,
  LeadReferralEvent,
  NotificationChannelsConfig,
} from '../types/luz';
import { generateWhatsAppDigest } from '../utils/calendarAndParser';
import {
  ChannelDispatchResult,
  getActionTypeLabel,
  sendTestAlertAllChannels,
} from '../utils/referralAndAlerts';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  isGoogleAppsScriptUrl,
} from '../utils/appsScriptTemplate';

interface AdminViewProps {
  entities: LuzEntity[];
  businesses: CommunityBusiness[];
  bookings: BookingRecord[];
  families: YouthCenterFamily[];
  referrals: LeadReferralEvent[];
  notificationConfig: NotificationChannelsConfig;
  lang: Language;
  appEnv: AppEnvironment;
  onToggleProviderSync: (entityId: string) => void;
  onUpdateNotificationConfig: (config: NotificationChannelsConfig) => void;
}

const SUPABASE_SCHEMA_SQL = `-- LUZ Goa Community OS — Supabase & Lovable Database Schema (PROD + TEST)
create table public.luz_entities (
  id uuid primary key default gen_random_uuid(),
  environment text not null default 'prod' check (environment in ('prod', 'test')),
  type text not null check (type in ('event', 'workshop', 'service', 'rental')),
  title_he text not null,
  title_en text not null,
  description_he text,
  description_en text,
  area text not null,
  location_details text,
  host_name text not null,
  host_phone text not null,
  preferred_contact_lang text default 'he',
  price_amount numeric default 0,
  price_currency text default 'INR',
  ingestion_source text default 'web',
  date date,
  start_time text,
  end_time text,
  day_of_week int,
  week_cycle text default 'all',
  time_slots jsonb default '[]'::jsonb,
  booked_slots jsonb default '{}'::jsonb,
  calendar_sync_status text default 'connected',
  available_from date,
  available_to date,
  bedrooms int,
  has_fiber_wifi boolean default true,
  has_power_backup boolean default true,
  created_at timestamptz default now()
);

create table public.luz_businesses (
  id uuid primary key default gen_random_uuid(),
  environment text not null default 'prod' check (environment in ('prod', 'test')),
  category text not null check (category in (
    'body_therapy',
    'beauty_cosmetics',
    'tattoo_art',
    'fitness_martial',
    'food_culinary',
    'kids_education',
    'transport_local',
    'pro_services'
  )),
  specialty_he text not null,
  specialty_en text not null,
  business_name_he text not null,
  business_name_en text not null,
  owner_name_he text not null,
  owner_name_en text not null,
  bio_he text,
  bio_en text,
  area text not null,
  location_details_he text,
  home_visit_available boolean default false,
  phone text not null,
  preferred_contact_lang text default 'he',
  instagram_handle text,
  website_url text,
  whatsapp_group_url text,
  services_menu jsonb default '[]'::jsonb,
  available_days jsonb default '[1,2,3,4,5]'::jsonb,
  time_slots jsonb default '[]'::jsonb,
  booked_slots jsonb default '{}'::jsonb,
  verified_community_member boolean default true,
  created_at timestamptz default now()
);

create table public.luz_bookings (
  id uuid primary key default gen_random_uuid(),
  referral_code text,
  environment text not null default 'prod' check (environment in ('prod', 'test')),
  entity_id text not null,
  entity_type text not null,
  customer_name text not null,
  customer_phone text not null,
  participants_count int default 1,
  selected_date date,
  selected_slot text,
  selected_service_offer text,
  rental_from date,
  rental_to date,
  reminder_channel text default 'both',
  created_at timestamptz default now()
);

create table public.luz_referrals (
  id uuid primary key default gen_random_uuid(),
  referral_code text not null,
  environment text not null default 'prod' check (environment in ('prod', 'test')),
  action_type text not null,
  provider_id text not null,
  provider_name_he text not null,
  provider_name_en text not null,
  owner_or_host_name text not null,
  provider_phone text not null,
  provider_category_or_type text,
  area text not null,
  provider_contact_lang text default 'he',
  customer_name text,
  customer_phone text,
  service_or_date_summary text,
  channels_dispatched jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);`;

export const AdminView: React.FC<AdminViewProps> = ({
  entities,
  businesses,
  bookings,
  families,
  referrals,
  notificationConfig,
  lang,
  appEnv,
  onToggleProviderSync,
  onUpdateNotificationConfig,
}) => {
  const isHe = lang === 'he';
  const [digestType, setDigestType] = useState<'user_weekly' | 'admin_system'>('admin_system');
  const [copiedDigest, setCopiedDigest] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const [draftConfig, setDraftConfig] = useState<NotificationChannelsConfig>(notificationConfig);
  const [savedConfigNotice, setSavedConfigNotice] = useState(false);
  const [testingAlerts, setTestingAlerts] = useState(false);
  const [testResults, setTestResults] = useState<ChannelDispatchResult[] | null>(null);
  const [copiedWebhookSample, setCopiedWebhookSample] = useState(false);
  const [copiedAppsScript, setCopiedAppsScript] = useState(false);
  const [showAppsScriptGuide, setShowAppsScriptGuide] = useState(false);

  const isAppsScriptConnected = isGoogleAppsScriptUrl(draftConfig.webhookUrl);

  const handleCopyAppsScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedAppsScript(true);
    setTimeout(() => setCopiedAppsScript(false), 3000);
  };

  const digestText = generateWhatsAppDigest(
    entities,
    families,
    bookings,
    digestType,
    lang,
    businesses,
    appEnv,
    referrals.length
  );

  const handleCopyDigest = () => {
    navigator.clipboard.writeText(digestText);
    setCopiedDigest(true);
    setTimeout(() => setCopiedDigest(false), 2500);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateNotificationConfig(draftConfig);
    setSavedConfigNotice(true);
    setTimeout(() => setSavedConfigNotice(false), 2500);
  };

  const handleSendTestAlert = async () => {
    onUpdateNotificationConfig(draftConfig);
    setTestingAlerts(true);
    setTestResults(null);
    try {
      const res = await sendTestAlertAllChannels(draftConfig, appEnv);
      setTestResults(res);
    } finally {
      setTestingAlerts(false);
    }
  };

  const handleCopySamplePayload = () => {
    const sample = JSON.stringify(
      {
        event: 'luz.provider_referral',
        referralCode: 'LUZ-1026-A8F2',
        environment: 'prod',
        actionType: 'whatsapp_click',
        actionLabelHe: 'פנייה ישירה בוואטסאפ לספק',
        provider: {
          nameHe: 'סולי — ריברסינג וטיפול רגשי (CBT)',
          ownerOrHost: 'סולי',
          phone: '+66 64 094 9859',
          area: 'Patnem',
          contactLang: 'he',
        },
        customer: {
          name: 'אורח/ת בקהילה',
          phone: '+972-52-000-0000',
        },
      },
      null,
      2
    );
    navigator.clipboard.writeText(sample);
    setCopiedWebhookSample(true);
    setTimeout(() => setCopiedWebhookSample(false), 2500);
  };

  const hourlyServices = entities.filter((e) => e.type === 'service');
  const scrapedOrDmCount = entities.filter(
    (e) => e.ingestionSource === 'scraper' || e.ingestionSource === 'whatsapp_dm'
  ).length;
  const webCount = entities.filter((e) => e.ingestionSource === 'web').length;

  return (
    <div className="space-y-6 animate-reveal">
      {/* Top Bar: System Pipeline Health & Lovable/Supabase Schema Export */}
      <div className="bg-canopy-900 text-sand-50 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              {isHe
                ? 'לוח בקרה למנהל מערכת, לידים ו-Digest'
                : 'LUZ System Manager, Referrals & Digest'}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                appEnv === 'prod'
                  ? 'bg-canopy-800 text-green-300 border border-canopy-700'
                  : 'bg-ochre-500 text-canopy-950'
              }`}
            >
              {appEnv === 'prod' ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <FlaskConical className="w-3.5 h-3.5" />
              )}
              {appEnv === 'prod' ? 'PROD (Real Data)' : 'TEST (Demo Sandbox)'}
            </span>
          </div>
          <p className="text-xs md:text-sm text-sand-200">
            {isHe
              ? 'התראות בזמן אמת על כל פנייה לספק (#LUZ-XXXX), ניהול ערוצי Google Apps Script / טלגרם / אימייל והפקת Digest שבועי'
              : 'Real-time provider referral alerts (#LUZ-XXXX), Google Apps Script / Telegram / Email routing, and weekly digests'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-terracotta-500/20 border border-terracotta-400/40 text-xs flex items-center gap-2 tabular-nums text-sand-50 font-semibold">
            <Bell className="w-3.5 h-3.5 text-ochre-400" />
            <span>
              {isHe ? 'פניות לספקים:' : 'Provider Leads:'} {referrals.length}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-canopy-800 border border-canopy-700 text-xs flex items-center gap-2 tabular-nums">
            <Briefcase className="w-3.5 h-3.5 text-ochre-400" />
            <span>
              {isHe ? 'בעלי עסקים:' : 'Businesses:'} {businesses.length}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-canopy-800 border border-canopy-700 text-xs flex items-center gap-2 tabular-nums">
            <span>
              {isHe ? 'מקור הזנה:' : 'Ingestion:'} {webCount} Web / {scrapedOrDmCount} WhatsApp
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowSqlModal(!showSqlModal)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ochre-500 text-canopy-950 font-bold text-xs hover:bg-ochre-400 transition-colors"
          >
            <Database className="w-4 h-4" />
            {isHe ? 'סכמת SQL ל-Supabase / Lovable' : 'Supabase / Lovable SQL Schema'}
          </button>
        </div>
      </div>

      {/* Collapsible SQL Schema Box */}
      {showSqlModal && (
        <div className="bg-canopy-950 text-sand-100 rounded-2xl p-5 border border-canopy-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ochre-400">
              {isHe
                ? 'כולל טבלאות luz_entities, luz_businesses, luz_bookings ו-luz_referrals עם הפרדת סביבות:'
                : 'Includes luz_entities, luz_businesses, luz_bookings, and luz_referrals:'}
            </span>
            <button
              type="button"
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-canopy-800 text-xs font-medium text-sand-50 hover:bg-canopy-700"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? (isHe ? 'הועתק!' : 'Copied!') : isHe ? 'העתק SQL' : 'Copy SQL'}
            </button>
          </div>
          <pre
            className="text-xs font-mono text-sand-200 overflow-x-auto p-3 rounded-xl bg-black/40 max-h-60"
            dir="ltr"
          >
            {SUPABASE_SCHEMA_SQL}
          </pre>
        </div>
      )}

      {/* REAL-TIME PROVIDER REFERRAL ALERTS & ATTRIBUTION HUB */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Channel Configuration Card */}
        <form
          onSubmit={handleSaveConfig}
          className="lg:col-span-7 bg-sand-50 rounded-2xl border border-sand-300 p-6 space-y-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="font-display text-xl font-bold text-canopy-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-terracotta-500" />
                {isHe
                  ? 'מרכז התראות לידים והפניות לספקים בזמן אמת'
                  : 'Real-Time Provider Referral Alerts Hub'}
              </h3>
              <p className="text-xs text-canopy-600 leading-relaxed">
                {isHe
                  ? 'בכל לחיצה על וואטסאפ של ספק, אתר חיצוני או קביעת תור — הספק מקבל הודעה ממותגת מ-LUZ גואה (#LUZ-XXXX בעברית או באנגלית בהתאם לספק), ואתה מקבל התראה מיידית לערוצים הפעילים כאן.'
                  : 'Every provider WhatsApp click, website visit, or slot booking tags LUZ Goa (#LUZ-XXXX) for the provider and sends you an instant alert.'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 1. Google Apps Script / Webhook Channel (RECOMMENDED) */}
            <div className="p-4 rounded-xl bg-white border border-sand-300 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-canopy-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftConfig.enableWebhook}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({ ...prev, enableWebhook: e.target.checked }))
                    }
                    className="rounded border-sand-300 text-terracotta-500 focus:ring-terracotta-500"
                  />
                  <Webhook className="w-4 h-4 text-ochre-600" />
                  <span>
                    {isHe
                      ? 'Google Apps Script (מומלץ — חינם + Google Sheets + Gmail) או Webhook'
                      : 'Google Apps Script Web App (Recommended) / Make Webhook'}
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyAppsScriptCode}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-sand-50 bg-canopy-800 hover:bg-canopy-700 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    {copiedAppsScript ? (
                      <Check className="w-3 h-3 text-ochre-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-ochre-400" />
                    )}
                    {copiedAppsScript
                      ? isHe
                        ? 'קוד ה-Apps Script הועתק!'
                        : 'Apps Script Copied!'
                      : isHe
                      ? 'העתק קוד Google Apps Script מוכן'
                      : 'Copy Ready Apps Script'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAppsScriptGuide((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-canopy-700 hover:text-canopy-950 px-2 py-1 rounded-lg bg-sand-100 border border-sand-300"
                  >
                    {isHe ? 'איך מחברים ב-2 דק׳?' : '2-Min Setup'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySamplePayload}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-canopy-700 hover:text-canopy-950 px-2 py-1 rounded-lg bg-sand-100 border border-sand-300"
                  >
                    {copiedWebhookSample ? (
                      <Check className="w-3 h-3 text-canopy-700" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copiedWebhookSample ? 'JSON' : 'JSON'}
                  </button>
                </div>
              </div>

              {showAppsScriptGuide && (
                <div className="p-3 rounded-xl bg-sand-100 border border-sand-300 text-[11px] text-canopy-800 space-y-1 leading-relaxed">
                  <div className="font-bold text-canopy-900">
                    {isHe
                      ? 'חיבור Google Apps Script ב-4 צעדים קצרים (ללא חשיפת מפתחות בקוד וללא עלות):'
                      : '4-Step Google Apps Script Setup:'}
                  </div>
                  <div>
                    1. פתחו את{' '}
                    <a
                      href="https://script.new"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold text-terracotta-600"
                    >
                      script.new
                    </a>{' '}
                    (או מתוך Google Sheet חדש: Extensions → Apps Script) והדביקו את הקוד שהעתקתם.
                  </div>
                  <div>
                    2. בחרו למעלה בפונקציה <code className="font-mono">setupAndTestLuzAlerts</code>{' '}
                    ולחצו <strong>Run</strong> לאישור הרשאות חד-פעמי (הסקריפט ייצור אוטומטית גיליון Google Sheets בעברית וישלח לכם מייל בדיקה!).
                  </div>
                  <div>
                    3. לחצו <strong>Deploy → New deployment → Web app</strong>, הגדירו{' '}
                    <strong>Execute as: Me</strong> ו-<strong>Who has access: Anyone</strong>.
                  </div>
                  <div>
                    4. העתיקו את כתובת ה-<code className="font-mono">.../exec</code> לכאן למטה (או שלחו אותה בצ׳אט כדי שנצרוב אותה קבוע לכל המבקרים באתר).
                  </div>
                </div>
              )}

              <input
                type="url"
                dir="ltr"
                value={draftConfig.webhookUrl}
                onChange={(e) => {
                  const nextUrl = e.target.value;
                  const nextIsGas = isGoogleAppsScriptUrl(nextUrl);
                  setDraftConfig((prev) => ({
                    ...prev,
                    webhookUrl: nextUrl,
                    // Avoid duplicate FormSubmit email when Apps Script already emails via Gmail
                    enableEmail: nextIsGas ? false : prev.enableEmail,
                  }));
                }}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full rounded-lg border border-sand-300 bg-sand-50 px-3 py-1.5 text-xs font-mono"
              />

              {isAppsScriptConnected && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-canopy-800 bg-canopy-100/70 px-2.5 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-canopy-700 shrink-0" />
                  <span>
                    {isHe
                      ? 'זוהה Google Apps Script — נשלח ישירות ללא שגיאות CORS, שומר ל-Google Sheets ושולח מייל מ-Gmail שלך!'
                      : 'Google Apps Script detected — zero-CORS dispatch to Sheets + Gmail active!'}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Fallback Direct Email Channel (FormSubmit / Web3Forms) */}
            <div className="p-4 rounded-xl bg-white border border-sand-300 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-canopy-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftConfig.enableEmail}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({ ...prev, enableEmail: e.target.checked }))
                    }
                    className="rounded border-sand-300 text-terracotta-500 focus:ring-terracotta-500"
                  />
                  <Mail className="w-4 h-4 text-terracotta-500" />
                  <span>
                    {isHe
                      ? 'גיבוי אימייל ישיר מהדפדפן (FormSubmit / Web3Forms — ללא Apps Script)'
                      : 'Direct Browser Email Fallback (FormSubmit / Web3Forms)'}
                  </span>
                </label>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sand-100 text-canopy-700">
                  {isAppsScriptConnected
                    ? isHe
                      ? 'כבוי אוטומטית (Apps Script שולח Gmail)'
                      : 'Handled by Apps Script'
                    : isHe
                    ? 'פעיל כגיבוי מיידי'
                    : 'Active Fallback'}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-canopy-600 mb-1">
                    {isHe ? 'כתובת אימייל לקבלת הלידים:' : 'Admin Alert Email:'}
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={draftConfig.adminEmail}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({ ...prev, adminEmail: e.target.value }))
                    }
                    placeholder="naorbo@gmail.com"
                    className="w-full rounded-lg border border-sand-300 bg-sand-50 px-3 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-canopy-600 mb-1">
                    {isHe
                      ? 'מפתח Web3Forms (אופציונלי):'
                      : 'Web3Forms Key (Optional):'}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={draftConfig.web3formsAccessKey || ''}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({
                        ...prev,
                        web3formsAccessKey: e.target.value,
                      }))
                    }
                    placeholder="Optional UUID key..."
                    className="w-full rounded-lg border border-sand-300 bg-sand-50 px-3 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Telegram Bot Channel */}
            <div className="p-4 rounded-xl bg-white border border-sand-300 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-canopy-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draftConfig.enableTelegram}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({ ...prev, enableTelegram: e.target.checked }))
                    }
                    className="rounded border-sand-300 text-terracotta-500 focus:ring-terracotta-500"
                  />
                  <Send className="w-4 h-4 text-lagoon-600" />
                  <span>
                    {isHe
                      ? 'התראה מיידית בבוט טלגרם (Telegram Bot Push)'
                      : 'Instant Telegram Bot Push'}
                  </span>
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-canopy-600 mb-1">
                    Telegram Bot Token (@BotFather):
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    value={draftConfig.telegramBotToken}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({ ...prev, telegramBotToken: e.target.value }))
                    }
                    placeholder="123456789:ABCdefGHIjklMNO..."
                    className="w-full rounded-lg border border-sand-300 bg-sand-50 px-3 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-canopy-600 mb-1">
                    Telegram Chat ID (שלך או של קבוצת אדמינים):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={draftConfig.telegramChatId}
                    onChange={(e) =>
                      setDraftConfig((prev) => ({ ...prev, telegramChatId: e.target.value }))
                    }
                    placeholder="e.g. 987654321 or -100123456789"
                    className="w-full rounded-lg border border-sand-300 bg-sand-50 px-3 py-1.5 text-xs font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Sandbox Alert Toggle */}
            <label className="inline-flex items-center gap-2 text-xs text-canopy-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={draftConfig.sendRealAlertsInTestEnv}
                onChange={(e) =>
                  setDraftConfig((prev) => ({
                    ...prev,
                    sendRealAlertsInTestEnv: e.target.checked,
                  }))
                }
                className="rounded border-sand-300 text-canopy-800"
              />
              <span>
                {isHe
                  ? 'שלח התראות אמיתיות גם בעת גלישה בסביבת TEST (כבוי כברירת מחדל כדי למנוע התראות דמו)'
                  : 'Also dispatch real alerts while browsing TEST sandbox'}
              </span>
            </label>
          </div>

          {/* Save + Test Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-canopy-800 text-sand-50 text-xs font-semibold hover:bg-canopy-700 transition-colors"
            >
              {savedConfigNotice ? (
                <>
                  <Check className="w-4 h-4 text-ochre-400" />
                  {isHe ? 'ההגדרות נשמרו!' : 'Settings Saved!'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-ochre-400" />
                  {isHe ? 'שמירת הגדרות ערוצים' : 'Save Alert Channels'}
                </>
              )}
            </button>

            <button
              type="button"
              disabled={testingAlerts}
              onClick={handleSendTestAlert}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-terracotta-500 text-white text-xs font-semibold hover:bg-terracotta-600 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {testingAlerts
                ? isHe
                  ? 'שולח התראת בדיקה...'
                  : 'Sending Test Alert...'
                : isHe
                ? 'שלח התראת בדיקה עכשיו (Test Alert)'
                : 'Send Test Alert Now'}
            </button>
          </div>

          {/* Test Dispatch Results */}
          {testResults && (
            <div className="p-3.5 rounded-xl bg-white border border-sand-300 space-y-2">
              <div className="text-xs font-bold text-canopy-900">
                {isHe ? 'תוצאות בדיקת שליחה לערוצים:' : 'Channel Test Results:'}
              </div>
              {testResults.length === 0 ? (
                <div className="text-xs text-ochre-600">
                  {isHe
                    ? 'לא הוגדר אף ערוץ פעיל עם כתובת/טוקן. הזן כתובת אימייל, Webhook או טלגרם ונסה שוב.'
                    : 'No active channel configured with a destination address/token.'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {testResults.map((r, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
                        r.ok
                          ? 'bg-canopy-100/70 text-canopy-900'
                          : 'bg-terracotta-50 text-terracotta-600'
                      }`}
                    >
                      {r.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-canopy-700 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-terracotta-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold uppercase">{r.channel}:</span> {r.detail}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Live Provider Referrals & Attribution Log (#LUZ-XXXX) */}
        <div className="lg:col-span-5 bg-sand-50 rounded-2xl border border-sand-300 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xl font-bold text-canopy-900 flex items-center gap-2">
                <Hash className="w-5 h-5 text-terracotta-500" />
                {isHe
                  ? 'יומן הפניות ולידים לספקים (#LUZ)'
                  : 'Live Provider Referrals Log (#LUZ)'}
              </h3>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-sand-200 text-canopy-800 tabular-nums">
                {referrals.length}
              </span>
            </div>

            <p className="text-xs text-canopy-600 leading-relaxed">
              {isHe
                ? 'כל פנייה לספק מתועדת כאן בזמן אמת יחד עם קוד השיוך החד-ערכי שהוצמד להודעת הוואטסאפ או לקישור ה-UTM של הספק.'
                : 'Every user click or booking to a provider is logged here with the exact #LUZ referral code sent to the provider.'}
            </p>

            {referrals.length === 0 ? (
              <div className="p-6 bg-white rounded-xl border border-sand-300 text-xs text-canopy-600 text-center space-y-1.5">
                <div className="font-semibold text-canopy-800">
                  {isHe
                    ? 'טרם נרשמו פניות לספקים בסביבה זו.'
                    : 'No provider referrals recorded in this environment yet.'}
                </div>
                <div>
                  {isHe
                    ? 'נסה ללחוץ על כפתור וואטסאפ או לקבוע תור אצל אחד מבעלי העסקים כדי לראות את השיוך והליד מופיעים מיד.'
                    : 'Click any provider WhatsApp or book a slot to see live attribution in action.'}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-sand-200 bg-white rounded-xl border border-sand-300 overflow-hidden max-h-[470px] overflow-y-auto">
                {referrals.map((ref) => (
                  <div key={ref.id} className="p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canopy-900 text-ochre-400 font-mono text-[11px] font-bold tabular-nums">
                        #{ref.referralCode}
                      </span>
                      <span className="text-[11px] text-canopy-500 tabular-nums">
                        {new Date(ref.createdAt).toLocaleString(isHe ? 'he-IL' : 'en-GB', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    <div className="font-bold text-canopy-900">
                      {isHe ? ref.providerNameHe : ref.providerNameEn}{' '}
                      <span className="font-normal text-canopy-600">
                        ({ref.ownerOrHostName} • {ref.area})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-full bg-terracotta-50 text-terracotta-600 font-semibold">
                        {getActionTypeLabel(ref.actionType, lang)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-sand-100 text-canopy-700 font-medium">
                        {ref.providerContactLang === 'en'
                          ? isHe
                            ? 'שיוך לספק: English'
                            : 'Provider Msg: EN'
                          : isHe
                          ? 'שיוך לספק: עברית'
                          : 'Provider Msg: HE'}
                      </span>
                    </div>

                    {(ref.customerName || ref.serviceOrDateSummary) && (
                      <div className="text-[11px] text-canopy-700 tabular-nums">
                        {ref.customerName && (
                          <span className="font-semibold">
                            {ref.customerName}
                            {ref.customerPhone ? ` (${ref.customerPhone})` : ''}
                          </span>
                        )}
                        {ref.customerName && ref.serviceOrDateSummary ? ' • ' : ''}
                        {ref.serviceOrDateSummary && <span>{ref.serviceOrDateSummary}</span>}
                      </div>
                    )}

                    <div className="text-[10px] text-canopy-500 flex items-center gap-1.5 pt-0.5">
                      <span>{isHe ? 'התראות שנשלחו:' : 'Dispatched:'}</span>
                      {ref.channelsDispatched.length > 0 ? (
                        ref.channelsDispatched.map((ch) => (
                          <span
                            key={ch}
                            className="px-1.5 py-0.5 rounded bg-canopy-100 text-canopy-800 font-mono uppercase"
                          >
                            {ch}
                          </span>
                        ))
                      ) : (
                        <span>
                          {isHe ? 'תיעוד ביומן בלבד (מצב TEST)' : 'Logged locally (TEST mode)'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Digest Generator + Provider Integrations & Bookings */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Digest Studio */}
        <div className="lg:col-span-6 bg-sand-50 rounded-2xl border border-sand-300 p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl font-bold text-canopy-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-terracotta-500" />
                {isHe ? 'מחולל Digest אוטומטי לוואטסאפ' : 'WhatsApp Digest Generator'}
              </h3>

              <div className="inline-flex rounded-xl bg-sand-200 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setDigestType('admin_system')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    digestType === 'admin_system'
                      ? 'bg-canopy-800 text-sand-50'
                      : 'text-canopy-700'
                  }`}
                >
                  {isHe ? 'Digest מנהל מערכת' : 'Admin Digest'}
                </button>
                <button
                  type="button"
                  onClick={() => setDigestType('user_weekly')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    digestType === 'user_weekly'
                      ? 'bg-canopy-800 text-sand-50'
                      : 'text-canopy-700'
                  }`}
                >
                  {isHe ? 'Digest שבועי לתושבים' : 'Resident Weekly Digest'}
                </button>
              </div>
            </div>

            <pre className="w-full rounded-xl bg-white border border-sand-300 p-4 text-xs font-sans whitespace-pre-wrap leading-relaxed text-canopy-900 max-h-[380px] overflow-y-auto">
              {digestText}
            </pre>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              type="button"
              onClick={handleCopyDigest}
              className="flex-1 py-2.5 px-4 rounded-xl bg-canopy-800 text-sand-50 text-xs font-semibold hover:bg-canopy-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              {copiedDigest ? (
                <>
                  <Check className="w-4 h-4 text-ochre-400" />
                  {isHe ? 'הודעת ה-Digest הועתקה ללוח!' : 'Digest Copied!'}
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-ochre-400" />
                  {isHe ? 'העתקת Digest לשליחה בוואטסאפ' : 'Copy Digest for WhatsApp'}
                </>
              )}
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(digestText)}`}
              target="_blank"
              rel="noreferrer"
              className="py-2.5 px-4 rounded-xl bg-terracotta-500 text-white text-xs font-semibold hover:bg-terracotta-600 transition-colors inline-flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              {isHe ? 'שיתוף ישיר בוואטסאפ' : 'Share on WhatsApp'}
            </a>
          </div>
        </div>

        {/* Right Column: Provider Calendar Sync Health + Active Bookings Table */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-sand-50 rounded-2xl border border-sand-300 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-canopy-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-ochre-600" />
                {isHe
                  ? 'סטטוס סנכרון יומנים (משאבים ושירותים שעתיים)'
                  : 'Hourly Provider Calendar Integrations'}
              </h3>
              <span className="text-xs text-canopy-600 tabular-nums">
                {hourlyServices.length} {isHe ? 'ספקים/משאבים' : 'providers'}
              </span>
            </div>

            {hourlyServices.length === 0 ? (
              <div className="p-5 bg-white rounded-xl border border-sand-300 text-xs text-canopy-600 text-center">
                {isHe
                  ? 'אין משאבים שעתיים רשומים בסביבה זו כרגע.'
                  : 'No hourly resources registered in this environment yet.'}
              </div>
            ) : (
              <div className="divide-y divide-sand-200 bg-white rounded-xl border border-sand-300 overflow-hidden">
                {hourlyServices.map((srv) => {
                  const isConnected = srv.calendarSyncStatus === 'connected';
                  return (
                    <div
                      key={srv.id}
                      className="p-3.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-canopy-900 truncate">
                          {isHe ? srv.titleHe : srv.titleEn}
                        </div>
                        <div className="text-canopy-600 tabular-nums">
                          {srv.hostName} • {srv.area} ({srv.timeSlots?.length || 0}{' '}
                          {isHe ? 'משבצות' : 'slots'})
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${
                            isConnected
                              ? 'bg-canopy-100 text-canopy-800'
                              : 'bg-ochre-100 text-ochre-600'
                          }`}
                        >
                          {isConnected ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                          {isConnected
                            ? isHe
                              ? 'יומן מסונכרן (GCal)'
                              : 'Synced (GCal)'
                            : isHe
                            ? 'ניהול ידני'
                            : 'Manual Slots'}
                        </span>

                        <button
                          type="button"
                          onClick={() => onToggleProviderSync(srv.id)}
                          title={isHe ? 'החלף סטטוס סנכרון' : 'Toggle Sync Status'}
                          className="p-1.5 rounded-lg border border-sand-300 hover:bg-sand-100 text-canopy-700"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent RSVPs & Bookings Log */}
          <div className="bg-sand-50 rounded-2xl border border-sand-300 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-canopy-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-terracotta-500" />
                {isHe
                  ? 'יומן הרשמות, תורים לעסקים ושריוני בתים'
                  : 'Recent RSVPs, Business Appointments & Stays'}
              </h3>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-sand-200 text-canopy-800 tabular-nums">
                {bookings.length}
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="p-5 bg-white rounded-xl border border-sand-300 text-xs text-canopy-600 text-center">
                {isHe
                  ? 'טרם בוצעו הזמנות או הרשמות בסביבה זו.'
                  : 'No bookings or RSVPs recorded in this environment yet.'}
              </div>
            ) : (
              <div className="divide-y divide-sand-200 bg-white rounded-xl border border-sand-300 overflow-hidden max-h-64 overflow-y-auto">
                {bookings.map((bk) => (
                  <div
                    key={bk.id}
                    className="p-3.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-canopy-900 truncate flex items-center gap-1.5">
                        {bk.referralCode && (
                          <span className="px-1.5 py-0.5 rounded bg-sand-200 text-canopy-800 font-mono text-[10px] tabular-nums shrink-0">
                            #{bk.referralCode}
                          </span>
                        )}
                        <span className="truncate">
                          {isHe ? bk.entityTitleHe : bk.entityTitleEn}
                        </span>
                      </div>
                      {bk.selectedServiceOffer && (
                        <div className="text-[11px] text-ochre-600 font-medium truncate">
                          {bk.selectedServiceOffer}
                        </div>
                      )}
                      <div className="text-canopy-600 tabular-nums">
                        {bk.customerName} ({bk.customerPhone}) •{' '}
                        <span className="inline-flex items-center gap-0.5">
                          <Users className="w-3 h-3" /> {bk.participantsCount}
                        </span>
                      </div>
                    </div>

                    <div className="text-end shrink-0 tabular-nums">
                      <div className="font-semibold text-canopy-900">
                        {bk.entityType === 'rental'
                          ? `${bk.rentalFrom} → ${bk.rentalTo}`
                          : `${bk.selectedDate} | ${bk.selectedSlot}`}
                      </div>
                      <div className="text-[11px] text-terracotta-600 font-medium">
                        {bk.reminderChannel === 'both'
                          ? isHe
                            ? 'תזכורת: וואטסאפ + יומן'
                            : 'Reminder: WA + .ics'
                          : bk.reminderChannel === 'whatsapp'
                          ? 'WhatsApp ("Ben")'
                          : 'Calendar (.ics)'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
