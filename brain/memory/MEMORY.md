# LUZ Goa — Shared Agent Memory Index (`MEMORY.md`)

> קובץ זה מרכז את הזיכרון הארגוני החי של סוכני **LUZ Goa**. כל סוכן קורא אותו בתחילת הרצה ומעדכן אותו כשמתקבלות החלטות מוצר, שיווק, תוכן או אבטחה חדשות.

---

## מצב המערכת הנוכחי (Launch State — Production Ready)
- **סטטוס השקה:** **LIVE ב-Production (`prod`)** תחת פרויקט Firebase `my-luz-dc028` (`my-Luz`).
- **נעילת סביבות ואדמין:**
  - משתמשים רגילים רואים אך ורק את סביבת `prod` (ללא גישה ל-`test`, ללא כפתור `Switch to TEST`, וללא טאב `Admin & Leads`).
  - כניסת אדמין מתבצעת אך ורק דרך כפתור המנעול הדיסקרטי בפוטר או `?admin=1` באמצעות **Firebase Google Auth** המוגבל קשיחה ב-Frontend וב-Firestore Security Rules לחשבון `luzschedu@gmail.com`.
- **ציון Hallmark Design Audit:** `0 FAIL, 0 REFLEX` (Together AI `sloplint.mjs --genre editorial --scope app`).

---

## יעדי צמיחה וקידום מרכזיים (Growth & Promotion Priorities)
1. **גיוס 50 ספקים ועסקים מאומתים בדרום גואה (`businesses`):**
   - מיקוד ראשוני: פאלולם (Palolem), פטנם (Patnem), אגונדה (Agonda).
   - קטגוריות בעדיפות גבוהה: Wellness & Yoga, Villas & Stays, Local Kitchens & Cafes, Taxis & Scooters, Family & Kids Activities.
2. **לוח אירועים יומי חי (`events`):**
   - הפעלת ה-WhatsApp AI Dropzone ליבוא יומי של הודעות מקבוצות הוואטסאפ של גואה, אימות על ידי סוכנת הבקרה **אליאנה (Eliana)**, ופרסום ל-`prod`.
3. **ויראליות מבוססת `#LUZ-XXXX`:**
   - כל ליד שיוצא מ-LUZ Goa לוואטסאפ של ספק כולל ייחוס מותג אוטומטי (`via *LUZ Goa* #LUZ-XXXX`), מה שהופך כל הזמנה של משתמש לערוץ הפצה שמגייס את הספקים עצמם להצטרף.
4. **מתנ"ס הקהילה (Community Youth Center — `tracks`):**
   - ביסוס LUZ Goa כבית של המשפחות והקהילה בדרום גואה דרך חוגים שבועיים, מפגשי הורים-ילדים ואירועי קהילה.

---

## היסטוריית החלטות מרכזיות (Decision Log)
- **2026-11-02:** השקת Production מלאה, הסתרת סביבת ה-`TEST` ודף האדמין מהציבור הרחב, הטמעת Together AI Hallmark (`0 FAIL, 0 REFLEX`), והקמת צוות 7 הסוכנים של LUZ Goa (`maestro`, `maayan`, `yuval`, `eliana`, `ofek`, `peleg`, `almog`).
