const mongoose = require('mongoose');

/**
 * Initialize database indexes
 * Ensures optimal query performance
 */
async function initializeIndexes() {
  try {
    const ExamProfile = require('../models/ExamProfile');
    const Timetable = require('../models/Timetable');

    console.log('📊 Creating database indexes...');

    // ExamProfile indexes
    await ExamProfile.collection.createIndex({ userId: 1, createdAt: -1 });
    await ExamProfile.collection.createIndex({ userId: 1, purpose: 1 });

    // Timetable indexes
    await Timetable.collection.createIndex({ userId: 1, createdAt: -1 });
    await Timetable.collection.createIndex({ userId: 1, 'slots.date': 1 });
    await Timetable.collection.createIndex({ userId: 1, isAdvancedAIGenerated: 1 });

    console.log('✅ Indexes created successfully');
  } catch (error) {
    console.error('❌ Index creation failed:', error);
  }
}

module.exports = { initializeIndexes };