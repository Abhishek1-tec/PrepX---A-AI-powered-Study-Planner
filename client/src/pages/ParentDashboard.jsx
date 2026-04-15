import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get('/users/linked-students').then(setStudents).catch(() => setStudents([]));
  }, []);

  useEffect(() => {
    if (!selected) {
      setAnalytics(null);
      return;
    }
    api.get(`/analytics/student/${selected}?days=7`).then(setAnalytics).catch(() => setAnalytics(null));
  }, [selected]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">Parent — Read-only</h1>
        <button onClick={() => { logout(); navigate('/login'); }} className="text-sm text-gray-600 dark:text-gray-300 hover:underline">Logout</button>
      </header>
      <main className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Linked students</h2>
        {students.length === 0 ? (
          <p className="text-gray-500">No students linked. Student must sign up with your email as parent email.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {students.map((s) => (
                <button
                  key={s._id}
                  onClick={() => setSelected(s._id)}
                  className={`px-4 py-2 rounded-lg ${selected === s._id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}
                >
                  {s.fullName}
                </button>
              ))}
            </div>
            {analytics && (
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                <h3 className="font-semibold mb-4">Last 7 days — Focus & discipline overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Study hours</p>
                    <p className="text-xl font-bold">{analytics.totalStudyHours}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Complete sessions</p>
                    <p className="text-xl font-bold text-green-600">{analytics.completeSessions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Incomplete</p>
                    <p className="text-xl font-bold text-amber-600">{analytics.incompleteSessions}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Focus score avg</p>
                    <p className="text-xl font-bold">{analytics.focusScoreAverage}</p>
                  </div>
                </div>
                {analytics.weakSubjects?.length > 0 && (
                  <p className="mt-4 text-sm text-gray-500">Weak subjects: {analytics.weakSubjects.join(', ')}</p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
