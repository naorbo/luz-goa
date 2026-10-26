import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  UserCheck,
  Code2,
  Bot,
  Briefcase,
} from 'lucide-react';
import {
  LuzEntity,
  CommunityBusiness,
  UserProfile,
  ChatMessage,
  Language,
  AppEnvironment,
} from '../types/luz';
import { parseWhatsAppMessageToDraft } from '../utils/calendarAndParser';

interface BenBotViewProps {
  entities: LuzEntity[];
  businesses: CommunityBusiness[];
  userProfile: UserProfile;
  lang: Language;
  appEnv: AppEnvironment;
  onUpdateProfile: (profile: UserProfile) => void;
  onSelectEntity: (entity: LuzEntity) => void;
  onNavigateToBusinesses: () => void;
  onAddEntityFromDM: (entity: LuzEntity) => void;
}

export const BenBotView: React.FC<BenBotViewProps> = ({
  entities,
  businesses,
  userProfile,
  lang,
  appEnv,
  onUpdateProfile,
  onSelectEntity,
  onNavigateToBusinesses,
  onAddEntityFromDM,
}) => {
  const isHe = lang === 'he';
  const [dmMode, setDmMode] = useState<'client' | 'provider_dm'>('client');
  const [showWebhookSpec, setShowWebhookSpec] = useState(false);
  const [input, setInput] = useState('');

  const buildWelcomeMessage = (): ChatMessage => ({
    id: `m-welcome-${appEnv}-${lang}`,
    sender: 'ben',
    text: isHe
      ? appEnv === 'prod'
        ? 'אהלן! אני "בן", סוכן הקהילה של LUZ בגואה (סביבת PROD — נתוני אמת בלבד).\nאפשר לשאול אותי על אירועים, בעלי עסקים בקהילה (שיאצו, קוסמטיקאית, מקעקעת, מאמן איגרוף, מאמנת ספורט ועוד), בתים להשכרה, או להעלות אירוע אמיתי ב-DM!'
        : 'אהלן! אני "בן", סוכן הקהילה של LUZ בגואה (סביבת TEST / הדגמה).\nאפשר לשאול אותי מה קורה השבוע, לחפש בעלי עסקים בקהילה (שיאצו, קוסמטיקאית, מקעקעת, מאמן איגרוף, מאמנת ספורט), לעדכן העדפות משפחה בטקסט חופשי, או להעלות אירוע ב-DM!'
      : appEnv === 'prod'
      ? 'Hey! I am "Ben", the LUZ Goa Community Agent (PROD — Verified Data Only).\nAsk me about events, community businesses (Shiatsu, Cosmetician, Tattoo Artist, Boxing, Fitness), sublets, or DM me to publish a real listing!'
      : 'Hey! I am "Ben", the LUZ Goa Community Agent (TEST Sandbox).\nAsk me what is happening this week, search community businesses (Shiatsu, Cosmetician, Tattoo, Boxing, Fitness), update your profile, or DM me as a provider!',
    timestamp: '10:00',
    recommendedEntityIds: entities.slice(0, 2).map((e) => e.id),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildWelcomeMessage()]);

  useEffect(() => {
    setMessages([buildWelcomeMessage()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appEnv, lang]);

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
        hostName: userProfile.name || (isHe ? 'חבר קהילה' : 'Community Member'),
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

    // 2. Scope Guard (Non-Event General Group Q&A is Phase 2 per MVP spec)
    if (/חיתולים|סופרמרקט|מוסך|ויזה הודית|diapers|supermarket|grocery/i.test(lower)) {
      const reply: ChatMessage = {
        id: `b-${Date.now() + 1}`,
        sender: 'ben',
        text: isHe
          ? 'בגרסת ה-MVP אני ממוקד באירועים, מפגשי מרכז הנוער, בעלי עסקים בקהילה והשכרת בתים.\n(מענה על מידע כללי מהיסטוריית הקבוצות ייכנס בשלב הבא). תרצה לראות את בעלי העסקים או האירועים הקרובים?'
          : 'In the current MVP, I focus exclusively on community events, Youth Center sessions, community businesses, and home rentals. Would you like to browse local businesses or upcoming events?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, userMsg, reply]);
      setInput('');
      return;
    }

    // 3. Querying Community Businesses by Category / Specialty!
    if (
      /שיאצו|עיסוי|דיקור|מטפל|קוסמטיק|פנים|טיפוח|מקעקע|קעקוע|איגרוף|מאמן|מאמנת|ספורט|כושר|פילאטיס|חלות|מחמצת|אפייה|בעלי עסקים|עסקים|עסק|shiatsu|massage|cosmetic|facial|tattoo|boxing|fitness|trainer|bakery|challah|business/i.test(
        lower
      )
    ) {
      const matchedBiz = businesses.filter((b) => {
        if (/שיאצו|עיסוי|דיקור|מטפל|shiatsu|massage/i.test(lower))
          return b.category === 'body_therapy';
        if (/קוסמטיק|פנים|טיפוח|cosmetic|facial/i.test(lower))
          return b.category === 'beauty_cosmetics';
        if (/מקעקע|קעקוע|tattoo/i.test(lower)) return b.category === 'tattoo_art';
        if (/איגרוף|מאמן|מאמנת|ספורט|כושר|פילאטיס|boxing|fitness|trainer/i.test(lower))
          return b.category === 'fitness_martial';
        if (/חלות|מחמצת|אפייה|bakery|challah/i.test(lower)) return b.category === 'food_culinary';
        return true;
      });

      const finalBiz = matchedBiz.length > 0 ? matchedBiz : businesses;

      const reply: ChatMessage = {
        id: `b-${Date.now() + 1}`,
        sender: 'ben',
        text:
          finalBiz.length === 0
            ? isHe
              ? 'בסביבת ה-PROD טרם הוזנו בעלי עסקים מאומתים (אפס מידע פיקטיבי). אפשר לעבור לסביבת TEST בראש המסך כדי לראות הדגמה מלאה של שיאצו, קוסמטיקאית, מקעקעת, מאמן איגרוף ומאמנת ספורט!'
              : 'No verified businesses have been added to PROD yet. Switch to TEST in the top bar to preview demo listings for Shiatsu, Cosmetician, Tattoo, Boxing, and Fitness!'
            : isHe
            ? `מצאתי ${finalBiz.length} בעלי עסקים מתאימים בקהילה שלנו בגואה! לחצו על כרטיס כדי לצפות במחירון המלא ולקבוע תור:`
            : `Found ${finalBiz.length} matching community businesses in Goa! Tap a card to view prices and book a slot:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedBusinessIds: finalBiz.map((b) => b.id),
      };

      setMessages((prev) => [...prev, userMsg, reply]);
      setInput('');
      return;
    }

    // 4. Free-Text Profiling Detection
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
          ? `עדכנתי את הפרופיל שלך:\n• אזור מועדף: ${updated.preferredArea}\n• גילאי ילדים: ${updated.kidsAges.join(', ') || 'לא צוין'}\n• תחומי עניין: ${updated.interests.join(', ') || 'כללי'}`
          : `Updated your family profile:\n• Preferred Area: ${updated.preferredArea}\n• Kids Ages: ${updated.kidsAges.join(', ') || 'N/A'}\n• Interests: ${updated.interests.join(', ') || 'General'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        profileUpdated: true,
        recommendedEntityIds: matched,
      };
      setMessages((prev) => [...prev, userMsg, reply]);
      setInput('');
      return;
    }

    // 5. Querying Houses / Rentals
    if (/בית|בתים|וילה|להשכרה|סאבלט|rent|villa|house/i.test(lower)) {
      const rentals = entities.filter((e) => e.type === 'rental').map((e) => e.id);
      const reply: ChatMessage = {
        id: `b-${Date.now() + 1}`,
        sender: 'ben',
        text:
          rentals.length === 0
            ? isHe
              ? 'כרגע אין בתים רשומים בסביבת ה-PROD. ניתן לעבור לסביבת TEST להדגמת שריון בתים לפי תאריכים.'
              : 'No verified homes listed in PROD yet. Switch to TEST to try date-range home booking.'
            : isHe
            ? `מצאתי ${rentals.length} בתים מאומתים להשכרה בקהילה (עם סיבים אופטיים וגיבוי חשמל). לחצו לבדיקת תאריכים:`
            : `I found ${rentals.length} verified community homes available for sublet. Tap to check dates:`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        recommendedEntityIds: rentals,
      };
      setMessages((prev) => [...prev, userMsg, reply]);
      setInput('');
      return;
    }

    // 6. Querying Hourly Community Spaces / Studio / Doctor
    if (/שעתי|אולפן|יוגה|רופא|עבודה|תור|studio|yoga|doctor|hourly|space/i.test(lower)) {
      const services = entities.filter((e) => e.type === 'service').map((e) => e.id);
      const reply: ChatMessage = {
        id: `b-${Date.now() + 1}`,
        sender: 'ben',
        text:
          services.length === 0
            ? isHe
              ? 'אין כרגע משאבים שעתיים רשומים ב-PROD.'
              : 'No hourly community spaces listed in PROD yet.'
            : isHe
            ? 'אלו המשאבים והשירותים השעתיים הפנויים השבוע:'
            : 'Here are the hourly community spaces and services with open slots this week:',
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
      text:
        topEvents.length === 0
          ? isHe
            ? 'סביבת PROD נקייה כרגע מנתוני דמו וממתינה לאירועי אמת. ניתן להעלות אירוע ראשון או לעבור לסביבת TEST בראש המסך כדי להתנסות בכל היכולות!'
            : 'PROD is currently clean and ready for real data. Publish a real event or switch to TEST in the header to explore demo data!'
          : isHe
          ? 'הנה האירועים הקרובים ופעילויות מרכז הנוער בקולום (ב׳–ה׳) שמחכים לכם השבוע:'
          : 'Here are the upcoming community events and Youth Center sessions this week:',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recommendedEntityIds: topEvents,
    };
    setMessages((prev) => [...prev, userMsg, reply]);
    setInput('');
  };

  const quickPrompts = isHe
    ? [
        'מי עושה שיאצו, קוסמטיקה או קעקועים בקהילה?',
        'יש מאמן איגרוף או מאמנת ספורט בקולום/פטנם?',
        'מה יש השבוע לנוער במתנ"ס בקולום?',
        'אילו בתים עם סיבים אופטיים פנויים להשכרה?',
      ]
    : [
        'Who offers Shiatsu, Cosmetics, or Tattoos in the community?',
        'Is there a Boxing Coach or Fitness Trainer in Goa?',
        'What is happening at the Youth Center in Colomb?',
        'Which homes with Fiber Wi-Fi are available to rent?',
      ];

  return (
    <div className="grid lg:grid-cols-12 gap-6 animate-reveal">
      {/* Left Column: WhatsApp Simulator with "Ben" */}
      <div className="lg:col-span-8 flex flex-col bg-sand-50 rounded-2xl border border-sand-300 overflow-hidden h-[680px]">
        {/* WhatsApp-Style Header */}
        <div className="bg-canopy-900 text-sand-50 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-terracotta-500 flex items-center justify-center text-white font-bold">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm md:text-base">
                  {isHe ? 'הבוט "בן" — סוכן LUZ בוואטסאפ' : '"Ben" — LUZ WhatsApp Agent'}
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-canopy-800 text-ochre-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {appEnv === 'prod' ? 'PROD' : 'TEST'}
                </span>
              </div>
              <p className="text-xs text-sand-300">
                {isHe
                  ? 'חיפוש בעלי עסקים • המלצות אירועים • פרופילינג בטקסט חופשי • קליטת DM'
                  : 'Business directory search • Smart events • Free-text profiling • DM ingestion'}
              </p>
            </div>
          </div>

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
            const recBusinesses = (msg.recommendedBusinessIds || [])
              .map((id) => businesses.find((b) => b.id === id))
              .filter(Boolean) as CommunityBusiness[];

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isBen ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
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

                {/* Recommended Community Businesses inside Chat */}
                {recBusinesses.length > 0 && (
                  <div className="mt-2.5 grid sm:grid-cols-2 gap-2.5 w-full max-w-[88%]">
                    {recBusinesses.map((biz) => (
                      <div
                        key={biz.id}
                        onClick={onNavigateToBusinesses}
                        className="p-3 rounded-xl bg-white border border-sand-300 hover:border-terracotta-500 cursor-pointer transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-ochre-600 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            <span>{isHe ? biz.specialtyHe : biz.specialtyEn}</span>
                          </div>
                          <div className="font-bold text-xs text-canopy-900 truncate">
                            {isHe ? biz.businessNameHe : biz.businessNameEn}
                          </div>
                          <div className="text-[11px] text-canopy-600">
                            {isHe ? biz.ownerNameHe : biz.ownerNameEn} • {biz.area}
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg bg-terracotta-500 text-white">
                          {isHe ? 'לתור' : 'Book'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommended Entities Cards inside Chat */}
                {recEntities.length > 0 && (
                  <div className="mt-2.5 grid sm:grid-cols-2 gap-2.5 w-full max-w-[88%]">
                    {recEntities.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => onSelectEntity(item)}
                        className="p-3 rounded-xl bg-white border border-sand-300 hover:border-terracotta-500 cursor-pointer transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-terracotta-600 tabular-nums">
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
                ? 'כתבו ל"בן" (למשל: "מחפש שיאצו או מאמן איגרוף בקולום")...'
                : 'Message "Ben" (e.g., "Looking for Shiatsu or a Boxing coach in Colomb")...'
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

      {/* Right Column: Live User Profiling & Webhook API Spec */}
      <div className="lg:col-span-4 space-y-5">
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
              <span className="font-semibold text-canopy-900">
                {userProfile.name || (isHe ? 'אורח/ת בקהילה' : 'Community Guest')}
              </span>
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
                {userProfile.kidsAges.length > 0 ? userProfile.kidsAges.join(', ') : '—'}
              </span>
            </div>
            <div>
              <span className="text-canopy-600 block mb-1.5">
                {isHe ? 'תחומי עניין מסוננים:' : 'Tracked Interests:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {userProfile.interests.length === 0 ? (
                  <span className="text-canopy-500">{isHe ? 'טרם הוגדרו' : 'None yet'}</span>
                ) : (
                  userProfile.interests.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-canopy-100 text-canopy-800 font-medium"
                    >
                      {tag}
                    </span>
                  ))
                )}
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
  "env": "${appEnv}",
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
