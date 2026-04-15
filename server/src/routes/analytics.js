/**
 * Analytics: study hours, streak, subject/topic performance, heatmap, AI tips.
 * Parent: read-only overview for linked students.
 */
import express from 'express';
import { authenticate, studentOnly, parentOnly } from '../middleware/auth.js';
import FocusSession from '../models/FocusSession.js';
import Test from '../models/Test.js';
import User from '../models/User.js';
import Timetable from '../models/Timetable.js';
import {
  startOfDay,
  endOfDay,
  subDays,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  differenceInCalendarDays,
} from 'date-fns';
import { getStreak } from '../services/streak.js';
import { generateAnalyticsInsights } from '../services/ai.js';

const router = express.Router();

function sessionMinutes(s) {
  if (!s.endedAt || !s.startedAt) return 0;
  return (s.endedAt - s.startedAt) / (60 * 1000);
}

function sumSessionMinutes(sessions) {
  return sessions.reduce((a, s) => a + sessionMinutes(s), 0);
}

function heatmapLevel(minutes) {
  if (minutes >= 120) return 4;
  if (minutes >= 60) return 3;
  if (minutes >= 30) return 2;
  if (minutes > 0) return 1;
  return 0;
}

function heuristicTips(snapshot) {
  const tips = [];
  const { totalStudyHours, completeSessions, incompleteSessions, focusScoreAverage, consistencyScore, subjectPerformance } = snapshot;
  if (incompleteSessions > completeSessions && completeSessions + incompleteSessions > 0) {
    tips.push('Incomplete sessions outnumber completed ones — try shorter focus blocks and fewer tab switches.');
  }
  if ((focusScoreAverage || 0) < 75 && (focusScoreAverage || 0) > 0) {
    tips.push('Focus score is below 75 — stay in fullscreen and avoid minimizing during study.');
  }
  if ((consistencyScore || 0) < 60) {
    tips.push('Study on more distinct days each week to lift your consistency score.');
  }
  (subjectPerformance || []).filter((s) => s.percentage < 55).slice(0, 2).forEach((s) => {
    tips.push(`Prioritize ${s.subject} (${s.percentage}% on tests) with extra revision this week.`);
  });
  if ((totalStudyHours || 0) < 5 && (completeSessions || 0) + (incompleteSessions || 0) > 0) {
    tips.push('Total hours are low — schedule at least one protected study block daily.');
  }
  if (tips.length === 0) tips.push('Keep logging focus sessions and topic tests so insights stay accurate.');
  return tips.slice(0, 5);
}

