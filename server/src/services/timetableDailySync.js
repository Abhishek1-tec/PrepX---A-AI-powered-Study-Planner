/**
 * Daily auto-update for AI timetables (PDF): drop completed topics from future days;
 * reinsert weak (failed) topics as high-priority catch-up when capacity allows.
 */
import { startOfDay } from 'date-fns';
import User from '../models/User.js';
import UserExamProfile from '../models/UserExamProfile.js';
import Timetable from '../models/Timetable.js';
import Test from '../models/Test.js';
import { hasRevisionFreeze } from './revision.js';

const CATCH_UP_MINUTES = 28;

function baseTopic(topic) {
  return String(topic || '')
    .replace(/\s*\(Revision\)\s*$/i, '')
    .replace(/\s*\(catch-up\)\s*$/i, '')
    .trim();
}

function topicKey(subject, topic) {
  return `${String(subject || '').trim()}|${baseTopic(topic)}`;
}

function slotMinutes(slots) {
  return (slots || []).reduce((a, s) => a + (Number(s.durationMinutes) || 0), 0);
}

function toPlainSlots(slots) {
  return (slots || []).map((s) => (typeof s.toObject === 'function' ? s.toObject() : { ...s }));
}

export async function runDailyTimetableUpdates() {
  const today = startOfDay(new Date());
  const students = await User.find({ role: 'student' }).select('_id');

  for (const u of students) {
    const userId = u._id;
    try {
      if (await hasRevisionFreeze(userId)) continue;

      const profile = await UserExamProfile.findOne({ userId });
      if (!profile) continue;
      const examDay = startOfDay(new Date(profile.examDate));
      if (examDay < today) continue;

      const dailyLimit = Math.max(30, Number(profile.dailyStudyMinutes) || 180);

      const passed = await Test.find({
        userId,
        topicComplete: true,
        completed: true,
        isRevisionTest: { $ne: true },
      })
        .select('subject topic')
        .lean();
      const completedKeys = new Set(passed.map((t) => topicKey(t.subject, t.topic)));

      const failed = await Test.find({
        userId,
        topicComplete: false,
        completed: true,
        isRevisionTest: { $ne: true },
        percentage: { $lt: 60 },
      })
        .sort({ updatedAt: -1 })
        .limit(40)
        .select('subject topic')
        .lean();

      const weakList = [];
      const seenWeak = new Set();
      for (const t of failed) {
        const k = topicKey(t.subject, t.topic);
        if (seenWeak.has(k) || completedKeys.has(k)) continue;
        seenWeak.add(k);
        weakList.push({ subject: t.subject, topic: baseTopic(t.topic) });
      }

      const future = await Timetable.find({
        userId,
        date: { $gte: today },
        isAdvancedAIGenerated: true,
      }).sort({ date: 1 });

      /** Each weak topic at most one catch-up slot across the plan (first day with capacity). */
      const scheduledWeak = new Set();

      for (const tt of future) {
        const day = startOfDay(tt.date);
        if (day > examDay) continue;

        let slots = toPlainSlots(tt.slots);

        slots = slots.filter((slot) => {
          if (slot.isRevisionSlot) return true;
          const k = topicKey(slot.subject, slot.topic);
          return !completedKeys.has(k);
        });

        let used = slotMinutes(slots);
        for (const w of weakList) {
          const k = topicKey(w.subject, w.topic);
          if (scheduledWeak.has(k)) continue;
          const already = slots.some((s) => topicKey(s.subject, s.topic) === k);
          if (already) {
            scheduledWeak.add(k);
            continue;
          }
          if (used + CATCH_UP_MINUTES > dailyLimit) break;
          slots.unshift({
            subject: w.subject,
            topic: `${w.topic} (catch-up)`,
            durationMinutes: CATCH_UP_MINUTES,
            order: 0,
            priority: 12,
            isRevisionSlot: false,
            completed: false,
          });
          used += CATCH_UP_MINUTES;
          scheduledWeak.add(k);
        }

        slots.forEach((s, i) => {
          s.order = i;
        });

        tt.slots = slots;
        tt.markModified('slots');
        await tt.save();
      }
    } catch (err) {
      console.error('[timetableDailySync] user', userId?.toString(), err.message);
    }
  }
}
