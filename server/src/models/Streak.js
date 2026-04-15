/**
 * Study streak: increases only if min study time + test submitted + <= 1 violation.
 * Break: no study for 2 days. Grace: 1 day per month.
 */
import mongoose from 'mongoose';

const streakSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastStudyDate: { type: Date },
    graceDaysUsedThisMonth: { type: Number, default: 0 },
    graceMonth: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model('Streak', streakSchema);
