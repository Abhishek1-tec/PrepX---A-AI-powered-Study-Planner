/**
 * Users: profile, settings, unique ID (for friends). Parent: linked students.
 */
import express from 'express';
import { authenticate, studentOnly, parentOnly } from '../middleware/auth.js';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/me', authenticate, studentOnly, [
  body('fullName').optional().trim(),
  body('language').optional().isIn(['en', 'hi']),
  body('class').optional().trim(),
  body('preparationType').optional().isIn(['Board', 'JEE', 'JEE Advanced', 'NEET']),
  body('subjectNames').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const allowed = ['fullName', 'language', 'class', 'preparationType', 'subjectNames'];
    for (const k of allowed) if (req.body[k] !== undefined) req.user[k] = req.body[k];
    await req.user.save();
    const u = req.user.toObject();
    delete u.password;
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alias for PUT /api/users/profile (frontend compatibility)
router.put('/profile', authenticate, studentOnly, [
  body('class').optional().trim(),
  body('preparationType').optional().isIn(['Board', 'JEE', 'JEE Advanced', 'NEET']),
  body('subjectNames').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const allowed = ['class', 'preparationType', 'subjectNames'];
    for (const k of allowed) if (req.body[k] !== undefined) req.user[k] = req.body[k];
    await req.user.save();
    const u = req.user.toObject();
    delete u.password;
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Parent: list linked students
router.get('/linked-students', authenticate, parentOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('linkedStudentIds', 'fullName email class preparationType uniqueId');
    res.json(user.linkedStudentIds || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
