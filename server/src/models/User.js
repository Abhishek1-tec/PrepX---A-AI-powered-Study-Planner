/**
 * User model: Student and Parent accounts.
 * Student has profile (class, preparation type, subjects); linked to parent by parentEmail.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'parent'], required: true },
    fullName: { type: String, required: true, trim: true },
    // Student-only fields (parent doc has these null)
    parentName: { type: String, trim: true },
    parentEmail: { type: String, trim: true, lowercase: true },
    class: { type: String, trim: true },
    preparationType: { type: String, enum: ['Board', 'JEE', 'JEE Advanced', 'NEET'], trim: true },
    subjectNames: [{ type: String, trim: true }],
    // Unique ID for friends (student only)
    uniqueId: { type: String, unique: true, sparse: true },
    // Link: parent's _id for quick lookup (set when parent account exists)
    parentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // For parent: list of student userIds (their children)
    linkedStudentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    language: { type: String, enum: ['en', 'hi'], default: 'en' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Generate friend ID: short alphanumeric
userSchema.statics.generateUniqueId = function () {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

export default mongoose.model('User', userSchema);
