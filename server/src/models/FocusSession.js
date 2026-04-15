/**
 * Focus session: one study block. Tracks violations and focus score for discipline.
 */
import mongoose from 'mongoose';

const violationSchema = new mongoose.Schema({
  type: { type: String, enum: ['tab_switch', 'blur', 'fullscreen_exit', 'reload'], required: true },
  at: { type: Date, default: Date.now },
  wasFirst: Boolean,
  wasSecond: Boolean,
});

const focusSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable' },
    slotIndex: { type: Number },
    subject: { type: String, trim: true },
    topic: { type: String, trim: true },
    plannedDurationMinutes: { type: Number },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    // Discipline
    violations: [violationSchema],
    violationCount: { type: Number, default: 0 },
    focusScore: { type: Number, default: 100 }, // 0-100
    status: {
      type: String,
      enum: ['active', 'completed', 'incomplete', 'reset'],
      default: 'active',
    },
    // Session reset = true if second violation occurred
    wasReset: { type: Boolean, default: false },
  },
  { timestamps: true }
);

focusSessionSchema.index({ userId: 1, startedAt: -1 });

export default mongoose.model('FocusSession', focusSessionSchema);
