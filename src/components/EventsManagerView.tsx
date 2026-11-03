import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit3,
  Trash2,
  Plus,
  Search,
  Copy,
  Tag,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  X,
  PlusCircle,
  FileText,
  Sliders,
  DollarSign,
  Phone,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import {
  LuzEntity,
  EntityType,
  GoaArea,
  AudienceGroup,
  Language,
  AppEnvironment,
  CustomFieldItem,
} from '../types/luz';

interface EventsManagerViewProps {
  entities: LuzEntity[];
  lang: Language;
  appEnv: AppEnvironment;
  onAddEntity: (newEntity: LuzEntity) => void;
  onUpdateEntity: (updatedEntity: LuzEntity) => void;
  onDeleteEntity: (entityId: string) => void;
}

const GOA_AREAS: GoaArea[] = ['Colomb', 'Palolem', 'Patnem', 'Agonda', 'Galgibaga'];

const DAY_NAMES_HE = [
  'יום ראשון',
  'יום שני',
  'יום שלישי',
  'יום רביעי',
  'יום חמישי',
  'יום שישי',
  'יום שבת',
];
const DAY_NAMES_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const AUDIENCE_OPTIONS: Array<{ value: AudienceGroup; labelHe: string; labelEn: string }> = [
  { value: 'all', labelHe: 'כל הקהילה', labelEn: 'All Community' },
  { value: 'youth_11_15', labelHe: 'נוער (11–15)', labelEn: 'Youth (11–15)' },
  { value: 'kids_8_15', labelHe: 'ילדים ונוער (8–15)', labelEn: 'Kids & Youth (8–15)' },
  { value: 'families', labelHe: 'משפחות וילדים', labelEn: 'Families & Kids' },
  { value: 'adults', labelHe: 'מבוגרים בלבד', labelEn: 'Adults Only' },
];

const FIELD_SUGGESTIONS = [
  { keyHe: 'ציוד נדרש להביא', keyEn: 'Required Equipment', defaultValHe: 'נעלי ספורט ובקבוק מים אישי' },
  { keyHe: 'מנחה / אמן אורח', keyEn: 'Guest Mentor', defaultValHe: 'בהנחיית אורח מהקהילה' },
  { keyHe: 'הנחיות להורים', keyEn: 'Parent Guidelines', defaultValHe: 'נא להגיע כ-5 דקות לפני תחילת הפעילות' },
  { keyHe: 'קישור לזום / שידור', keyEn: 'Zoom / Stream Link', defaultValHe: 'https://zoom.us/j/example' },
  { keyHe: 'הערות בטיחות', keyEn: 'Safety Notes', defaultValHe: 'מותאם לפעילות שטח' },
  { keyHe: 'מגבלת משתתפים', keyEn: 'Max Participant Limit', defaultValHe: 'עד 20 משתתפים' },
];

