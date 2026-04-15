import React, { useMemo, useState } from 'react';
import { differenceInCalendarDays, startOfDay } from 'date-fns';

const PURPOSES = ['Board', 'JEE Mains', 'NEET', 'UPSC', 'SSC CGL', 'SSC GD'];
const DEFAULT_SUBJECT_BOXES = {
  Board: 5,
  'JEE Mains': 3,
  NEET: 3,
  UPSC: 9,
  'SSC CGL': 5,
  'SSC GD': 5,
};

export default function AIGenerateModal({ open, onClose, onGenerateAI, onCustom }) {
  const [purpose, setPurpose] = useState('Board');
  const [subjects, setSubjects] = useState(Array(5).fill(''));
  const [examDate, setExamDate] = useState('');
  const [dailyStudyHours, setDailyStudyHours] = useState(4);
  const [syllabusNotes, setSyllabusNotes] = useState('');

  const daysRemaining = useMemo(() => {
    if (!examDate) return null;
    const d = startOfDay(new Date(examDate));
    return Math.max(0, differenceInCalendarDays(d, startOfDay(new Date())));
  }, [examDate]);

  const handlePurposeChange = (p) => {
    setPurpose(p);
    const count = DEFAULT_SUBJECT_BOXES[p] || 5;
    setSubjects((prev) => {
      const next = [...prev];
      while (next.length < count) next.push('');
      return next.slice(0, count);
    });
  };

  const updateSubject = (idx, value) => {
    setSubjects((prev) => prev.map((s, i) => (i === idx ? value : s)));
  };

  const addSubjectField = () => setSubjects((prev) => [...prev, '']);
  const removeSubjectField = (idx) => setSubjects((prev) => prev.filter((_, i) => i !== idx));

  const submitPayload = () => ({
    purpose,
    subjects: subjects.map((s) => s.trim()).filter(Boolean),
    examDate,
    daysRemaining: daysRemaining ?? 0,
    dailyStudyHours: Number(dailyStudyHours),
    syllabusNotes: syllabusNotes.trim() || undefined,
  });

  const validate = () => purpose && examDate && Number(dailyStudyHours) > 0;
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Timetable Setup</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fill required details before generation.</p>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium mb-1">Purpose / Exam Type *</label>
            <select value={purpose} onChange={(e) => handlePurposeChange(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
              {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Subjects (dynamic, optional)</label>
              <button type="button" onClick={addSubjectField} className="text-sm text-indigo-600 dark:text-indigo-400">+ Add field</button>
            </div>
            <div className="space-y-2">
              {subjects.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input value={s} onChange={(e) => updateSubject(i, e.target.value)} placeholder={`Subject ${i + 1}`} className="flex-1 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
                  {subjects.length > 1 && (
                    <button type="button" onClick={() => removeSubjectField(i)} className="px-3 rounded-xl border border-gray-300 dark:border-gray-600 text-sm">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Upcoming Exam Date *</label>
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Daily Available Study Hours *</label>
              <input type="number" min={0.5} step={0.5} value={dailyStudyHours} onChange={(e) => setDailyStudyHours(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Syllabus or notes (optional)</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Paste key chapters or topics; helps AI weight your timetable. PDF upload can be added later.</p>
            <textarea
              value={syllabusNotes}
              onChange={(e) => setSyllabusNotes(e.target.value)}
              rows={4}
              placeholder="e.g. Unit 3: Electromagnetic induction; past paper focus on numericals…"
              className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
            />
          </div>

          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 text-sm">
            <p><strong>Days remaining:</strong> {daysRemaining == null ? 'Select exam date' : daysRemaining}</p>
            <p><strong>Daily study minutes:</strong> {Math.round((Number(dailyStudyHours) || 0) * 60)}</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600">Cancel</button>
          <button type="button" disabled={!validate()} onClick={() => onCustom(submitPayload())} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white disabled:opacity-50">
            Custom (Manual Timetable)
          </button>
          <button type="button" disabled={!validate()} onClick={() => onGenerateAI(submitPayload())} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-50">
            Generate with AI
          </button>
        </div>
      </div>
    </div>
  );
}