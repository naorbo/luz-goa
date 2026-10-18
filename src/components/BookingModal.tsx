import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  Download,
  ExternalLink,
  MessageSquare,
  Wifi,
  Zap,
  Home,
  AlertCircle,
  Users,
} from 'lucide-react';
import { LuzEntity, BookingRecord, Language } from '../types/luz';
import { downloadIcsFile, buildGoogleCalendarUrl } from '../utils/calendarAndParser';

interface BookingModalProps {
  entity: LuzEntity | null;
  lang: Language;
  defaultUserName: string;
  defaultUserPhone: string;
  onClose: () => void;
  onConfirmBooking: (booking: Omit<BookingRecord, 'id' | 'createdAt' | 'status'>) => void;
}

const UPCOMING_DATES = [
  { date: '2026-10-19', labelHe: 'ב׳ 19/10', labelEn: 'Mon Oct 19' },
  { date: '2026-10-20', labelHe: 'ג׳ 20/10', labelEn: 'Tue Oct 20' },
  { date: '2026-10-21', labelHe: 'ד׳ 21/10', labelEn: 'Wed Oct 21' },
  { date: '2026-10-22', labelHe: 'ה׳ 22/10', labelEn: 'Thu Oct 22' },
  { date: '2026-10-23', labelHe: 'ו׳ 23/10', labelEn: 'Fri Oct 23' },
  { date: '2026-10-24', labelHe: 'ש׳ 24/10', labelEn: 'Sat Oct 24' },
];

