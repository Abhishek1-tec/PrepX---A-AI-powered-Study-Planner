import React, { useEffect, useState } from 'react';
import { format, isValid } from 'date-fns';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

function safeFormatDate(dateStr) {
  try {
    if (dateStr == null || dateStr === '') return '—';
    const d = new Date(dateStr);
    if (typeof isValid !== 'function' || !isValid(d)) return '—';
    return format(d, 'PPp');
  } catch (_) {
    return '—';
  }
}

export default function Reminder() {
  const [list, setList] = useState([]);
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.get('/reminders')
      .then((data) => {
        setList(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setList([]);
        setError(err?.message || 'Could not load reminders');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/reminders')
      .then((data) => {
        if (!cancelled) setList(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setList([]);
          setError(err?.message || 'Could not load reminders');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await api.post('/reminders', { title: title.trim(), dueAt: dueAt || new Date().toISOString().slice(0, 16) });
      toast.success('Added');
      setTitle('');
      setDueAt('');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const complete = async (id) => {
    try {
      await api.patch(`/reminders/${id}/complete`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/reminders/${id}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const safeList = Array.isArray(list) ? list : [];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Reminder</h1>
      <form onSubmit={add} className="flex flex-wrap gap-2 mb-6">
        <input placeholder="Title" value={title || ''} onChange={(e) => setTitle(e.target.value)} className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" />
        <input type="datetime-local" value={dueAt || ''} onChange={(e) => setDueAt(e.target.value)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" />
        <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Add</button>
      </form>
      {error && <p className="mb-4 text-sm text-amber-600 dark:text-amber-400">{error}</p>}
      {loading && <p className="text-gray-500 dark:text-gray-400">Loading...</p>}
      <ul className="space-y-2">
        {safeList.map((r, idx) => (
          <li key={r?._id || idx} className={`flex items-center justify-between p-3 rounded-lg border ${r?.completed ? 'border-green-300 dark:border-green-700 opacity-70' : 'border-gray-200 dark:border-gray-700'} bg-white dark:bg-gray-800`}>
            <div>
              <p className={r?.completed ? 'line-through text-gray-500' : 'font-medium'}>{r?.title ?? '—'}</p>
              <p className="text-sm text-gray-500">{safeFormatDate(r?.dueAt)}</p>
            </div>
            <div className="flex gap-2">
              {!r?.completed && <button type="button" onClick={() => complete(r?._id)} className="text-sm text-green-600 dark:text-green-400">Done</button>}
              <button type="button" onClick={() => remove(r?._id)} className="text-sm text-red-600 dark:text-red-400">Delete</button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && safeList.length === 0 && !error && <p className="text-gray-500 dark:text-gray-400">No reminders yet. Add one above.</p>}
    </div>
  );
}
