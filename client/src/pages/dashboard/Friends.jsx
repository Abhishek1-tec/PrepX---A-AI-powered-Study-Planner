import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../lib/api';

export default function Friends() {
  const [myId, setMyId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [inputId, setInputId] = useState('');

  const load = () => {
    api.get('/friends/my-id').then((d) => setMyId(d.uniqueId)).catch(() => {});
    api.get('/friends/requests').then(setRequests).catch(() => setRequests([]));
    api.get('/friends/list').then(setFriends).catch(() => setFriends([]));
  };

  useEffect(() => load(), []);

  const sendRequest = async (e) => {
    e.preventDefault();
    if (!inputId.trim()) return;
    try {
      await api.post('/friends/send-request', { uniqueId: inputId.trim() });
      toast.success('Request sent');
      setInputId('');
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  const accept = async (id) => {
    try {
      await api.post(`/friends/accept/${id}`);
      toast.success('Accepted');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Join Friends</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-4">Share your ID with friends. No chat — only Notes & PYQs sharing between accepted friends.</p>
      {myId && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mb-6">
          <p className="text-sm text-gray-500">Your unique ID</p>
          <p className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400">{myId}</p>
        </div>
      )}
      <form onSubmit={sendRequest} className="flex gap-2 mb-6">
        <input placeholder="Friend's unique ID" value={inputId} onChange={(e) => setInputId(e.target.value)} className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" />
        <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Send request</button>
      </form>
      {requests.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Pending requests</h3>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r._id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <span>{r.fromUserId?.fullName} ({r.fromUserId?.uniqueId})</span>
                <button onClick={() => accept(r._id)} className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">Accept</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <h3 className="font-semibold mb-2">Friends</h3>
        <ul className="space-y-2">
          {friends.map((f) => (
            <li key={f.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {f.user?.fullName} ({f.user?.uniqueId})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
