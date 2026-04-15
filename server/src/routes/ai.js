import express from 'express';
import { body, validationResult } from 'express-validator';
import { differenceInCalendarDays, startOfDay, addDays } from 'date-fns';
import { authenticate, studentOnly } from '../middleware/auth.js';
import UserExamProfile from '../models/UserExamProfile.js';
import AITopicAnalysis from '../models/AITopicAnalysis.js';
import Timetable from '../models/Timetable.js';
import StudyAidCache from '../models/StudyAidCache.js';
import {
  hasOpenRouter,
  generateTimetableTopicAnalysis,
  generateTopicTest,
  generateFocusStudyAid,
} from '../services/ai.js';

const router = express.Router();

const PURPOSE_YEARS = {
  Board: 'the last 10 years',
  'JEE Mains': 'the last 25–30 years',
  NEET: 'the last 25–30 years',
  UPSC: 'the last 20 years',
  'SSC CGL': 'the last 20 years',
  'SSC GD': 'the last 20 years',
};

function defaultSubjectCount(purpose) {
  if (purpose === 'Board') return 5;
  if (purpose === 'UPSC') return 9;
  if (purpose === 'JEE Mains' || purpose === 'NEET') return 3;
  return 5;
}

function normalizeSubjects(subjects, purpose) {
  const cleaned = (subjects || []).map((s) => String(s || '').trim()).filter(Boolean);
  if (cleaned.length > 0) return cleaned;
  const count = defaultSubjectCount(purpose);
  return Array.from({ length: count }).map((_, i) => `Subject ${i + 1}`);
}

function simulatedTopicsFor(subject, purpose) {
  const base = [
    `${subject} Fundamentals`,
    `${subject} Core Concepts`,
    `${subject} Applications`,
    `${subject} PYQ High-Weight`,
    `${subject} Mixed Practice`,
  ];
  if (purpose === 'UPSC') return [...base, `${subject} Essay/GS Linkage`, `${subject} Case Analysis`];
  if (purpose === 'NEET' || purpose === 'JEE Mains') return [...base, `${subject} Formula Drill`, `${subject} Advanced Problems`];
  return base;
}

function priorityFromScore(score) {
  if (score >= 80) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
}

/** PDF: max topic block25–30 minutes */
function durationByPriority(priority) {
  if (priority === 'high') return 30;
  if (priority === 'medium') return 28;
  return 25;
}

