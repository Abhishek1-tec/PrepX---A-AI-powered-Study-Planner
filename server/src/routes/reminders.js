/**
 * Reminders for student
 */
import express from 'express';
import { authenticate, studentOnly } from '../middleware/auth.js';
import Reminder from '../models/Reminder.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

router.get('/', authenticate, studentOnly, async (req, res) => {
  try {
    const list = await Reminder.find({ userId: req.user._id }).sort({ dueAt: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, studentOnly, [
  body('title').trim().notEmpty(),
  body('description').optional().trim(),
  body('dueAt').isISO8601(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const reminder = new Reminder({
      userId: req.user._id,
      title: req.body.title,
      description: req.body.description,
      dueAt: new Date(req.body.dueAt),
    });
    await reminder.save();
    res.json(reminder);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/complete', authenticate, studentOnly, async (req, res) => {
  try {
    const r = await Reminder.findOne({ _id: req.params.id, userId: req.user._id });
    if (!r) return res.status(404).json({ error: 'Not found' });
    r.completed = true;
    await r.save();
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, studentOnly, async (req, res) => {
  try {
    await Reminder.deleteOne({ _id: req.params.id, userId: req.user._id });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
