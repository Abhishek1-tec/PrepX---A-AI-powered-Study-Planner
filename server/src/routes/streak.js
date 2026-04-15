import express from 'express';
import { authenticate, studentOnly } from '../middleware/auth.js';
import { getStreak } from '../services/streak.js';

const router = express.Router();

router.get('/', authenticate, studentOnly, async (req, res) => {
  try {
    const data = await getStreak(req.user._id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