async function buildStudentAnalytics(userId, days) {
  const safeDays = Math.min(120, Math.max(7, days));
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(new Date(), safeDays));
  const prevEnd = endOfDay(subDays(start, 1));
  const prevStart = startOfDay(subDays(start, safeDays));

  const [sessions, prevSessions, streakDoc, tests, timetables] = await Promise.all([
    FocusSession.find({
      userId,
      startedAt: { $gte: start, $lte: end },
      status: { $ne: 'active' },
    }).lean(),
    FocusSession.find({
      userId,
      startedAt: { $gte: prevStart, $lte: prevEnd },
      status: { $ne: 'active' },
    }).lean(),
    getStreak(userId),
    Test.find({
      userId,
      completed: true,
      completedAt: { $gte: start, $lte: end },
      isRevisionTest: { $ne: true },
    }).lean(),
    Timetable.find({ userId, date: { $gte: start, $lte: end } }).lean(),
  ]);

  const totalMinutes = sumSessionMinutes(sessions);
  const totalStudyHours = Math.round((totalMinutes / 60) * 100) / 100;
  const prevMinutes = sumSessionMinutes(prevSessions);
  const prevHours = prevMinutes / 60;
  const hoursChangePct =
    prevHours > 0.01 ? Math.round(((totalStudyHours - prevHours) / prevHours) * 100) : totalStudyHours > 0 ? 100 : 0;

  const complete = sessions.filter((s) => s.status === 'completed').length;
  const incomplete = sessions.filter((s) => s.status === 'incomplete' || s.status === 'reset').length;
  const focusCount = complete;
  const avgFocus = sessions.filter((s) => s.status === 'completed').reduce((a, s) => a + (s.focusScore || 0), 0);
  const focusScoreAverage = focusCount ? Math.round((avgFocus / focusCount) * 100) / 100 : 0;

  const bySubject = {};
  tests.forEach((t) => {
    if (!t.subject) return;
    if (!bySubject[t.subject]) bySubject[t.subject] = { total: 0, obtained: 0 };
    bySubject[t.subject].total += t.totalMarks || 0;
    bySubject[t.subject].obtained += t.obtainedMarks || 0;
  });
  const subjectPerformance = Object.entries(bySubject).map(([subject, d]) => ({
    subject,
    percentage: d.total ? Math.round((d.obtained / d.total) * 100) : 0,
  }));

  const topicAgg = {};
  tests.forEach((t) => {
    if (!t.subject || !t.topic) return;
    const key = `${t.subject}\u0000${t.topic}`;
    if (!topicAgg[key]) topicAgg[key] = { subject: t.subject, topic: t.topic, pctSum: 0, n: 0 };
    topicAgg[key].pctSum += typeof t.percentage === 'number' ? t.percentage : 0;
    topicAgg[key].n += 1;
  });
  const topicPerformance = Object.values(topicAgg)
    .map((row) => {
      const percentage = row.n ? Math.round(row.pctSum / row.n) : 0;
      let priority = 'low';
      if (percentage < 50) priority = 'high';
      else if (percentage < 70) priority = 'medium';
      let aiInsight = 'On track';
      if (percentage < 50) aiInsight = 'Revision recommended';
      else if (percentage < 60) aiInsight = 'High exam weight — drill more';
      else if (percentage < 75) aiInsight = 'Solid — push for mastery';
      return { subject: row.subject, topic: row.topic, percentage, testsCount: row.n, priority, aiInsight };
    })
    .sort((a, b) => a.percentage - b.percentage);

  const dailyMinutes = {};
  eachDayOfInterval({ start, end }).forEach((d) => {
    dailyMinutes[format(d, 'yyyy-MM-dd')] = 0;
  });
  sessions.forEach((s) => {
    const m = sessionMinutes(s);
    if (!m) return;
    const dateStr = format(new Date(s.startedAt), 'yyyy-MM-dd');
    if (dailyMinutes[dateStr] !== undefined) dailyMinutes[dateStr] += m;
  });
  const distinctStudyDays = Object.values(dailyMinutes).filter((m) => m > 0).length;
  const consistencyScore = Math.min(
    100,
    Math.round((distinctStudyDays / Math.max(1, differenceInCalendarDays(end, start) + 1)) * 100)
  );

  const dailyHoursTrend = Object.entries(dailyMinutes).map(([date, minutes]) => ({
    dateLabel: format(new Date(date), 'MMM d'),
    date,
    hours: Math.round((minutes / 60) * 100) / 100,
  }));

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekSessions = sessions.filter((s) => {
    const t = new Date(s.startedAt).getTime();
    return t >= weekStart.getTime() && t <= weekEnd.getTime();
  });
  const minutesByWeekday = [0, 0, 0, 0, 0, 0, 0];
  weekSessions.forEach((s) => {
    const wd = new Date(s.startedAt).getDay();
    minutesByWeekday[wd] += sessionMinutes(s);
  });
  const order = [1, 2, 3, 4, 5, 6, 0];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const thisWeekDaily = order.map((jsDay, idx) => {
    const hours = Math.round((minutesByWeekday[jsDay] / 60) * 100) / 100;
    return { dayLabel: dayLabels[idx], hours };
  });

  const hoursByWeekdayAll = [0, 0, 0, 0, 0, 0, 0];
  sessions.forEach((s) => {
    hoursByWeekdayAll[new Date(s.startedAt).getDay()] += sessionMinutes(s) / 60;
  });
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const bestPerformanceDays = dayNames
    .map((day, i) => ({ day, hours: Math.round(hoursByWeekdayAll[i] * 100) / 100 }))
    .filter((d) => d.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3)
    .map((d, rank) => ({ rank: rank + 1, ...d }));

  let slotTotal = 0;
  let slotCompleted = 0;
  timetables.forEach((tt) => {
    (tt.slots || []).forEach((sl) => {
      slotTotal += 1;
      if (sl.completed) slotCompleted += 1;
    });
  });
  const completionRate =
    slotTotal > 0
      ? Math.round((slotCompleted / slotTotal) * 100)
      : complete + incomplete > 0
        ? Math.round((complete / (complete + incomplete)) * 100)
        : 0;

  const syllabusProgress =
    subjectPerformance.length > 0
      ? Math.round(subjectPerformance.reduce((a, s) => a + s.percentage, 0) / subjectPerformance.length)
      : completionRate;

  const heatmapDays = 98;
  const heatStart = startOfDay(subDays(new Date(), heatmapDays - 1));
  const heatSessions = await FocusSession.find({
    userId,
    startedAt: { $gte: heatStart, $lte: end },
    status: { $ne: 'active' },
  }).lean();
  const perDayMin = {};
  eachDayOfInterval({ start: heatStart, end: new Date() }).forEach((d) => {
    perDayMin[format(d, 'yyyy-MM-dd')] = 0;
  });
  heatSessions.forEach((s) => {
    const dateStr = format(new Date(s.startedAt), 'yyyy-MM-dd');
    if (perDayMin[dateStr] !== undefined) perDayMin[dateStr] += sessionMinutes(s);
  });
  const heatmap = Object.entries(perDayMin).map(([date, minutes]) => ({
    date,
    level: heatmapLevel(minutes),
    minutes: Math.round(minutes),
  }));

  const weakSubjects = subjectPerformance.filter((s) => s.percentage < 60).map((s) => s.subject);
  const weakTopicAlerts = topicPerformance.filter((t) => t.percentage < 55).slice(0, 4);

  const snapshot = {
    totalStudyHours,
    completeSessions: complete,
    incompleteSessions: incomplete,
    focusScoreAverage,
    consistencyScore,
    subjectPerformance,
  };
  let smartSuggestions = await generateAnalyticsInsights(snapshot);
  if (!smartSuggestions.length) smartSuggestions = heuristicTips(snapshot);

  return {
    periodDays: safeDays,
    totalStudyHours,
    hoursChangePct,
    completeSessions: complete,
    incompleteSessions: incomplete,
    completionRate,
    consistencyScore,
    focusScoreAverage,
    focusScoreTrend: sessions
      .filter((s) => s.focusScore != null)
      .map((s) => ({ date: s.startedAt, score: s.focusScore })),
    dailyHoursTrend,
    thisWeekDaily,
    subjectPerformance,
    topicPerformance,
    weakSubjects,
    weakTopicAlerts,
    heatmap,
    bestPerformanceDays,
    smartSuggestions,
    streak: {
      current: streakDoc.currentStreak || 0,
      longest: streakDoc.longestStreak || 0,
      lastStudyDate: streakDoc.lastStudyDate,
    },
    syllabusProgress,
    taskPie: {
      completed: slotTotal ? slotCompleted : complete,
      incomplete: slotTotal ? slotTotal - slotCompleted : incomplete,
      label: slotTotal ? 'Timetable slots' : 'Focus sessions',
    },
    slotTotal,
    slotCompleted,
  };
}

router.get('/me', authenticate, studentOnly, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const payload = await buildStudentAnalytics(req.user._id, days);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/student/:studentId', authenticate, parentOnly, async (req, res) => {
  try {
    const parent = await User.findById(req.user._id);
    const studentId = req.params.studentId;
    if (!parent.linkedStudentIds?.some((id) => id.toString() === studentId)) {
      return res.status(403).json({ error: 'Not linked to this student' });
    }
    const days = parseInt(req.query.days, 10) || 7;
    const payload = await buildStudentAnalytics(studentId, days);
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
