/**
 * Quiz: AI-generated exam-pattern questions (subject, chapter, topic, difficulty).
 */
import mongoose from 'mongoose';

const quizQuestionSchema = new mongoose.Schema({
  type: { type: String, enum: ['mcq', 'short'], default: 'mcq' },
  question: { type: String, required: true },
  options: [{ text: String, isCorrect: Boolean }],
  correctIndex: Number,
  maxMarks: Number,
  studentAnswer: String,
  studentMarks: Number,
});

const quizSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    chapter: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    questions: [quizQuestionSchema],
    totalMarks: Number,
    obtainedMarks: Number,
    startedAt: { type: Date, default: Date.now },
    submittedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model('Quiz', quizSchema);
