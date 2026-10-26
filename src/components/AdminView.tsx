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
} from 'lucide-react';
import {
  LuzEntity,
  CommunityBusiness,
  BookingRecord,
  YouthCenterFamily,
  Language,
  AppEnvironment,
} from '../types/luz';
import { generateWhatsAppDigest } from '../utils/calendarAndParser';

interface AdminViewProps {
  entities: LuzEntity[];
  businesses: CommunityBusiness[];
  bookings: BookingRecord[];
  families: YouthCenterFamily[];
  lang: Language;
  appEnv: AppEnvironment;
  onToggleProviderSync: (entityId: string) => void;
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
  instagram_handle text,
  services_menu jsonb default '[]'::jsonb,
  available_days jsonb default '[1,2,3,4,5]'::jsonb,
  time_slots jsonb default '[]'::jsonb,
  booked_slots jsonb default '{}'::jsonb,
  verified_community_member boolean default true,
  created_at timestamptz default now()
);

create table public.luz_bookings (
  id uuid primary key default gen_random_uuid(),
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
);`;

export const AdminView: React.FC<AdminViewProps> = ({
  entities,
  businesses,
  bookings,
  families,
  lang,
  appEnv,
  onToggleProviderSync,
}) => {
  const isHe = lang === 'he';
  const [digestType, setDigestType] = useState<'user_weekly' | 'admin_system'>('admin_system');
  const [copiedDigest, setCopiedDigest] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const digestText = generateWhatsAppDigest(
    entities,
    families,
    bookings,
    digestType,
    lang,
    businesses,
    appEnv
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
                ? 'לוח בקרה למנהל מערכת ו-Digest'
                : 'LUZ System Manager & Digest Control'}
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
              ? 'מעקב חי אחר אינטגרציות יומן ספקים, עסקים רשומים, קליטת אירועים מוואטסאפ והפקת Digest שבועי'
              : 'Monitor provider calendar integrations, registered businesses, bookings, and generate digests'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
                ? 'כולל טבלאות luz_entities, luz_businesses ו-luz_bookings עם הפרדת סביבות (prod / test):'
                : 'Includes luz_entities, luz_businesses, and luz_bookings with prod/test isolation:'}
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
                      <div className="font-bold text-canopy-900 truncate">
                        {isHe ? bk.entityTitleHe : bk.entityTitleEn}
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
