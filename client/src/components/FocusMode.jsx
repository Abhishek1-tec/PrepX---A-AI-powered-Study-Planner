/**
 * Smart Focus Mode: fullscreen, no sidebar, no right-click, timer.
 * AI study pack: notes + Mermaid diagram + ASCII + video search link (PDF).
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../lib/api';

const FOCUS_API = {
  violation: (sessionId, type) => api.post(`/focus/${sessionId}/violation`, { type }),
  end: (sessionId, status) => api.post(`/focus/${sessionId}/end`, { status }),
};

export default function FocusMode({ sessionId, plannedMinutes, subject, topic, examContext, onEnd, onViolation }) {
  const [secondsLeft, setSecondsLeft] = useState(plannedMinutes * 60);
  const [violationCount, setViolationCount] = useState(0);
  const [warning, setWarning] = useState(null);
  const [focusScore, setFocusScore] = useState(100);
  const [aid, setAid] = useState({ notes: '', mermaid: '', ascii: '', videoSearchUrl: '' });
  const [notesLoading, setNotesLoading] = useState(true);
  const timerRef = useRef(null);
  const reportingRef = useRef(false);
  const diagramRef = useRef(null);

  const reportViolation = useCallback(
    async (type) => {
      if (!sessionId || reportingRef.current) return;
      reportingRef.current = true;
      try {
        const { session, warning: w } = await FOCUS_API.violation(sessionId, type);
        setViolationCount(session.violationCount);
        setFocusScore(session.focusScore);
        setWarning(w || null);
        onViolation?.(session);
        if (session.status === 'reset' || session.status === 'incomplete') {
          onEnd?.(session.status);
          return;
        }
      } catch (e) {
        console.error(e);
      } finally {
        reportingRef.current = false;
      }
    },
    [sessionId, onEnd, onViolation]
  );

  useEffect(() => {
    let cancelled = false;
    const loadAid = async () => {
      setNotesLoading(true);
      setAid({ notes: '', mermaid: '', ascii: '', videoSearchUrl: '' });
      try {
        const q = `/ai/study-aid?subject=${encodeURIComponent(subject || '')}&topic=${encodeURIComponent(topic || '')}`;
        const res = await api.get(q);
        if (!cancelled) {
          setAid({
            notes: res.notes || '',
            mermaid: res.mermaid || '',
            ascii: res.ascii || '',
            videoSearchUrl: res.videoSearchUrl || '',
          });
        }
      } catch {
        if (!cancelled) setAid({ notes: '', mermaid: '', ascii: '', videoSearchUrl: '' });
      } finally {
        if (!cancelled) setNotesLoading(false);
      }
    };
    if (subject && topic) loadAid();
    else setNotesLoading(false);
    return () => {
      cancelled = true;
    };
  }, [subject, topic]);

  useEffect(() => {
    let cancelled = false;
    const el = diagramRef.current;
    if (!aid.mermaid || !el) {
      if (el) el.innerHTML = '';
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'strict',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        });
        const id = `mmd-${sessionId || 's'}-${subject?.slice(0, 8)}-${Date.now()}`;
        const { svg } = await mermaid.render(id, aid.mermaid);
        if (!cancelled && diagramRef.current) diagramRef.current.innerHTML = svg;
      } catch {
        if (!cancelled && diagramRef.current) {
          diagramRef.current.innerHTML =
            '<p class="text-amber-300 text-xs p-2">Diagram could not be rendered. Try refreshing focus after a moment.</p>';
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [aid.mermaid, sessionId, subject]);

  useEffect(() => {
    const goFullscreen = () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    };
    goFullscreen();
    document.body.classList.add('focus-mode-no-context');
    const preventRightClick = (e) => e.preventDefault();
    document.addEventListener('contextmenu', preventRightClick);
    return () => {
      document.body.classList.remove('focus-mode-no-context');
      document.removeEventListener('contextmenu', preventRightClick);
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') reportViolation('tab_switch');
    };
    const handleBlur = () => reportViolation('blur');
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) reportViolation('fullscreen_exit');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [reportViolation]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    timerRef.current = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [secondsLeft]);

  const endSession = async (status = 'completed') => {
    try {
      await FOCUS_API.end(sessionId, status);
    } catch (e) {}
    onEnd?.(status);
  };

  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;

  return (
    <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col lg:flex-row text-white overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[40vh] lg:min-h-0 border-b lg:border-b-0 lg:border-r border-gray-700">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-1">Focus Mode</h2>
          <p className="text-gray-400 mb-1">
            {subject} · {topic}
          </p>
          {examContext && <p className="text-xs text-gray-500 mb-4">Exam focus: {examContext}</p>}
          <div className="text-5xl font-mono mb-6">
            {m}:{s.toString().padStart(2, '0')}
          </div>
          <p className="text-sm text-amber-400 mb-2">Focus score: {focusScore}</p>
          {warning && <p className="text-amber-400 text-sm mb-4">{warning}</p>}
          <button type="button" onClick={() => endSession('completed')} className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700">
            End session
          </button>
        </div>
      </div>
      <aside className="flex-1 max-h-[55vh] lg:max-h-none overflow-y-auto p-5 bg-gray-950/80 space-y-6">
        <section>
          <h3 className="text-sm font-semibold text-indigo-300 mb-2">AI study notes</h3>
          {notesLoading && <p className="text-gray-500 text-sm">Loading…</p>}
          {!notesLoading && !aid.notes && (
            <p className="text-gray-500 text-sm">No notes yet. Set OPENROUTER_API_KEY on the server for AI content.</p>
          )}
          {!notesLoading && aid.notes && <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">{aid.notes}</pre>}
        </section>

        {!notesLoading && aid.mermaid && (
          <section>
            <h3 className="text-sm font-semibold text-indigo-300 mb-2">AI diagram</h3>
            <div ref={diagramRef} className="rounded-lg bg-white/95 text-gray-900 p-2 overflow-x-auto min-h-[2rem]" />
          </section>
        )}

        {aid.ascii && (
          <section>
            <h3 className="text-sm font-semibold text-indigo-300 mb-2">ASCII overview</h3>
            <pre className="text-xs text-gray-300 whitespace-pre font-mono leading-tight bg-black/30 p-3 rounded-lg overflow-x-auto">{aid.ascii}</pre>
          </section>
        )}

        {aid.videoSearchUrl && (
          <section>
            <h3 className="text-sm font-semibold text-indigo-300 mb-2">Concept video (search)</h3>
            <a
              href={aid.videoSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-sky-400 underline break-all"
            >
              Open YouTube results for this topic
            </a>
            <p className="text-xs text-gray-500 mt-1">Opens in a new tab — use after focus or during a break.</p>
          </section>
        )}
      </aside>
    </div>
  );
}
