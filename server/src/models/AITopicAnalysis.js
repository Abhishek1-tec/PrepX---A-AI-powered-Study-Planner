import mongoose from 'mongoose';

const aiTopicAnalysisSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    examType: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    frequencyScore: { type: Number, required: true },
    priority: { type: String, enum: ['high', 'medium', 'low'], required: true },
  },
  { timestamps: true }
);

aiTopicAnalysisSchema.index({ userId: 1, examType: 1, subject: 1, topic: 1 }, { unique: true });

export default mongoose.model('AITopicAnalysis', aiTopicAnalysisSchema);
