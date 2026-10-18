# LUZ Goa — Community OS, Events, Services & Youth Center

## Product Overview
**LUZ Goa** is a bilingual (Hebrew RTL / English LTR) community operating system and marketplace built for the Israeli and international community in South Goa (Colomb, Patnem, Palolem, Agonda). It addresses the "Leaky Bucket" challenge by anchoring community life around shared events, the **Youth Center Goa** 4-day cooperative program, hourly services & shared spaces, and verified community house sublets.

## Core Entities (4 Logical Types)
1. **One-Time Event (`event`)**: Specific date, start/end time, location, capacity, and RSVP tracking (e.g., Kickoff at Ilan's Rooftop, Community Sunset Shabbat).
2. **Recurring Workshop / Youth Center Session (`workshop`)**: Fixed weekly day (`Monday`–`Friday`), alternating Week A / Week B support (Monday *Game On*, Tuesday *Open Minds*, Wednesday *Screen or Scene*, Thursday *Make Some Noise / Makers Lab*).
3. **Hourly Service & Community Space (`service`)**: Time-based slot booking with double-booking prevention and Google Calendar sync status (`connected` / `manual`). Supports individual practitioners (Yoga, therapy), community spaces (Youth Center Recording Studio, Fiber Co-Working Hub), and trusted medical appointments.
4. **Property Rental (`rental`)**: Date-range booking (`availableFrom` to `availableTo`) with overlap validation, nightly/monthly pricing, bedroom count (BHK), Fiber Wi-Fi speed, and power backup (Inverter/Generator) indicators.

## Core Flows
- **Explore & Weekly Timetable**: Switch between a 5-day Weekly Timetable Rhythm and a filterable Catalog View. Book slots or date ranges and trigger Smart Reminders via WhatsApp ("Ben") or `.ics` / Google Calendar invites.
- **"Ben" WhatsApp Bot Simulator & Webhook**: Free-text resident profiling (extracts kids' ages, neighborhood, and interests), live database Q&A, and direct Provider DM ingestion.
- **Youth Center Goa Hub**: Multi-child family registration (1–4 children per family), parent monthly volunteer shift selection, and 1-click CSV export for Google Sheets.
- **Provider Studio**: Structured 4-entity creation form + AI WhatsApp free-text parser for instant ingestion from group messages.
- **Admin & Digest Control**: Monitor provider calendar sync health, view bookings, export the Supabase/Lovable SQL schema, and generate formatted WhatsApp Weekly Digests.
