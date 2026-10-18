import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  UserCheck,
  Code2,
  Calendar,
  MapPin,
  Bot,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  LuzEntity,
  UserProfile,
  ChatMessage,
  Language,
  GoaArea,
} from '../types/luz';
import { parseWhatsAppMessageToDraft } from '../utils/calendarAndParser';

interface BenBotViewProps {
  entities: LuzEntity[];
  userProfile: UserProfile;
  lang: Language;
  onUpdateProfile: (profile: UserProfile) => void;
  onSelectEntity: (entity: LuzEntity) => void;
  onAddEntityFromDM: (entity: LuzEntity) => void;
}

export const BenBotView: React.FC<BenBotViewProps> = ({
  entities,
  userProfile,
  lang,
  onUpdateProfile,
  onSelectEntity,
  onAddEntityFromDM,
}) => {
  const isHe = lang === 'he';
  const [dmMode, setDmMode] = useState<'client' | 'provider_dm'>('client');
  const [showWebhookSpec, setShowWebhookSpec] = useState(false);
  const [input, setInput] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'ben',
      text: isHe
        ? 'אהלן! אני "בן", סוכן האירועים, המתנ"ס והשירותים של קהילת גואה ב-LUZ 🌴\nאפשר לשאול אותי מה קורה השבוע, לעדכן העדפות משפחה בטקסט חופשי (למשל גילאי ילדים ואזור), לחפש בית להשכרה, או להעלות אירוע ב-DM!'
        : 'Hey! I am "Ben", the LUZ Goa Community Events & Services Agent 🌴\nAsk me what is happening this week, update your family preferences in free text, find a sublet, or DM me as a provider to publish an event!',
      timestamp: '10:00',
      recommendedEntityIds: ['evt-kickoff-colomb', 'wks-yc-thursday-makers'],
    },
  ]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processUserMessage = (rawText: string) => {
    if (!rawText.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: rawText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const lower = rawText.toLowerCase();

    // 1. Provider DM Mode: Create new entity directly from chat
    if (dmMode === 'provider_dm' || /^(פרסם|העלה אירוע|חדש:|publish:)/i.test(rawText.trim())) {
      const draft = parseWhatsAppMessageToDraft(rawText);
      const newEntity: LuzEntity = {
        id: `dm-${Date.now()}`,
        type: draft.type,
        titleHe: draft.titleHe,
        titleEn: draft.titleEn,
        descriptionHe: draft.descriptionHe,
        descriptionEn: draft.descriptionHe,
        area: draft.area,
        locationDetailsHe: draft.locationDetailsHe,
        locationDetailsEn: `${draft.area}, Goa`,
        hostName: userProfile.name,
        hostPhone: draft.hostPhone,
        priceAmount: draft.priceAmount,
        priceCurrency: draft.priceCurrency,
        audience: 'all',
        ingestionSource: 'whatsapp_dm',
        imageUrl:
          draft.type === 'rental'
            ? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1000'
            : 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1000',
        tags: [draft.area, draft.type],
        rsvpCount: 1,
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        availableFrom: draft.availableFrom,
        availableTo: draft.availableTo,
        bedrooms: draft.bedrooms,
        hasFiberWifi: draft.hasFiberWifi,
        hasPowerBackup: draft.hasPowerBackup,
        pricePerNight: draft.priceAmount,
        timeSlots: ['10:00', '14:00', '17:00'],
        bookedSlots: {},
      };

      onAddEntityFromDM(newEntity);

      const reply: ChatMessage = {
        id: `b-${Date.now() + 1}`,
        sender: 'ben',
        text: isHe
          ? `מעולה! קלטתי את ההודעה שלך ב-DM ויצרתי בלוח LUZ ישות חדשה:\n"${newEntity.titleHe}" (${newEntity.area}).\nחברי הקהילה יכולים מעכשיו להירשם ולקבל תזכורת!`
          : `Awesome! I parsed your DM and published "${newEntity.titleEn}" (${newEntity.area}) straight to the LUZ Calendar!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdEntityId: newEntity.id,
        recommendedEntityIds: [newEntity.id],
      };

      setMessages((prev) => [...prev, userMsg, reply]);
      setInput('');
      return;
    }

    // 2. Scope Guard (Non-Event General Group Q&A is Phase 2 per MVP spec!)
    if (/חיתולים|סופרמרקט|מוסך|ויזה הודית|diapers|supermarket|grocery/i.test(lower)) {
      const reply: ChatMessage = {
        id: `b-${Date.now() + 1}`,
        sender: 'ben',
        text: isHe
          ? 'בגרסת ה-MVP אני ממוקד אך ורק באירועים, מפגשי מרכז הנוער, שירותים שעתיים והשכרת בתים בקהילה 🎯\n(מענה על מידע כללי מהיסטוריית הקבוצות ייכנס בשלב הבא של ה-Roadmap). תרצה לראות את האירועים הקרובים בקולום?'
          : 'In the current MVP, I focus exclusively on community events, Youth Center sessions, hourly services, and home rentals 🎯 (General group Q&A is scheduled for Phase 2). Would you like to see upcoming events in Colomb?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg, reply]);
      setInput('');
      return;
    }

    // 3. Free-Text Profiling Detection
    if (/ילד|ילדים|בני|גיל|גרים ב|מחפש רק|אנחנו מ|kids|age|live in|prefer/i.test(lower)) {
      const ageMatches = [...rawText.matchAll(/\b([4-9]|1[0-7])\b/g)].map((m) =>
        parseInt(m[1], 10)
      );
      let newArea = userProfile.preferredArea;
      if (/פטנם|patnem/i.test(lower)) newArea = 'Patnem';
      if (/קולום|colomb/i.test(lower)) newArea = 'Colomb';
      if (/פאלולם|palolem/i.test(lower)) newArea = 'Palolem';
      if (/אגונדה|agonda/i.test(lower)) newArea = 'Agonda';

      const newInterests = [...userProfile.interests];
      if (/מוזיקה|ג'אם|music/i.test(lower) && !newInterests.includes('מוזיקה'))
        newInterests.push('מוזיקה');
      if (/יוגה|yoga/i.test(lower) && !newInterests.includes('יוגה'))
        newInterests.push('יוגה');
      if (/משחק|board/i.test(lower) && !newInterests.includes('משחקי קופסה'))
        newInterests.push('משחקי קופסה');

      const updated: UserProfile = {
        ...userProfile,
        preferredArea: newArea,
        kidsAges: ageMatches.length > 0 ? ageMatches : userProfile.kidsAges,
        interests: newInterests,
        rawPreferenceText: rawText,
      };
      onUpdateProfile(updated);

      const matched = entities
        .filter((e) => e.area === newArea || e.isYouthCenter)
        .slice(0, 3)
        .map((e) => e.id);

      const reply: ChatMessage = {
        id: `b-${Date.now() + 1}`,
        sender: 'ben',
        text: isHe
          ? `עדכנתי את הפרופיל שלך! 📌\n• אזור מועדף: ${updated.preferredArea}\n• גילאי ילדים: ${updated.kidsAges.join(', ')}\n• תחומי עניין: ${updated.interests.join(', ')}\n\nהנה הפעילויות שהכי מתאימות לכם השבוע:`
          : `Updated your family profile! 📌\n• Preferred Area: ${updated.preferredArea}\n• Kids Ages: ${updated.kidsAges.join(', ')}\n• Interests: ${updated.interests.join(', ')}\n\nHere are the top matches for you this week:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        profileUpdated: true,
        recommendedEntityIds: matched,
      };
      setMessages((prev) => [...prev, userMsg, reply]);
      setInput('');
      return;
    }

    // 4. Querying Houses / Rentals
    if (/בית|בתים|וילה|להשכרה|סאבלט|rent|villa|house/i.test(lower)) {
      const rentals = entities.filter((e) => e.type === 'rental').map((e) => e.id);
      const reply: ChatMessage = {
        id: `b-${Date.now() + 1}`,
        sender: 'ben',
        text: isHe
          ? `מצאתי ${rentals.length} בתים מאומתים להשכרה בקהילה (עם סיבים אופטיים וגיבוי חשמל). אפשר ללחוץ על כל בית כדי לבדוק תאריכים פנויים ולשריין:`
          : `I found ${rentals.length} verified community homes available for sublet (with Fiber Wi-Fi & Power Backup). Tap any listing to check dates and reserve:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedEntityIds: rentals,
      };
      setMessages((prev) => [...prev, userMsg, reply]);
      setInput('');
      return;
    }

    // 5. Querying Hourly Services / Spaces / Studio / Yoga / Doctor
    if (/שעתי|אולפן|יוגה|רופא|עבודה|תור|studio|yoga|doctor|hourly|space/i.test(lower)) {
      const services = entities.filter((e) => e.type === 'service').map((e) => e.id);
      const reply: ChatMessage = {
        id: `b-${Date.now() + 1}`,
        sender: 'ben',
        text: isHe
          ? 'אלו השירותים השעתיים והמשאבים הקהילתיים (אולפן הקלטות במתנ"ס, מרחב עבודה עם סיבים, יוגה ורפואה) עם משבצות יומן פנויות השבוע:'
          : 'Here are the hourly services and community spaces (Recording Studio, Fiber Co-Working, Yoga & Medical) with open calendar slots this week:',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedEntityIds: services,
      };
      setMessages((prev) => [...prev, userMsg, reply]);
      setInput('');
      return;
    }

    // Default: Recommend Youth Center + Upcoming Events
    const topEvents = entities
      .filter((e) => e.type === 'event' || e.type === 'workshop')
      .slice(0, 4)
      .map((e) => e.id);

    const reply: ChatMessage = {
      id: `b-${Date.now() + 1}`,
      sender: 'ben',
      text: isHe
        ? 'הנה האירועים הקרובים ופעילויות מרכז הנוער בקולום (ב׳–ה׳) שמחכים לכם השבוע. לחצו על כל כרטיס להרשמה וקבלת תזכורת:'
        : 'Here are the upcoming community events and Youth Center sessions (Mon–Thu in Colomb) this week. Tap any card to RSVP and set a reminder:',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recommendedEntityIds: topEvents,
    };
    setMessages((prev) => [...prev, userMsg, reply]);
    setInput('');
  };

  const quickPrompts = isHe
    ? [
        'מה יש השבוע לנוער במתנ"ס בקולום?',
        'יש לי שני ילדים בני 11 ו-14 ואנחנו גרים בפטנם',
        'אילו בתים עם סיבים אופטיים פנויים להשכרה?',
        'מתי פנוי אולפן ההקלטות או מורה ליוגה?',
      ]
    : [
        'What is happening at the Youth Center in Colomb?',
        'We live in Patnem with kids aged 11 and 14',
        'Which homes with Fiber Wi-Fi are available to rent?',
        'Show available slots for the Recording Studio & Yoga',
      ];

  return (
    <div className="grid lg:grid-cols-12 gap-6 animate-reveal">
      {/* Left Column: WhatsApp Simulator with "Ben" */}
      <div className="lg:col-span-8 flex flex-col bg-sand-50 rounded-2xl border border-sand-300 overflow-hidden h-[680px]">
        {/* WhatsApp-Style Header */}
        <div className="bg-canopy-900 text-sand-50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-terracotta-500 flex items-center justify-center text-white font-bold shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm md:text-base">
                  {isHe ? 'הבוט "בן" — סוכן LUZ בוואטסאפ' : '"Ben" — LUZ WhatsApp Agent'}
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-canopy-800 text-ochre-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-xs text-sand-300">
                {isHe
                  ? 'פרופילינג בטקסט חופשי • המלצות אירועים • קליטת אירועי ספק ב-DM'
                  : 'Free-text profiling • Smart recommendations • Provider DM ingestion'}
              </p>
            </div>
          </div>

          {/* Toggle Client vs Provider DM Mode */}
          <div className="inline-flex rounded-xl bg-canopy-950 p-1 text-xs">
            <button
              type="button"
              onClick={() => setDmMode('client')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                dmMode === 'client' ? 'bg-terracotta-500 text-white' : 'text-sand-300'
              }`}
            >
              {isHe ? 'מצב תושב (חיפוש ופרופיל)' : 'Resident Mode'}
            </button>
            <button
              type="button"
              onClick={() => setDmMode('provider_dm')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                dmMode === 'provider_dm' ? 'bg-ochre-500 text-canopy-950' : 'text-sand-300'
              }`}
            >
              {isHe ? 'מצב ספק (העלאת אירוע ב-DM)' : 'Provider DM Upload'}
            </button>
          </div>
        </div>

        {/* Chat Messages Stream */}
        <div className="flex-1 p-4 md:p-5 overflow-y-auto space-y-4 bg-sand-100">
          {messages.map((msg) => {
            const isBen = msg.sender === 'ben';
            const recEntities = (msg.recommendedEntityIds || [])
              .map((id) => entities.find((e) => e.id === id))
              .filter(Boolean) as LuzEntity[];

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isBen ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-surface ${
                    isBen
                      ? 'bg-white text-canopy-900 border border-sand-300'
                      : 'bg-canopy-800 text-sand-50'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>
                  <div
                    className={`text-[10px] mt-1.5 text-end tabular-nums ${
                      isBen ? 'text-canopy-500' : 'text-sand-300'
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>

                {/* Recommended Entities Cards inside Chat */}
                {recEntities.length > 0 && (
                  <div className="mt-2.5 grid sm:grid-cols-2 gap-2.5 w-full max-w-[88%]">
                    {recEntities.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelectEntity(item)}
                        className="p-3 rounded-xl bg-white border border-sand-300 hover:border-terracotta-500 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-terracotta-600">
                            {item.area} • {item.startTime || item.availableFrom || 'Slot'}
                          </div>
                          <div className="font-bold text-xs text-canopy-900 truncate">
                            {isHe ? item.titleHe : item.titleEn}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-sand-100 text-canopy-800">
                          {isHe ? 'שריון' : 'Book'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts Bar */}
        <div className="px-4 py-2 bg-sand-50 border-t border-sand-200 flex items-center gap-2 overflow-x-auto">
          {quickPrompts.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => processUserMessage(q)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white border border-sand-300 text-canopy-800 hover:border-terracotta-500 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            processUserMessage(input);
          }}
          className="p-3 bg-white border-t border-sand-300 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              dmMode === 'provider_dm'
                ? isHe
                  ? 'מצב ספק: כתבו פרטי אירוע או בית להשכרה ו"בן" יפרסם אותו בלוח...'
                  : 'Provider DM: Type event or rental details to publish directly...'
                : isHe
                ? 'כתבו ל"בן" בטקסט חופשי (למשל: "יש לי ילד בן 12 ואנחנו מחפשים מוזיקה בקולום")...'
                : 'Message "Ben" in free text (e.g., "Looking for youth activities in Colomb")...'
            }
            className="flex-1 rounded-xl border border-sand-300 bg-sand-50 px-4 py-2.5 text-sm text-canopy-900"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-terracotta-500 text-white font-semibold text-sm hover:bg-terracotta-600 transition-colors flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            <span>{isHe ? 'שלח' : 'Send'}</span>
          </button>
        </form>
      </div>

      {/* Right Column: Live User Profiling & Shai Zaluf Webhook API Spec */}
      <div className="lg:col-span-4 space-y-5">
        {/* Live User Profile Card */}
        <div className="bg-sand-50 rounded-2xl border border-sand-300 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl font-bold text-canopy-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-terracotta-500" />
              {isHe ? 'פרופיל משתמש חי (Profiling)' : 'Live User Profile'}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded bg-canopy-100 text-canopy-800 font-medium">
              Auto-Synced
            </span>
          </div>

          <p className="text-xs text-canopy-600">
            {isHe
              ? 'הבוט "בן" מעדכן את השדות האלו אוטומטית מתוך שיחה חופשית בוואטסאפ:'
              : 'Automatically updated by "Ben" as the resident chats in free text:'}
          </p>

          <div className="space-y-3 text-xs bg-white p-4 rounded-xl border border-sand-200">
            <div className="flex justify-between">
              <span className="text-canopy-600">{isHe ? 'שם תושב:' : 'Resident:'}</span>
              <span className="font-semibold text-canopy-900">{userProfile.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-canopy-600">{isHe ? 'אזור מועדף:' : 'Preferred Area:'}</span>
              <span className="font-semibold text-terracotta-600">
                {userProfile.preferredArea}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-canopy-600">{isHe ? 'גילאי ילדים:' : 'Kids Ages:'}</span>
              <span className="font-semibold text-canopy-900 tabular-nums">
                {userProfile.kidsAges.join(', ')}
              </span>
            </div>
            <div>
              <span className="text-canopy-600 block mb-1.5">
                {isHe ? 'תחומי עניין מסוננים:' : 'Tracked Interests:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {userProfile.interests.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md bg-canopy-100 text-canopy-800 font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Unofficial WhatsApp API & Lovable Webhook Spec for Shai Zaluf */}
        <div className="bg-canopy-900 text-sand-50 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2 text-ochre-400">
              <Code2 className="w-4 h-4" />
              {isHe
                ? 'ממשק API לספריית וואטסאפ (עבור שי זלוף)'
                : 'WhatsApp Webhook API Spec (For Shai Zaluf)'}
            </h3>
            <button
              type="button"
              onClick={() => setShowWebhookSpec(!showWebhookSpec)}
              className="text-xs underline text-sand-200 hover:text-white"
            >
              {showWebhookSpec ? (isHe ? 'הסתר' : 'Hide') : isHe ? 'הצג JSON' : 'Show JSON'}
            </button>
          </div>

          <p className="text-xs text-sand-200 leading-relaxed">
            {isHe
              ? 'מוכן לחיבור לספריית הוואטסאפ הלא-רשמית (Baileys / WPPConnect / Green-API) ול-API של Lovable/Supabase.'
              : 'Ready to connect with the unofficial WhatsApp library and Lovable/Supabase endpoints.'}
          </p>

          {showWebhookSpec && (
            <pre className="p-3 rounded-xl bg-canopy-950 text-[11px] font-mono text-ochre-400 overflow-x-auto leading-relaxed" dir="ltr">
{`POST /api/v1/whatsapp/webhook
{
  "from": "+972524780033@c.us",
  "senderName": "Naor",
  "messageType": "text",
  "text": "הופעה בגג של אילן ברביעי ב-20:00",
  "mode": "dm_ingestion | client_query"
}`}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
