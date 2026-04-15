/**
 * Friends: unique ID, send/accept requests. No chat.
 */
import mongoose from 'mongoose';

const friendSchema = new mongoose.Schema(
  {
    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

friendSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });
friendSchema.index({ toUserId: 1, status: 1 });

export default mongoose.model('Friend', friendSchema);
