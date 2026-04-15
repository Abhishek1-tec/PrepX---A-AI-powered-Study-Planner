import { startOfWeek, addDays } from 'date-fns';
import RevisionTask from '../models/RevisionTask.js';
import Test from '../models/Test.js';

export function currentWeekStart(date = new Date()) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export async function addTopicToWeeklyRevisionPool(userId, subject, topic) {
  const weekStart = currentWeekStart(new Date());
  const dueAt = addDays(weekStart, 6);
  return RevisionTask.findOneAndUpdate(
    { userId, subject, topic, weekStart },
    { userId, subject, topic, weekStart, dueAt, status: 'pending' },
    { upsert: true, new: true }
  );
}

export async function hasRevisionFreeze(userId) {
  const failed = await RevisionTask.findOne({ userId, status: 'failed' }).lean();
  return !!failed;
}

export async function downgradeTopicToIncomplete(userId, subject, topic) {
  // Mark latest non-revision test as incomplete so topic re-enters timetable.
  const latest = await Test.findOne({ userId, subject, topic, isRevisionTest: { $ne: true } }).sort({ createdAt: -1 });
  if (latest) {
    latest.topicComplete = false;
    latest.completed = true;
    await latest.save();
  } else {
    await Test.create({
      userId,
      subject,
      topic,
      mcqs: [],
      shortAnswers: [],
      totalMarks: 0,
      obtainedMarks: 0,
      percentage: 0,
      completed: true,
      topicComplete: false,
    });
  }
}
