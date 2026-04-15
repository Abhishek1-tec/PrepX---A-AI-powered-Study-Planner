/**
 * Topic completion tests: AI-generated; short answers AI-evaluated. Topic pass >= 60%; revision pass >= 65%.
 */
import express from 'express';
import { authenticate, studentOnly } from '../middleware/auth.js';
import Test from '../models/Test.js';
import FocusSession from '../models/FocusSession.js';
import UserExamProfile from '../models/UserExamProfile.js';
import { evaluateShortAnswer, generateTopicTest } from '../services/ai.js';
import { updateStreak } from '../services/streak.js';
import { body, validationResult } from 'express-validator';
import RevisionTask from '../models/RevisionTask.js';
import { addTopicToWeeklyRevisionPool, downgradeTopicToIncomplete, hasRevisionFreeze } from '../services/revision.js';

const router = express.Router();

const TOPIC_TEST_PASS_PCT = 60;
const REVISION_TEST_PASS_PCT = 65;
/** PDF: topic completion test time ~10 minutes */
const TOPIC_TEST_TIME_LIMIT_SEC = 600;

router.get('/generate', authenticate, studentOnly, async (req, res) => {
  try {
    const subject = req.query.subject || '';
    const topic = req.query.topic || '';
    if (!subject || !topic) return res.status(400).json({ error: 'subject and topic required' });
    const profile = await UserExamProfile.findOne({ userId: req.user._id });
    const purpose = profile?.purpose || 'Board';
    const { mcqs, shortAnswers } = await generateTopicTest(subject, topic, { purpose });
    res.json({ subject, topic, mcqs, shortAnswers, timeLimitSeconds: TOPIC_TEST_TIME_LIMIT_SEC });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/revision/pool', authenticate, studentOnly, async (req, res) => {
  try {
    const tasks = await RevisionTask.find({ userId: req.user._id, status: { $in: ['pending', 'failed'] } })
      .sort({ weekStart: -1, updatedAt: -1 })
      .limit(50);
    const frozen = await hasRevisionFreeze(req.user._id);
    res.json({ frozen, tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/revision/generate', authenticate, studentOnly, [
  body('revisionTaskId').optional().isMongoId(),
  body('subject').trim().notEmpty(),
  body('topic').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (req.body.revisionTaskId) {
      const t = await RevisionTask.findOne({ _id: req.body.revisionTaskId, userId: req.user._id });
      if (!t) return res.status(404).json({ error: 'Revision task not found' });
    }
    const profile = await UserExamProfile.findOne({ userId: req.user._id });
    const purpose = profile?.purpose || 'Board';
    const { mcqs, shortAnswers } = await generateTopicTest(req.body.subject, req.body.topic, { purpose, revision: true });
    res.json({
      subject: req.body.subject,
      topic: req.body.topic,
      mcqs,
      shortAnswers,
      timeLimitSeconds: TOPIC_TEST_TIME_LIMIT_SEC,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function evaluateTestPayload(test) {
  // Evaluate short answers with AI and compute percentage
  for (let i = 0; i < test.shortAnswers.length; i++) {
    const sa = test.shortAnswers[i];
    if (sa.studentAnswer) {
      const result = await evaluateShortAnswer(
        sa.question,
        sa.expectedKeywords,
        sa.wordCountMin,
        sa.wordCountMax,
        sa.studentAnswer,
        sa.maxMarks
      );
      sa.aiMarks = result.marks;
      sa.aiFeedback = result.feedback;
      sa.evaluatedAt = new Date();
      test.obtainedMarks += result.marks;
    }
  }
  test.percentage = test.totalMarks > 0 ? Math.round((test.obtainedMarks / test.totalMarks) * 100) : 0;
  test.completed = true;
  test.completedAt = new Date();
}

router.post('/revision/:taskId/submit', authenticate, studentOnly, [
  body('mcqs').isArray(),
  body('shortAnswers').optional().isArray(),
], async (req, res) => {
  try {
    const task = await RevisionTask.findOne({ _id: req.params.taskId, userId: req.user._id });
    if (!task) return res.status(404).json({ error: 'Revision task not found' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    let totalMarks = 0;
    let obtainedMarks = 0;
    const mcqList = (req.body.mcqs || []).map((m) => {
      const correctIndex = m.options?.findIndex((o) => o.isCorrect);
      const selected = m.selectedIndex;
      const marks = selected === correctIndex ? (m.marks || 1) : 0;
      totalMarks += (m.marks || 1);
      obtainedMarks += marks;
      return { ...m, correctIndex, marks };
    });
    const shortList = req.body.shortAnswers || [];
    for (const s of shortList) totalMarks += s.maxMarks || 5;

    const test = new Test({
      userId: req.user._id,
      revisionTaskId: task._id,
      isRevisionTest: true,
      subject: task.subject,
      topic: task.topic,
      mcqs: mcqList,
      shortAnswers: shortList,
      totalMarks,
      obtainedMarks,
    });
    await evaluateTestPayload(test);
    test.topicComplete = test.percentage >= REVISION_TEST_PASS_PCT;
    await test.save();

    task.lastScore = test.percentage || 0;
    task.lastTestId = test._id;
    if (test.percentage >= REVISION_TEST_PASS_PCT) {
      task.status = 'passed';
    } else {
      task.status = 'failed';
      await downgradeTopicToIncomplete(req.user._id, task.subject, task.topic);
    }
    await task.save();
    res.json({ test, revisionTask: task, frozen: await hasRevisionFreeze(req.user._id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, studentOnly, [
  body('focusSessionId').optional().isMongoId(),
  body('subject').trim().notEmpty(),
  body('topic').trim().notEmpty(),
  body('mcqs').isArray(),
  body('shortAnswers').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { focusSessionId, subject, topic, mcqs, shortAnswers } = req.body;
    let totalMarks = 0;
    let obtainedMarks = 0;
    const mcqList = (mcqs || []).map(m => {
      const correctIndex = m.options?.findIndex(o => o.isCorrect);
      const selected = m.selectedIndex;
      const marks = selected === correctIndex ? (m.marks || 1) : 0;
      totalMarks += (m.marks || 1);
      obtainedMarks += marks;
      return { ...m, correctIndex, marks };
    });
    const shortList = shortAnswers || [];
    for (const s of shortList) {
      totalMarks += s.maxMarks || 5;
    }
    const test = new Test({
      userId: req.user._id,
      focusSessionId,
      subject,
      topic,
      mcqs: mcqList,
      shortAnswers: shortList,
      totalMarks,
      obtainedMarks,
    });
    await test.save();
    await evaluateTestPayload(test);
    const sessionReset = focusSessionId ? await FocusSession.findOne({ _id: focusSessionId }).then(s => s?.wasReset) : false;
    test.topicComplete = !sessionReset && test.percentage >= TOPIC_TEST_PASS_PCT;
    await test.save();
    if (test.topicComplete) {
      await addTopicToWeeklyRevisionPool(req.user._id, subject, topic);
    }
    // Update streak if session was completed with test and <= 1 violation
    if (focusSessionId) {
      const session = await FocusSession.findById(focusSessionId);
      if (session && session.status === 'completed') {
        const minutes = session.endedAt && session.startedAt ? (session.endedAt - session.startedAt) / (60 * 1000) : 0;
        await updateStreak(req.user._id, { studyMinutes: minutes, testSubmitted: true, violationCount: session.violationCount });
      }
    }
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticate, studentOnly, async (req, res) => {
  try {
    const subject = req.query.subject;
    const topic = req.query.topic;
    const q = { userId: req.user._id };
    if (subject) q.subject = subject;
    if (topic) q.topic = topic;
    const tests = await Test.find(q).sort({ createdAt: -1 }).limit(50);
    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
