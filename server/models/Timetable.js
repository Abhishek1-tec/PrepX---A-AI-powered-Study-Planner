const mongoose = require('mongoose');

/**
 * Slot Schema - Embedded within Timetable
 * 
 * Reference: Data Modeling - Embedding Strategy
 * - Slots are always accessed with their parent timetable
 * - Minimal individual slot access patterns
 * - Reduces cross-partition queries
 * - Total timetable size typically < 500 KB (well under 2 MB limit)
 */
const slotSchema = new mongoose.Schema(
  {
    id: String,
    date: String, // ISO format: YYYY-MM-DD
    timeSlot: String, // HH:00 format
    subject: String,
    topic: String,
    durationMinutes: Number,
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low']
    },
    isRevisionSlot: Boolean,
    type: {
      type: String,
      enum: ['study', 'revision', 'test'],
      default: 'study'
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  },
  { _id: false }
);

/**
 * Timetable Schema
 * 
 * Partition Strategy: userId (High Cardinality)
 * Access Patterns:
 *  - Query by userId + date to fetch daily timetable
 *  - Query by userId to fetch all timetables
 *  - Update slots within a timetable
 * 
 * Embedding Strategy:
 *  - All slots embedded (no separate slot collection)
 *  - Eliminates joins and cross-partition queries
 *  - Single document write for slot updates
 */
const timetableSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    examProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamProfile'
    },
    title: {
      type: String,
      required: true
    },
    isAdvancedAIGenerated: {
      type: Boolean,
      default: false
    },
    // AI Generation Metadata
    generatedFrom: {
      profileId: mongoose.Schema.Types.ObjectId,
      generatedAt: Date
    },
    // Embedded slots array
    slots: [slotSchema],
    // Metadata for quick access
    metadata: {
      totalSlots: Number,
      totalDays: Number,
      totalHours: Number,
      subjectsCount: Number,
      revisionsScheduled: Number,
      completedSlots: Number
    }
  },
  {
    timestamps: true
  }
);

// Indexes for efficient queries
timetableSchema.index({ userId: 1, createdAt: -1 });
timetableSchema.index({ userId: 1, 'slots.date': 1 });
timetableSchema.index({ userId: 1, isAdvancedAIGenerated: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);