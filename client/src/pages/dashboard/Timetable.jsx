import React, { useEffect, useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';
import FocusMode from '../../components/FocusMode';
import TopicTestForm from '../../components/TopicTestForm';
import AIGenerateModal from '../../components/AIGenerateModal';
import RevisionTestModal from '../../components/RevisionTestModal';

export default function Timetable() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [timetable, setTimetable] = useState(null);
  const [focusSession, setFocusSession] = useState(null);
  const [focusSlot, setFocusSlot] = useState(null);
  const [pendingTest, setPendingTest] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlot, setNewSlot] = useState({ subject: '', topic: '', durationMinutes: 45 });
  const [preview, setPreview] = useState(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [revisionPool, setRevisionPool] = useState({ frozen: false, tasks: [] });
  const [activeRevisionTask, setActiveRevisionTask] = useState(null);

  const load = () => {
    api.get(`/timetable?date=${date}`).then(setTimetable).catch(() => setTimetable({ slots: [] }));
    api.get('/tests/revision/pool').then(setRevisionPool).catch(() => setRevisionPool({ frozen: false, tasks: [] }));
  };

  useEffect(() => {
    load();
  }, [date]);

  const startFocus = async (slot, index) => {
    try {
      const session = await api.post('/focus/start', {
        timetableId: timetable?._id,
        slotIndex: index,
        subject: slot.subject,
        topic: slot.topic,
        plannedDurationMinutes: slot.durationMinutes,
      });
      setFocusSession(session);
      setFocusSlot({ ...slot, _slotIndex: index });
    } catch (e) {
      toast.error(e.message || 'Failed to start');
    }
  };

  const handleFocusEnd = async (status) => {
    const sessionId = focusSession?._id;
    const slot = focusSlot;
    setFocusSession(null);
    setFocusSlot(null);
    if (status === 'completed') {
      if (slot && sessionId) {
        setPendingTest({
          focusSessionId: sessionId,
          subject: slot.subject,
          topic: slot.topic,
          timetableId: timetable?._id,
          slotIndex: slot._slotIndex,
        });
      }
    }
    load();
  };

  const handleTestSubmitted = () => {
    setPendingTest(null);
    load();
  };

  const showPreview = async () => {
    setRegenerating(true);
    try {
      const data = await api.post('/timetable/preview', { date });
      setPreview({
        days: [{ date: data.date || date, slots: data.slots || [] }],
        dayCount: 1,
        aiMeta: timetable?.aiMeta,
      });
    } catch (e) {
      toast.error(e.message || 'Failed to generate preview');
    } finally {
      setRegenerating(false);
    }
  };

  const generateFromModal = async (payload) => {
    setRegenerating(true);
    try {
      await api.post('/ai/profile', payload);
      await api.post('/ai/analyze');
      const generated = await api.post('/ai/generate-timetable', { date, save: false });
      const days = generated.days?.length ? generated.days : [];
      setPreview({
        days,
        dayCount: generated.dayCount ?? days.length,
        purpose: payload.purpose,
        aiMeta: {
          purpose: payload.purpose,
          examDate: payload.examDate,
          daysRemaining: payload.daysRemaining,
          dailyStudyMinutes: Math.round((Number(payload.dailyStudyHours) || 0) * 60),
        },
      });
      setShowAIModal(false);
    } catch (e) {
      toast.error(e.message || 'Failed to generate AI timetable');
    } finally {
      setRegenerating(false);
    }
  };

  const startCustomMode = async (payload) => {
    try {
      await api.post('/ai/profile', payload);
      setShowAIModal(false);
      setShowAddSlot(true);
      toast.success('Custom mode enabled. Add your topics manually.');
    } catch (e) {
      toast.error(e.message || 'Failed to start custom mode');
    }
  };

  const applyPreview = async () => {
    if (!preview?.days?.length) return;
    setRegenerating(true);
    try {
      await api.post('/timetable/apply-plan', {
        days: preview.days,
        isAdvancedAIGenerated: true,
        aiMeta: preview.aiMeta,
      });
      toast.success(`Timetable applied (${preview.days.length} days)`);
      setPreview(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to apply');
    } finally {
      setRegenerating(false);
    }
  };

  const addSlot = async (e) => {
    e.preventDefault();
    if (!newSlot.subject.trim() || !newSlot.topic.trim()) {
      toast.error('Subject and topic required');
      return;
    }
    try {
      await api.post('/timetable/slot', { ...newSlot, date });
      toast.success('Slot added');
      setNewSlot({ subject: '', topic: '', durationMinutes: 45 });
      setShowAddSlot(false);
      load();
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
  };

  const slots = timetable?.slots || [];
  const day = new Date(date);

  if (pendingTest) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Topic completion test</h1>
        <TopicTestForm
          focusSessionId={pendingTest.focusSessionId}
          subject={pendingTest.subject}
          topic={pendingTest.topic}
          timetableId={pendingTest.timetableId}
          slotIndex={pendingTest.slotIndex}
          onSubmitted={handleTestSubmitted}
        />
      </div>
    );
  }

  if (focusSession) {
    return (
      <FocusMode
        sessionId={focusSession._id}
        plannedMinutes={focusSlot?.durationMinutes || 45}
        subject={focusSlot?.subject}
        topic={focusSlot?.topic}
        examContext={timetable?.aiMeta?.purpose}
        onEnd={handleFocusEnd}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 gradient-text">📅 Timetable</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">{format(day, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Navigation and Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-8 animate-slide-down">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1">
          <button 
            onClick={() => setDate(format(subDays(day, 1), 'yyyy-MM-dd'))} 
            className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            ←
          </button>
          <span className="font-semibold text-gray-900 dark:text-white px-3">{format(day, 'MMM d')}</span>
          <button 
            onClick={() => setDate(format(addDays(day, 1), 'yyyy-MM-dd'))} 
            className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            →
          </button>
        </div>

        <button 
          type="button" 
          onClick={() => setShowAIModal(true)} 
          disabled={regenerating} 
          className="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 btn-glow"
        >
          {regenerating ? '⚙️ Generating...' : '🤖 AI Generate'}
        </button>
        <button 
          type="button" 
          onClick={() => setShowAddSlot(!showAddSlot)} 
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
        >
          {showAddSlot ? '✕ Cancel' : '+ Add Task'}
        </button>
      </div>

      {revisionPool.frozen && (
        <div className="mb-6 p-4 rounded-2xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
            Timetable progression is frozen due to failed revision. Pass a revision test to continue.
          </p>
          <div className="flex flex-wrap gap-2">
            {(revisionPool.tasks || []).filter((t) => t.status !== 'passed').slice(0, 5).map((task) => (
              <button
                key={task._id}
                onClick={() => setActiveRevisionTask(task)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 text-sm"
              >
                Take revision: {task.subject} - {task.topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add Slot Form */}
      {showAddSlot && (
        <div className="mb-8 rounded-3xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-800/50 p-6 shadow-lg animate-scale-in">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📝 Add New Task</h3>
          <form onSubmit={addSlot} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input 
                placeholder="Subject (e.g., Physics)" 
                value={newSlot.subject} 
                onChange={(e) => setNewSlot({ ...newSlot, subject: e.target.value })} 
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
              />
              <input 
                placeholder="Topic (e.g., Quantum Mechanics)" 
                value={newSlot.topic} 
                onChange={(e) => setNewSlot({ ...newSlot, topic: e.target.value })} 
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
              />
              <input 
                type="number" 
                min={5} 
                max={180} 
                placeholder="Duration (min)" 
                value={newSlot.durationMinutes} 
                onChange={(e) => setNewSlot({ ...newSlot, durationMinutes: Number(e.target.value) || 45 })} 
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            <button 
              type="submit" 
              className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              ✓ Add Task
            </button>
          </form>
        </div>
      )}

      <AIGenerateModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerateAI={generateFromModal}
        onCustom={startCustomMode}
      />

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Preview — {preview.dayCount ?? preview.days?.length ?? 0} days</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Plan distributed until your exam date (daily minutes cap). Apply to save every day at once.</p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-6">
              {(preview.days || []).map((planDay, di) => (
                <div key={di}>
                  <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                    {format(new Date(planDay.date), 'EEEE, MMM d, yyyy')}
                  </h4>
                  <div className="space-y-2">
                    {(planDay.slots || []).map((slot, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{slot.subject}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{slot.topic}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {slot.durationMinutes} min{slot.isRevisionSlot ? ' · Revision' : ''}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">#{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 flex gap-3 justify-end border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={() => setPreview(null)} className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button type="button" onClick={applyPreview} disabled={regenerating} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:shadow-lg disabled:opacity-50">
                {regenerating ? 'Applying...' : 'Apply to Timetable'}
              </button>
            </div>
          </div>
        </div>
      )}

      <RevisionTestModal
        open={!!activeRevisionTask}
        task={activeRevisionTask}
        onClose={() => setActiveRevisionTask(null)}
        onSubmitted={load}
      />

      {/* Slots List */}
      {slots.length > 0 ? (
        <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {slots.map((slot, index) => (
            <div
              key={index}
              className={`rounded-2xl border-2 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300 hover:shadow-lg animate-fade-in-up ${
                slot.completed 
                  ? 'border-green-300 dark:border-green-700 bg-gradient-to-r from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10' 
                  : 'border-gray-300 dark:border-gray-600 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-gray-800/50 hover:scale-102'
              }`}
              style={{ animationDelay: `${300 + index * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white ${
                  slot.completed 
                    ? 'bg-gradient-to-br from-green-400 to-green-600' 
                    : 'bg-gradient-to-br from-blue-400 to-indigo-600'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{slot.subject}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{slot.topic}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-500">
                    <span>⏱️ {slot.durationMinutes} min</span>
                    {slot.isRevisionSlot && <span className="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Revision</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {slot.completed ? (
                  <span className="px-4 py-2 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                    ✓ Completed
                  </span>
                ) : (
                  <button 
                    onClick={() => startFocus(slot, index)} 
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 btn-glow"
                  >
                    ▶ Start
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 animate-fade-in-up">
          <div className="text-5xl mb-4">📚</div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No tasks for this day</p>
          <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
            Add tasks manually or use AI to generate a smart timetable based on your subjects
          </p>
          <button 
            onClick={() => setShowAIModal(true)}
            disabled={regenerating}
            className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50"
          >
            🤖 Generate with AI
          </button>
        </div>
      )}
    </div>
  );
}
