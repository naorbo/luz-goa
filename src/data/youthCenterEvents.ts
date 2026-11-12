import { LuzEntity } from '../types/luz';

export const CORE_YOUTH_CENTER_EVENTS: LuzEntity[] = [
  // 1. Friday 06/11/2026 - פתיחה חגיגית — Goa Teens House | משחק הכדור עם אילן
  {
    id: 'yc-2026-11-06-odt-opening',
    type: 'workshop',
    titleHe: 'פתיחה חגיגית — Goa Teens House | משחק הכדור עם אילן',
    titleEn: 'Grand Opening — Goa Teens House | The Ball Game with Ilan',
    descriptionHe: `היי לכולם! 🌿

בעקבות הסקרים ומפגש ההיכרות, התוכנית של מרכז הנוער (Goa Teens House) גובשה סביב הפעילויות שהנוער בחר:
🏓 פינג פונג | 🎲 משחקי קופסה | 🎬 ערבי סרטים
המרחב יהיה פתוח גם למפגש חופשי (Hangouts) — מקום לנוער לבלות יחד, להירגע וליזום תוכניות משלהם.

כדי לשמור על עלויות נמוכות, נתחיל בתקופת ניסיון ללא מדריך בתשלום, בהישענות על מעורבות הורים משותפת: תורנויות בשעות הפתיחה, סיוע במרחב והובלת פעילויות מדי פעם (בסביבות משמרת אחת להורה בכל חודש עד שישה שבועות).

🎉 פתיחה חגיגית — יום שישי, 6 בנובמבר בשעה 10:00 בבוקר!
הנוער מוזמן לפתוח את הפעילות במפגש היכרות וגיבוש:
• משחק הכדור עם אילן (The Ball Game) — חוויה קבוצתית כיפית של תנועה, חיבור והמון צחוק!
• בוחרים יחד שם למרחב! (Let's Choose a Name!)
• פירות מרעננים ולימונדה צוננת (Fruits & Ice-cold Lemonade)

💰 עלויות חודשיות (תקופת ניסיון):
₹2,500 לילד | ₹3,500 למשפחה (2 ילדים ומעלה).
* תשלום במזומן בלבד עבור החודש הראשון.`,
    descriptionEn: `Hi everyone! 🌿

Following the surveys and our introductory meeting, the plan for Goa Teens House has been simplified around the activities the teens chose:
🏓 Ping pong | 🎲 Board games | 🎬 Movie nights
The space will also be open for free hangouts — a place for the teens to spend time together and make their own plans.

To keep costs low, we’ll start with a trial period without a paid instructor, relying on shared parent involvement: opening-hour shifts, helping with the space, and occasionally leading activities. This is expected to mean around one shift per parent every month to six weeks.

🎉 Grand Opening — Friday, November 6 at 10:00 AM!
The teens are invited to kick things off with their first get-together — a morning of games, fun, and getting to know each other:
• The Ball Game with Ilan — a playful group experience of movement, connection, and lots of laughter!
• Let's Choose a Name for our space!
• Fresh fruits & ice-cold lemonade

💰 Monthly Membership (Trial Period):
₹2,500 per child | ₹3,500 per family (2 children or more).
* Cash payment only (for the first month).`,
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'אילן & הורי Goa Teens House',
    hostNameEn: 'Ilan & Goa Teens House Parents',
    hostPhone: '+972-52-478-0033',
    priceAmount: 2500,
    priceCurrency: 'INR',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl: '/images/events/goa-teens-opening-nov6.jpg',
    tags: ['פתיחה חגיגית', 'The Ball Game', 'אילן', 'Goa Teens House', 'פינג פונג', 'משחקי קופסה'],
    rsvpCount: 0,
    date: '2026-11-06',
    dayOfWeek: 5, // Friday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '10:00',
    endTime: '13:00',
  },
  // 2. Saturday 07/11/2026 - הקרנת סרט
  {
    id: 'yc-2026-11-07-movie',
    type: 'workshop',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe:
      'ערב סרט קהילתי על מסך ענק עם פופקורן, שתייה ואווירה כיפית לנוער במתחם הבמבוק בקולום.',
    descriptionEn:
      'Big-screen movie screening night with popcorn, cold drinks, and cozy youth hangout atmosphere.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
    tags: ['הקרנת סרט', 'קולנוע', 'פופקורן', 'שבת'],
    rsvpCount: 0,
    date: '2026-11-07',
    dayOfWeek: 6, // Saturday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '18:00',
    endTime: '20:30',
  },
  // 3. Sunday 08/11/2026 - מרחב פתוח
  {
    id: 'yc-2026-11-08-open-space',
    type: 'workshop',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Hangout',
    descriptionHe:
      'זמן חופשי לבני נוער להיפגש, לבלות, לשחק, להאזין למוזיקה וליצור יחד במרחב הבמבוק הפתוח.',
    descriptionEn:
      'Open youth space to connect, relax, play games, listen to music, and spend time together in Colomb.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
    tags: ['מרחב פתוח', 'מפגש', 'חברים', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-08',
    dayOfWeek: 0, // Sunday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:30',
  },
  // 4. Monday 09/11/2026 - פעילות ג'אם
  {
    id: 'yc-2026-11-09-jam',
    type: 'workshop',
    titleHe: 'פעילות ג\'אם',
    titleEn: 'Sunset Music Jam Session',
    descriptionHe:
      'ג\'אם מוזיקלי פתוח לנוער: גיטרות, כלי הקשה, שירה ואלתור משותף לקראת השקיעה.',
    descriptionEn:
      'Open sunset music jam: guitars, drums, percussion, vocals, and spontaneous live improvisation.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000',
    tags: ['ג\'אם', 'מוזיקה', 'שירה', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-09',
    dayOfWeek: 1, // Monday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '17:00',
    endTime: '19:30',
  },
  // 5. Thursday 12/11/2026 - משחקי קופסה
  {
    id: 'yc-2026-11-12-board-games',
    type: 'workshop',
    titleHe: 'משחקי קופסה',
    titleEn: 'Strategy Board Games & Tournaments',
    descriptionHe:
      'אחר צהריים של משחקי אסטרטגיה, קטאן, שחמט, משחקי שולחן וטורנירים מהנים. מוזמנים להביא משחקים מהבית!',
    descriptionEn:
      'Afternoon of board games, Catan, chess, strategy tabletop games, and friendly team competitions. Feel free to bring board games from home!',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=1000',
    tags: ['משחקי קופסה', 'שחמט', 'קטאן', 'אסטרטגיה'],
    rsvpCount: 0,
    date: '2026-11-12',
    dayOfWeek: 4, // Thursday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '17:00',
    endTime: '18:30',
  },
  // 6. Saturday 14/11/2026 - הקרנת סרט
  {
    id: 'yc-2026-11-14-movie',
    type: 'workshop',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe:
      'הקרנת סרט מרתק על מסך גדול עם פופקורן ושיחה משותפת אחרי הסרט.',
    descriptionEn:
      'Feature youth film screening on big screen with fresh popcorn and post-film discussion.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
    tags: ['הקרנת סרט', 'קולנוע', 'פופקורן', 'שבת'],
    rsvpCount: 0,
    date: '2026-11-14',
    dayOfWeek: 6, // Saturday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '18:00',
    endTime: '20:30',
  },
  // 7. Sunday 15/11/2026 - מרחב פתוח
  {
    id: 'yc-2026-11-15-open-space',
    type: 'workshop',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Hangout',
    descriptionHe:
      'מרחב פתוח וחופשי לנוער: מפגש חברים, עבודה על פרויקטים אישיים, משחקים ושיח.',
    descriptionEn:
      'Open community space for teens: social time, personal projects, board games, and chill vibe.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
    tags: ['מרחב פתוח', 'מפגש', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-15',
    dayOfWeek: 0, // Sunday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:30',
  },
  // 8. Monday 16/11/2026 - הרצאת אורח
  {
    id: 'yc-2026-11-16-guest-talk',
    type: 'workshop',
    titleHe: 'הרצאת אורח',
    titleEn: 'Guest Speaker & Inspiring Stories',
    descriptionHe:
      'הרצאת אורח מעוררת השראה ומפגש בגובה העיניים עם אורח מיוחד מהקהילה על מסעות חיים, יצירה ומדע.',
    descriptionEn:
      'Inspiring guest speaker session and friendly youth discussion on life journeys and creative exploration.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000',
    tags: ['הרצאת אורח', 'השראה', 'שיח', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-16',
    dayOfWeek: 1, // Monday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '17:00',
    endTime: '18:45',
  },
  // 9. Thursday 19/11/2026 - סדנת אומנות
  {
    id: 'yc-2026-11-19-art',
    type: 'workshop',
    titleHe: 'סדנת אומנות',
    titleEn: 'Youth Art & Creative Studio',
    descriptionHe:
      'סדנת אומנות ויצירה מעשית: ציור, חומרים טבעיים ויצירה מקורית בהנחיית יוצרים מהקהילה.',
    descriptionEn:
      'Hands-on creative art studio: painting, sculpture with natural materials, and self-expression.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=1000',
    tags: ['אומנות', 'יצירה', 'סדנה', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-19',
    dayOfWeek: 4, // Thursday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:00',
  },
  // 10. Saturday 21/11/2026 - הקרנת סרט
  {
    id: 'yc-2026-11-21-movie',
    type: 'workshop',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe:
      'ערב סרט קולנוע ופופקורן לנוער במתחם הבמבוק בקולום.',
    descriptionEn:
      'Cinema movie night and popcorn for youth in the bamboo pavilion.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
    tags: ['הקרנת סרט', 'קולנוע', 'פופקורן', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-21',
    dayOfWeek: 6, // Saturday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '18:00',
    endTime: '20:30',
  },
  // 11. Sunday 22/11/2026 - מרחב פתוח
  {
    id: 'yc-2026-11-22-open-space',
    type: 'workshop',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Hangout',
    descriptionHe:
      'מרחב פתוח למפגש, שיחה חופשית, משחקי שולחן ומוזיקה.',
    descriptionEn:
      'Open space for hanging out, open conversations, board games, and relaxing with friends.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
    tags: ['מרחב פתוח', 'מפגש', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-22',
    dayOfWeek: 0, // Sunday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:30',
  },
  // 12. Monday 23/11/2026 - פעילות ג'אם
  {
    id: 'yc-2026-11-23-jam',
    type: 'workshop',
    titleHe: 'פעילות ג\'אם',
    titleEn: 'Acoustic Jam Session',
    descriptionHe:
      'פעילות ג\'אם מוזיקלי פתוח: הביאו כלי נגינה או בואו להקשיב ולהשתתף בשירה ואלתור.',
    descriptionEn:
      'Open youth music jam: bring instruments or join in with vocals, rhythm, and acoustic melodies.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000',
    tags: ['ג\'אם', 'מוזיקה', 'שירה', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-23',
    dayOfWeek: 1, // Monday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '17:00',
    endTime: '19:30',
  },
  // 13. Thursday 26/11/2026 - משחקי קופסה
  {
    id: 'yc-2026-11-26-board-games',
    type: 'workshop',
    titleHe: 'משחקי קופסה',
    titleEn: 'Strategy Board Games & Challenges',
    descriptionHe:
      'מפגש משחקי קופסה ואסטרטגיה: שחמט, קטאן, משחקי קלפים וטורניר קבוצתי מהנה.',
    descriptionEn:
      'Strategy board games, chess, Catan, card games, and fun team challenges.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&q=80&w=1000',
    tags: ['משחקי קופסה', 'שחמט', 'אסטרטגיה', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-26',
    dayOfWeek: 4, // Thursday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:00',
  },
  // 14. Saturday 28/11/2026 - הקרנת סרט
  {
    id: 'yc-2026-11-28-movie',
    type: 'workshop',
    titleHe: 'הקרנת סרט',
    titleEn: 'Youth Movie Night Screening',
    descriptionHe:
      'הקרנת סרט סוף שבוע על מסך ענק עם כיבוד ופופקורן חם.',
    descriptionEn:
      'Weekend big screen movie night with warm popcorn and cinema treats.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1000',
    tags: ['הקרנת סרט', 'קולנוע', 'פופקורן', 'סוף שבוע'],
    rsvpCount: 0,
    date: '2026-11-28',
    dayOfWeek: 6, // Saturday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '18:00',
    endTime: '20:30',
  },
  // 15. Sunday 29/11/2026 - מרחב פתוח
  {
    id: 'yc-2026-11-29-open-space',
    type: 'workshop',
    titleHe: 'מרחב פתוח',
    titleEn: 'Open Youth Space & Chill',
    descriptionHe:
      'מרחב פתוח לנוער: זמן חופשי, פינת יצירה, מוזיקה ומפגש חברים.',
    descriptionEn:
      'Open youth space: free time, creative corner, music, and socializing.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
    tags: ['מרחב פתוח', 'מפגש', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-29',
    dayOfWeek: 0, // Sunday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '16:30',
    endTime: '19:30',
  },
  // 16. Monday 30/11/2026 - הרצאת אורח
  {
    id: 'yc-2026-11-30-guest-talk',
    type: 'workshop',
    titleHe: 'הרצאת אורח',
    titleEn: 'Guest Speaker & Youth Dialogue',
    descriptionHe:
      'הרצאת אורח מרתקת בנושאי מדע, יצירתיות וסיפורי חיים מעוררי השראה.',
    descriptionEn:
      'Fascinating guest speaker session touching upon science, creativity, and inspiring life stories.',
    area: 'Colomb',
    locationDetailsHe: 'מרכז הנוער קולום (ליד שייליש)',
    locationDetailsEn: 'Colomb Youth Center (near Shailish)',
    hostName: 'צוות מרכז הנוער גואה',
    hostNameEn: 'Youth Center Goa Team',
    hostPhone: '+972-52-478-0033',
    priceAmount: 0,
    priceCurrency: 'FREE',
    audience: 'youth_11_15',
    ingestionSource: 'web',
    imageUrl:
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=1000',
    tags: ['הרצאת אורח', 'השראה', 'שיח', 'נוער'],
    rsvpCount: 0,
    date: '2026-11-30',
    dayOfWeek: 1, // Monday
    weekCycle: 'all',
    isYouthCenter: true,
    startTime: '17:00',
    endTime: '18:45',
  },
];
