/**
 * Cron: weekly parent email every Sunday; optional streak recalculation.
 */
import cron from 'node-cron';
import User from '../models/User.js';
import FocusSession from '../models/FocusSession.js';
import Test from '../models/Test.js';
import { sendParentWeeklyReport } from '../services/email.js';
import { generateParentRemark } from '../services/ai.js';
import { runDailyTimetableUpdates } from '../services/timetableDailySync.js';
import { startOfWeek, subDays, endOfDay } from 'date-fns';

export function initCronJobs() {
  // Daily at 00:05 — AI timetables: drop completed topics, queue weak topics (PDF continuous update)
  cron.schedule('5 0 * * *', async () => {
    try {
      await runDailyTimetableUpdates();
      console.log('[cron] Daily timetable sync finished');
    } catch (e) {
      console.error('[cron] Daily timetable sync failed', e);
    }
  });
  // Every Sunday at 9:00 AM
  cron.schedule('0 9 * * 0', async () => {
    const weekEnd = endOfDay(new Date());
    const weekStart = startOfWeek(subDays(weekEnd, 7), { weekStartsOn: 1 });
    const students = await User.find({ role: 'student' }).select('email fullName parentEmail parentUserId');
    for (const student of students) {
      if (!student.parentEmail) continue;
      const sessions = await FocusSession.find({
        userId: student._id,
        startedAt: { $gte: weekStart, $lte: weekEnd },
        status: { $ne: 'active' },
      });
      const totalMinutes = sessions.reduce((a, s) => (s.endedAt && s.startedAt ? a + (s.endedAt - s.startedAt) / (60 * 1000) : a), 0);
      const complete = sessions.filter(s => s.status === 'completed').length;
      const incomplete = sessions.filter(s => s.status === 'incomplete' || s.status === 'reset').length;
      const avgFocus = sessions.filter(s => s.status === 'completed').reduce((a, s) => a + (s.focusScore || 0), 0);
      const focusCount = sessions.filter(s => s.status === 'completed').length;
      const tests = await Test.find({
        userId: student._id,
        completed: true,
        completedAt: { $gte: weekStart },
        isRevisionTest: { $ne: true },
      });
      const bySubject = {};
      tests.forEach(t => {
        if (!bySubject[t.subject]) bySubject[t.subject] = { total: 0, obtained: 0 };
        bySubject[t.subject].total += t.totalMarks;
        bySubject[t.subject].obtained += t.obtainedMarks;
      });
      const weakSubjects = Object.entries(bySubject)
        .filter(([, d]) => d.total && (d.obtained / d.total) * 100 < 60)
        .map(([s]) => s);
      const summary = { totalHours: (totalMinutes / 60).toFixed(1), completeSessions: complete, incompleteSessions: incomplete, focusScore: focusCount ? (avgFocus / focusCount).toFixed(1) : '-', weakSubjects };
      const remark = await generateParentRemark(summary);
      await sendParentWeeklyReport(student.parentEmail, student.fullName, {
        ...summary,
        totalHours: summary.totalHours,
        completeSessions: complete,
        incompleteSessions: incomplete,
        focusScore: summary.focusScore,
        weakSubjects,
        remark,
      });
    }
  });
}
