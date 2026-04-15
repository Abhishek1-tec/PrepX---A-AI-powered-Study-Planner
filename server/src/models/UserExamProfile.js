import mongoose from 'mongoose';

const userExamProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    purpose: {
      type: String,
      enum: ['Board', 'JEE Mains', 'NEET', 'UPSC', 'SSC CGL', 'SSC GD'],
      required: true,
    },
    subjects: [{ type: String, trim: true }],
    examDate: { type: Date, required: true },
    daysRemaining: { type: Number, required: true },
    dailyStudyHours: { type: Number, required: true },
    dailyStudyMinutes: { type: Number, required: true },
    /** Optional syllabus / notes pasted by student (AI timetable weighting). */
    syllabusNotes: { type: String, trim: true, maxlength: 12000 },
  },
  { timestamps: true }
);

export default mongoose.model('UserExamProfile', userExamProfileSchema);
