/**
 * Focus sessions: start, record violations, end. Focus score 0–100.
 * Rules: first switch -10, second -25, fullscreen exit -30, session reset = 0.
 */
import express from 'express';
import { authenticate, studentOnly } from '../middleware/auth.js';
import FocusSession from '../models/FocusSession.js';
import { body, validationResult } from 'express-validator';
import { hasRevisionFreeze } from '../services/revision.js';

const router = express.Router();

const SCORE_FIRST_VIOLATION = 10;
const SCORE_SECOND_VIOLATION = 25;
const SCORE_FULLSCREEN_EXIT = 30;
const SCORE_RESET = 0;

router.post('/start', authenticate, studentOnly, [
  body('timetableId').optional().isMongoId(),
  body('slotIndex').optional().isInt({ min: 0 }),
  body('subject').optional().trim(),
  body('topic').optional().trim(),
  body('plannedDurationMinutes').optional().isInt({ min: 5 }),
], async (req, res) => {
  try {
    if (await hasRevisionFreeze(req.user._id)) {
      return res.status(423).json({ error: 'Timetable progression is frozen. Pass failed revision test first.' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const session = new FocusSession({
      userId: req.user._id,
      timetableId: req.body.timetableId,
      slotIndex: req.body.slotIndex,
      subject: req.body.subject,
      topic: req.body.topic,
      plannedDurationMinutes: req.body.plannedDurationMinutes || 45,
      status: 'active',
      focusScore: 100,
    });
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record violation (tab switch, blur, fullscreen exit, reload)
router.post('/:id/violation', authenticate, studentOnly, [
  body('type').isIn(['tab_switch', 'blur', 'fullscreen_exit', 'reload']),
], async (req, res) => {
  try {
    const session = await FocusSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'active') return res.status(400).json({ error: 'Session not active' });
    const type = req.body.type;
    const count = session.violationCount + 1;
    const wasFirst = count === 1;
    const wasSecond = count >= 2;
    let newScore = session.focusScore;
    let status = session.status;
    let wasReset = session.wasReset;
    if (type === 'fullscreen_exit' || type === 'reload') {
      newScore = Math.max(0, newScore - SCORE_FULLSCREEN_EXIT);
      status = 'incomplete';
    } else if (wasSecond) {
      newScore = SCORE_RESET;
      status = 'reset';
      wasReset = true;
    } else {
      newScore = Math.max(0, newScore - SCORE_FIRST_VIOLATION);
    }
    session.violations.push({
      type,
      wasFirst,
      wasSecond,
    });
    session.violationCount = count;
    session.focusScore = newScore;
    session.status = status;
    session.wasReset = wasReset;
    if (status !== 'active') session.endedAt = new Date();
    await session.save();
    res.json({ session, warning: wasFirst && count === 1 ? 'First violation; one more will reset the session.' : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/end', authenticate, studentOnly, [
  body('status').optional().isIn(['completed', 'incomplete']),
], async (req, res) => {
  try {
    const session = await FocusSession.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'active') return res.status(400).json({ error: 'Session not active' });
    session.endedAt = new Date();
    session.status = req.body.status || 'completed';
    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get my sessions for date range (for analytics)
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const start = req.query.start ? new Date(req.query.start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = req.query.end ? new Date(req.query.end) : new Date();
    const sessions = await FocusSession.find({
      userId: req.user._id,
      startedAt: { $gte: start, $lte: end },
    }).sort({ startedAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Weekly average focus score (for student/parent)
router.get('/focus-score/weekly', authenticate, async (req, res) => {
  try {
    const uid = req.role === 'parent' && req.query.studentId ? req.query.studentId : req.user._id;
    if (req.role === 'parent' && uid.toString() !== req.user._id.toString()) {
      const user = await import('../models/User.js').then(m => m.default.findById(req.user._id));
      if (!user?.linkedStudentIds?.some(id => id.toString() === uid)) return res.status(403).json({ error: 'Not linked to this student' });
    }
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const sessions = await FocusSession.find({ userId: uid, startedAt: { $gte: weekStart }, status: { $ne: 'active' } });
    const completed = sessions.filter(s => s.status === 'completed');
    const avg = completed.length ? completed.reduce((a, s) => a + (s.focusScore || 0), 0) / completed.length : 0;
    res.json({ weeklyAverage: Math.round(avg * 100) / 100, sessionCount: completed.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
