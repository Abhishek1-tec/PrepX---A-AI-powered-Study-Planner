import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

const DEFAULT_TIME_SEC = 600;

export default function RevisionTestModal({ open, onClose, task, onSubmitted }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState(null);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [shortAnswers, setShortAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_SEC);
  const finishedRef = useRef(false);
  const performSubmitRef = useRef(async () => {});

  useEffect(() => {
    if (!open || !task) {
      setData(null);
      return;
    }
    finishedRef.current = false;
    setLoading(true);
    setMcqAnswers({});
    setShortAnswers({});
    api
      .post('/tests/revision/generate', {
        revisionTaskId: task._id,
        subject: task.subject,
        topic: task.topic,
      })
      .then(setData)
      .catch((e) => toast.error(e.message || 'Failed to load revision test'))
      .finally(() => setLoading(false));
  }, [open, task]);

  const limitSec = data?.timeLimitSeconds ?? DEFAULT_TIME_SEC;

  const performSubmit = useCallback(
    async (fromTimeout) => {
      if (!data || !task || finishedRef.current) return;
      finishedRef.current = true;
      const mcqList = data.mcqs || [];
      if (!fromTimeout && mcqList.some((_, i) => mcqAnswers[i] == null)) {
        toast.error('Please answer all MCQs');
        finishedRef.current = false;
        return;
      }
      const payload = {
        mcqs: mcqList.map((m, i) => ({ ...m, selectedIndex: mcqAnswers[i] ?? -1 })),
        shortAnswers: (data.shortAnswers || []).map((s, i) => ({ ...s, studentAnswer: shortAnswers[i] || '' })),
      };
      if (!fromTimeout && payload.shortAnswers.some((s) => !s.studentAnswer?.trim())) {
        toast.error('Please answer all short questions');
        finishedRef.current = false;
        return;
      }
      setSubmitting(true);
      try {
        const result = await api.post(`/tests/revision/${task._id}/submit`, payload);
        const pct = result?.test?.percentage ?? 0;
        if (fromTimeout) {
          toast.success(`Time's up — submitted (${pct}%). ${pct >= 65 ? 'Revision passed.' : 'Need ≥ 65% to pass revision.'}`);
        } else if (pct >= 65) toast.success('Revision passed. Progression unlocked.');
        else toast.error('Revision failed. Topic is moved back to incomplete.');
        onSubmitted?.();
        onClose?.();
      } catch (e) {
        toast.error(e.message || 'Failed to submit revision test');
        finishedRef.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [data, mcqAnswers, onClose, onSubmitted, shortAnswers, task]
  );

  useEffect(() => {
    performSubmitRef.current = performSubmit;
  }, [performSubmit]);

  useEffect(() => {
    if (!open || !data || loading) return;
    const lim = data.timeLimitSeconds ?? DEFAULT_TIME_SEC;
    setTimeLeft(lim);
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          queueMicrotask(() => performSubmitRef.current(true));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, data, loading]);

  if (!open || !task) return null;

  const fmt = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const submit = async () => {
    await performSubmit(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Weekly Revision Test</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {task.subject} • {task.topic}
            </p>
          </div>
          {!loading && data && (
            <div
              className={`text-lg font-mono font-semibold px-3 py-1 rounded-lg ${
                timeLeft <= 60 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
              }`}
            >
              {fmt(timeLeft)}
            </div>
          )}
        </div>
        <p className="px-6 pt-3 text-xs text-gray-500 dark:text-gray-400">{limitSec / 60} min limit; timer submits automatically at zero.</p>
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
          {loading && <p>Loading test...</p>}
          {!loading && data && (
            <>
              {(data.mcqs || []).map((q, i) => (
                <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="font-medium mb-2">
                    {i + 1}. {q.question}
                  </p>
                  <div className="space-y-1">
                    {(q.options || []).map((opt, j) => (
                      <label key={j} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`rmcq-${i}`}
                          disabled={submitting}
                          checked={mcqAnswers[i] === j}
                          onChange={() => setMcqAnswers((a) => ({ ...a, [i]: j }))}
                        />
                        <span>{opt.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {(data.shortAnswers || []).map((q, i) => (
                <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="font-medium mb-2">{q.question}</p>
                  <textarea
                    rows={4}
                    disabled={submitting}
                    value={shortAnswers[i] || ''}
                    onChange={(e) => setShortAnswers((s) => ({ ...s, [i]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                  />
                </div>
              ))}
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={submitting || loading} className="px-4 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit Revision Test'}
          </button>
        </div>
      </div>
    </div>
  );
}
