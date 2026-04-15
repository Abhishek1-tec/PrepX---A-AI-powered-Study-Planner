import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, setUser } = useAuth();
  const { dark, toggle } = useTheme();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [language, setLanguage] = useState(user?.language || 'en');

  const save = async (e) => {
    e.preventDefault();
    try {
      const u = await api.patch('/users/me', { fullName, language });
      setUser?.(u);
      toast.success('Saved');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
            <option value="en">English</option>
            <option value="hi">Hindi (expandable)</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Dark mode</span>
          <button type="button" onClick={toggle} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-600 text-sm">{dark ? 'On' : 'Off'}</button>
        </div>
        <button type="submit" className="w-full py-2 rounded-lg bg-indigo-600 text-white font-medium">Save</button>
      </form>
    </div>
  );
}
