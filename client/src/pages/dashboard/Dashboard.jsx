import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import CalendarWidget from '../../components/CalendarWidget';

const StatCard = ({ icon, label, value, subtext, trend, delay = 0 }) => (
  <div 
    className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-fade-in-up"
    style={{ animationDelay: `${delay * 100}ms` }}
  >
    <div className="flex items-start justify-between mb-4">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">{value}</p>
        {subtext && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtext}</p>}
      </div>
      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-lg">
        {icon}
      </div>
    </div>
    {trend && (
      <div className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
        <span className="text-lg">↑</span> {trend}
      </div>
    )}
  </div>
);

const IconClock = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-11a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IconBook = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const IconTarget = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IconStar = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
const IconArrowRight = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>;

export default function Dashboard() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [previousAnalytics, setPreviousAnalytics] = useState(null);
  const [timetable, setTimetable] = useState(null);
  const [growthRate, setGrowthRate] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    
    // Fetch current week analytics (7 days)
    api.get('/analytics/me?days=7').then(setAnalytics).catch(() => setAnalytics({}));
    
    // Fetch previous week analytics for growth calculation (14 days, minus last 7)
    api.get('/analytics/me?days=14').then(data => {
      setPreviousAnalytics(data);
      // Calculate growth rate
      if (analytics && data) {
        const prevHours = data.totalStudyHours || 0;
        const currHours = analytics.totalStudyHours || 0;
        const rate = prevHours > 0 ? Math.round(((currHours - prevHours) / prevHours) * 100) : 0;
        setGrowthRate(rate);
      }
    }).catch(() => setPreviousAnalytics({}));
    
    // Fetch today's timetable
    api.get(`/timetable?date=${today}`).then(setTimetable).catch(() => setTimetable({ slots: [] }));
  }, []);

  const trend = analytics?.dailyHoursTrend || [];
  const activityData = trend.map(d => ({
    date: format(new Date(d.date), 'EEE'),
    hours: d.hours
  }));

  // Get today's pending/upcoming slots from timetable
  const upNextTasks = (timetable?.slots || []).filter(slot => !slot.completed).slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Overview</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here's how you're performing this week.</p>
        </div>
        <Link to="/app/timetable" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3l8 8-8 8v-7h-8V10h8z" /></svg>
          Set New Goal
        </Link>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<IconClock />} 
          label="Study Hours" 
          value={`${analytics?.totalStudyHours?.toFixed(1) ?? 0}h`}
          subtext="This week"
          trend={`${growthRate > 0 ? '↑' : growthRate < 0 ? '↓' : '→'} ${Math.abs(growthRate)}% from last week`}
          delay={1}
        />
        <StatCard 
          icon={<IconBook />} 
          label="Topics Completed" 
          value={analytics?.completeSessions ?? 0}
          subtext={`${analytics?.incompleteSessions ?? 0} topics pending`}
          delay={2}
        />
        <StatCard 
          icon={<IconTarget />} 
          label="Consistency" 
          value="85%"
          subtext="Top 10% of class"
          delay={3}
        />
        <StatCard 
          icon={<IconStar />} 
          label="Focus Score" 
          value={analytics?.focusScoreAverage?.toFixed(0) ?? 0}
          subtext="Based on distraction rate"
          delay={4}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 rounded-3xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-800/50 p-6 shadow-lg hover:shadow-2xl transition-all duration-300">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Weekly Activity</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">📊 Number of hours studied per day</p>
          </div>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(v) => v}
                  stroke="#9ca3af"
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                  labelFormatter={(v) => v}
                  formatter={(value) => `${value}h`}
                />
                <Area type="natural" dataKey="hours" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <p>No activity data yet. Complete study sessions to see trends.</p>
            </div>
          )}
        </div>

        {/* Calendar Widget */}
        <div className="animate-scale-in" style={{ animationDelay: '300ms' }}>
          <CalendarWidget selectedDate={selectedDate} onDateSelect={setSelectedDate} />
        </div>

        {/* Up Next Tasks */}
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-gray-800/50 p-6 shadow-lg hover:shadow-2xl transition-all duration-300 animate-fade-in-left" style={{ animationDelay: '400ms' }}>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">📅 Up Next</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Your scheduled tasks for today</p>
          <div className="space-y-2">
            {upNextTasks && upNextTasks.length > 0 ? (
              upNextTasks.map((task, idx) => (
                <Link
                  key={idx}
                  to="/app/timetable"
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all duration-300 cursor-pointer hover:scale-105 hover:-translate-y-0.5 animate-fade-in-up hover:shadow-md active:scale-95"
                  style={{ animationDelay: `${400 + idx * 100}ms` }}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br ${
                    idx === 0 ? 'from-blue-400 to-blue-600' : idx === 1 ? 'from-orange-400 to-orange-600' : 'from-purple-400 to-purple-600'
                  } flex items-center justify-center text-white font-semibold text-sm shadow-md`}>
                    {task.subject?.charAt(0) || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{task.topic || task.subject}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">⏱️ {task.subject} • {task.durationMinutes || 60} min</p>
                  </div>
                  <IconArrowRight />
                </Link>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in-up">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 flex items-center justify-center text-2xl mb-3">
                  📚
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">No tasks scheduled</p>
                <Link to="/app/timetable" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2">
                  Create tasks in timetable →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subject Performance */}
      {analytics?.subjectPerformance?.length > 0 && (
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-gray-800/50 p-8 shadow-lg animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🎯 Subject Performance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Your progress across different subjects</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.subjectPerformance.map((s, idx) => (
              <div 
                key={s.subject} 
                className="p-5 rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-700/50 dark:to-gray-800/50 border border-gray-100 dark:border-gray-600 hover:shadow-lg transition-all duration-300 hover:scale-105 hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${550 + idx * 100}ms` }}
              >
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">{s.subject}</p>
                <div className="flex items-end gap-3 mb-3">
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{s.percentage}%</p>
                  <p className={`text-xs font-bold px-2 py-1 rounded-lg ${s.percentage >= 65 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                    {s.percentage >= 65 ? '✓ Strong' : '↗ Improving'}
                  </p>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${s.percentage >= 65 ? 'from-green-400 to-green-600' : 'from-amber-400 to-amber-600'} transition-all duration-500`}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
