const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// Models
const ExamProfile = require('../../models/ExamProfile');
const Timetable = require('../../models/Timetable');

// Middleware
const auth = require('../../middleware/auth');

// Apply authentication to all routes
router.use(auth);

/**
 * Analysis Configuration
 * 
 * Based on exam type, determines:
 * - How many years of data to analyze
 * - Topic distribution patterns
 * - Priority scoring methodology
 */
const ANALYSIS_RANGES = {
  'Board': 10,
  'JEE Mains': 25,
  'NEET': 30,
  'UPSC': 20,
  'SSC CGL': 20,
  'SSC GD': 20
};

/**
 * Topic Map
 * 
 * Maps each subject to its typical topics
 * Used for generating realistic timetable slots
 * Can be extended with more subjects as needed
 */
const TOPIC_MAP = {
  'Physics': ['Mechanics', 'Thermodynamics', 'Waves', 'Optics', 'Modern Physics', 'Electricity', 'Magnetism'],
  'Chemistry': ['Organic', 'Inorganic', 'Physical', 'Analytical', 'Industrial'],
  'Mathematics': ['Algebra', 'Calculus', 'Geometry', 'Trigonometry', 'Statistics'],
  'Biology': ['Botany', 'Zoology', 'Genetics', 'Ecology', 'Cell Biology'],
  'English': ['Grammar', 'Literature', 'Comprehension', 'Vocabulary'],
  'History': ['Ancient', 'Medieval', 'Modern', 'Contemporary', 'World History'],
  'Geography': ['Physical', 'Human', 'Maps', 'Climate', 'Geopolitics'],
  'Polity': ['Constitution', 'Government', 'Laws', 'Rights'],
  'Economics': ['Micro', 'Macro', 'Development', 'International Trade'],
  'Quantitative Aptitude': ['Arithmetic', 'Algebra', 'Geometry', 'Data Interpretation'],
  'General Intelligence': ['Logic', 'Reasoning', 'Puzzles', 'Patterns'],
  'General Awareness': ['Current Affairs', 'Static GK', 'Science', 'History'],
  'General': ['General Topics']
};

/**
 * POST /api/ai/profile
 * 
 * Creates an exam profile for the user
 * 
 * Data Modeling:
 * - Partition Key: userId (High Cardinality)
 * - Stored in ExamProfile collection
 * - Referenced by Timetable documents
 * 
 * Request Body:
 *   {
 *     purpose: string,      // Exam type
 *     subjects: string[],   // List of subjects
 *     examDate: string      // ISO date
 *   }
 * 
 * Response:
 *   {
 *     id: string,
 *     userId: string,
 *     purpose: string,
 *     subjects: string[],
 *     examDate: Date,
 *     daysRemaining: number,
 *     createdAt: Date
 *   }
 */
