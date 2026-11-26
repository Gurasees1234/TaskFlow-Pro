import mongoose from 'mongoose';
import { PROJECT_ROLES } from './ProjectMember.js';

const invitationSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    inviter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: PROJECT_ROLES,
      default: 'developer',
    },
    message: { type: String, default: '', trim: true, maxlength: 500 },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'revoked'],
      default: 'pending',
    },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

invitationSchema.index({ project: 1, email: 1, status: 1 });
invitationSchema.index({ expiresAt: 1 });

export default mongoose.model('Invitation', invitationSchema);
