# LUZ Goa — Shared Agent Memory Index (`MEMORY.md`)

> קובץ זה מרכז את הזיכרון הארגוני החי של סוכני **LUZ Goa**. כל סוכן קורא אותו בתחילת הרצה ומעדכן אותו בסיום משימה כשמתקבלות החלטות מוצר, שיווק, תוכן או אבטחה חדשות.

---

## מצב המערכת הנוכחי (Launch State — Production Ready)
- **סטטוס השקה:** **LIVE ב-Production (`prod`)** תחת פרויקט Firebase `my-luz-dc028` (`my-Luz`).
- **כתובת האתר הקנונית:** `https://my-luz-dc028.web.app/` (לעולם לא `github.io`).
- **עלות תפעול:** **$0** — כל הסקריפטים והאוטומציות רצים ב-GitHub Actions או מקומית ללא שרתים בתשלום.
- **נעילת סביבות ואדמין:**
  - משתמשים רגילים רואים אך ורק את סביבת `prod` (ללא גישה ל-`test`, ללא כפתור `Switch to TEST`, וללא טאב `Admin & Leads`).
  - כניסת אדמין מתבצעת אך ורק דרך כפתור המנעול הדיסקרטי בפוטר או `?admin=1` באמצעות **Firebase Google Auth** המוגבל קשיחה ב-Frontend וב-Firestore Security Rules לחשבון `luzschedu@gmail.com`.
- **ציון Hallmark Design Audit:** `0 FAIL, 0 REFLEX` (Together AI `sloplint.mjs --genre editorial --scope app`).

---

## כללי וואטסאפ ואוטומציה מחייבים (Strict Guardrails)
1. **איסור שליחת הודעות לקבוצות חיצוניות:** לעולם אין לשלוח הודעות ללא אישור מפורש מהמשתמש לאף קבוצה שאינה `Youth center parents` (`120363430775078450@g.us`).
2. **בידוד מרכז הנוער מהסקרייפר:** קבוצת `Youth center parents` (`120363430775078450@g.us`) חסומה ב-`EXCLUDED_GROUPS` של `scripts/luz-community-scraper.cjs` ואינה נסרקת לאתר הציבורי.
3. **מנעול שעות שקטות (`22:00–08:00 IST`):** כל סקריפט שולח הודעות בודק את השעה בהודו (`Asia/Kolkata`) ועוצר מיד בשעות הלילה או מחוץ לחלון הזמן המיועד.
4. **תור בקרה (`moderation_queue`):** הסקרייפר (`scripts/luz-community-scraper.cjs`) פועל כ-**Read-Only** על 5 קבוצות קהילה (כולל `SGC1`, `Parents with Children`, `House Hunt Canacona`) ושומר פריטים ב-`/envs/prod/moderation_queue` עם `status: "pending"` (ללא פרסום אוטומטי ישיר לאתר) + Webhook ל-CRM ב-`luzschedu@gmail.com`.
5. **בידוד חשבון LUZ:** אוטומציות LUZ משתמשות ב-Session הייעודי `.wa-luz-session` / `LUZ_WA_SESSION_GZ_B64` (טלפון `84899274378`), ללא ערבוב עם PodKids.

---

## יעדי צמיחה וקידום מרכזיים (Growth & Promotion Priorities)
1. **גיוס 50 ספקים ועסקים מאומתים בדרום גואה (`businesses`):**
   - מיקוד ראשוני: פאלולם (Palolem), פטנם (Patnem), אגונדה (Agonda).
   - קטגוריות בעדיפות גבוהה: Wellness & Yoga, Villas & Stays, Local Kitchens & Cafes, Taxis & Scooters, Family & Kids Activities.
2. **לוח אירועים ונדל"ן יומי חי (`events`, `rentals`):**
   - קליטה רציפה מהסקרייפר מ-5 הקבוצות הקהילתיות אל `moderation_queue`, סינון ואישור על ידי **אליאנה (Eliana)** והעברה ל-`prod`.
3. **ויראליות מבוססת `#LUZ-XXXX`:**
   - כל ליד שיוצא מ-LUZ Goa לוואטסאפ של ספק כולל ייחוס מותג אוטומטי (`via *LUZ Goa* #LUZ-XXXX`), מה שהופך כל הזמנה של משתמש לערוץ הפצה שמגייס את הספקים עצמם להצטרף.
4. **מתנ"ס הקהילה (Community Youth Center — `tracks`):**
   - ביסוס LUZ Goa כבית של המשפחות והקהילה בדרום גואה דרך חוגים שבועיים, מפגשי הורים-ילדים, ותזכורות בוקר/ערב להורים מתנדבים.

---

## היסטוריית החלטות מרכזיות (Decision Log)
- **2026-11-13:** חיבור 3 קבוצות חדשות לסקרייפר הרב-קבוצתי (`SGC1`, `Parents with Children`, `House Hunt Canacona`) עם מנתחי `rental` / `kids_activity` / `event` והשארת תור ה-`moderation_queue` במצב `pending` (ללא פרסום אוטומטי).
- **2026-11-13:** הטמעת מנעול שעות שקטות (`22:00–08:00 IST`) וחלונות בוקר/ערב בעקבות עיכוב Cron של GitHub Actions, והגדרת `GEMINI.md` להפעלת סוכני הצמיחה בכל תחילת סשן ועדכון אוטומטי של `brain/TASKS.md` + `MEMORY.md` בכל סיום משימה.
- **2026-11-10..12:** הקמת מנגנון תזכורות הערב להורים מתנדבים ב-`Youth center parents` על בסיס Session ייעודי של LUZ (`$0` ב-GitHub Actions).
- **2026-11-02:** השקת Production מלאה, הסתרת סביבת ה-`TEST` ודף האדמין מהציבור הרחב, הטמעת Together AI Hallmark (`0 FAIL, 0 REFLEX`), והקמת צוות 7 הסוכנים של LUZ Goa (`maestro`, `maayan`, `yuval`, `eliana`, `ofek`, `peleg`, `almog`).
