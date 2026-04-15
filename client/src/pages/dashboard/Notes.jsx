import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, upload } from '../../lib/api';

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [shared, setShared] = useState([]);
  const [tab, setTab] = useState('mine');
  const [uploading, setUploading] = useState(false);

  const load = () => {
    api.get('/notes').then(setNotes).catch(() => setNotes([]));
    api.get('/notes/shared-with-me').then(setShared).catch(() => setShared([]));
  };

  useEffect(() => load(), []);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', file.name);
    try {
      await upload('/notes/upload', fd);
      toast.success('Uploaded');
      load();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Notes & PYQs</h1>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('mine')} className={`px-4 py-2 rounded-lg ${tab === 'mine' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>My Notes</button>
        <button onClick={() => setTab('shared')} className={`px-4 py-2 rounded-lg ${tab === 'shared' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Shared with Me</button>
      </div>
      {tab === 'mine' && (
        <>
          <label className="inline-block mb-4 px-4 py-2 rounded-lg bg-indigo-600 text-white cursor-pointer hover:bg-indigo-700">
            {uploading ? 'Uploading...' : 'Upload PDF / Image'}
            <input type="file" accept=".pdf,image/*" className="hidden" onChange={onFile} />
          </label>
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n._id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-gray-500">{n.subject} {n.topic && `· ${n.topic}`} {n.isPYQ && '(PYQ)'}</p>
                </div>
                <a href={n.fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 text-sm">View / Download</a>
              </li>
            ))}
          </ul>
        </>
      )}
      {tab === 'shared' && (
        <ul className="space-y-2">
          {shared.map((n) => (
            <li key={n._id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-gray-500">From: {n.sharedFrom}</p>
              </div>
              <a href={n.fileUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 text-sm">View / Download</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
