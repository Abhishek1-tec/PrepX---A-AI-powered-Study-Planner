const mongoose = require('mongoose');

/**
 * ExamProfile Schema
 * 
 * Partition Strategy: userId (High Cardinality)
 * Access Patterns:
 *  - Query by userId to fetch user's exam profiles
 *  - Query by userId + purpose for filtering
 * 
 * Reference: Data Modeling Best Practices
 * - High cardinality partition key (userId)
 * - Supports most common query patterns
 * - Prevents hot partitions
 */
const examProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    purpose: {
      type: String,
      enum: ['Board', 'JEE Mains', 'NEET', 'UPSC', 'SSC CGL', 'SSC GD'],
      required: true
    },
    subjects: {
      type: [String],
      required: true,
      minlength: 1
    },
    examDate: {
      type: Date,
      required: true
    },
    daysRemaining: {
      type: Number,
      required: true
    },
    // Metadata for analysis
    analysisRange: Number, // Years analyzed (10, 20, 25, 30)
    topicsIdentified: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
examProfileSchema.index({ userId: 1, createdAt: -1 });
examProfileSchema.index({ userId: 1, purpose: 1 });

module.exports = mongoose.model('ExamProfile', examProfileSchema);