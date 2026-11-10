import { CommunityBusiness, Language, LuzEntity } from '../types/luz';

const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  Colomb: { lat: 15.001, lng: 74.0292 },
  Patnem: { lat: 14.9965, lng: 74.0329 },
  Palolem: { lat: 15.01, lng: 74.0232 },
  Agonda: { lat: 15.0448, lng: 73.9856 },
  Galgibaga: { lat: 14.9612, lng: 74.0491 },
};

/**
 * Dynamically updates document title, meta description, OpenGraph tags,
 * and injects Schema.org JSON-LD for Events, LocalBusinesses, and Accommodations
 * so Google Search & AI engines index live South Goa community data.
 */
export function syncSeoAndStructuredData(params: {
  activeTab: string;
  lang: Language;
  entities: LuzEntity[];
  businesses: CommunityBusiness[];
  selectedEntity?: LuzEntity | null;
}) {
  const { activeTab, lang, entities, businesses, selectedEntity } = params;
  const isHe = lang === 'he';

  // 1. Dynamic Title & Description per View or Selected Modal
  let title = isHe
    ? 'LUZ גואה — מערכת הפעלה קהילתית לאירועים, בעלי עסקים, מתנ"ס ובתים בדרום גואה'
    : 'LUZ Goa — South Goa Community OS for Events, Businesses, Youth Center & Homes';

  let description = isHe
    ? 'כל מה שקורה בקולום, פטנם, פאלולם ואגונדה: לוח אירועים שבועי, מתנ"ס נוער, מטפלים ובעלי עסקים מאומתים ובתים להשכרה עם סיבים אופטיים.'
    : 'Everything happening across Colomb, Patnem, Palolem & Agonda: verified events, 4-day Youth Center, trusted local therapists & businesses, and homes with fiber WiFi.';

  if (selectedEntity) {
    const entTitle = isHe ? selectedEntity.titleHe : selectedEntity.titleEn;
    const entDesc = isHe ? selectedEntity.descriptionHe : selectedEntity.descriptionEn;
    title = `${entTitle} (${selectedEntity.area}) | LUZ Goa`;
    description = entDesc.slice(0, 160);
  } else {
    switch (activeTab) {
      case 'businesses':
        title = isHe
          ? 'אינדקס בעלי עסקים ומטפלים בדרום גואה | LUZ Goa'
          : 'Verified Community Businesses & Therapists in South Goa | LUZ Goa';
        break;
      case 'youth_center':
        title = isHe
          ? 'מתנ"ס קולום לנוער וילדים בדרום גואה | LUZ Goa'
          : 'Colomb Youth Center (Ages 11–15) — South Goa Community | LUZ Goa';
        break;
      case 'beit_bina':
        title = isHe
          ? 'בית בינ"ה בגואה — לו"ז שבועי, הרשמה לאירועים וקבלת שבת | LUZ Goa'
          : 'Beit BINA in Goa — Weekly Schedule, Workshops & Kabbalat Shabbat | LUZ Goa';
        description = isHe
          ? 'הלו"ז השבועי של בית בינ"ה בגואה (8.11–14.11): טורניר שחמט וג׳חנון, אימוני Movement וקליסטניקס, לימוד משותף לחג הדיוואלי, סדנאות וקבלת שבת ישראלית חילונית.'
          : 'Weekly schedule at Beit BINA in Goa: Chess tournament & Jachnun, Movement & Calisthenics, Diwali learning, workshops, and Israeli Kabbalat Shabbat.';
        break;
      case 'ben':
        title = isHe
          ? 'הבוט "בן" — עוזר הוואטסאפ החכם של קהילת גואה | LUZ Goa'
          : 'Meet "Ben" — South Goa WhatsApp Community AI Assistant | LUZ Goa';
        break;
      case 'provider':
        title = isHe
          ? 'פרסום אירוע, סדנה או בית להשכרה בגואה | LUZ Goa'
          : 'Publish an Event, Class, or Home Rental in South Goa | LUZ Goa';
        break;
    }
  }

  document.title = title;
  setMetaContent('name', 'description', description);
  setMetaContent('property', 'og:title', title);
  setMetaContent('property', 'og:description', description);

  // 2. Build Dynamic Schema.org JSON-LD Graph
  const graph: Record<string, unknown>[] = [];

  // Events & Workshops -> schema.org/Event
  entities
    .filter((e) => e.type === 'event' || e.type === 'workshop')
    .slice(0, 20)
    .forEach((ev) => {
      const coords = AREA_COORDS[ev.area] || AREA_COORDS.Colomb;
      const startDate = ev.date
        ? `${ev.date}T${ev.startTime || '17:00'}:00+05:30`
        : `2026-11-04T${ev.startTime || '16:30'}:00+05:30`;

      graph.push({
        '@type': 'Event',
        '@id': `https://my-luz-dc028.web.app/#entity-${ev.id}`,
        name: isHe ? ev.titleHe : ev.titleEn,
        description: isHe ? ev.descriptionHe : ev.descriptionEn,
        startDate,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        image: [ev.imageUrl],
        location: {
          '@type': 'Place',
          name: `${ev.area}, South Goa`,
          address: {
            '@type': 'PostalAddress',
            addressLocality: ev.area,
            addressRegion: 'Goa',
            addressCountry: 'IN',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: coords.lat,
            longitude: coords.lng,
          },
        },
        organizer: {
          '@type': 'Person',
          name: isHe ? ev.hostName : ev.hostNameEn || ev.hostName,
          telephone: ev.hostPhone,
        },
        offers: {
          '@type': 'Offer',
          price: ev.priceCurrency === 'FREE' || ev.priceCurrency === 'CONTACT' ? 0 : ev.priceAmount,
          priceCurrency:
            ev.priceCurrency === 'FREE' || ev.priceCurrency === 'CONTACT'
              ? 'INR'
              : ev.priceCurrency,
          availability: 'https://schema.org/InStock',
        },
      });
    });

  // Rentals -> schema.org/Accommodation
  entities
    .filter((e) => e.type === 'rental')
    .slice(0, 10)
    .forEach((rental) => {
      const coords = AREA_COORDS[rental.area] || AREA_COORDS.Colomb;
      graph.push({
        '@type': 'Accommodation',
        '@id': `https://my-luz-dc028.web.app/#rental-${rental.id}`,
        name: isHe ? rental.titleHe : rental.titleEn,
        description: isHe ? rental.descriptionHe : rental.descriptionEn,
        image: rental.imageUrl,
        numberOfRooms: rental.bedrooms || 2,
        address: {
          '@type': 'PostalAddress',
          addressLocality: rental.area,
          addressRegion: 'Goa',
          addressCountry: 'IN',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: coords.lat,
          longitude: coords.lng,
        },
      });
    });

  // Community Businesses -> schema.org/LocalBusiness
  businesses.slice(0, 25).forEach((biz) => {
    const coords = AREA_COORDS[biz.area] || AREA_COORDS.Colomb;
    graph.push({
      '@type': 'LocalBusiness',
      '@id': `https://my-luz-dc028.web.app/#biz-${biz.id}`,
      name: isHe ? biz.businessNameHe : biz.businessNameEn,
      description: isHe ? biz.bioHe : biz.bioEn,
      image: biz.imageUrl,
      telephone: biz.phone,
      address: {
        '@type': 'PostalAddress',
        addressLocality: biz.area,
        addressRegion: 'Goa',
        addressCountry: 'IN',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: coords.lat,
        longitude: coords.lng,
      },
    });
  });

  // Inject into <script id="luz-dynamic-schema" type="application/ld+json">
  let scriptEl = document.getElementById('luz-dynamic-schema') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'luz-dynamic-schema';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}

function setMetaContent(attrName: 'name' | 'property', attrValue: string, content: string) {
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}
