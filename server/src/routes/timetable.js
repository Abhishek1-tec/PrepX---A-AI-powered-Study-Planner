/**
 * Timetable: get/create daily slots. Weak-topic replan increases priority and adds revision.
 */
import express from 'express';
import { authenticate, studentOnly } from '../middleware/auth.js';
import Timetable from '../models/Timetable.js';
import Test from '../models/Test.js';
import FocusSession from '../models/FocusSession.js';
import { body, validationResult } from 'express-validator';
import { startOfDay, addDays, subDays } from 'date-fns';
import { hasRevisionFreeze } from '../services/revision.js';

const router = express.Router();

/** Topic completion tests below this % are treated as weak for replanning (PDF: 60%). */
const TOPIC_WEAK_THRESHOLD = 60;

function toDayStart(d) {
  return startOfDay(new Date(d));
}

// Get timetable for a date
router.get('/', authenticate, studentOnly, async (req, res) => {
  try {
    const date = req.query.date ? toDayStart(req.query.date) : toDayStart(new Date());
    let tt = await Timetable.findOne({ userId: req.user._id, date });
    if (!tt) {
      tt = await generateTimetable(req.user._id, req.user.subjectNames || [], date);
    }
    res.json(tt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Build slots for a date (reusable for preview and save)
async function buildSlots(userId, subjectNames, date) {
  const weakTopics = await getWeakTopics(userId);
  const slots = [];
  const subjects = subjectNames.length ? subjectNames : ['Subject 1', 'Subject 2'];
  let order = 0;
  for (const w of weakTopics) {
    slots.push({
      subject: w.subject,
      topic: w.topic,
      durationMinutes: 30,
      order: order++,
      priority: 10,
      isRevisionSlot: true,
    });
  }
  const perSubject = Math.max(1, Math.floor(6 / subjects.length));
  for (const sub of subjects) {
    for (let i = 0; i < perSubject; i++) {
      slots.push({
        subject: sub,
        topic: `${sub} - Topic ${i + 1}`,
        durationMinutes: 45,
        order: order++,
        priority: 0,
      });
    }
  }
  slots.sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.order - b.order);
  slots.forEach((s, i) => s.order = i);
  return slots;
}

async function generateTimetable(userId, subjectNames, date) {
  const slots = await buildSlots(userId, subjectNames, date);
  const tt = new Timetable({ userId, date, slots });
  await tt.save();
  return tt;
}

async function getWeakTopics(userId) {
  const incomplete = await Test.find({
    userId,
    isRevisionTest: { $ne: true },
    $or: [{ topicComplete: false }, { percentage: { $lt: TOPIC_WEAK_THRESHOLD } }, { completed: false }],
  }).sort({ updatedAt: -1 }).limit(20);
  const key = (s, t) => `${s}|${t}`;
  const seen = new Set();
  const out = [];
  for (const t of incomplete) {
    if (!t.subject || !t.topic) continue;
    if (seen.has(key(t.subject, t.topic))) continue;
    seen.add(key(t.subject, t.topic));
    out.push({ subject: t.subject, topic: t.topic });
  }
  return out;
}

// Mark slot completed (called after focus session + test pass)
router.patch('/:id/slots/:slotIndex/complete', authenticate, studentOnly, async (req, res) => {
  try {
    if (await hasRevisionFreeze(req.user._id)) {
      return res.status(423).json({ error: 'Timetable progression is frozen. Pass failed revision test first.' });
    }
    const tt = await Timetable.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tt) return res.status(404).json({ error: 'Timetable not found' });
    const idx = parseInt(req.params.slotIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= tt.slots.length) return res.status(400).json({ error: 'Invalid slot' });
    tt.slots[idx].completed = true;
    tt.slots[idx].completedAt = new Date();
    await tt.save();
    res.json(tt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Preview: generate slots without saving
router.post('/preview', authenticate, studentOnly, [
  body('date').optional(),
], async (req, res) => {
  try {
    if (await hasRevisionFreeze(req.user._id)) {
      return res.status(423).json({ error: 'Timetable progression is frozen. Pass failed revision test first.' });
    }
    const date = req.body.date ? toDayStart(req.body.date) : toDayStart(new Date());
    const slots = await buildSlots(req.user._id, req.user.subjectNames || [], date);
    res.json({ date, slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply preview to save timetable
router.post('/apply', authenticate, studentOnly, [
  body('date').optional(),
  body('slots').isArray(),
  body('isAdvancedAIGenerated').optional().isBoolean(),
  body('aiMeta').optional().isObject(),
], async (req, res) => {
  try {
    if (await hasRevisionFreeze(req.user._id)) {
      return res.status(423).json({ error: 'Timetable progression is frozen. Pass failed revision test first.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const date = req.body.date ? toDayStart(req.body.date) : toDayStart(new Date());
    const slots = req.body.slots || [];
    await Timetable.deleteOne({ userId: req.user._id, date });
    const tt = new Timetable({
      userId: req.user._id,
      date,
      slots,
      isAdvancedAIGenerated: req.body.isAdvancedAIGenerated === true,
      aiMeta: req.body.aiMeta || undefined,
    });
    await tt.save();
    res.json(tt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Apply multi-day AI plan (one document per calendar day)
router.post('/apply-plan', authenticate, studentOnly, [
  body('days').isArray({ min: 1 }),
  body('days.*.slots').isArray(),
  body('isAdvancedAIGenerated').optional().isBoolean(),
  body('aiMeta').optional().isObject(),
], async (req, res) => {
  try {
    if (await hasRevisionFreeze(req.user._id)) {
      return res.status(423).json({ error: 'Timetable progression is frozen. Pass failed revision test first.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const days = req.body.days || [];
    const isAdvancedAIGenerated = req.body.isAdvancedAIGenerated === true;
    const aiMeta = req.body.aiMeta || undefined;

    for (const day of days) {
      const date = toDayStart(day.date || new Date());
      await Timetable.deleteOne({ userId: req.user._id, date });
      await Timetable.create({
        userId: req.user._id,
        date,
        slots: day.slots || [],
        isAdvancedAIGenerated,
        aiMeta,
      });
    }
    res.json({ ok: true, daysWritten: days.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Regenerate timetable for date (AI/weak-topic aware)
router.post('/regenerate', authenticate, studentOnly, [
  body('date').optional().isISO8601(),
], async (req, res) => {
  try {
    const date = req.body.date ? toDayStart(req.body.date) : toDayStart(new Date());
    await Timetable.deleteOne({ userId: req.user._id, date });
    const tt = await generateTimetable(req.user._id, req.user.subjectNames || [], date);
    res.json(tt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a custom slot to today's (or given date) timetable
router.post('/slot', authenticate, studentOnly, [
  body('subject').trim().notEmpty(),
  body('topic').trim().notEmpty(),
  body('durationMinutes').optional().isInt({ min: 5, max: 180 }),
  body('date').optional().isISO8601(),
], async (req, res) => {
  try {
    if (await hasRevisionFreeze(req.user._id)) {
      return res.status(423).json({ error: 'Timetable progression is frozen. Pass failed revision test first.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const date = req.body.date ? toDayStart(req.body.date) : toDayStart(new Date());
    let tt = await Timetable.findOne({ userId: req.user._id, date });
    if (!tt) tt = await generateTimetable(req.user._id, req.user.subjectNames || [], date);
    tt.slots.push({
      subject: req.body.subject.trim(),
      topic: req.body.topic.trim(),
      durationMinutes: req.body.durationMinutes || 45,
      order: tt.slots.length,
      priority: 0,
    });
    await tt.save();
    res.json(tt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
