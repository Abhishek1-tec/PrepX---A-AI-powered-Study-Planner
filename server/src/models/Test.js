/**
 * Topic completion tests: MCQs (auto) + short answers (AI-evaluated).
 * Topic completion: score >= 60% (revision tests: >= 65%). No session reset for topic pass.
 */
import mongoose from 'mongoose';

const mcqOptionSchema = new mongoose.Schema({
  text: String,
  isCorrect: Boolean,
});

const mcqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [mcqOptionSchema],
  selectedIndex: { type: Number },
  correctIndex: { type: Number },
  marks: { type: Number, default: 1 },
});

const shortAnswerSchema = new mongoose.Schema({
  question: { type: String, required: true },
  maxMarks: { type: Number, required: true },
  expectedKeywords: [String],
  wordCountMin: Number,
  wordCountMax: Number,
  studentAnswer: { type: String },
  aiMarks: { type: Number },
  aiFeedback: { type: String },
  evaluatedAt: { type: Date },
});

const testSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    focusSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FocusSession' },
    revisionTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'RevisionTask' },
    isRevisionTest: { type: Boolean, default: false },
    subject: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    mcqs: [mcqSchema],
    shortAnswers: [shortAnswerSchema],
    totalMarks: { type: Number, required: true },
    obtainedMarks: { type: Number },
    percentage: { type: Number },
    completed: { type: Boolean, default: false }, // true when submitted and AI done
    completedAt: { type: Date },
    // Topic marked complete if >= 60% (revision flow uses 65% in routes)
    topicComplete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

testSchema.index({ userId: 1, subject: 1, topic: 1 });
testSchema.index({ focusSessionId: 1 });

export default mongoose.model('Test', testSchema);
