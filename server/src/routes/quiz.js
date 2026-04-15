/**
 * Quiz: AI-generated exam-pattern questions. Select subject, chapter, topic, difficulty.
 */
import express from 'express';
import { authenticate, studentOnly } from '../middleware/auth.js';
import Quiz from '../models/Quiz.js';
import { generateQuizQuestions } from '../services/ai.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

router.post('/generate', authenticate, studentOnly, [
  body('subject').trim().notEmpty(),
  body('chapter').trim().notEmpty(),
  body('topic').trim().notEmpty(),
  body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('count').optional().isInt({ min: 1, max: 20 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { subject, chapter, topic, difficulty = 'medium', count = 10 } = req.body;
    const raw = await generateQuizQuestions(subject, chapter, topic, difficulty, Math.min(count, 15));
    if (!raw || raw.length === 0) {
      return res.status(400).json({
        error: 'Could not generate questions. Ensure OPENROUTER_API_KEY is set in server .env and try again.',
      });
    }
    const questions = raw.map((q) => {
      const opts = q.options || [];
      const options = opts.map((opt, j) => ({
        text: typeof opt === 'string' ? opt : (opt?.text || String(opt)),
        isCorrect: j === q.correctIndex,
      }));
      return {
        type: 'mcq',
        question: q.question || '',
        options,
        correctIndex: q.correctIndex,
        maxMarks: q.maxMarks || 1,
      };
    });
    const totalMarks = questions.reduce((a, q) => a + (q.maxMarks || 1), 0);
    const quiz = new Quiz({
      userId: req.user._id,
      subject,
      chapter,
      topic,
      difficulty,
      questions,
      totalMarks,
    });
    await quiz.save();
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/submit', authenticate, studentOnly, [
  body('answers').isArray(),
], async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    if (quiz.submittedAt) return res.status(400).json({ error: 'Already submitted' });
    const answers = req.body.answers || [];
    let obtained = 0;
    quiz.questions.forEach((q, i) => {
      const ans = answers[i];
      q.studentAnswer = typeof ans === 'number' ? q.options?.[ans]?.text : ans;
      const correct = q.correctIndex === ans;
      q.studentMarks = correct ? (q.maxMarks || 1) : 0;
      obtained += q.studentMarks;
    });
    quiz.obtainedMarks = obtained;
    quiz.submittedAt = new Date();
    await quiz.save();
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticate, studentOnly, async (req, res) => {
  try {
    const list = await Quiz.find({ userId: req.user._id }).sort({ startedAt: -1 }).limit(30);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, studentOnly, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, userId: req.user._id });
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