export const BookingModal: React.FC<BookingModalProps> = ({
  entity,
  lang,
  defaultUserName,
  defaultUserPhone,
  onClose,
  onConfirmBooking,
}) => {
  if (!entity) return null;

  const isHe = lang === 'he';
  const title = isHe ? entity.titleHe : entity.titleEn;
  const description = isHe ? entity.descriptionHe : entity.descriptionEn;
  const location = isHe ? entity.locationDetailsHe : entity.locationDetailsEn;

  const [customerName, setCustomerName] = useState(defaultUserName);
  const [customerPhone, setCustomerPhone] = useState(defaultUserPhone);
  const [participantsCount, setParticipantsCount] = useState(1);
  const [selectedDate, setSelectedDate] = useState(entity.date || UPCOMING_DATES[1].date);
  const [selectedSlot, setSelectedSlot] = useState(
    entity.timeSlots && entity.timeSlots.length > 0 ? entity.timeSlots[0] : entity.startTime || '17:00'
  );
  const [rentalFrom, setRentalFrom] = useState('2026-10-20');
  const [rentalTo, setRentalTo] = useState('2026-10-24');
  const [reminderChannel, setReminderChannel] = useState<'whatsapp' | 'calendar_ics' | 'both'>('both');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Check if selected slot is already booked for hourly services
  const bookedForDate = useMemo(() => {
    if (entity.type !== 'service' || !entity.bookedSlots) return [];
    return entity.bookedSlots[selectedDate] || [];
  }, [entity, selectedDate]);

  // Calculate rental nights, price, and date conflict
  const rentalCalculation = useMemo(() => {
    if (entity.type !== 'rental') return { nights: 0, total: 0, conflict: null as string | null };
    const start = new Date(rentalFrom);
    const end = new Date(rentalTo);
    const diffMs = end.getTime() - start.getTime();
    const nights = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    const pricePerNight = entity.pricePerNight || entity.priceAmount || 3500;
    const total = nights * pricePerNight;

    let conflict: string | null = null;
    if (nights <= 0) {
      conflict = isHe ? 'תאריך יציאה חייב להיות אחרי תאריך כניסה' : 'Check-out must be after check-in date';
    } else if (entity.bookedRanges) {
      for (const r of entity.bookedRanges) {
        if (rentalFrom < r.to && rentalTo > r.from) {
          conflict = isHe
            ? `התאריכים מתנגשים עם הזמנה קיימת (${r.from} עד ${r.to})`
            : `Dates overlap with an existing booking (${r.from} to ${r.to})`;
          break;
        }
      }
    }
    return { nights, total, conflict };
  }, [entity, rentalFrom, rentalTo, isHe]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (entity.type === 'rental' && rentalCalculation.conflict) return;
    if (entity.type === 'service' && bookedForDate.includes(selectedSlot)) return;

    onConfirmBooking({
      entityId: entity.id,
      entityTitleHe: entity.titleHe,
      entityTitleEn: entity.titleEn,
      entityType: entity.type,
      customerName,
      customerPhone,
      participantsCount,
      selectedDate: entity.type === 'rental' ? rentalFrom : selectedDate,
      selectedSlot: entity.type === 'rental' ? 'Check-in 14:00' : selectedSlot,
      rentalFrom: entity.type === 'rental' ? rentalFrom : undefined,
      rentalTo: entity.type === 'rental' ? rentalTo : undefined,
      totalPrice:
        entity.type === 'rental'
          ? rentalCalculation.total
          : entity.priceAmount * participantsCount,
      currency: entity.priceCurrency,
      reminderChannel,
      notes,
    });

    if (reminderChannel === 'calendar_ics' || reminderChannel === 'both') {
      downloadIcsFile({
        title: `${title} (LUZ Goa)`,
        description: `${description}\nHost: ${entity.hostName} (${entity.hostPhone})`,
        location,
        startDate: entity.type === 'rental' ? rentalFrom : selectedDate,
        startTime: entity.type === 'rental' ? '14:00' : selectedSlot,
        endDate: entity.type === 'rental' ? rentalTo : undefined,
        endTime: entity.endTime || '19:30',
      });
    }

    setSubmitted(true);
  };

  const gcalUrl = buildGoogleCalendarUrl({
    title: `${title} (LUZ Goa)`,
    description,
    location,
    startDate: entity.type === 'rental' ? rentalFrom : selectedDate,
    startTime: entity.type === 'rental' ? '14:00' : selectedSlot,
    endDate: entity.type === 'rental' ? rentalTo : undefined,
    endTime: entity.endTime || '19:30',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canopy-950/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-sand-50 rounded-2xl shadow-elevated overflow-hidden my-8 animate-reveal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner */}
        <div className="relative h-44 bg-canopy-900 overflow-hidden">
          <img
            src={entity.imageUrl}
            alt={title}
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-canopy-950 via-canopy-950/50 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 end-4 w-9 h-9 rounded-full bg-canopy-950/60 text-sand-50 flex items-center justify-center hover:bg-canopy-900 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 inset-x-6 text-sand-50">
            <h2 className="font-display text-2xl md:text-3xl font-bold leading-snug">
              {title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-sand-200">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-ochre-400" />
                {location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-terracotta-400" />
                {entity.hostName} ({entity.hostPhone})
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8">
          {submitted ? (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-canopy-100 text-canopy-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-2xl font-bold text-canopy-900">
                  {isHe ? 'ההרשמה והשריון נקלטו בהצלחה!' : 'Booking & RSVP Confirmed!'}
                </h3>
                <p className="text-sm text-canopy-600 max-w-md mx-auto">
                  {isHe
                    ? `שריינו עבור ${customerName}. תזכורת אוטומטית תישלח מהבוט "בן" בוואטסאפ למספר ${customerPhone}.`
                    : `Reserved for ${customerName}. Smart reminder scheduled via "Ben" WhatsApp Bot to ${customerPhone}.`}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <a
                  href={gcalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-canopy-800 text-sand-50 text-sm font-medium hover:bg-canopy-700 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-ochre-400" />
                  {isHe ? 'הוספה ל-Google Calendar' : 'Add to Google Calendar'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() =>
                    downloadIcsFile({
                      title: `${title} (LUZ Goa)`,
                      description,
                      location,
                      startDate: entity.type === 'rental' ? rentalFrom : selectedDate,
                      startTime: entity.type === 'rental' ? '14:00' : selectedSlot,
                      endDate: entity.type === 'rental' ? rentalTo : undefined,
                      endTime: entity.endTime || '19:30',
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-canopy-200 bg-white text-canopy-800 text-sm font-medium hover:bg-sand-100 transition-colors"
                >
                  <Download className="w-4 h-4 text-terracotta-500" />
                  {isHe ? 'הורדת קובץ יומן (.ics)' : 'Download .ics File'}
                </button>

                <a
                  href={`https://wa.me/${entity.hostPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    isHe
                      ? `היי ${entity.hostName}, נרשמתי דרך מערכת LUZ ל"${entity.titleHe}" (${
                          entity.type === 'rental' ? `${rentalFrom} עד ${rentalTo}` : `${selectedDate} ${selectedSlot}`
                        }).`
                      : `Hi ${entity.hostName}, I booked "${entity.titleEn}" via LUZ Goa (${
                          entity.type === 'rental' ? `${rentalFrom} to ${rentalTo}` : `${selectedDate} ${selectedSlot}`
                        }).`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-terracotta-500 text-white text-sm font-medium hover:bg-terracotta-600 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  {isHe ? 'שליחת הודעה בוואטסאפ למארח' : 'Message Host on WhatsApp'}
                </a>
              </div>

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="text-sm font-medium text-canopy-600 underline underline-offset-4 hover:text-canopy-900"
                >
                  {isHe ? 'חזרה ללוח LUZ' : 'Back to LUZ Schedule'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm text-canopy-700 leading-relaxed">{description}</p>

              {/* ENTITY-SPECIFIC SCHEDULING CONTROLS */}
              {entity.type === 'service' && (
                <div className="p-4 rounded-xl bg-sand-100 border border-sand-300 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-canopy-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-terracotta-500" />
                      {isHe
                        ? 'בחירת תאריך ומשבצת שעה פנויה (סנכרון יומן ספק)'
                        : 'Select Date & Available Time Slot (Provider Calendar)'}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-canopy-800 text-ochre-400 font-medium">
                      {entity.slotDurationMinutes || 60} {isHe ? 'דק׳' : 'min'}
                    </span>
                  </div>

                  {/* Date Pills */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {UPCOMING_DATES.map((d) => {
                      const active = selectedDate === d.date;
                      return (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => setSelectedDate(d.date)}
                          className={`py-2 px-2 rounded-lg text-xs font-medium transition-colors tabular-nums ${
                            active
                              ? 'bg-canopy-800 text-sand-50 shadow-sm'
                              : 'bg-white text-canopy-700 border border-sand-300 hover:border-canopy-600'
                          }`}
                        >
                          {isHe ? d.labelHe : d.labelEn}
                        </button>
                      );
                    })}
                  </div>

                  {/* Time Slots */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-canopy-600">
                      {isHe ? 'משבצות זמן:' : 'Time Slots:'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(entity.timeSlots || ['09:00', '11:00', '15:00', '17:00']).map((slot) => {
                        const isTaken = bookedForDate.includes(slot);
                        const isSelected = selectedSlot === slot && !isTaken;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isTaken}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3.5 py-2 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                              isTaken
                                ? 'bg-sand-200 text-canopy-500/50 line-through cursor-not-allowed'
                                : isSelected
                                ? 'bg-terracotta-500 text-white shadow-sm'
                                : 'bg-white text-canopy-800 border border-sand-300 hover:border-terracotta-500'
                            }`}
                          >
                            {slot} {isTaken ? (isHe ? '(תפוס)' : '(Booked)') : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {entity.type === 'rental' && (
                <div className="p-4 rounded-xl bg-lagoon-50 border border-lagoon-100 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm text-lagoon-700 flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      {isHe
                        ? 'שריון טווח תאריכים להשכרת נכס (Date Range)'
                        : 'Select Check-in & Check-out Dates'}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-lagoon-700">
                      {entity.hasFiberWifi && (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Wifi className="w-3.5 h-3.5" /> Fiber {entity.wifiSpeedMbps || 100}Mbps
                        </span>
                      )}
                      {entity.hasPowerBackup && (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Zap className="w-3.5 h-3.5 text-ochre-600" />{' '}
                          {isHe ? 'גיבוי חשמל' : 'Power Backup'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-canopy-700 mb-1">
                        {isHe ? 'מתאריך (Check-in):' : 'Check-in Date:'}
                      </label>
                      <input
                        type="date"
                        value={rentalFrom}
                        min={entity.availableFrom || '2026-10-18'}
                        max={entity.availableTo || '2026-12-31'}
                        onChange={(e) => setRentalFrom(e.target.value)}
                        className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-canopy-700 mb-1">
                        {isHe ? 'עד תאריך (Check-out):' : 'Check-out Date:'}
                      </label>
                      <input
                        type="date"
                        value={rentalTo}
                        min={rentalFrom}
                        max={entity.availableTo || '2026-12-31'}
                        onChange={(e) => setRentalTo(e.target.value)}
                        className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                        required
                      />
                    </div>
                  </div>

                  {entity.bookedRanges && entity.bookedRanges.length > 0 && (
                    <div className="text-xs text-canopy-600">
                      <span className="font-medium">
                        {isHe ? 'תאריכים תפוסים בנכס:' : 'Already reserved dates:'}
                      </span>{' '}
                      {entity.bookedRanges.map((r, i) => (
                        <span
                          key={i}
                          className="inline-block bg-white border border-sand-300 rounded px-2 py-0.5 mx-1 tabular-nums"
                        >
                          {r.from} → {r.to}
                        </span>
                      ))}
                    </div>
                  )}

                  {rentalCalculation.conflict ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-terracotta-600 bg-terracotta-50 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {rentalCalculation.conflict}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm font-medium text-canopy-900 bg-white px-3.5 py-2.5 rounded-lg border border-sand-200 tabular-nums">
                      <span>
                        {rentalCalculation.nights} {isHe ? 'לילות' : 'nights'} × ₹
                        {(entity.pricePerNight || entity.priceAmount).toLocaleString()}
                      </span>
                      <span className="text-base font-bold text-lagoon-700">
                        {isHe ? 'סה"כ:' : 'Total:'} ₹{rentalCalculation.total.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* USER DETAILS */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-canopy-700 mb-1">
                    {isHe ? 'שם מלא (הורה / מזמין)' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-canopy-700 mb-1">
                    {isHe ? 'טלפון וואטסאפ (לתזכורת מ"בן")' : 'WhatsApp Phone'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-canopy-700 mb-1">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {isHe ? 'מספר משתתפים / נפשות' : 'Participants'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={participantsCount}
                    onChange={(e) => setParticipantsCount(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-sm tabular-nums"
                  />
                </div>
              </div>

              {/* SMART REMINDER CHANNEL */}
              <div className="p-4 rounded-xl bg-sand-100 border border-sand-300 space-y-2.5">
                <label className="block text-xs font-semibold text-canopy-800">
                  {isHe
                    ? 'תזכורת חכמה (Smart Reminder למניעת פספוס):'
                    : 'Smart Reminder Preference:'}
                </label>
                <div className="grid sm:grid-cols-3 gap-2.5">
                  {[
                    {
                      id: 'both',
                      labelHe: 'וואטסאפ ("בן") + קובץ יומן',
                      labelEn: 'WhatsApp ("Ben") + Calendar .ics',
                    },
                    {
                      id: 'whatsapp',
                      labelHe: 'הודעת וואטסאפ מהבוט "בן"',
                      labelEn: 'WhatsApp Message Only',
                    },
                    {
                      id: 'calendar_ics',
                      labelHe: 'זימון ליומן אישי בלבד (.ics)',
                      labelEn: 'Calendar Invite (.ics) Only',
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReminderChannel(opt.id as any)}
                      className={`py-2.5 px-3 rounded-lg text-xs font-medium text-start border transition-colors ${
                        reminderChannel === opt.id
                          ? 'bg-canopy-800 text-sand-50 border-canopy-800'
                          : 'bg-white text-canopy-700 border-sand-300 hover:border-canopy-600'
                      }`}
                    >
                      {isHe ? opt.labelHe : opt.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* SUBMIT FOOTER */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-canopy-700 hover:bg-sand-200 transition-colors"
                >
                  {isHe ? 'ביטול' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={
                    (entity.type === 'rental' && !!rentalCalculation.conflict) ||
                    (entity.type === 'service' && bookedForDate.includes(selectedSlot))
                  }
                  className="px-6 py-2.5 rounded-xl bg-terracotta-500 text-white text-sm font-semibold hover:bg-terracotta-600 disabled:opacity-40 transition-colors shadow-sm"
                >
                  {entity.type === 'rental'
                    ? isHe
                      ? 'שריון תאריכים וקבלת תזכורת'
                      : 'Reserve Dates & Remind Me'
                    : entity.type === 'service'
                    ? isHe
                      ? `קביעת תור ל-${selectedSlot}`
                      : `Book Slot at ${selectedSlot}`
                    : isHe
                    ? 'אישור הגעה וקבלת תזכורת'
                    : 'Confirm RSVP & Reminder'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
