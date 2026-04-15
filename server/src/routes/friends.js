/**
 * Friends: unique ID, send/accept. No chat.
 */
import express from 'express';
import { authenticate, studentOnly } from '../middleware/auth.js';
import User from '../models/User.js';
import Friend from '../models/Friend.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

router.get('/my-id', authenticate, studentOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('uniqueId fullName');
    if (!user.uniqueId) {
      user.uniqueId = User.generateUniqueId();
      await user.save();
    }
    res.json({ uniqueId: user.uniqueId, fullName: user.fullName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send-request', authenticate, studentOnly, [
  body('uniqueId').trim().notEmpty(),
], async (req, res) => {
  try {
    const target = await User.findOne({ uniqueId: req.body.uniqueId.trim(), role: 'student' });
    if (!target) return res.status(404).json({ error: 'No user found with this ID' });
    if (target._id.toString() === req.user._id.toString()) return res.status(400).json({ error: 'Cannot add yourself' });
    const existing = await Friend.findOne({
      $or: [
        { fromUserId: req.user._id, toUserId: target._id },
        { fromUserId: target._id, toUserId: req.user._id },
      ],
    });
    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ error: 'Already friends' });
      if (existing.fromUserId.toString() === req.user._id.toString()) return res.status(400).json({ error: 'Request already sent' });
      return res.status(400).json({ error: 'They already sent you a request' });
    }
    const fr = new Friend({ fromUserId: req.user._id, toUserId: target._id, status: 'pending' });
    await fr.save();
    res.json(fr);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/requests', authenticate, studentOnly, async (req, res) => {
  try {
    const pending = await Friend.find({ toUserId: req.user._id, status: 'pending' })
      .populate('fromUserId', 'fullName uniqueId');
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/accept/:id', authenticate, studentOnly, async (req, res) => {
  try {
    const fr = await Friend.findOne({ _id: req.params.id, toUserId: req.user._id, status: 'pending' });
    if (!fr) return res.status(404).json({ error: 'Request not found' });
    fr.status = 'accepted';
    fr.acceptedAt = new Date();
    await fr.save();
    res.json(fr);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/list', authenticate, studentOnly, async (req, res) => {
  try {
    const list = await Friend.find({ $or: [{ fromUserId: req.user._id }, { toUserId: req.user._id }], status: 'accepted' })
      .populate('fromUserId', 'fullName uniqueId')
      .populate('toUserId', 'fullName uniqueId');
    const friends = list.map(f => {
      const other = f.fromUserId._id.toString() === req.user._id.toString() ? f.toUserId : f.fromUserId;
      return { id: f._id, user: other };
    });
    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
