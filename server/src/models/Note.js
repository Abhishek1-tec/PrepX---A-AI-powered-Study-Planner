/**
 * Notes & PYQs: PDF/image uploads with topic tagging. Cloud storage URL.
 * Sharing: only between accepted friends; re-share disabled by default.
 */
import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, trim: true },
    topic: { type: String, trim: true },
    fileUrl: { type: String, required: true },
    fileName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    tags: [String],
    isPYQ: { type: Boolean, default: false },
    // Sharing: who has access (friend user IDs)
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Shared-with-me view: stored as reference when someone shares with you
const sharedNoteRefSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
    sharedWithUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    savedToMyNotes: { type: Boolean, default: false }, // view/download only unless saved
  },
  { timestamps: true }
);
sharedNoteRefSchema.index({ sharedWithUserId: 1, noteId: 1 }, { unique: true });

export const Note = mongoose.model('Note', noteSchema);
export const SharedNoteRef = mongoose.model('SharedNoteRef', sharedNoteRefSchema);
