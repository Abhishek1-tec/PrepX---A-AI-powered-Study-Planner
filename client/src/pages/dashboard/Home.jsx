import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const StatCard = ({ icon, label, value, subtext, delay = 0, color = 'blue' }) => (
  <div 
    className={`rounded-3xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-${color}-50 dark:from-gray-800 dark:to-gray-800/50 p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-2 animate-fade-in-up`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between mb-4">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        <p className={`text-4xl font-bold bg-gradient-to-r from-${color}-600 to-${color}-400 bg-clip-text text-transparent mt-2`}>{value}</p>
        {subtext && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtext}</p>}
      </div>
      <div className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-${color}-100 to-${color}-50 dark:from-${color}-900/40 dark:to-${color}-900/20 flex items-center justify-center text-2xl shadow-md`}>
        {icon}
      </div>
    </div>
  </div>
);

export default function Home() {
  const [timetable, setTimetable] = useState(null);
  const [streak, setStreak] = useState(null);
  const [focusWeekly, setFocusWeekly] = useState(null);

  useEffect(() => {
    const date = new Date().toISOString().slice(0, 10);
    api.get(`/timetable?date=${date}`).then(setTimetable).catch(() => setTimetable({ slots: [] }));
    api.get('/streak').then(setStreak).catch(() => setStreak({ currentStreak: 0, longestStreak: 0 }));
    api.get('/focus/focus-score/weekly').then(setFocusWeekly).catch(() => setFocusWeekly({ weeklyAverage: 0 }));
  }, []);

  const slots = timetable?.slots || [];
  const completed = slots.filter((s) => s.completed).length;
  const pending = slots.filter((s) => !s.completed).length;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 gradient-text">📚 Daily Overview</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        <StatCard 
          icon="✅"
          label="Today's Progress"
          value={`${completed}/${slots.length}`}
          subtext={`${pending} task${pending !== 1 ? 's' : ''} left`}
          delay={100}
          color="blue"
        />
        <StatCard 
          icon="🔥"
          label="Study Streak"
          value={`${streak?.currentStreak ?? 0}`}
          subtext="days in a row"
          delay={200}
          color="orange"
        />
        <StatCard 
          icon="⭐"
          label="Weekly Focus"
          value={`${focusWeekly?.weeklyAverage ?? 0}`}
          subtext="avg score"
          delay={300}
          color="purple"
        />
      </div>

      {/* Today's Schedule Section */}
      <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-gray-800/50 p-8 shadow-lg animate-fade-in-up" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📅 Today's Schedule</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{slots.length === 0 ? 'No tasks scheduled' : `${slots.length} task${slots.length !== 1 ? 's' : ''} scheduled today`}</p>
          </div>
          <Link to="/app/timetable" className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:shadow-lg transition-all duration-300 hover:scale-105">
            View Timetable →
          </Link>
        </div>

        {slots.length > 0 ? (
          <div className="space-y-3">
            {slots.slice(0, 5).map((slot, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-all duration-300 animate-fade-in-up border border-gray-200 dark:border-gray-600"
                style={{ animationDelay: `${450 + idx * 50}ms` }}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{slot.topic}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{slot.subject} • {slot.durationMinutes} min</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${slot.completed ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                  {slot.completed ? '✓ Done' : '⏳ Pending'}
                </div>
              </div>
            ))}
            {slots.length > 5 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center pt-2">+{slots.length - 5} more tasks</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">📝</div>
            <p className="text-gray-500 dark:text-gray-400">No tasks scheduled for today</p>
            <Link to="/app/timetable" className="text-blue-600 dark:text-blue-400 hover:underline text-sm mt-2">
              Create a task in Timetable
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
