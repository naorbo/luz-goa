# LUZ Goa — יומן משימות חי (`TASKS.md`)

> קובץ זה מתעדכן אוטומטית בסיום כל משימה.

---

## כללים קשיחים ומחייבים (Hard Constraints)
1. **איסור שליחת הודעות וואטסאפ לקבוצות חיצוניות:** לעולם לא לשלוח הודעות לאף קבוצה מלבד `Youth center parents` (`120363430775078450@g.us`) ללא אישור מפורש מהמשתמש. הסקרייפר הוא Read-Only מוחלט.
2. **הפרדת קבוצת מרכז הנוער מסקרייפינג:** קבוצת `Youth center parents` (`120363430775078450@g.us`) נמצאת ב-`EXCLUDED_GROUPS` של הסקרייפר ולעולם לא נסרקת למאגר הציבורי.
3. **מנעול שעות שקטות (Quiet Hours Lock):** אין לשלוח הודעות וואטסאפ בין השעות `22:00–08:00` שעון הודו (`Asia/Kolkata`).
4. **מצב בקרת תוכן (`moderation_queue`):** כל פריט שנקלט מהקבוצות נשמר כ-`status: "pending"` ב-`/envs/prod/moderation_queue` וב-CRM (`luzschedu@gmail.com`) ואינו מתפרסם אוטומטית לאתר ללא אישור.
5. **כתובת האתר הקנונית:** תמיד `https://my-luz-dc028.web.app/` (לעולם לא `github.io`).
6. **עלות $0:** כל האוטומציות רצות ב-GitHub Actions או מקומית, ללא שרתים בתשלום.
7. **בידוד סביבות ו-Sessions:** שימוש אך ורק בחשבון הוואטסאפ הייעודי של LUZ (`.wa-luz-session` / `LUZ_WA_SESSION_GZ_B64`), בנפרד מ-PodKids.

---

## משימות שהושלמו לאחרונה (Completed)
- [x] **2026-11-13 | שדרוג ה-Daemon לענן (24/7 גם כשהמחשב סגור), שרת HTTP ו-Dockerfile (`Dockerfile`, `render.yaml`, `scripts/luz-community-daemon.cjs`):**
  - הטמעת שרת HTTP מובנה (`GET /health`, `GET /summary`, `GET /summary.json`) המציג סיכום יומי חי בדפדפן ומאפשר שמירת השרת ער ב-Free Tier.
  - תמיכה מלאה בטעינת סשן וואטסאפ מתוך משתנה סביבה (`LUZ_WA_SESSION_GZ_B64`) ללא תלות בקבצים מקומיים.
  - יצירת `Dockerfile` מותאם ל-Docker / Render / Fly / VPS וקובץ `render.yaml` לפריסה מיידית ב-1 קליק בעלות $0.
  - סקריפט אריזה ייעודי `scripts/pack-session.cjs` שמפיק את מחרוזת ה-Base64 של הסשן (`.wa-luz-session.b64`).
- [x] **2026-11-13 | הקמת Daemon מאזין 24/7 לקהילות דרום גואה וסקריפט סיכום יומי (`scripts/luz-community-daemon.cjs`, `scripts/luz-community-summary.cjs`):**
  - תהליך רקע (Daemon) מאזין קבוע ל-6 קבוצות קהילה (כולל 'הקהילה! חיים בדרום גואה❤', SGC1, House Hunt Canacona, Parents with Children).
  - שמירה מקומית אטומית ב-SQLite (`data/community_messages.sqlite`) ו-JSONL יומי לפי קטגוריות (דיור, טרמפים/משלוחים, אירועים, ילדים, מרקטפלייס, שיח כללי).
  - סקריפט סיכום יומי מובנה (`node scripts/luz-community-summary.cjs`) בפורמט Markdown בעברית.
  - הקפדה מחמירה על Guardrails: 100% Read-Only, ללא שליחת הודעות, ובידוד מוחלט של מרכז הנוער.
