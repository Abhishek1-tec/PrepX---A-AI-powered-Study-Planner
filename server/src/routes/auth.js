/**
 * Auth: signup (2-step), login (role: student | parent)
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// Step 1: fullName, email, parentName, parentEmail, password
router.post(
  '/signup/step1',
  [
    body('fullName').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('parentName').trim().notEmpty(),
    body('parentEmail').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { fullName, email, parentName, parentEmail, password } = req.body;
      if (email === parentEmail) return res.status(400).json({ error: 'Parent email must be different from yours' });
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ error: 'Email already registered' });
      const existingParent = await User.findOne({ email: parentEmail });
      if (existingParent && existingParent.role !== 'parent') return res.status(400).json({ error: 'Parent email is already used as student' });
      // Create parent account if not exists so they can login with parent email + same password
      if (!existingParent) {
        const parentUser = new User({
          email: parentEmail,
          password,
          role: 'parent',
          fullName: parentName,
        });
        await parentUser.save();
      }
      // Create student with step1 data only; step2 will add class, preparationType, subjectNames
      const user = new User({
        fullName,
        email,
        parentName,
        parentEmail,
        password,
        role: 'student',
      });
      await user.save();
      const token = jwt.sign({ userId: user._id, role: 'student' }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      return res.json({ token, user: { id: user._id, email: user.email, fullName: user.fullName, role: 'student', step: 1 } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Step 2: class, preparationType, subjectNames (requires auth from step1)
router.post(
  '/signup/step2',
  [
    body('class').trim().notEmpty(),
    body('preparationType').isIn(['Board', 'JEE', 'JEE Advanced', 'NEET']),
    body('subjectNames').isArray().isLength({ min: 1, max: 10 }),
  ],
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Token required' });
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user || user.role !== 'student') return res.status(401).json({ error: 'Invalid token' });
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { class: cls, preparationType, subjectNames } = req.body;
      const names = (subjectNames || []).slice(0, 5).map(s => (s && String(s).trim()).filter(Boolean)).flat();
      if (names.length < 1) return res.status(400).json({ error: 'At least one subject required' });
      user.class = cls;
      user.preparationType = preparationType;
      user.subjectNames = names.slice(0, 5);
      user.uniqueId = User.generateUniqueId();
      // Link parent if they have account
      const parent = await User.findOne({ email: user.parentEmail, role: 'parent' });
      if (parent) {
        user.parentUserId = parent._id;
        if (!parent.linkedStudentIds) parent.linkedStudentIds = [];
        if (!parent.linkedStudentIds.some(id => id.toString() === user._id.toString())) {
          parent.linkedStudentIds.push(user._id);
          await parent.save();
        }
      }
      await user.save();
      return res.json({ user: { id: user._id, email: user.email, fullName: user.fullName, role: 'student', step: 2, uniqueId: user.uniqueId } });
    } catch (err) {
      if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
      res.status(500).json({ error: err.message });
    }
  }
);

// Login: role (student | parent), email, password. Parent uses parent email + same password.
router.post(
  '/login',
  [
    body('role').isIn(['student', 'parent']),
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { role, email, password } = req.body;
      const user = await User.findOne({ email, role }).select('+password');
      if (!user) return res.status(401).json({ error: 'Invalid email or password' });
      const ok = await user.comparePassword(password);
      if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
      const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      const u = user.toObject();
      delete u.password;
      return res.json({ token, user: u });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
