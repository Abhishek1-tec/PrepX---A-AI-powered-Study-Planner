/**
 * Cached AI study notes per exam type + subject + topic (shared across users for faster loads).
 */
import mongoose from 'mongoose';

const studyAidCacheSchema = new mongoose.Schema(
  {
    examType: { type: String, required: true, trim: true, index: true },
    subject: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    notesText: { type: String, required: true },
    /** Mermaid diagram source (flowchart / graph TD) for client render */
    mermaidDiagram: { type: String, default: '' },
    /** Optional ASCII diagram */
    asciiDiagram: { type: String, default: '' },
    /** Short query for opening YouTube search (video walkthrough) */
    videoSearchQuery: { type: String, default: '' },
  },
  { timestamps: true }
);

studyAidCacheSchema.index({ examType: 1, subject: 1, topic: 1 }, { unique: true });

export default mongoose.model('StudyAidCache', studyAidCacheSchema);
