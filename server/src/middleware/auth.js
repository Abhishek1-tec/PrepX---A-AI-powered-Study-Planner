/**
 * Auth middleware: verify JWT and attach user (student or parent)
 * Parent can only access read-only endpoints; full access for student.
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    req.role = user.role; // 'student' | 'parent'
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expired' });
    next(err);
  }
};

/** Only students can proceed */
export const studentOnly = (req, res, next) => {
  if (req.role !== 'student') return res.status(403).json({ error: 'Student access only' });
  next();
};

/** Only parents can proceed */
export const parentOnly = (req, res, next) => {
  if (req.role !== 'parent') return res.status(403).json({ error: 'Parent access only' });
  next();
};
