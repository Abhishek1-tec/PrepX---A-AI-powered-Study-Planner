/**
 * Timetable: daily slots per student. Used for card-based timetable and weak-topic replanning.
 */
import mongoose from 'mongoose';

const slotSchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true },
  topic: { type: String, required: true, trim: true },
  durationMinutes: { type: Number, required: true, min: 5 },
  order: { type: Number, default: 0 },
  // Weak-topic replan: higher = earlier reschedule
  priority: { type: Number, default: 0 },
  isRevisionSlot: { type: Boolean, default: false },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
});

const timetableSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true }, // start of day (UTC)
    slots: [slotSchema],
    // New AI workflow flag from PDF requirements
    isAdvancedAIGenerated: { type: Boolean, default: false },
    aiMeta: {
      purpose: { type: String, trim: true },
      dailyStudyMinutes: { type: Number },
      examDate: { type: Date },
      daysRemaining: { type: Number },
    },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

timetableSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('Timetable', timetableSchema);
