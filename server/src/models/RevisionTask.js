import mongoose from 'mongoose';

const revisionTaskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    weekStart: { type: Date, required: true, index: true },
    status: { type: String, enum: ['pending', 'passed', 'failed'], default: 'pending' },
    lastScore: { type: Number, default: 0 },
    lastTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
    dueAt: { type: Date },
  },
  { timestamps: true }
);

revisionTaskSchema.index({ userId: 1, subject: 1, topic: 1, weekStart: 1 }, { unique: true });

export default mongoose.model('RevisionTask', revisionTaskSchema);
