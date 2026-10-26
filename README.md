# LUZ Goa — Community OS (PROD + TEST)

פלטפורמה דו-לשונית (עברית / אנגלית) לקהילה בדרום גואה (**Colomb • Patnem • Palolem • Agonda**) לאירועים, מרכז הנוער גואה, **בעלי עסקים בקהילה לפי קטגוריות**, שירותים שעתיים והשכרת בתים.

## שתי סביבות עבודה מופרדות

1. **סביבת PROD (פרודקשן — מידע אמיתי ומאומת בלבד):**
   - כתובת חיה: [https://naorbo.github.io/luz-goa/](https://naorbo.github.io/luz-goa/)
   - מקור נתונים: [`src/data/prodData.ts`](src/data/prodData.ts) — מכיל אך ורק מידע אמיתי שנאור סיפק ואישר (אפס נתוני דמו).

2. **סביבת TEST (הדגמות ובדיקות):**
   - כתובת חיה: [https://naorbo.github.io/luz-goa/test/](https://naorbo.github.io/luz-goa/test/) (או `?env=test`)
   - מקור נתונים: [`src/data/testData.ts`](src/data/testData.ts) — סביבת ארגז חול מלאה עם נתוני הדגמה (אירועים, בתים, ובעלי עסקים לדוגמה: שיאצו, קוסמטיקאית, מקעקעת, מאמן איגרוף, מאמנת ספורט ומאפייה ביתית).

## הרצה ובנייה מקומית

```bash
npm install
npm run dev     # http://localhost:5173/ (PROD) | http://localhost:5173/?env=test (TEST)
npm run build   # בונה אוטומטית את PROD לתיקיית docs/ ואת TEST לתיקיית docs/test/
```
