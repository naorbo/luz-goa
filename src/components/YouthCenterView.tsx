import React, { useState } from 'react';
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  HeartHandshake,
  Download,
  MapPin,
  Sparkles,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import {
  YouthCenterFamily,
  ChildDetail,
  GoaArea,
  VolunteerRole,
  Language,
} from '../types/luz';

interface YouthCenterViewProps {
  families: YouthCenterFamily[];
  lang: Language;
  onRegisterFamily: (family: Omit<YouthCenterFamily, 'id' | 'createdAt'>) => void;
}

export const YouthCenterView: React.FC<YouthCenterViewProps> = ({
  families,
  lang,
  onRegisterFamily,
}) => {
  const isHe = lang === 'he';

  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [area, setArea] = useState<GoaArea>('Colomb');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [volunteerRole, setVolunteerRole] = useState<VolunteerRole>('activities');
  const [consentVolunteer, setConsentVolunteer] = useState(true);
  const [googleScriptUrl, setGoogleScriptUrl] = useState('');
  const [showSheetSetup, setShowSheetSetup] = useState(false);

  const [children, setChildren] = useState<ChildDetail[]>([
    { id: 'c-init-1', name: '', age: 12, grade: 'ו׳ / 6th', interests: '' },
  ]);

  const [submitted, setSubmitted] = useState(false);

  const handleAddChild = () => {
    if (children.length >= 4) return;
    setChildren((prev) => [
      ...prev,
      {
        id: `c-${Date.now()}`,
        name: '',
        age: 11,
        grade: 'ה׳ / 5th',
        interests: '',
      },
    ]);
  };

  const handleRemoveChild = (id: string) => {
    if (children.length <= 1) return;
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateChild = (id: string, field: keyof ChildDetail, value: string | number) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newFamily: Omit<YouthCenterFamily, 'id' | 'createdAt'> = {
      parentName,
      parentPhone,
      parentEmail,
      area,
      emergencyContact,
      medicalNotes: medicalNotes || (isHe ? 'ללא' : 'None'),
      volunteerRole,
      consentVolunteer,
      children,
    };

    onRegisterFamily(newFamily);

    // Optional live sync to Google Apps Script Web App if configured
    if (googleScriptUrl.trim().startsWith('https://script.google.com')) {
      try {
        const formData = new FormData();
        formData.append('Parent Name', parentName);
        formData.append('Parent Phone', parentPhone);
        formData.append('Parent Email', parentEmail);
        formData.append('Area', area);
        children.forEach((child, idx) => {
          formData.append(`Child ${idx + 1} Name`, child.name);
          formData.append(`Child ${idx + 1} Age`, String(child.age));
          formData.append(`Child ${idx + 1} Grade`, child.grade);
        });
        formData.append('Emergency Contact', emergencyContact);
        formData.append('Medical Info', medicalNotes);
        formData.append('Volunteer Role', volunteerRole);
        await fetch(googleScriptUrl.trim(), {
          method: 'POST',
          body: formData,
          mode: 'no-cors',
        });
      } catch {
        // Fallback already stored locally in LUZ DB
      }
    }

    setSubmitted(true);
  };

  const exportFamiliesToCsv = () => {
    const headers = [
      'Timestamp',
      'Parent Name',
      'Parent Phone',
      'Parent Email',
      'Area',
      'Volunteer Role',
      'Emergency Contact',
      'Medical Notes',
      'Child 1 Name',
      'Child 1 Age',
      'Child 1 Grade',
      'Child 2 Name',
      'Child 2 Age',
      'Child 2 Grade',
      'Child 3 Name',
      'Child 3 Age',
      'Child 3 Grade',
    ];

    const rows = families.map((f) => [
      f.createdAt,
      f.parentName,
      f.parentPhone,
      f.parentEmail,
      f.area,
      f.volunteerRole,
      f.emergencyContact,
      f.medicalNotes,
      f.children[0]?.name || '',
      f.children[0]?.age || '',
      f.children[0]?.grade || '',
      f.children[1]?.name || '',
      f.children[1]?.age || '',
      f.children[1]?.grade || '',
      f.children[2]?.name || '',
      f.children[2]?.age || '',
      f.children[2]?.grade || '',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'youth_center_goa_families.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalKids = families.reduce((sum, f) => sum + f.children.length, 0);

  return (
    <div className="space-y-8 animate-reveal">
      {/* Top Vision & 4-Day Overview Banner */}
      <div className="bg-canopy-900 text-sand-50 rounded-2xl p-6 md:p-8 border border-canopy-800 grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold leading-tight">
            {isHe
              ? 'מרכז הנוער גואה (Youth Center Goa) — המקום שלהם. הקהילה שלנו.'
              : 'Youth Center Goa — Their Place. Our Community.'}
          </h2>
          <p className="text-sm md:text-base text-sand-200 leading-relaxed max-w-2xl">
            {isHe
              ? 'הילדים שלנו גדלים בקהילה ייחודית שנמצאת בתנועה מתמדת. בקולום (ליד החנות של שייליש) אנחנו מקימים מרחב במבוק פתוח וקבוע לבני 11–15 (עם התרחבות ל-8–15) — מקום שהם שותפים לעיצובו, לבניית חברויות וליצירה.'
              : 'Our children grow up in a unique community on the move. In Colomb (near Shailish’s shop), we are building an open bamboo pavilion for ages 11–15 (expanding to 8–15) — a space they help shape and call their own.'}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-sand-100">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-canopy-800 border border-canopy-700 font-medium">
              <MapPin className="w-3.5 h-3.5 text-terracotta-400" />
              {isHe ? 'מיקום: קולום, ליד שייליש' : 'Location: Colomb, near Shailish'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-canopy-800 border border-canopy-700 font-medium">
              <Calendar className="w-3.5 h-3.5 text-ochre-400" />
              {isHe ? 'פתיחה: 1 בנובמבר (ב׳–ה׳)' : 'Target Opening: Nov 1 (Mon–Thu)'}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-ochre-500 text-canopy-950 font-bold tabular-nums">
              ₪200 / $65 {isHe ? 'לילד לחודש + משמרת הורה חודשית' : 'per child/mo + 1 parent shift'}
            </span>
          </div>
        </div>

        {/* Poem Quote by Noam Horev */}
        <div className="lg:col-span-5 bg-canopy-950/80 rounded-2xl p-5 border border-canopy-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-ochre-400 font-medium">
            <span>{isHe ? 'הורות / נועם חורב' : 'Parenthood / Noam Horev'}</span>
            <span>The Parenting Paradox</span>
          </div>
          <blockquote className="font-display text-base md:text-lg italic text-sand-100 leading-relaxed">
            {isHe
              ? '״אולי שני קולות יתנגנו בי כל חיי — מצד אחד לתת לך ללכת, ומצד שני להשאיר אותך קרוב אליי.״'
              : '“Maybe two voices will echo through me all my life — one telling me to let you go, the other keeping you close to me.”'}
          </blockquote>
          <p className="text-xs text-sand-300">
            {isHe
              ? 'איך נותנים להם חופש ועצמאות — בלי לוותר על הכפר שעוטף אותם?'
              : 'How do we give them freedom — without letting go of the village?'}
          </p>
        </div>
      </div>

      {/* Main Content: Registration Form + Registered Community Directory */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Registration Form (Up to 4 Kids) */}
        <div className="lg:col-span-7">
          <div className="bg-sand-50 rounded-2xl border border-sand-300 p-6 md:p-7 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sand-200 pb-4">
              <div>
                <h3 className="font-display text-2xl font-bold text-canopy-900">
                  {isHe
                    ? 'טופס רישום משפחה וילדים למרכז הנוער'
                    : 'Family & Multi-Child Registration Form'}
                </h3>
                <p className="text-xs text-canopy-600">
                  {isHe
                    ? 'ניתן לרשום ילד אחד או יותר (כולל הנחת אחים) ולבחור תחום מעורבות הורים'
                    : 'Register one or multiple children and select your monthly parent contribution'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSheetSetup(!showSheetSetup)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-sand-300 text-canopy-800 hover:bg-sand-100"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-canopy-700" />
                {isHe ? 'חיבור ל-Google Sheets' : 'Google Sheets Sync'}
              </button>
            </div>

            {showSheetSetup && (
              <div className="p-4 rounded-xl bg-sand-100 border border-sand-300 space-y-2 text-xs">
                <label className="font-semibold text-canopy-900 block">
                  {isHe
                    ? 'כתובת Webhook של Google Apps Script (אופציונלי — לשליחה אוטומטית לגיליון):'
                    : 'Optional Google Apps Script Web App URL (/exec):'}
                </label>
                <input
                  type="url"
                  value={googleScriptUrl}
                  onChange={(e) => setGoogleScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-xs font-mono"
                  dir="ltr"
                />
                <p className="text-canopy-600">
                  {isHe
                    ? 'גם ללא כתובת סקריפט, כל ההרשמות נשמרות במערכת וניתנות לייצוא מלא לקובץ אקסל/Google Sheets בלחיצה!'
                    : 'All registrations are saved automatically and can be exported to Google Sheets CSV anytime.'}
                </p>
              </div>
            )}

            {submitted ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-canopy-100 text-canopy-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-display text-2xl font-bold text-canopy-900">
                  {isHe
                    ? 'המשפחה והילדים נרשמו בהצלחה למרכז הנוער!'
                    : 'Family Registration Completed!'}
                </h4>
                <p className="text-sm text-canopy-600 max-w-md mx-auto">
                  {isHe
                    ? `תודה ${parentName}! פרטי ${children.length} הילדים נשמרו במאגר הקהילה.`
                    : `Thank you ${parentName}! Your ${children.length} child(ren) have been added to the Youth Center roster.`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setParentName('');
                    setChildren([{ id: `c-${Date.now()}`, name: '', age: 12, grade: 'ו׳ / 6th', interests: '' }]);
                  }}
                  className="px-4 py-2 rounded-xl bg-canopy-800 text-sand-50 text-xs font-semibold"
                >
                  {isHe ? 'רישום משפחה נוספת' : 'Register Another Family'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* SECTION A: PARENT DETAILS */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-canopy-700">
                    {isHe ? '1. פרטי הורה ויצירת קשר' : '1. Parent Details'}
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-canopy-700 mb-1">
                        {isHe ? 'שם ההורה(ים)' : 'Parent Name(s)'}
                      </label>
                      <input
                        type="text"
                        required
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder={isHe ? 'לדוגמה: רוני ומיכל כהן' : 'e.g., Roni & Michal'}
                        className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-canopy-700 mb-1">
                        {isHe ? 'טלפון וואטסאפ' : 'WhatsApp Phone'}
                      </label>
                      <input
                        type="tel"
                        required
                        value={parentPhone}
                        onChange={(e) => setParentPhone(e.target.value)}
                        placeholder="+972-52-..."
                        className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2 text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-canopy-700 mb-1">
                        {isHe ? 'אימייל' : 'Email Address'}
                      </label>
                      <input
                        type="email"
                        required
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="family@gmail.com"
                        className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-canopy-700 mb-1">
                        {isHe ? 'אזור מגורים בגואה' : 'Neighborhood in Goa'}
                      </label>
                      <select
                        value={area}
                        onChange={(e) => setArea(e.target.value as GoaArea)}
                        className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2 text-sm"
                      >
                        <option value="Colomb">Colomb (קולום)</option>
                        <option value="Patnem">Patnem (פטנם)</option>
                        <option value="Palolem">Palolem (פאלולם)</option>
                        <option value="Agonda">Agonda (אגונדה)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION B: DYNAMIC CHILDREN LIST */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-canopy-700">
                      {isHe
                        ? `2. פרטי הילדים (${children.length} ילדים)`
                        : `2. Children Details (${children.length})`}
                    </h4>
                    {children.length < 4 && (
                      <button
                        type="button"
                        onClick={handleAddChild}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ochre-500 text-canopy-950 text-xs font-bold hover:bg-ochre-400 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isHe ? 'הוספת ילד/ה נוסף' : 'Add Another Child'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {children.map((child, idx) => (
                      <div
                        key={child.id}
                        className="p-4 rounded-xl bg-white border border-sand-300 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-canopy-800">
                            {isHe ? `ילד/ה #${idx + 1}` : `Child #${idx + 1}`}
                          </span>
                          {children.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveChild(child.id)}
                              className="text-xs text-terracotta-600 hover:underline inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {isHe ? 'הסרה' : 'Remove'}
                            </button>
                          )}
                        </div>

                        <div className="grid sm:grid-cols-4 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-medium text-canopy-600 mb-1">
                              {isHe ? 'שם הילד/ה' : 'Child Name'}
                            </label>
                            <input
                              type="text"
                              required
                              value={child.name}
                              onChange={(e) =>
                                handleUpdateChild(child.id, 'name', e.target.value)
                              }
                              placeholder={isHe ? 'שם פרטי' : 'First Name'}
                              className="w-full rounded-lg border border-sand-300 px-3 py-1.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-canopy-600 mb-1">
                              {isHe ? 'גיל (8–16)' : 'Age (8–16)'}
                            </label>
                            <input
                              type="number"
                              min={6}
                              max={18}
                              required
                              value={child.age}
                              onChange={(e) =>
                                handleUpdateChild(
                                  child.id,
                                  'age',
                                  parseInt(e.target.value, 10) || 11
                                )
                              }
                              className="w-full rounded-lg border border-sand-300 px-3 py-1.5 text-sm tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-medium text-canopy-600 mb-1">
                              {isHe ? 'כיתה / שכבה' : 'Grade'}
                            </label>
                            <input
                              type="text"
                              value={child.grade}
                              onChange={(e) =>
                                handleUpdateChild(child.id, 'grade', e.target.value)
                              }
                              className="w-full rounded-lg border border-sand-300 px-3 py-1.5 text-sm"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-medium text-canopy-600 mb-1">
                              {isHe
                                ? 'תחומי עניין ומה היה רוצה לעשות במתנ"ס (מוזיקה, מייקרים, משחקי קופסה, קולנוע...)'
                                : 'Interests & Ideas for the Youth Center'}
                            </label>
                            <input
                              type="text"
                              value={child.interests}
                              onChange={(e) =>
                                handleUpdateChild(child.id, 'interests', e.target.value)
                              }
                              placeholder={
                                isHe
                                  ? 'לדוגמה: גיטרה, נגרות בבמבוק, ערבי סרט...'
                                  : 'e.g., Guitar, Bamboo crafting, Board games...'
                              }
                              className="w-full rounded-lg border border-sand-300 px-3 py-1.5 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION C: HEALTH, EMERGENCY & VOLUNTEER SHIFT */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-canopy-700 mb-1">
                      {isHe ? 'איש קשר נוסף לחירום' : 'Emergency Contact'}
                    </label>
                    <input
                      type="text"
                      required
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      placeholder={isHe ? 'שם + טלפון' : 'Name + Phone'}
                      className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-canopy-700 mb-1">
                      {isHe ? 'רגישויות / אלרגיות / מידע רפואי' : 'Allergies / Medical Notes'}
                    </label>
                    <input
                      type="text"
                      value={medicalNotes}
                      onChange={(e) => setMedicalNotes(e.target.value)}
                      placeholder={isHe ? 'לדוגמה: רגישות לבוטנים / ללא' : 'e.g., None'}
                      className="w-full rounded-xl border border-sand-300 bg-white px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-sand-100 border border-sand-300 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-canopy-900">
                    <HeartHandshake className="w-4 h-4 text-terracotta-500" />
                    {isHe
                      ? 'מעורבות הורים (המודל המשותף — משמרת אחת לחודש)'
                      : 'Shared Parent Involvement (~1 shift per month)'}
                  </div>
                  <select
                    value={volunteerRole}
                    onChange={(e) => setVolunteerRole(e.target.value as VolunteerRole)}
                    className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 text-xs font-medium"
                  >
                    <option value="activities">
                      {isHe
                        ? 'פעילויות ותוכן: הובלת משחק, סדנה, שיחה ב-Open Minds או אירוע'
                        : 'Activities: Lead a game, workshop, or Open Minds session'}
                    </option>
                    <option value="community">
                      {isHe
                        ? 'קהילה ותקשורת: קבלת פנים למשפחות חדשות ("משפחה מאמצת")'
                        : 'Community & Welcome: Onboard new families'}
                    </option>
                    <option value="scheduling">
                      {isHe
                        ? 'תיאום ושיבוץ: ארגון לוח משמרות מתנדבים'
                        : 'Scheduling: Coordinate parent volunteer shifts'}
                    </option>
                    <option value="logistics">
                      {isHe
                        ? 'לוגיסטיקה וציוד: ארגון חומרי יצירה, במבוק וכיבוד לערב סרט'
                        : 'Logistics: Organize supplies, equipment, and space'}
                    </option>
                    <option value="finance">
                      {isHe
                        ? 'כספים ושקיפות: ניהול תקציב הקהילה (₪200 לילד)'
                        : 'Finance: Manage transparent community budget'}
                    </option>
                  </select>

                  <label className="flex items-start gap-2.5 text-xs text-canopy-800 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      required
                      checked={consentVolunteer}
                      onChange={(e) => setConsentVolunteer(e.target.checked)}
                      className="mt-0.5 rounded text-terracotta-500"
                    />
                    <span>
                      {isHe
                        ? 'אני מאשר/ת את השתתפות ילדיי במרכז הנוער בקולום ומסכים/ה לקחת חלק במודל הקהילתי המשותף (תרומה חודשית ומשמרת הורה כפי שיתואם).'
                        : 'I consent to my children participating in Youth Center Goa and agree to take part in our shared community model.'}
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-terracotta-500 text-white font-semibold text-sm hover:bg-terracotta-600 transition-colors shadow-sm"
                >
                  {isHe
                    ? `שליחת רישום (${children.length} ילדים) למרכז הנוער`
                    : `Complete Registration (${children.length} Children)`}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Registered Families Roster & Export to Google Sheets */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-sand-50 rounded-2xl border border-sand-300 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-canopy-900">
                  {isHe ? 'משפחות וילדים רשומים' : 'Registered Families & Youth'}
                </h3>
                <p className="text-xs text-canopy-600 tabular-nums">
                  {families.length} {isHe ? 'משפחות' : 'families'} • {totalKids}{' '}
                  {isHe ? 'ילדים רשומים' : 'children enrolled'}
                </p>
              </div>
              <button
                type="button"
                onClick={exportFamiliesToCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-canopy-800 text-sand-50 text-xs font-semibold hover:bg-canopy-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-ochre-400" />
                {isHe ? 'ייצוא CSV ל-Sheets' : 'Export CSV'}
              </button>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pe-1">
              {families.length === 0 ? (
                <div className="p-6 rounded-xl bg-white border border-sand-300 text-center space-y-2">
                  <Users className="w-6 h-6 text-canopy-600 mx-auto" />
                  <p className="text-sm font-semibold text-canopy-900">
                    {isHe
                      ? 'טרם נרשמו משפחות בסביבה זו'
                      : 'No families registered in this environment yet'}
                  </p>
                  <p className="text-xs text-canopy-600 leading-relaxed">
                    {isHe
                      ? 'טופס הרישום מוכן לקליטת משפחות אמת של הקהילה וייצוא ישיר ל-Google Sheets.'
                      : 'Use the registration form to enroll real community families and export directly to Google Sheets.'}
                  </p>
                </div>
              ) : (
                families.map((fam) => (
                  <div
                    key={fam.id}
                    className="p-4 rounded-xl bg-white border border-sand-300 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-canopy-900">{fam.parentName}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-sand-100 text-canopy-700 font-medium">
                        {fam.area}
                      </span>
                    </div>
                    <div className="text-xs text-canopy-600 tabular-nums">
                      {fam.parentPhone} • {fam.parentEmail}
                    </div>
                    <div className="space-y-1 pt-1 border-t border-sand-100">
                      {fam.children.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs bg-sand-50 px-2.5 py-1.5 rounded-lg"
                        >
                          <span className="font-semibold text-canopy-900">
                            {c.name} ({isHe ? 'גיל' : 'Age'} {c.age}, {c.grade})
                          </span>
                          <span className="text-canopy-600 truncate max-w-[45%]">{c.interests}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
