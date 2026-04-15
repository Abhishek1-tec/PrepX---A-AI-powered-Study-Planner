/**
 * Streak: increases only if min study time + test submitted + <= 1 violation.
 * Break: no study for 2 days. Grace: 1 per month.
 */
import Streak from '../models/Streak.js';
import { startOfDay, differenceInDays, startOfMonth } from 'date-fns';

const MIN_STUDY_MINUTES = 30;
const GRACE_DAYS_PER_MONTH = 1;

export async function updateStreak(userId, { studyMinutes, testSubmitted, violationCount }) {
  const today = startOfDay(new Date());
  let streak = await Streak.findOne({ userId });
  if (!streak) streak = new Streak({ userId });

  const eligible = studyMinutes >= MIN_STUDY_MINUTES && testSubmitted && (violationCount ?? 0) <= 1;
  if (!eligible) return streak;

  const last = streak.lastStudyDate ? startOfDay(streak.lastStudyDate) : null;
  if (!last) {
    streak.currentStreak = 1;
    streak.lastStudyDate = today;
  } else {
    const gap = differenceInDays(today, last);
    if (gap === 0) {
      // Same day: no change to streak count
    } else if (gap === 1) {
      streak.currentStreak = (streak.currentStreak || 0) + 1;
      streak.lastStudyDate = today;
    } else if (gap === 2) {
      const thisMonth = startOfMonth(today).getTime();
      if (streak.graceMonth !== thisMonth || (streak.graceDaysUsedThisMonth || 0) < GRACE_DAYS_PER_MONTH) {
        streak.graceMonth = thisMonth;
        streak.graceDaysUsedThisMonth = (streak.graceDaysUsedThisMonth || 0) + 1;
        streak.currentStreak = (streak.currentStreak || 0) + 1;
        streak.lastStudyDate = today;
      } else {
        streak.currentStreak = 0;
        streak.lastStudyDate = today;
      }
    } else {
      streak.currentStreak = 1;
      streak.lastStudyDate = today;
    }
  }
  if ((streak.currentStreak || 0) > (streak.longestStreak || 0)) streak.longestStreak = streak.currentStreak;
  await streak.save();
  return streak;
}

export async function getStreak(userId) {
  let streak = await Streak.findOne({ userId });
  if (!streak) return { currentStreak: 0, longestStreak: 0, lastStudyDate: null };
  return streak;
}
