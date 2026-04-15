/**
 * Mandatory topic completion test after focus: 10 questions, 10-minute limit (PDF), >= 60% = topic complete.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

const DEFAULT_TIME_SEC = 600;

export default function TopicTestForm({ focusSessionId, subject, topic, timetableId, slotIndex, onSubmitted }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mcqAnswers, setMcqAnswers] = useState({});
  const [shortAnswers, setShortAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME_SEC);
  const finishedRef = useRef(false);
  const performSubmitRef = useRef(async () => {});

  useEffect(() => {
    finishedRef.current = false;
    setData(null);
    setLoading(true);
    setMcqAnswers({});
    setShortAnswers({});
    api
      .get(`/tests/generate?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`)
      .then(setData)
      .catch(() => {
        toast.error('Could not load test');
        setData({ mcqs: [], shortAnswers: [] });
      })
      .finally(() => setLoading(false));
  }, [subject, topic]);

  const limitSec = data?.timeLimitSeconds ?? DEFAULT_TIME_SEC;

  const performSubmit = useCallback(
    async (fromTimeout) => {
      if (!data || finishedRef.current) return;
      finishedRef.current = true;
      const mcqList = data.mcqs || [];
      if (!fromTimeout && mcqList.some((_, i) => mcqAnswers[i] == null)) {
        toast.error('Please answer all MCQs');
        finishedRef.current = false;
        return;
      }
      const mcqs = mcqList.map((m, i) => ({ ...m, selectedIndex: mcqAnswers[i] ?? -1 }));
      const sas = (data.shortAnswers || []).map((s, i) => ({ ...s, studentAnswer: shortAnswers[i] || '' }));
      if (!fromTimeout && sas.some((s) => !s.studentAnswer?.trim())) {
        toast.error('Please answer all questions');
        finishedRef.current = false;
        return;
      }
      setSubmitting(true);
      try {
        const result = await api.post('/tests', {
          focusSessionId,
          subject,
          topic,
          mcqs,
          shortAnswers: sas,
        });
        if (result.topicComplete && timetableId && slotIndex != null && slotIndex >= 0) {
          try {
            await api.patch(`/timetable/${timetableId}/slots/${slotIndex}/complete`);
          } catch (_) {
            /* slot may already be updated */
          }
        }
        toast.success(
          fromTimeout
            ? `Time's up — submitted (${result.percentage ?? 0}%). ${result.topicComplete ? 'Topic complete.' : 'Need ≥ 60% to complete topic.'}`
            : result.topicComplete
              ? 'Topic complete (score ≥ 60%).'
              : `Submitted (${result.percentage ?? 0}%). Need ≥ 60% to mark topic complete.`
        );
        onSubmitted?.();
      } catch (err) {
        toast.error(err.message || 'Submit failed');
        finishedRef.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [data, focusSessionId, mcqAnswers, onSubmitted, shortAnswers, subject, timetableId, slotIndex, topic]
  );

  useEffect(() => {
    performSubmitRef.current = performSubmit;
  }, [performSubmit]);

  useEffect(() => {
    if (!data || loading) return;
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
  }, [data, loading]);

  const submit = async (e) => {
    e.preventDefault();
    await performSubmit(false);
  };

  const fmt = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <p className="text-gray-500">Loading test...</p>;
  if (!data || ((!data.mcqs || data.mcqs.length === 0) && (!data.shortAnswers || data.shortAnswers.length === 0))) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
        <p>No test questions generated. You can skip or retry later.</p>
        <button type="button" onClick={onSubmitted} className="mt-2 text-indigo-600 dark:text-indigo-400">
          Skip
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 sticky top-0 z-10 bg-white/95 dark:bg-gray-900/95 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-bold">Topic completion test: {subject} · {topic}</h3>
        <div
          className={`text-lg font-mono font-semibold px-3 py-1 rounded-lg ${
            timeLeft <= 60 ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200'
          }`}
        >
          {fmt(timeLeft)}
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {limitSec / 60} minute limit (PDF). When the timer hits zero, your answers are sent automatically.
      </p>
      {(data.mcqs || []).map((q, i) => (
        <div key={i} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="font-medium mb-2">
            {i + 1}. {q.question}
          </p>
          <div className="space-y-2">
            {(q.options || []).map((opt, j) => (
              <label key={j} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`mcq${i}`}
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
        <div key={i} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <p className="font-medium mb-2">
            Short answer ({q.maxMarks} marks): {q.question}
          </p>
          <textarea
            value={shortAnswers[i] || ''}
            disabled={submitting}
            onChange={(e) => setShortAnswers((s) => ({ ...s, [i]: e.target.value }))}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            placeholder="Write your answer (word count as per question)"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium disabled:opacity-50">
          Submit test
        </button>
        <button type="button" disabled={submitting} onClick={onSubmitted} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600">
          Skip
        </button>
      </div>
    </form>
  );
}