- [x] **2026-11-13 | חיבור 3 קבוצות וואטסאפ חדשות לסקרייפר של LUZ (`cd9d21d`):**
  - `(SGC1) South Goa Community Collective` (`120363429760018768@g.us`) -> אירועים וסדנאות
  - `Parents with Children in South Goa Group` (`120363182876398895@g.us`) -> פעילויות ילדים ומשפחה
  - `House Hunt Canacona 🏘🏘🛖🪴` (`120363040585010698@g.us`) -> דירות והשכרות (`rental`)
  - נבדק מקומית וב-GitHub Actions (Run `43369151934` — SUCCESS).
- [x] **2026-11-13 | תיקון הודעת הלילה (03:00 IST) ומנעול שעות שקטות (`5dfa17b`):**
  - הוטמע מנעול שעות שקטות (`22:00–08:00 IST`) וחלונות זמן ייעודיים בבוקר (`08:00–13:00`) ובערב (`18:00–22:00`) בסקריפטי התזכורות, והוסר טריגר ערב כפול מ-Workflow הבוקר.
- [x] **2026-11-10..12 | אוטומציית תזכורת מתנדבים יומית למרכז הנוער:**
  - בדיקת 3–4 אירועים קרובים ללא מתנדבים ושליחת תזכורת ערב בקבוצת `Youth center parents` עם קישור ישיר לרישום באתר.
- [x] **2026-11-13 | הגדרת כללי סשן אוטומטיים (`GEMINI.md`):**
  - הפעלה אוטומטית של סוכני הצמיחה בכל תחילת סשן ועדכון אוטומטי של `brain/TASKS.md` ו-`brain/memory/MEMORY.md` בכל סיום משימה.
- [x] **2026-11-13 | שדרוג SEO ותשתית אורגנית (`seoAndSchema.ts`, `public/sitemap.xml`, `index.html`):**
  - סנכרון דינמי של `<link rel="canonical">` ו-`og:url` במעבר בין טאבים + סכמת `FAQPage` דו-לשונית.
  - הוספת `?tab=beit_bina`, תגי `hreflang`, ורענון תאריכי `lastmod` ב-`public/sitemap.xml`.
  - חיזוק מילות מפתח בעברית ב-`index.html` ובניית `docs/` בהצלחה (`tsc` + `vite build`).
- [x] **2026-11-13 | פריסה חיה ל-Firebase Hosting (`https://my-luz-dc028.web.app`):**
  - הועלו 10 קבצים מתוך `docs/` ושוחררה גרסת Production חדשה (`Deploy complete`).
- [x] **2026-11-13 | תיקון סנכרון ותצוגת הורים מתנדבים במרכז הנוער (`firestore.rules`, `YouthCenterView.tsx`, `youthCenterEvents.ts`):**
  - הוסרה דריסת `volunteers` מקומית על ידי `eventOverrides` ריקים ב-`YouthCenterView.tsx`.
  - נפתחה הרשאה מאובטחת ב-`firestore.rules` להורים לעדכן `volunteers` באירועי מרכז הנוער ונפרסה ל-Firebase.
  - הוטמעו השיבוצים של Sivan Ben Namer (`12.11`) ו-Smadar Hersckovitz (`19.11`) גם ב-`youthCenterEvents.ts` (ונבדק שהם קיימים ב-Firestore).
- [x] **2026-11-14 | הסרת רשומת בדיקה (`Smadar Hersckovitz`) מאירוע 19.11 (`a7abbac`):**
  - הוסרה מ-Firestore (`yc-2026-11-19-art`) ומ-`youthCenterEvents.ts`, נבנתה מחדש ונפרסה ל-Firebase Hosting ול-GitHub.

---

## משימות פתוחות ומעקב שוטף (Backlog / Active)
- [ ] **אישור וסינון פריטים ב-`moderation_queue`:** סקירה שוטפת דרך פאנל האדמין (`luzschedu@gmail.com`) של מודעות הדירות (`House Hunt Canacona`), סדנאות הילדים ואירועי הקהילה והעברתם ל-`approved`.
- [ ] **הגדלת היצע הספקים המאומתים ב-`businesses` (יעד 50 ספקים):** כרגע יש 32 עסקים ב-`prodData.ts` (22 בפטנם, 10 בפאלולם, **0 באגונדה**). יש להשלים 18 ספקים נוספים בדגש על אגונדה ודיור/וילות (יישום מודל "פרופיל מתנה" 1-על-1 + קוד `#LUZ-XXXX`).