function dedupeAnalysisRows(rows) {
  const seen = new Set();
  return rows.filter((r) => {
    const k = `${r.subject}|${r.topic}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function normalizePriorityLabel(p, frequencyScore) {
  const x = String(p || '').toLowerCase();
  if (x === 'high' || x === 'medium' || x === 'low') return x;
  return priorityFromScore(frequencyScore);
}

async function persistAnalysisFromRows(userId, examType, rows) {
  const docs = dedupeAnalysisRows(rows).map((r) => ({
    userId,
    examType,
    subject: r.subject,
    topic: r.topic,
    frequencyScore: r.frequencyScore,
    priority: normalizePriorityLabel(r.priority, r.frequencyScore),
  }));
  if (!docs.length) return;
  try {
    await AITopicAnalysis.insertMany(docs, { ordered: false });
  } catch (e) {
    if (e?.code !== 11000) throw e;
  }
}

function buildSimulatedAnalysisDocs(userId, profile) {
  const docs = [];
  for (const subject of profile.subjects) {
    for (const topic of simulatedTopicsFor(subject, profile.purpose)) {
      const frequencyScore = Math.floor(45 + Math.random() * 55);
      docs.push({
        userId,
        examType: profile.purpose,
        subject,
        topic,
        frequencyScore,
        priority: priorityFromScore(frequencyScore),
      });
    }
  }
  return docs;
}

/**
 * Spread prioritized topics across calendar days until the exam date (PDF: full syllabus across remaining days).
 */
function buildMultiDayPlan(analysisDocs, profile, planStartDate) {
  const dailyLimit = profile.dailyStudyMinutes;
  const examDate = startOfDay(new Date(profile.examDate));
  let d = startOfDay(new Date(planStartDate));
  if (d > examDate) return [];

  const items = analysisDocs
    .map((a) => ({
      subject: a.subject,
      topic: a.topic,
      priority: a.priority,
      frequencyScore: a.frequencyScore,
    }))
    .sort((a, b) => b.frequencyScore - a.frequencyScore);

  const days = [];
  let dayOffset = 0;
  let i = 0;
  const REV_MIN = 25;

  while (i < items.length && d <= examDate) {
    const slots = [];
    let used = 0;
    let order = 0;

    const pushSlot = (slot) => {
      slot.order = order++;
      slots.push(slot);
      used += slot.durationMinutes;
    };

    while (i < items.length) {
      const dur = durationByPriority(items[i].priority);
      if (used + dur <= dailyLimit) {
        pushSlot({
          subject: items[i].subject,
          topic: items[i].topic,
          durationMinutes: dur,
          priority: items[i].priority === 'high' ? 10 : items[i].priority === 'medium' ? 6 : 3,
          isRevisionSlot: false,
        });
        i += 1;
      } else {
        break;
      }
    }

    const addRevision = dayOffset > 0 && dayOffset % 7 === 0;
    if (addRevision && slots.length > 0) {
      const top = [...slots].filter((s) => !s.isRevisionSlot).sort((a, b) => b.priority - a.priority)[0];
      if (top && used + REV_MIN <= dailyLimit) {
        const baseTopic = String(top.topic).replace(/\s*\(Revision\)\s*$/i, '');
        pushSlot({
          subject: top.subject,
          topic: `${baseTopic} (Revision)`,
          durationMinutes: REV_MIN,
          priority: top.priority,
          isRevisionSlot: true,
        });
      }
    }

    slots.sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.order - b.order);
    slots.forEach((s, idx) => {
      s.order = idx;
    });

    if (slots.length === 0) {
      if (i >= items.length) break;
      d = addDays(d, 1);
      dayOffset += 1;
      continue;
    }

    days.push({ date: d.toISOString(), slots });
    d = addDays(d, 1);
    dayOffset += 1;
  }

  return days;
}

async function saveAiPlanToDatabase(userId, days, profile) {
  const aiMeta = {
    purpose: profile.purpose,
    dailyStudyMinutes: profile.dailyStudyMinutes,
    examDate: profile.examDate,
    daysRemaining: profile.daysRemaining,
  };
  for (const day of days) {
    const date = startOfDay(new Date(day.date));
    await Timetable.deleteOne({ userId, date });
    await Timetable.create({
      userId,
      date,
      slots: day.slots,
      isAdvancedAIGenerated: true,
      aiMeta,
    });
  }
}

router.post(
  '/profile',
  authenticate,
  studentOnly,
  [
    body('purpose').isIn(['Board', 'JEE Mains', 'NEET', 'UPSC', 'SSC CGL', 'SSC GD']),
    body('subjects').isArray(),
    body('examDate').isISO8601(),
    body('dailyStudyHours').isFloat({ min: 0.5, max: 18 }),
    body('syllabusNotes').optional().isString().isLength({ max: 12000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const purpose = req.body.purpose;
      const examDate = startOfDay(new Date(req.body.examDate));
      const daysRemaining = Math.max(1, differenceInCalendarDays(examDate, startOfDay(new Date())));
      const dailyStudyHours = Number(req.body.dailyStudyHours);
      const dailyStudyMinutes = Math.round(dailyStudyHours * 60);
      const subjects = normalizeSubjects(req.body.subjects, purpose);
      const syllabusNotes = req.body.syllabusNotes != null ? String(req.body.syllabusNotes).trim() : undefined;

      const update = {
        userId: req.user._id,
        purpose,
        subjects,
        examDate,
        daysRemaining,
        dailyStudyHours,
        dailyStudyMinutes,
      };
      if (syllabusNotes !== undefined) update.syllabusNotes = syllabusNotes || '';

      const profile = await UserExamProfile.findOneAndUpdate({ userId: req.user._id }, update, { new: true, upsert: true });
      res.json(profile);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.post('/analyze', authenticate, studentOnly, async (req, res) => {
  try {
    const profile = await UserExamProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(400).json({ error: 'Exam profile not found. Submit /api/ai/profile first.' });

    await AITopicAnalysis.deleteMany({ userId: req.user._id, examType: profile.purpose });

    const rangeLabel = PURPOSE_YEARS[profile.purpose] || 'the last 20 years';
    let source = 'simulated';

    if (hasOpenRouter()) {
      const aiRows = await generateTimetableTopicAnalysis(profile, profile.syllabusNotes || '', rangeLabel);
      if (aiRows?.length) {
        await persistAnalysisFromRows(req.user._id, profile.purpose, aiRows);
        source = 'openrouter';
      }
    }

    let count = await AITopicAnalysis.countDocuments({ userId: req.user._id, examType: profile.purpose });
    if (count === 0) {
      const docs = buildSimulatedAnalysisDocs(req.user._id, profile);
      if (docs.length) await AITopicAnalysis.insertMany(docs);
      count = await AITopicAnalysis.countDocuments({ userId: req.user._id, examType: profile.purpose });
      source = 'simulated';
    }

    res.json({
      examType: profile.purpose,
      analysisRange: rangeLabel,
      items: count,
      source,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-timetable', authenticate, studentOnly, async (req, res) => {
  try {
    const profile = await UserExamProfile.findOne({ userId: req.user._id });
    if (!profile) return res.status(400).json({ error: 'Exam profile not found. Submit /api/ai/profile first.' });

    let analysis = await AITopicAnalysis.find({ userId: req.user._id, examType: profile.purpose }).sort({ frequencyScore: -1 });
    if (!analysis.length) {
      await AITopicAnalysis.deleteMany({ userId: req.user._id, examType: profile.purpose });
      if (hasOpenRouter()) {
        const rangeLabel = PURPOSE_YEARS[profile.purpose] || 'the last 20 years';
        const aiRows = await generateTimetableTopicAnalysis(profile, profile.syllabusNotes || '', rangeLabel);
        if (aiRows?.length) await persistAnalysisFromRows(req.user._id, profile.purpose, aiRows);
      }
      if (!(await AITopicAnalysis.countDocuments({ userId: req.user._id, examType: profile.purpose }))) {
        const docs = buildSimulatedAnalysisDocs(req.user._id, profile);
        if (docs.length) await AITopicAnalysis.insertMany(docs);
      }
      analysis = await AITopicAnalysis.find({ userId: req.user._id, examType: profile.purpose }).sort({ frequencyScore: -1 });
    }

    const planStart = req.body.date ? startOfDay(new Date(req.body.date)) : startOfDay(new Date());
    const days = buildMultiDayPlan(analysis, profile, planStart);

    if (req.body.save === true) {
      await saveAiPlanToDatabase(req.user._id, days, profile);
      return res.json({
        saved: true,
        days,
        dayCount: days.length,
        purpose: profile.purpose,
        analysisRange: PURPOSE_YEARS[profile.purpose] || '20 years',
        dailyStudyMinutes: profile.dailyStudyMinutes,
      });
    }

    res.json({
      saved: false,
      days,
      dayCount: days.length,
      planStart: planStart.toISOString(),
      purpose: profile.purpose,
      analysisRange: PURPOSE_YEARS[profile.purpose] || '20 years',
      dailyStudyMinutes: profile.dailyStudyMinutes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/study-aid', authenticate, studentOnly, async (req, res) => {
  try {
    const subject = String(req.query.subject || '').trim();
    const topic = String(req.query.topic || '').trim();
    if (!subject || !topic) return res.status(400).json({ error: 'subject and topic required' });
    const profile = await UserExamProfile.findOne({ userId: req.user._id });
    const examType = profile?.purpose || 'Board';

    let doc = await StudyAidCache.findOne({ examType, subject, topic });
    if (!doc?.notesText) {
      if (!hasOpenRouter()) {
        return res.json({
          notes: '',
          mermaid: '',
          ascii: '',
          videoSearchQuery: '',
          videoSearchUrl: '',
          cached: false,
        });
      }
      const aid = await generateFocusStudyAid(subject, topic, examType);
      if (!aid.notesText) {
        return res.json({
          notes: '',
          mermaid: '',
          ascii: '',
          videoSearchQuery: '',
          videoSearchUrl: '',
          cached: false,
        });
      }
      doc = await StudyAidCache.findOneAndUpdate(
        { examType, subject, topic },
        { examType, subject, topic, ...aid },
        { upsert: true, new: true }
      );
    } else if (hasOpenRouter()) {
      const plain = doc.toObject ? doc.toObject() : doc;
      if (!('mermaidDiagram' in plain)) {
        const aid = await generateFocusStudyAid(subject, topic, examType);
        doc = await StudyAidCache.findOneAndUpdate(
          { examType, subject, topic },
          {
            $set: {
              mermaidDiagram: aid.mermaidDiagram || '',
              asciiDiagram: aid.asciiDiagram || '',
              videoSearchQuery: aid.videoSearchQuery || '',
            },
          },
          { new: true }
        );
      }
    }

    const videoSearchQuery = doc.videoSearchQuery || '';
    res.json({
      notes: doc.notesText,
      mermaid: doc.mermaidDiagram || '',
      ascii: doc.asciiDiagram || '',
      videoSearchQuery,
      videoSearchUrl: videoSearchQuery
        ? `https://www.youtube.com/results?search_query=${encodeURIComponent(videoSearchQuery)}`
        : '',
      cached: true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-test', authenticate, studentOnly, [
  body('subject').trim().notEmpty(),
  body('topic').trim().notEmpty(),
], async (req, res) => {
  try {
    const profile = await UserExamProfile.findOne({ userId: req.user._id });
    const purpose = profile?.purpose || 'Board';
    const { mcqs, shortAnswers } = await generateTopicTest(req.body.subject, req.body.topic, { purpose });
    if (!mcqs?.length && !shortAnswers?.length) {
      return res.status(503).json({ error: 'AI test generation unavailable. Set OPENROUTER_API_KEY on the server.' });
    }
    res.json({
      purpose,
      subject: req.body.subject,
      topic: req.body.topic,
      mcqs,
      shortAnswers,
      timeLimitSeconds: 600,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
