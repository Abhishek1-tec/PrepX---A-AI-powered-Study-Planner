const mongoose = require('mongoose');

/**
 * AIAnalysis Schema - Optional storage of analysis results
 * 
 * Partition Strategy: userId (High Cardinality)
 * Use Case:
 *  - Store historical topic analysis data
 *  - Track which topics are frequently asked
 *  - Support trend analysis
 * 
 * Note: Can be omitted if generating analysis on-the-fly
 */
const aiAnalysisSchema = new mongoose.Schema(
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
    subject: String,
    topic: String,
    frequencyScore: {
      type: Number,
      min: 0,
      max: 100
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low']
    },
    analysisRange: Number, // Years analyzed
    yearwiseTrends: {
      type: Map,
      of: {
        frequency: Number,
        difficulty: String
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
aiAnalysisSchema.index({ userId: 1, purpose: 1 });
aiAnalysisSchema.index({ userId: 1, subject: 1 });

module.exports = mongoose.model('AIAnalysis', aiAnalysisSchema);