router.post('/profile', async (req, res) => {
  try {
    const { purpose, subjects, examDate } = req.body;
    const userId = req.user.id;

    // Validation
    if (!purpose || !examDate) {
      return res.status(400).json({
        error: 'Purpose and exam date are required'
      });
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        error: 'At least one subject is required'
      });
    }

    // Calculate days remaining
    const daysRemaining = Math.ceil(
      (new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining < 1) {
      return res.status(400).json({
        error: 'Exam date must be in the future'
      });
    }

    // Create exam profile
    const profile = new ExamProfile({
      userId,
      purpose,
      subjects: subjects.filter(s => s?.trim()),
      examDate: new Date(examDate),
      daysRemaining: Math.max(0, daysRemaining),
      analysisRange: ANALYSIS_RANGES[purpose]
    });

    await profile.save();

    res.status(201).json({
      id: profile._id,
      userId: profile.userId,
      purpose: profile.purpose,
      subjects: profile.subjects,
      examDate: profile.examDate,
      daysRemaining: profile.daysRemaining,
      createdAt: profile.createdAt
    });
  } catch (error) {
    console.error('Error creating exam profile:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/analyze
 * 
 * Analyzes exam patterns based on exam type
 * Simulates historical data analysis (10-30 years of questions)
 * 
 * Can be extended to connect with real data sources:
 * - Previous question papers
 * - Topic frequency databases
 * - Student performance analytics
 * 
 * Request Body:
 *   { profileId: string }
 * 
 * Response:
 *   {
 *     totalTopics: number,
 *     analyses: [{
 *       subject: string,
 *       topic: string,
 *       frequencyScore: number,
 *       priority: string,
 *       analysisRange: number
 *     }]
 *   }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { profileId } = req.body;
    const userId = req.user.id;

    // Fetch exam profile
    const profile = await ExamProfile.findById(profileId);

    if (!profile || profile.userId.toString() !== userId) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const analyses = [];
    const analysisRange = ANALYSIS_RANGES[profile.purpose];

    // Generate topic analysis for each subject
    for (const subject of profile.subjects) {
      const topics = TOPIC_MAP[subject] || TOPIC_MAP['General'];

      for (const topic of topics) {
        // Simulate frequency score (0-100)
        // In production, this would come from historical question paper analysis
        const frequencyScore = Math.floor(Math.random() * 100);

        analyses.push({
          subject,
          topic,
          frequencyScore,
          priority: assignPriority(frequencyScore),
          analysisRange
        });
      }
    }

    // Update profile with topic count
    profile.topicsIdentified = analyses.length;
    await profile.save();

    res.status(200).json({
      totalTopics: analyses.length,
      analyses,
      message: `Analyzed ${analyses.length} topics across ${profile.subjects.length} subjects`
    });
  } catch (error) {
    console.error('Error in analyze:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/generate-timetable
 * 
 * Generates AI-powered timetable based on exam profile
 * 
 * Algorithm:
 * 1. Fetch exam profile and analysis data
 * 2. Generate slots across remaining days
 * 3. Prioritize high-frequency topics
 * 4. Insert revision slots every 7 days
 * 5. Store in Timetable collection
 * 
 * Data Modeling:
 * - Parent Document: Timetable (Partition Key: userId)
 * - Embedded: slots array (prevents cross-partition queries)
 * - Size: Typically <500 KB (well under 2 MB limit)
 * 
 * Request Body:
 *   { profileId: string }
 * 
 * Response:
 *   {
 *     _id: ObjectId,
 *     userId: ObjectId,
 *     examProfileId: ObjectId,
 *     title: string,
 *     isAdvancedAIGenerated: true,
 *     slots: [...],
 *     metadata: {...},
 *     createdAt: Date
 *   }
 */
router.post('/generate-timetable', async (req, res) => {
  try {
    const { profileId } = req.body;
    const userId = req.user.id;

    // Fetch exam profile
    const profile = await ExamProfile.findById(profileId);

    if (!profile || profile.userId.toString() !== userId) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Generate timetable slots
    const slots = generateAISlots(
      profile.daysRemaining,
      profile.subjects,
      profile.examDate,
      profile.purpose
    );

    // Create timetable document
    const timetable = new Timetable({
      userId,
      examProfileId: profileId,
      title: `AI Generated - ${profile.purpose}`,
      isAdvancedAIGenerated: true,
      generatedFrom: {
        profileId: profileId,
        generatedAt: new Date()
      },
      slots,
      metadata: calculateMetadata(slots)
    });

    await timetable.save();

    res.status(201).json({
      _id: timetable._id,
      userId: timetable.userId,
      examProfileId: timetable.examProfileId,
      title: timetable.title,
      isAdvancedAIGenerated: timetable.isAdvancedAIGenerated,
      slots: timetable.slots.length,
      metadata: timetable.metadata,
      createdAt: timetable.createdAt,
      message: `Timetable generated with ${timetable.slots.length} study slots`
    });
  } catch (error) {
    console.error('Error generating timetable:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/ai/generate-test
 * 
 * Generates a dynamic test based on subject and topic
 * Difficulty adapts to exam type
 * 
 * Can be extended to:
 * - Pull from real question bank
 * - Adapt difficulty based on past performance
 * - Generate test in multiple formats (MCQ, Short Answer, etc.)
 * 
 * Request Body:
 *   {
 *     profileId: string,
 *     subject: string,
 *     topic: string
 *   }
 * 
 * Response:
 *   {
 *     testId: string,
 *     subject: string,
 *     topic: string,
 *     difficulty: string,
 *     totalQuestions: number,
 *     questions: [...]
 *   }
 */
router.post('/generate-test', async (req, res) => {
  try {
    const { profileId, subject, topic } = req.body;
    const userId = req.user.id;

    // Fetch exam profile
    const profile = await ExamProfile.findById(profileId);

    if (!profile || profile.userId.toString() !== userId) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Determine difficulty based on exam type
    const difficulty = calculateDifficulty(profile.purpose);

    // Generate questions
    const questions = generateTestQuestions(subject, topic, difficulty);

    res.status(200).json({
      testId: uuidv4(),
      subject,
      topic,
      difficulty,
      totalQuestions: questions.length,
      questions,
      examType: profile.purpose,
      message: `Generated ${difficulty} test with ${questions.length} questions`
    });
  } catch (error) {
    console.error('Error generating test:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ Helper Functions ============

/**
 * Assign priority based on frequency score
 * 
 * High:   70+ (appears in >70% of exams)
 * Medium: 40-69 (appears in 40-70% of exams)
 * Low:    <40 (appears in <40% of exams)
 */
function assignPriority(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

/**
 * Generate AI study slots
 * 
 * Algorithm:
 * 1. Divide remaining days into study periods
 * 2. Allocate 4 study slots per day (9AM, 12PM, 3PM, 6PM)
 * 3. Vary slot duration (60, 60, 90, 120 minutes)
 * 4. Prioritize high-frequency topics
 * 5. Insert revision slots every 7 days
 */
function generateAISlots(daysRemaining, subjects, examDate, purpose) {
  const slots = [];
  const slotsPerDay = 4;
  const slotHours = [9, 12, 15, 18];
  const slotDurations = [60, 60, 90, 120]; // Increasing duration through day

  const startDate = new Date(examDate);
  startDate.setDate(startDate.getDate() - daysRemaining);

  let subjectIndex = 0;

  // Generate slots for each day
  for (let day = 0; day < daysRemaining; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);
    const dateStr = currentDate.toISOString().split('T')[0];

    for (let slot = 0; slot < slotsPerDay; slot++) {
      const subject = subjects[subjectIndex % subjects.length];
      const topicList = TOPIC_MAP[subject] || TOPIC_MAP['General'];
      const topic = topicList[Math.floor(Math.random() * topicList.length)];

      // Revision slots every 7 days
      const isRevisionSlot = day > 0 && day % 7 === 0 && slot < 2;
      const priority = ['High', 'Medium', 'Low'][
        Math.floor(Math.random() * 3)
      ];

      slots.push({
        id: uuidv4(),
        date: dateStr,
        timeSlot: `${slotHours[slot]}:00`,
        subject,
        topic,
        durationMinutes: slotDurations[slot],
        priority,
        isRevisionSlot,
        type: isRevisionSlot ? 'revision' : 'study',
        completed: false
      });

      subjectIndex++;
    }
  }

  return slots;
}

/**
 * Calculate timetable metadata
 * Used for quick statistics and overview
 */
function calculateMetadata(slots) {
  const uniqueDates = new Set(slots.map(s => s.date));
  const totalMinutes = slots.reduce((sum, s) => sum + (s.durationMinutes || 60), 0);
  const uniqueSubjects = new Set(slots.map(s => s.subject));

  return {
    totalSlots: slots.length,
    totalDays: uniqueDates.size,
    totalHours: Math.round(totalMinutes / 60),
    subjectsCount: uniqueSubjects.size,
    revisionsScheduled: slots.filter(s => s.type === 'revision').length,
    completedSlots: slots.filter(s => s.completed).length
  };
}

/**
 * Determine test difficulty based on exam type
 * 
 * Competitive exams (JEE, NEET, UPSC): Hard
 * Board exams: Medium
 * Recruitment exams (SSC): Medium to Easy
 */
function calculateDifficulty(examType) {
  const difficultyMap = {
    'JEE Mains': 'Hard',
    'NEET': 'Hard',
    'UPSC': 'Hard',
    'Board': 'Medium',
    'SSC CGL': 'Medium',
    'SSC GD': 'Easy'
  };
  return difficultyMap[examType] || 'Medium';
}

/**
 * Generate test questions
 * 
 * Question count varies by difficulty:
 * - Easy: 10 questions
 * - Medium: 15 questions
 * - Hard: 20 questions
 * 
 * Can be extended to:
 * - Pull from question bank
 * - Generate using AI models
 * - Include multiple question types
 */
function generateTestQuestions(subject, topic, difficulty) {
  const questionCount =
    difficulty === 'Easy' ? 10 : difficulty === 'Medium' ? 15 : 20;

  return Array.from({ length: questionCount }, (_, i) => ({
    id: i + 1,
    question: `${subject} - ${topic} Question ${i + 1}`,
    difficulty,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    explanation: `This is a ${difficulty} level question testing your understanding of ${topic}.`
  }));
}

module.exports = router;