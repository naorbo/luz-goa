# LUZ Goa — Brand & Voice DNA (חוקת המותג והשפה)

> מסמך זה נקרא אוטומטית על ידי כל הסוכנים של LUZ Goa לפני כל יצירת תוכן, קופי, הודעת וואטסאפ, קידום אורגני (SEO) או פיתוח ממשק.

---

## 1. המהות של LUZ Goa (The Core Identity)
**LUZ Goa** היא מערכת ההפעלה הקהילתית והמרקטפלייס של דרום גואה (**South Goa Community OS & Curated Marketplace**): פאלולם (Palolem), פטנם (Patnem), אגונדה (Agonda), קולום (Colomb) וגalgibaga.
המערכת מחברת בין:
1. **תושבים, נוודים דיגיטליים, משפחות ומטיילים** המחפשים סדנאות, אירועים, מטפלים, וילות, הסעות, אוכל ביתי ופעילויות במתנ"ס הקהילתי.
2. **ספקים מקומיים ובינלאומיים (Providers & Businesses)** בדרום גואה שמקבלים לידים חמים ומאומתים ישירות לוואטסאפ עם קוד מעקב (`#LUZ-XXXX`).

---

## 2. טון, אישיות ושפה (Tone of Voice)
- **חם, אותנטי, מבוסס-קהילה ומקצועי (Editorial Tropical Warmth):** אנחנו נשמעים כמו החבר הכי מחובר בפאלולם-פטנם שיודע בדיוק איפה הסאונד הילינג הכי טוב הערב, למי יש וילה פנויה עם Wi-Fi יציב, ומי עושה קובה או תאלי ביתי אמיתי ביום שישי.
- **בלי קלישאות AI ורובוטיות:**
  - לא להשתמש במקפים ארוכים (`—` או `–`) בטקסטים שיווקיים או בממשק (חוק Hallmark Gate 19). להשתמש בפסיקים, נקודות או נקודתיים.
  - לא להשתמש במילים גנריות כמו: *"Unleash"*, *"Revolutionize"*, *"Seamless experience"*, *"Elevate your journey"*.
  - כן להשתמש בשפה קונקרטית, מקומית וחושית: *"Sunset acoustic jam on North Patnem cliff"*, *"Verified 100Mbps fiber in Agonda"*, *"מפגש הורים וילדים במתנ"ס פטנם בשעה 16:30"*.

---

## 3. חוקי דו-לשוניות (Bilingual First: EN + HE)
- **אנגלית כברירת מחדל גלובלית (`en`, LTR):** האתר נפתח באנגלית לכל מבקר חדש כדי לשרת את כלל הקהילה הבינלאומית והמקומית בגואה.
- **עברית מלאה וטבעית (`he`, RTL):** כל ישות במערכת (`Event`, `Business`, `CommunityTrack`, `BenBot FAQ`) חייבת לכלול שדות מקבילים באנגלית ובעברית (`title` / `titleHe`, `description` / `descriptionHe`, `location` / `locationHe`).
- העברית אינה תרגום מילולי מאנגלית — היא נכתבת בעברית טבעית של קהילת גואה ("ג'אם שקיעה", "מעגל שירה", "אוכל ביתי", "המונית של ראג'ש", "מתנ"ס הקהילה").

---

## 4. מנגנון הייחוס והלידים (`#LUZ-XXXX`)
כל פנייה או הזמנה שיוצאת מ-LUZ Goa לוואטסאפ של ספק חייבת לכלול:
1. **קוד אסמכתא ייחודי:** `#LUZ-XXXX` (למשל `#LUZ-8492`).
2. **ייחוס ברור למותג:** `Hi! Reaching out via *LUZ Goa* (#LUZ-XXXX)` / `היי! הגעתי דרך *לו"ז גואה* (#LUZ-XXXX)`.
3. **שמירת ליד מוצפנת ומאובטחת ב-Firestore (`leads`):** ללא חשיפת מידע אישי למשתמשים אחרים (Write-only לציבור, Read-only לאדמין מאומת `luzschedu@gmail.com`).

---

## 5. סטנדרט העיצוב: Hallmark Editorial Tropical (`--genre editorial --scope app`)
כל קוד UI ודף נחיתה ב-LUZ Goa כפוף לסטנדרט **Together AI Hallmark**:
- **פלטת צבעים מבוססת Tokens בלבד (`:root` ב-`src/index.css`):**
  - רקע חם: `--luz-bg: #FAF6F0`, משטחים: `--luz-surface: #FFFFFF` ו-`--luz-sand: #F3ECE1`.
  - דיו וטיפוגרפיה: `--luz-ink: #1C1917`, `--luz-ink-muted: #57534E`.
  - הדגשות מותג: טרקוטה/שקיעה (`#EA580C`), ג'ונגל טרופי (`#064E3B`), ענבר חם (`#D97706`).
- **טיפוגרפיה:**
  - כותרות Editorial: `Fraunces` (אנגלית) / `Frank Ruhl Libre` (עברית).
  - גוף טקסט וממשק: `Plus Jakarta Sans` (אנגלית) / `Heebo` (עברית).
  - קודי `#LUZ-XXXX` ונתונים טכניים בלבד: `JetBrains Mono` (`--font-outlier`).
- **איסורים מוחלטים (Hallmark Floor):**
  - אפס `transition-all` (רק `transition-colors`, `transition-transform`, `transition-opacity`).
  - אפס אמוג'ים כתחליף לאייקונים בממשק (רק `lucide-react` או SVG עם `aria-hidden="true"`).
  - אפס `uppercase` עם `tracking` על טקסט בגודל `12px` ומטה (`text-xs` או `text-[10px]`).
  - תמיכה מלאה ב-`@media (prefers-reduced-motion: reduce)` ו-`overflow-x: clip` על `html, body`.
