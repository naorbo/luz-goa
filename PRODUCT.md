# LUZ Goa — Community OS, Events, Businesses & Youth Center

## Product Overview
**LUZ Goa** is a bilingual (Hebrew RTL / English LTR) community operating system and directory built for the Israeli and international community in South Goa (`Colomb`, `Patnem`, `Palolem`, `Agonda`). It anchors community life around shared events, the **Youth Center Goa** 4-day cooperative program, a categorized **Community Business Directory**, hourly shared spaces, and verified community house sublets.

## Dual Environments (`PROD` vs `TEST`)
- **`PROD` Environment (`/`, `?env=prod`, `src/data/prodData.ts`)**: Strictly reserved for **real, verified community data** explicitly supplied by Naor. Zero fake/demo items ever appear in `PROD`. Isolated in `localStorage` under `luz_prod_v2_*`.
- **`TEST` Environment (`/test/`, `?env=test`, `src/data/testData.ts`)**: Full sandbox/staging environment populated with realistic demo events, homes, families, and businesses for demonstrations and QA testing. Isolated in `localStorage` under `luz_test_v2_*`.

## Categorized Community Business Directory (`CommunityBusiness`)
First-class directory, transparent price menu, WhatsApp direct contact, and time-slot appointment booking across 7 categories:
1. **`body_therapy` (טיפולי גוף ושיאצו)**: Shiatsu, Acupuncture, Tuina, Therapeutic Massage.
2. **`beauty_cosmetics` (קוסמטיקה וטיפוח)**: Cosmetician, Tropical Skincare, Facials, Natural Aesthetics.
3. **`tattoo_art` (קעקועים ואומנות)**: Tattoo Artist, Fine-Line Custom Ink, Illustration.
4. **`fitness_martial` (איגרוף, ספורט וכושר)**: Boxing Coach, Muay Thai, Sports/Fitness Trainer, Functional Strength, Pilates.
5. **`food_culinary` (אוכל ביתי ואפייה)**: Sourdough Bakery, Shabbat Challah, Home Catering.
6. **`kids_education` (חוגים, מוזיקה והוראה)**: Private Tutors, Music Lessons, Youth Mentors.
7. **`pro_services` (שירותים מקצועיים)**: Photography, Design, Consulting, Local Tech/Maintenance.

## Core Schedule Entities (`LuzEntity`)
1. **One-Time Event (`event`)**: Specific date, start/end time, location, capacity, and RSVP tracking.
2. **Recurring Workshop / Youth Center Session (`workshop`)**: Fixed weekly day (`Monday`–`Friday`), alternating Week A / Week B support.
3. **Hourly Community Space & Resource (`service`)**: Time-based slot booking with double-booking prevention and Google Calendar sync status (`connected` / `manual`).
4. **Property Rental (`rental`)**: Date-range booking (`availableFrom` to `availableTo`) with overlap validation, nightly/monthly pricing, bedroom count (BHK), Fiber Wi-Fi speed, and power backup indicators.