export const EventsManagerView: React.FC<EventsManagerViewProps> = ({
  entities,
  lang,
  appEnv,
  onAddEntity,
  onUpdateEntity,
  onDeleteEntity,
}) => {
  const isHe = lang === 'he';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<
    'all' | 'youth_center' | 'community' | 'workshop' | 'event' | 'service'
  >('all');
  const [filterArea, setFilterArea] = useState<'all' | GoaArea>('all');

  // Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [deleteConfirmEntity, setDeleteConfirmEntity] = useState<LuzEntity | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Editor Form Fields
  const [formTitleHe, setFormTitleHe] = useState('');
  const [formTitleEn, setFormTitleEn] = useState('');
  const [formDescHe, setFormDescHe] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  const [formIsYouthCenter, setFormIsYouthCenter] = useState(false);
  const [formType, setFormType] = useState<EntityType>('workshop');
  const [formDate, setFormDate] = useState('');
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1);
  const [formStartTime, setFormStartTime] = useState('16:30');
  const [formEndTime, setFormEndTime] = useState('19:00');
  const [formArea, setFormArea] = useState<GoaArea>('Colomb');
  const [formLocationHe, setFormLocationHe] = useState('');
  const [formLocationEn, setFormLocationEn] = useState('');
  const [formMapUrl, setFormMapUrl] = useState('');
  const [formWhatsappUrl, setFormWhatsappUrl] = useState('');
  const [formHostName, setFormHostName] = useState('צוות מרכז הנוער גואה');
  const [formHostPhone, setFormHostPhone] = useState('+972-52-478-0033');
  const [formPriceAmount, setFormPriceAmount] = useState<number>(0);
  const [formPriceCurrency, setFormPriceCurrency] = useState<'INR' | 'ILS' | 'USD' | 'FREE' | 'CONTACT'>('FREE');
  const [formAudience, setFormAudience] = useState<AudienceGroup>('youth_11_15');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formTags, setFormTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Dynamic Custom Fields State
  const [formCustomFields, setFormCustomFields] = useState<CustomFieldItem[]>([]);

  // Filtered & Sorted Entities
  const filteredEntities = useMemo(() => {
    return entities.filter((item) => {
      // Category filter
      if (filterCategory === 'youth_center' && !item.isYouthCenter) return false;
      if (filterCategory === 'community' && item.isYouthCenter) return false;
      if (filterCategory === 'workshop' && item.type !== 'workshop') return false;
      if (filterCategory === 'event' && item.type !== 'event') return false;
      if (filterCategory === 'service' && item.type !== 'service') return false;

      // Area filter
      if (filterArea !== 'all' && item.area !== filterArea) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle =
          item.titleHe.toLowerCase().includes(q) || item.titleEn.toLowerCase().includes(q);
        const matchDesc =
          item.descriptionHe.toLowerCase().includes(q) ||
          item.descriptionEn.toLowerCase().includes(q);
        const matchHost = item.hostName.toLowerCase().includes(q);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(q));
        const matchDate = (item.date || '').includes(q);
        const matchCustom = (item.customFields || []).some(
          (cf) => cf.key.toLowerCase().includes(q) || cf.value.toLowerCase().includes(q)
        );
        if (!matchTitle && !matchDesc && !matchHost && !matchTags && !matchDate && !matchCustom) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Prioritize date order
      const dateA = a.date || (typeof a.dayOfWeek === 'number' ? `2026-11-${String(a.dayOfWeek + 1).padStart(2, '0')}` : '9999');
      const dateB = b.date || (typeof b.dayOfWeek === 'number' ? `2026-11-${String(b.dayOfWeek + 1).padStart(2, '0')}` : '9999');
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.startTime || '16:00').localeCompare(b.startTime || '16:00');
    });
  }, [entities, filterCategory, filterArea, searchQuery]);

  // Open Editor for Creating New Event
  const handleOpenCreateModal = (presetYouth = false) => {
    setEditingEntityId(null);
    setFormTitleHe('');
    setFormTitleEn('');
    setFormDescHe('');
    setFormDescEn('');
    setFormIsYouthCenter(presetYouth);
    setFormType(presetYouth ? 'workshop' : 'event');
    setFormDate('');
    setFormDayOfWeek(1);
    setFormStartTime('16:30');
    setFormEndTime('19:00');
    setFormArea(presetYouth ? 'Colomb' : 'Palolem');
    setFormLocationHe(presetYouth ? 'מרכז הנוער קולום (ליד שייליש)' : 'קולום / פאלולים');
    setFormLocationEn(presetYouth ? 'Colomb Youth Center (near Shailish)' : 'Colomb / Palolem');
    setFormMapUrl('');
    setFormWhatsappUrl('');
    setFormHostName(presetYouth ? 'צוות מרכז הנוער גואה' : 'צוות LUZ Goa');
    setFormHostPhone('+972-52-478-0033');
    setFormPriceAmount(0);
    setFormPriceCurrency('FREE');
    setFormAudience(presetYouth ? 'youth_11_15' : 'all');
    setFormImageUrl(
      presetYouth
        ? 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000'
        : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000'
    );
    setFormTags(presetYouth ? ['נוער', 'מרכז הנוער'] : ['אירוע קהילתי']);
    setFormCustomFields([]);
    setIsEditorOpen(true);
  };

  // Open Editor for Modifying Existing Event
  const handleOpenEditModal = (item: LuzEntity) => {
    setEditingEntityId(item.id);
    setFormTitleHe(item.titleHe || '');
    setFormTitleEn(item.titleEn || '');
    setFormDescHe(item.descriptionHe || '');
    setFormDescEn(item.descriptionEn || '');
    setFormIsYouthCenter(Boolean(item.isYouthCenter));
    setFormType(item.type);
    setFormDate(item.date || '');
    setFormDayOfWeek(typeof item.dayOfWeek === 'number' ? item.dayOfWeek : 1);
    setFormStartTime(item.startTime || '16:30');
    setFormEndTime(item.endTime || '19:00');
    setFormArea(item.area);
    setFormLocationHe(item.locationDetailsHe || '');
    setFormLocationEn(item.locationDetailsEn || '');
    setFormMapUrl(item.mapUrl || '');
    setFormWhatsappUrl(item.whatsappGroupUrl || '');
    setFormHostName(item.hostName || '');
    setFormHostPhone(item.hostPhone || '');
    setFormPriceAmount(item.priceAmount || 0);
    setFormPriceCurrency(item.priceCurrency || 'FREE');
    setFormAudience(item.audience || 'all');
    setFormImageUrl(item.imageUrl || '');
    setFormTags(item.tags || []);
    setFormCustomFields(item.customFields ? [...item.customFields] : []);
    setIsEditorOpen(true);
  };

  // Duplicate Event
  const handleDuplicateEvent = (item: LuzEntity) => {
    handleOpenEditModal(item);
    setEditingEntityId(null); // will create a new record
    setFormTitleHe(`${item.titleHe} (העתק)`);
    setFormTitleEn(item.titleEn ? `${item.titleEn} (Copy)` : '');
  };

  // Dynamic Custom Fields Handlers
  const handleAddCustomField = (key = '', value = '') => {
    const newField: CustomFieldItem = {
      id: `field-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key: key.trim(),
      value: value.trim(),
    };
    setFormCustomFields((prev) => [...prev, newField]);
  };

  const handleUpdateCustomField = (id: string, key: string, value: string) => {
    setFormCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, key, value } : f))
    );
  };

  const handleDeleteCustomField = (id: string) => {
    setFormCustomFields((prev) => prev.filter((f) => f.id !== id));
  };

  // Tags Handlers
  const handleAddTag = () => {
    const val = newTagInput.trim();
    if (val && !formTags.includes(val)) {
      setFormTags([...formTags, val]);
      setNewTagInput('');
    }
  };

  const handleDeleteTag = (tagToRemove: string) => {
    setFormTags(formTags.filter((t) => t !== tagToRemove));
  };

  // Save Event (Add or Update)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitleHe.trim()) {
      alert(isHe ? 'נא להזין כותרת לאירוע בעברית' : 'Please provide a title');
      return;
    }

    // Auto calculate dayOfWeek if date provided
    let calculatedDayOfWeek = formDayOfWeek;
    if (formDate) {
      const parts = formDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(d.getTime())) {
          calculatedDayOfWeek = d.getDay();
        }
      }
    }

    // Clean up custom fields (only keep non-empty keys)
    const cleanedCustomFields = formCustomFields
      .filter((cf) => cf.key.trim() !== '')
      .map((cf) => ({
        id: cf.id,
        key: cf.key.trim(),
        value: cf.value.trim(),
      }));

    const entityPayload: LuzEntity = {
      id: editingEntityId || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: formType,
      titleHe: formTitleHe.trim(),
      titleEn: formTitleEn.trim() || formTitleHe.trim(),
      descriptionHe: formDescHe.trim(),
      descriptionEn: formDescEn.trim() || formDescHe.trim(),
      area: formArea,
      locationDetailsHe: formLocationHe.trim(),
      locationDetailsEn: formLocationEn.trim() || formLocationHe.trim(),
      mapUrl: formMapUrl.trim() || undefined,
      whatsappGroupUrl: formWhatsappUrl.trim() || undefined,
      hostName: formHostName.trim() || (isHe ? 'מארח קהילתי' : 'Community Host'),
      hostPhone: formHostPhone.trim() || '+972-52-478-0033',
      priceAmount: Number(formPriceAmount) || 0,
      priceCurrency: formPriceCurrency,
      audience: formAudience,
      ingestionSource: 'web',
      imageUrl:
        formImageUrl.trim() ||
        'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=1000',
      tags: formTags.length > 0 ? formTags : [isHe ? 'אירוע' : 'Event'],
      rsvpCount: 0,
      date: formDate.trim() || undefined,
      dayOfWeek: calculatedDayOfWeek,
      weekCycle: 'all',
      isYouthCenter: formIsYouthCenter,
      startTime: formStartTime.trim() || '16:30',
      endTime: formEndTime.trim() || undefined,
      customFields: cleanedCustomFields.length > 0 ? cleanedCustomFields : undefined,
      updatedAt: new Date().toISOString(),
    };

    if (editingEntityId) {
      onUpdateEntity(entityPayload);
      setSaveSuccessMsg(isHe ? 'האירוע עודכן בהצלחה!' : 'Event updated successfully!');
    } else {
      onAddEntity(entityPayload);
      setSaveSuccessMsg(isHe ? 'אירוע חדש נוסף בהצלחה!' : 'New event created successfully!');
    }

    setIsEditorOpen(false);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deleteConfirmEntity) return;
    onDeleteEntity(deleteConfirmEntity.id);
    setDeleteConfirmEntity(null);
    setSaveSuccessMsg(isHe ? 'האירוע נמחק בהצלחה.' : 'Event deleted successfully.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  return (
    <div className="space-y-6" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-700 text-white flex items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg('')}
            className="p-1 rounded-full hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Screen Header & Top Action Bar */}
      <section className="hallmark-well-gold p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-paper-2 text-xs font-semibold text-ink-2">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span>
              {isHe
                ? `מסך ניהול אירועים מורשה (${appEnv.toUpperCase()})`
                : `Authorized Events Manager (${appEnv.toUpperCase()})`}
            </span>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink">
            {isHe ? 'ניהול אירועים ושדות מותאמים אישית' : 'Events & Custom Fields Manager'}
          </h1>

          <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
            {isHe
              ? 'כאן תוכלו לערוך, להוסיף, לשכפל ולמחוק אירועים מהלוח הראשי וממרכז הנוער, וכן להוסיף ולמחוק שדות מותאמים אישית לכל אירוע (ציוד, שעות, קישורים והנחיות).'
              : 'Add, edit, duplicate, and delete events across the main community calendar and the Youth Center. Dynamically manage custom fields on any event.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenCreateModal(true)}
            className="px-4 py-2.5 rounded-full bg-emerald-700 text-white hover:bg-emerald-800 transition-colors text-xs font-bold inline-flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isHe ? 'אירוע חדש למרכז הנוער' : 'Add Youth Event'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCreateModal(false)}
            className="hallmark-btn-primary text-xs font-bold !py-2.5 !px-5 inline-flex items-center gap-2 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isHe ? 'הוספת אירוע כללי חדש' : 'Add Community Event'}</span>
          </button>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="hallmark-plate p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted absolute start-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isHe
                  ? 'חיפוש אירוע לפי שם, תאריך, מארח, תגית או שדה מותאם אישית...'
                  : 'Search by title, date, host, tag, or custom field...'
              }
              className="hallmark-input ps-10 pe-4 py-2.5 text-xs sm:text-sm w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Area Selector */}
          <div className="shrink-0 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted" />
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value as 'all' | GoaArea)}
              className="hallmark-input py-2 text-xs font-semibold"
            >
              <option value="all">{isHe ? 'כל האזורים בגואה' : 'All Areas'}</option>
              {GOA_AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scope Pill Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rule">
          {[
            { id: 'all', labelHe: 'כל האירועים', labelEn: 'All Events', count: entities.length },
            {
              id: 'youth_center',
              labelHe: 'מרכז הנוער',
              labelEn: 'Youth Center',
              count: entities.filter((e) => e.isYouthCenter).length,
            },
            {
              id: 'community',
              labelHe: 'לוח קהילתי',
              labelEn: 'Community Schedule',
              count: entities.filter((e) => !e.isYouthCenter).length,
            },
            {
              id: 'workshop',
              labelHe: 'סדנאות ומפגשים',
              labelEn: 'Workshops',
              count: entities.filter((e) => e.type === 'workshop').length,
            },
            {
              id: 'event',
              labelHe: 'אירועים חד-פעמיים',
              labelEn: 'Single Events',
              count: entities.filter((e) => e.type === 'event').length,
            },
          ].map((pill) => {
            const isSelected = filterCategory === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setFilterCategory(pill.id as any)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-ink text-paper shadow-sm'
                    : 'bg-paper-2 text-ink-2 hover:bg-paper-3'
                }`}
              >
                <span>{isHe ? pill.labelHe : pill.labelEn}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-paper text-muted'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Events Table / Card List */}
      <section className="hallmark-plate overflow-hidden">
        <div className="px-5 py-4 bg-paper-2 border-b border-rule flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <h2 className="font-display text-base font-bold text-ink">
              {isHe ? 'רשימת אירועים לניהול' : 'Managed Events Roster'}
            </h2>
          </div>
          <span className="text-xs font-semibold text-muted">
            {filteredEntities.length} {isHe ? 'אירועים מוצגים' : 'events shown'}
          </span>
        </div>

        {filteredEntities.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Calendar className="w-8 h-8 text-muted mx-auto" />
            <p className="text-sm text-muted">
              {isHe
                ? 'לא נמצאו אירועים התואמים לחיפוש או לסינון הנוכחי.'
                : 'No events match your current search/filter.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
                setFilterArea('all');
              }}
              className="text-xs font-bold text-accent hover:underline"
            >
              {isHe ? 'איפוס כל הסינונים' : 'Reset all filters'}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-rule">
            {filteredEntities.map((item) => {
              const customFieldsCount = item.customFields?.length || 0;
              const title = isHe ? item.titleHe : item.titleEn;
              const desc = isHe ? item.descriptionHe : item.descriptionEn;
              const location = isHe ? item.locationDetailsHe : item.locationDetailsEn;

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-paper-2/40 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Thumbnail + Titles & Details */}
                  <div className="flex items-start gap-4 min-w-0">
                    <img
                      src={item.imageUrl}
                      alt={title}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0 bg-paper-2 border border-rule shadow-sm"
                    />

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.isYouthCenter ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-700 text-white">
                            {isHe ? 'מרכז הנוער' : 'Youth Center'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-accent/15 text-accent">
                            {item.type === 'event'
                              ? isHe
                                ? 'אירוע קהילתי'
                                : 'Community Event'
                              : isHe
                              ? 'סדנה / מפגש'
                              : 'Workshop'}
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-xs text-muted">
                          <MapPin className="w-3 h-3 text-accent" />
                          <span>{item.area}</span>
                        </span>

                        {customFieldsCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sand-200 text-ink">
                            <Sliders className="w-3 h-3 text-accent" />
                            <span>
                              {customFieldsCount} {isHe ? 'שדות מותאמים' : 'custom fields'}
                            </span>
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-base sm:text-lg font-bold text-ink leading-snug">
                        {title}
                      </h3>

                      <p className="text-xs text-ink-2 line-clamp-1 leading-relaxed">
                        {desc || (isHe ? 'ללא תיאור' : 'No description')}
                      </p>

                      {/* Schedule line */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted pt-0.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-ink">
                          <Clock className="w-3.5 h-3.5 text-accent" />
                          <span>
                            {item.date
                              ? `${item.date}`
                              : typeof item.dayOfWeek === 'number'
                              ? isHe
                                ? DAY_NAMES_HE[item.dayOfWeek]
                                : DAY_NAMES_EN[item.dayOfWeek]
                              : ''}
                            {item.startTime ? ` · ${item.startTime}` : ''}
                            {item.endTime ? ` – ${item.endTime}` : ''}
                          </span>
                        </span>

                        <span>•</span>
                        <span>{item.hostName}</span>
                        <span>•</span>
                        <span>{item.priceAmount === 0 ? (isHe ? 'חינם' : 'Free') : `₹${item.priceAmount}`}</span>
                      </div>

                      {/* Display Custom Fields Tags if present */}
                      {item.customFields && item.customFields.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {item.customFields.map((cf) => (
                            <span
                              key={cf.id}
                              className="px-2 py-0.5 rounded-md text-[11px] bg-paper-2 border border-rule text-ink flex items-center gap-1"
                              title={`${cf.key}: ${cf.value}`}
                            >
                              <span className="font-bold text-accent">{cf.key}:</span>
                              <span className="truncate max-w-[150px]">{cf.value}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions Buttons (Edit, Duplicate, Delete) */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0 pt-2 lg:pt-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="px-3.5 py-2 rounded-xl bg-paper-2 border border-rule hover:bg-paper-3 text-ink text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
                      title={isHe ? 'עריכת האירוע והשדות שלו' : 'Edit event and fields'}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-accent" />
                      <span>{isHe ? 'עריכה' : 'Edit'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateEvent(item)}
                      className="p-2 rounded-xl border border-rule hover:bg-paper-2 text-ink-2 hover:text-ink transition-colors"
                      title={isHe ? 'שכפול אירוע' : 'Duplicate event'}
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmEntity(item)}
                      className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      title={isHe ? 'מחיקת אירוע' : 'Delete event'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================================
          EVENT EDITOR MODAL (ADD & EDIT WITH DYNAMIC CUSTOM FIELDS)
         ===================================================================== */}
      {isEditorOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="hallmark-plate bg-paper w-full max-w-3xl my-auto rounded-3xl shadow-2xl border border-rule overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-paper-2 border-b border-rule flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center shadow-sm">
                  <Edit3 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">
                    {editingEntityId
                      ? isHe
                        ? 'עריכת אירוע ושדות מותאמים'
                        : 'Edit Event & Custom Fields'
                      : isHe
                      ? 'הוספת אירוע חדש למערכת'
                      : 'Create New Event'}
                  </h3>
                  <p className="text-[11px] text-muted">
                    {isHe
                      ? 'השינויים יישמרו ישירות ב-Firestore ובאתר החי'
                      : 'Changes sync directly to Firestore and live site'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-paper-3 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Scope & Association Toggle */}
              <div className="p-4 rounded-2xl bg-paper-2 border border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-ink block">
                    {isHe ? 'שיוך למרכז הנוער (Youth Center)' : 'Youth Center Association'}
                  </span>
                  <span className="text-[11px] text-muted">
                    {isHe
                      ? 'האם אירוע זה יוצג בלוח השנה הייעודי של מרכז הנוער?'
                      : 'Show in dedicated Youth Center schedule?'}
                  </span>
                </div>

                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsYouthCenter}
                    onChange={(e) => setFormIsYouthCenter(e.target.checked)}
                    className="w-5 h-5 accent-accent rounded"
                  />
                  <span className="text-xs font-bold text-ink">
                    {formIsYouthCenter ? (isHe ? 'כן, אירוע מרכז נוער' : 'Yes, Youth Center') : (isHe ? 'לא, אירוע כללי' : 'No, General Event')}
                  </span>
                </label>
              </div>

              {/* Basic Details: Titles & Descriptions */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                  {isHe ? '1. פרטי האירוע' : '1. Event Details'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'כותרת בעברית *' : 'Hebrew Title *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitleHe}
                      onChange={(e) => setFormTitleHe(e.target.value)}
                      placeholder={isHe ? 'לדוגמה: הקרנת סרט' : 'e.g., Movie Night'}
                      className="hallmark-input w-full text-xs sm:text-sm py-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'כותרת באנגלית' : 'English Title'}
                    </label>
                    <input
                      type="text"
                      value={formTitleEn}
                      onChange={(e) => setFormTitleEn(e.target.value)}
                      placeholder="e.g., Youth Movie Night"
                      className="hallmark-input w-full text-xs sm:text-sm py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'תיאור מפורט בעברית' : 'Hebrew Description'}
                    </label>
                    <textarea
                      rows={3}
                      value={formDescHe}
                      onChange={(e) => setFormDescHe(e.target.value)}
                      placeholder={isHe ? 'פירוט על תוכן הפעילות...' : 'Activity details...'}
                      className="hallmark-input w-full text-xs sm:text-sm py-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'תיאור באנגלית' : 'English Description'}
                    </label>
                    <textarea
                      rows={3}
                      value={formDescEn}
                      onChange={(e) => setFormDescEn(e.target.value)}
                      placeholder="English summary..."
                      className="hallmark-input w-full text-xs sm:text-sm py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Timing & Dates */}
              <div className="space-y-4 pt-4 border-t border-rule">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                  {isHe ? '2. מועד ושעות הפעילות' : '2. Schedule & Timing'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'תאריך מדויק (YYYY-MM-DD)' : 'Exact Date'}
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="hallmark-input w-full text-xs py-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'שעת התחלה' : 'Start Time'}
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="hallmark-input w-full text-xs py-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'שעת סיום' : 'End Time'}
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="hallmark-input w-full text-xs py-2"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink">
                    {isHe ? 'יום בשבוע (רלוונטי למפגש מחזורי)' : 'Day of Week'}
                  </label>
                  <select
                    value={formDayOfWeek}
                    onChange={(e) => setFormDayOfWeek(Number(e.target.value))}
                    className="hallmark-input w-full text-xs py-2"
                  >
                    {DAY_NAMES_HE.map((name, idx) => (
                      <option key={idx} value={idx}>
                        {isHe ? name : DAY_NAMES_EN[idx]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location & Host */}
              <div className="space-y-4 pt-4 border-t border-rule">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                  {isHe ? '3. מיקום ואיש קשר' : '3. Location & Host'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'אזור בגואה' : 'Area in Goa'}
                    </label>
                    <select
                      value={formArea}
                      onChange={(e) => setFormArea(e.target.value as GoaArea)}
                      className="hallmark-input w-full text-xs py-2"
                    >
                      {GOA_AREAS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'פירוט מיקום' : 'Location Details'}
                    </label>
                    <input
                      type="text"
                      value={formLocationHe}
                      onChange={(e) => setFormLocationHe(e.target.value)}
                      placeholder={isHe ? 'מרכז הנוער קולום (ליד שייליש)' : 'Colomb Youth Center'}
                      className="hallmark-input w-full text-xs py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'שם המארח / מנחה' : 'Host Name'}
                    </label>
                    <input
                      type="text"
                      value={formHostName}
                      onChange={(e) => setFormHostName(e.target.value)}
                      className="hallmark-input w-full text-xs py-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'טלפון מארח (לוואטסאפ)' : 'Host Phone'}
                    </label>
                    <input
                      type="text"
                      value={formHostPhone}
                      onChange={(e) => setFormHostPhone(e.target.value)}
                      className="hallmark-input w-full text-xs py-2"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing, Audience & Image */}
              <div className="space-y-4 pt-4 border-t border-rule">
                <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                  {isHe ? '4. קהל יעד, מחיר ומדיה' : '4. Audience, Price & Media'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'קהל יעד' : 'Audience'}
                    </label>
                    <select
                      value={formAudience}
                      onChange={(e) => setFormAudience(e.target.value as AudienceGroup)}
                      className="hallmark-input w-full text-xs py-2"
                    >
                      {AUDIENCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {isHe ? opt.labelHe : opt.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'מחיר (0 = חינם)' : 'Price Amount'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formPriceAmount}
                      onChange={(e) => setFormPriceAmount(Number(e.target.value))}
                      className="hallmark-input w-full text-xs py-2"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-ink">
                      {isHe ? 'מטבע' : 'Currency'}
                    </label>
                    <select
                      value={formPriceCurrency}
                      onChange={(e) => setFormPriceCurrency(e.target.value as any)}
                      className="hallmark-input w-full text-xs py-2"
                    >
                      <option value="FREE">חינם / FREE</option>
                      <option value="INR">רופי (INR)</option>
                      <option value="ILS">שקלים (ILS)</option>
                      <option value="USD">דולר (USD)</option>
                      <option value="CONTACT">לבירור / CONTACT</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-ink">
                    {isHe ? 'קישור לתמונה (URL)' : 'Image URL'}
                  </label>
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="hallmark-input w-full text-xs py-2"
                  />
                  {formImageUrl && (
                    <div className="mt-2 h-24 rounded-xl overflow-hidden border border-rule w-40">
                      <img
                        src={formImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Tags Management */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-ink">
                    {isHe ? 'תגיות האירוע' : 'Tags'}
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 pb-1">
                    {formTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-paper-2 border border-rule text-ink inline-flex items-center gap-1"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteTag(tag)}
                          className="text-muted hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder={isHe ? 'הקלד תגית ולחץ הוסף...' : 'New tag...'}
                      className="hallmark-input text-xs py-1.5 flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-3 py-1.5 rounded-xl bg-paper-2 border border-rule text-xs font-bold text-ink hover:bg-paper-3"
                    >
                      {isHe ? 'הוסף תגית' : 'Add Tag'}
                    </button>
                  </div>
                </div>
              </div>

              {/* =============================================================
                  ⭐ DYNAMIC CUSTOM FIELDS MANAGEMENT (הוספה ועריכה של שדות) ⭐
                 ============================================================= */}
              <div className="space-y-4 pt-4 border-t-2 border-accent/40 bg-sand-50/50 p-4 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span>{isHe ? '5. שדות מותאמים אישית לאירוע' : '5. Custom Dynamic Fields'}</span>
                    </h4>
                    <p className="text-[11px] text-muted">
                      {isHe
                        ? 'באפשרותכם להוסיף, לערוך ולמחוק כל שדה שתרצו עבור אירוע זה (כגון ציוד, מנחה אורח, קישור מיוחד ועוד).'
                        : 'Add, edit, or remove any custom field for this event.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddCustomField('', '')}
                    className="px-3 py-1.5 rounded-full bg-accent text-white hover:bg-accent-hover text-xs font-bold inline-flex items-center gap-1.5 shadow-sm self-start"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isHe ? 'הוספת שדה חדש' : 'Add Custom Field'}</span>
                  </button>
                </div>

                {/* Quick Suggestion Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-muted">
                    {isHe ? 'הוספה מהירה:' : 'Quick Presets:'}
                  </span>
                  {FIELD_SUGGESTIONS.map((preset) => (
                    <button
                      key={preset.keyHe}
                      type="button"
                      onClick={() =>
                        handleAddCustomField(
                          isHe ? preset.keyHe : preset.keyEn,
                          isHe ? preset.defaultValHe : ''
                        )
                      }
                      className="px-2.5 py-1 rounded-full bg-paper border border-rule hover:border-accent text-[11px] font-semibold text-ink-2 hover:text-accent transition-colors"
                    >
                      + {isHe ? preset.keyHe : preset.keyEn}
                    </button>
                  ))}
                </div>

                {/* List of Custom Fields */}
                {formCustomFields.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-rule text-center text-xs text-muted">
                    {isHe
                      ? 'אין שדות מותאמים אישית לאירוע זה. לחצו על "הוספת שדה חדש" או בחרו מההצעות למעלה.'
                      : 'No custom fields yet. Click "Add Custom Field" or choose a preset.'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formCustomFields.map((field) => (
                      <div
                        key={field.id}
                        className="p-3 rounded-xl bg-paper border border-rule flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-sm"
                      >
                        <input
                          type="text"
                          value={field.key}
                          onChange={(e) =>
                            handleUpdateCustomField(field.id, e.target.value, field.value)
                          }
                          placeholder={isHe ? 'שם השדה (למשל: ציוד נדרש)' : 'Field Name (e.g. Gear)'}
                          className="hallmark-input text-xs py-1.5 font-bold sm:w-1/3"
                        />
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) =>
                            handleUpdateCustomField(field.id, field.key, e.target.value)
                          }
                          placeholder={isHe ? 'ערך / פירוט השדה...' : 'Value / instructions...'}
                          className="hallmark-input text-xs py-1.5 flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomField(field.id)}
                          className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors self-end sm:self-center"
                          title={isHe ? 'מחיקת שדה זה' : 'Delete this field'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-rule flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2.5 rounded-full border border-rule text-xs font-semibold hover:bg-paper-2"
                >
                  {isHe ? 'ביטול' : 'Cancel'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="hallmark-btn-primary text-xs font-bold !py-2.5 !px-6 shadow-sm inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingEntityId ? (isHe ? 'שמירת שינויים' : 'Save Changes') : (isHe ? 'הוספת האירוע' : 'Create Event')}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          DELETE CONFIRMATION MODAL
         ===================================================================== */}
      {deleteConfirmEntity && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="hallmark-plate bg-paper w-full max-w-md p-6 rounded-3xl shadow-2xl border border-rule space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </span>
              <h3 className="font-display text-lg font-bold text-ink">
                {isHe ? 'אישור מחיקת אירוע' : 'Confirm Event Deletion'}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
              {isHe ? (
                <>
                  האם אתם בטוחים שברצונכם למחוק את האירוע{' '}
                  <span className="font-bold text-ink">
                    "{deleteConfirmEntity.titleHe}"
                  </span>
                  ? פעולה זו תסיר את האירוע לצמיתות מהלוח ומ-Firestore.
                </>
              ) : (
                <>
                  Are you sure you want to delete{' '}
                  <span className="font-bold text-ink">
                    "{deleteConfirmEntity.titleEn || deleteConfirmEntity.titleHe}"
                  </span>
                  ? This action cannot be undone.
                </>
              )}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmEntity(null)}
                className="px-4 py-2 rounded-full border border-rule text-xs font-semibold hover:bg-paper-2"
              >
                {isHe ? 'ביטול' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-full bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold transition-colors shadow-sm"
              >
                {isHe ? 'כן, למחוק אירוע' : 'Yes, Delete Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
