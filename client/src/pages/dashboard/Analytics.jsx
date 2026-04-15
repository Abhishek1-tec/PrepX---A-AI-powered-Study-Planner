import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { api } from '../../lib/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

const PURPLE = '#6366f1';
const GREEN = '#22c55e';
const AMBER = '#f59e0b';
const RED = '#ef4444';
const MUTED = '#e5e7eb';

function buildHeatmapRows(cells) {
  if (!cells?.length) return [];
  const sorted = [...cells].sort((a, b) => a.date.localeCompare(b.date));
  const first = new Date(sorted[0].date + 'T12:00:00');
  const pad = (first.getDay() + 6) % 7;
  const padded = [...Array(pad).fill(null), ...sorted];
  const rows = [];
  for (let i = 0; i < padded.length; i += 7) {
    rows.push(padded.slice(i, i + 7));
  }
  return rows;
}

function levelBg(level) {
  if (!level) return 'bg-gray-200 dark:bg-gray-800';
  if (level === 1) return 'bg-emerald-200 dark:bg-emerald-900';
  if (level === 2) return 'bg-emerald-400 dark:bg-emerald-700';
  if (level === 3) return 'bg-emerald-500 dark:bg-emerald-600';
  return 'bg-emerald-600 dark:bg-emerald-500';
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/analytics/me?days=${days}`);
      setData(res);
    } catch (e) {
      setError(e.message || 'Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const topicFiltered = useMemo(() => {
    const list = data?.topicPerformance || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        (t.topic && t.topic.toLowerCase().includes(q)) || (t.subject && t.subject.toLowerCase().includes(q))
    );
  }, [data, search]);

  const heatRows = useMemo(() => buildHeatmapRows(data?.heatmap || []), [data]);

  const taskPieData = useMemo(() => {
    const c = data?.taskPie?.completed ?? 0;
    const inc = data?.taskPie?.incomplete ?? 0;
    if (c + inc === 0) return [{ name: 'No data', value: 1, color: MUTED }];
    return [
      { name: 'Completed', value: c, color: GREEN },
      { name: 'Remaining / incomplete', value: Math.max(0, inc), color: AMBER },
    ];
  }, [data]);

  const syllabusDonut = useMemo(() => {
    const p = Math.min(100, Math.max(0, data?.syllabusProgress ?? 0));
    return [
      { name: 'done', value: p, color: PURPLE },
      { name: 'rest', value: 100 - p, color: MUTED },
    ];
  }, [data]);

  const sparkFocus = useMemo(() => {
    const trend = (data?.focusScoreTrend || []).slice(-8);
    if (!trend.length) return [{ i: 0, score: data?.focusScoreAverage ?? 0 }];
    return trend.map((t, i) => ({ i, score: t.score ?? 0 }));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading analytics…
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-red-700 dark:text-red-300">
        {error}
      </div>
    );
  }

  const pct = (n) => (n > 0 ? `+${n}%` : `${n}%`);
  const hoursTip = data?.hoursChangePct != null ? pct(data.hoursChangePct) : '—';

  return (
    <div className="max-w-[1400px] mx-auto pb-10">
      {/* Top bar (page-local, matches mock) */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Analytics &amp; Reporting</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Study performance, habits, and AI-assisted insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter topics…"
            className="w-full sm:w-56 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
          />
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
          >
            <option value={7}>This week (7d)</option>
            <option value={30}>This month (30d)</option>
            <option value={90}>Quarter (90d)</option>
          </select>
          {loading && <span className="text-xs text-indigo-600 dark:text-indigo-400">Updating…</span>}
        </div>
      </div>

      {/* Row 1 — KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total study hours</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data?.totalStudyHours ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">hrs in selected period</p>
          <span
            className={`inline-flex mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
              (data?.hoursChangePct ?? 0) >= 0
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
            }`}
          >
            {hoursTip} vs prior period
          </span>
          <div className="h-14 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.dailyHoursTrend?.slice(-7) || []}>
                <Bar dataKey="hours" fill={PURPLE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current streak</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data?.streak?.current ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">days · best {data?.streak?.longest ?? 0}</p>
          <div className="h-14 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkFocus}>
                <Line type="monotone" dataKey="score" stroke={PURPLE} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Consistency</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data?.consistencyScore ?? 0}%</p>
          <p className="text-xs text-gray-500 mt-1">active days / period</p>
          <span className="inline-flex mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">
            {(data?.consistencyScore ?? 0) >= 70 ? 'Good' : 'Build rhythm'}
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Completion rate</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data?.completionRate ?? 0}%</p>
          <p className="text-xs text-gray-500 mt-1">{data?.taskPie?.label || 'Tasks'}</p>
          <div className="h-20 mt-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskPieData} dataKey="value" innerRadius={22} outerRadius={34} paddingAngle={2}>
                  {taskPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Incomplete sessions</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{data?.incompleteSessions ?? 0}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">Focus discipline</p>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm lg:col-span-1 xl:col-span-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Study activity</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">This calendar week (hours)</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.thisWeekDaily || []} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ borderRadius: 8 }}
                  formatter={(v) => [`${v} hrs`, 'Study']}
                />
                <Bar dataKey="hours" fill={PURPLE} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Progress &amp; performance</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Syllabus proxy &amp; task mix</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={syllabusDonut}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={60}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {syllabusDonut.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{data?.syllabusProgress ?? 0}%</span>
              </div>
            </div>
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskPieData} dataKey="value" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {taskPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Subject performance</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Test accuracy by subject</p>
          <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
            {(data?.subjectPerformance || []).length === 0 && (
              <p className="text-sm text-gray-500">No topic tests in this range yet.</p>
            )}
            {(data?.subjectPerformance || []).map((s) => (
              <div key={s.subject}>
                <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <span>{s.subject}</span>
                  <span>{s.percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 55 ? 'bg-indigo-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, s.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm xl:col-span-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Topic performance</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">From topic completion tests</p>
          <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0">
                <tr className="text-left text-gray-500 dark:text-gray-400">
                  <th className="px-3 py-2 font-medium">Topic</th>
                  <th className="px-3 py-2 font-medium">Subject</th>
                  <th className="px-3 py-2 font-medium">Accuracy</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium">Insight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {topicFiltered.slice(0, 40).map((row) => (
                  <tr key={`${row.subject}-${row.topic}`} className="text-gray-800 dark:text-gray-200">
                    <td className="px-3 py-2 max-w-[140px] truncate" title={row.topic}>
                      {row.topic}
                    </td>
                    <td className="px-3 py-2">{row.subject}</td>
                    <td className="px-3 py-2 font-semibold">{row.percentage}%</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                          row.priority === 'high'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                            : row.priority === 'medium'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {row.priority === 'high' ? '★' : '○'} {row.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-[160px]">{row.aiInsight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">AI insight labels are rule-based from your scores; tips below use AI when configured.</p>
        </div>
      </div>

      {/* Daily trend full width */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm mb-8">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Daily study hours</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Selected range</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.dailyHoursTrend || []} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10 }} interval="preserveStartEnd" stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
              <Tooltip formatter={(v) => [`${v} h`, 'Hours']} />
              <Bar dataKey="hours" fill={PURPLE} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm lg:col-span-2 xl:col-span-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Consistency heatmap</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Focus time intensity (~14 weeks)</p>
          <div className="overflow-x-auto">
            <div className="flex flex-col gap-1 min-w-max">
              {heatRows.map((row, ri) => (
                <div key={ri} className="flex gap-1">
                  {row.map((cell, ci) =>
                    cell ? (
                      <div
                        key={cell.date}
                        title={`${cell.date} · ${cell.minutes} min`}
                        className={`w-3.5 h-3.5 rounded-sm ${levelBg(cell.level)}`}
                      />
                    ) : (
                      <div key={`e-${ri}-${ci}`} className="w-3.5 h-3.5" />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-600 dark:text-gray-400">
            <span>Longest streak: <strong className="text-gray-900 dark:text-white">{data?.streak?.longest ?? 0}</strong> days</span>
            <span>
              Avg / active day:{' '}
              <strong className="text-gray-900 dark:text-white">
                {(data?.totalStudyHours && distinctStudyDays(data))
                  ? (data.totalStudyHours / distinctStudyDays(data)).toFixed(1)
                  : '0'}
              </strong>{' '}
              hrs
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">Weakness detection</h2>
          <ul className="space-y-2 text-sm text-amber-950 dark:text-amber-100">
            {(data?.weakTopicAlerts || []).length === 0 && <li>No critical weak topics in this window.</li>}
            {(data?.weakTopicAlerts || []).map((w) => (
              <li key={`${w.subject}-${w.topic}`}>
                <strong>{w.topic}</strong> ({w.subject}) — {w.percentage}% accuracy. Consider revision soon.
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Best performance days</h2>
          <ol className="space-y-2 text-sm">
            {(data?.bestPerformanceDays || []).length === 0 && <li className="text-gray-500">Not enough data yet.</li>}
            {(data?.bestPerformanceDays || []).map((d) => (
              <li key={d.day} className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">#{d.rank}</span> {d.day}
                </span>
                <span className="font-medium">{d.hours}h</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/30 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 mb-2">Smart suggestions</h2>
          <ul className="list-disc pl-4 space-y-2 text-sm text-gray-800 dark:text-gray-200">
            {(data?.smartSuggestions || []).map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
        Focus score avg: <strong className="text-gray-800 dark:text-gray-200">{data?.focusScoreAverage ?? 0}</strong> · Completed
        sessions: <strong className="text-gray-800 dark:text-gray-200">{data?.completeSessions ?? 0}</strong> · Weak subjects
        (&lt;60%): {(data?.weakSubjects || []).join(', ') || '—'}
      </div>
    </div>
  );
}

function distinctStudyDays(data) {
  const trend = data?.dailyHoursTrend || [];
  const n = trend.filter((d) => (d.hours || 0) > 0).length;
  return Math.max(1, n);
}
