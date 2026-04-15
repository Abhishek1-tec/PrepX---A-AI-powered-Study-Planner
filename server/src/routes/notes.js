/**
 * Notes & PYQs: upload (PDF/images), topic tagging. Sharing only with accepted friends.
 */
import express from 'express';
import multer from 'multer';
import { authenticate, studentOnly } from '../middleware/auth.js';
import { Note, SharedNoteRef } from '../models/Note.js';
import Friend from '../models/Friend.js';
import { uploadFile } from '../services/storage.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB

router.post('/upload', authenticate, studentOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File required' });
    const { title, subject, topic, isPYQ, tags } = req.body;
    const fileUrl = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    const note = new Note({
      userId: req.user._id,
      title: title || req.file.originalname,
      subject: subject || '',
      topic: topic || '',
      fileUrl,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      isPYQ: isPYQ === true || isPYQ === 'true',
      tags: Array.isArray(tags) ? tags : (tags ? [].concat(tags) : []),
    });
    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticate, studentOnly, async (req, res) => {
  try {
    const mine = await Note.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(mine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Shared with me (only notes from accepted friends)
router.get('/shared-with-me', authenticate, studentOnly, async (req, res) => {
  try {
    const refs = await SharedNoteRef.find({ sharedWithUserId: req.user._id })
      .populate('noteId').populate('ownerId', 'fullName');
    const notes = refs.map(r => ({ ...r.noteId?.toObject(), sharedFrom: r.ownerId?.fullName, savedToMyNotes: r.savedToMyNotes }));
    res.json(notes.filter(n => n._id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Share with friend (only accepted friends; only notes/PYQs; no links/videos)
router.post('/:id/share', authenticate, studentOnly, [
  body('friendUserId').notEmpty(),
], async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    const friendId = req.body.friendUserId;
    const friendship = await Friend.findOne({
      $or: [
        { fromUserId: req.user._id, toUserId: friendId },
        { fromUserId: friendId, toUserId: req.user._id },
      ],
      status: 'accepted',
    });
    if (!friendship) return res.status(403).json({ error: 'Can only share with accepted friends' });
    const targetId = friendship.fromUserId.toString() === req.user._id.toString() ? friendship.toUserId : friendship.fromUserId;
    if (!note.sharedWith) note.sharedWith = [];
    if (!note.sharedWith.some(id => id.toString() === targetId.toString())) {
      note.sharedWith.push(targetId);
      await note.save();
    }
    await SharedNoteRef.findOneAndUpdate(
      { noteId: note._id, sharedWithUserId: targetId },
      { ownerId: req.user._id, noteId: note._id, sharedWithUserId: targetId },
      { upsert: true }
    );
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save shared note to my notes (copy reference; re-share disabled by default)
router.post('/shared/:refId/save', authenticate, studentOnly, async (req, res) => {
  try {
    const ref = await SharedNoteRef.findOne({ _id: req.params.refId, sharedWithUserId: req.user._id });
    if (!ref) return res.status(404).json({ error: 'Not found' });
    ref.savedToMyNotes = true;
    await ref.save();
    res.json(ref);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, studentOnly, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    await note.deleteOne();
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
