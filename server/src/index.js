/**
 * PrepX API Server
 * Entry point - connects DB, mounts routes, starts cron jobs
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import timetableRoutes from './routes/timetable.js';
import focusRoutes from './routes/focus.js';
import testRoutes from './routes/tests.js';
import quizRoutes from './routes/quiz.js';
import notesRoutes from './routes/notes.js';
import friendsRoutes from './routes/friends.js';
import analyticsRoutes from './routes/analytics.js';
import reminderRoutes from './routes/reminders.js';
import streakRoutes from './routes/streak.js';
import aiRoutes from './routes/ai.js';
import { initCronJobs } from './cron/index.js';

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
// Local uploads (when not using Firebase)
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/ai', aiRoutes);

// 404
app.use('/api/*', (req, res) => res.status(404).json({ error: 'Not found' }));

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/prepx');
    console.log('MongoDB connected');
    initCronJobs();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}
start().catch(console.error);
